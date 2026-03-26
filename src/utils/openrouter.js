// FILE: src/utils/openrouter.js
// VERSION: 2.0.0
// START_MODULE_CONTRACT
//   PURPOSE: Continuous audio transcription with LLM-based question detection via OpenRouter API
//   SCOPE: Audio ring buffer → WhisperX STT → text buffer → question detector → main LLM chat
//   DEPENDS: gemini.js (sendToRenderer, initializeNewSession, saveConversationTurn), prompts.js (getSystemPrompt)
//   LINKS: <M-OPENROUTER>
// END_MODULE_CONTRACT
//
// START_MODULE_MAP
//   resample24kTo16k — Downsample audio from 24kHz to 16kHz with linear interpolation
//   loadWhisperPipeline — Load local HuggingFace Whisper model (fallback STT)
//   transcribeAudio — Transcribe PCM buffer via local Whisper pipeline
//   pcm16ToWavBuffer — Convert PCM16 buffer to WAV format with headers
//   transcribeWithWhisperX — Send audio to WhisperX Docker API, poll for result
//   isHallucination — Filter known Whisper hallucination patterns
//   transcribeAccumulatedAudio — Grab ring buffer audio, send to STT, push to text buffer
//   buildDetectorPrompt — Build prompt for question detection LLM
//   detectQuestion — Call detector LLM to find new questions in text buffer
//   stripThinkingTags — Remove <think> tags from LLM responses
//   sendToOpenRouter — Stream chat completion from OpenRouter API
//   sendImageToOpenRouter — Send screenshot to vision model via OpenRouter
//   initializeOpenRouterSession — Configure and start continuous transcription session
//   processOpenRouterAudio — Receive audio chunk, add to ring buffer
//   closeOpenRouterSession — Stop timers, clear state
// END_MODULE_MAP

const { BrowserWindow } = require('electron');
const { getSystemPrompt } = require('./prompts');
const { sendToRenderer, initializeNewSession, saveConversationTurn } = require('./gemini');
const {
    pcm16ToFloat32, pcm16ToWavBuffer, resample24kTo16k: _resample24kTo16k,
    isHallucination, stripThinkingTags, buildDetectorPrompt: _buildDetectorPrompt,
    parseSSEChunk,
} = require('./audio-helpers');

// ── State ──

let openrouterApiKey = null;
let openrouterModel = null;
let openrouterVisionModel = null;
let currentSystemPrompt = null;
let conversationHistory = [];
let isActive = false;

// Whisper (reused from localai)
let whisperPipeline = null;
let isWhisperLoading = false;

// WhisperX Docker STT
let whisperXUrl = null; // e.g. 'http://localhost:8000'
let whisperXModel = 'large-v3';
let whisperXLang = 'ru';

// Continuous transcription state
let continuousBuffer = [];       // Array of {text, timestamp}
let detectedQuestions = [];      // Last 3 detected questions for dedup
let detectorModel = 'openai/gpt-4o-mini';
let windowSizeSec = 15;          // Rolling window in seconds (10-30)
let checkFrequencyMs = 1000;     // Detection check interval (500-2000)
let detectorTimer = null;        // setInterval reference
let transcriptionTimer = null;   // setInterval for periodic transcription
let isTranscribing = false;      // Lock to prevent overlapping transcriptions
let isDetecting = false;         // Lock to prevent overlapping detections
let audioRingBuffer = [];        // Ring buffer of PCM16k chunks with timestamps
let audioLookbackSec = 3;        // How many seconds of audio to send each time
let transcriptionIntervalMs = 500; // How often to send audio to WhisperX

// Audio resampling buffer
let resampleRemainder = Buffer.alloc(0);

// ── Audio Resampling (24kHz → 16kHz) ──

// START_BLOCK_AUDIO_RESAMPLING
function resample24kTo16k(inputBuffer) {
    const result = _resample24kTo16k(inputBuffer, resampleRemainder);
    resampleRemainder = result.remainder;
    return result.output;
}
// END_BLOCK_AUDIO_RESAMPLING

// ── Whisper ──

async function loadWhisperPipeline(modelName) {
    if (whisperPipeline) return whisperPipeline;
    if (isWhisperLoading) return null;

    isWhisperLoading = true;
    console.log('[OpenRouter] Loading Whisper model:', modelName);
    sendToRenderer('whisper-downloading', true);
    sendToRenderer('update-status', 'Loading Whisper model...');

    try {
        const { pipeline, env } = await import('@huggingface/transformers');
        const { app } = require('electron');
        const path = require('path');
        env.cacheDir = path.join(app.getPath('userData'), 'whisper-models');

        whisperPipeline = await pipeline('automatic-speech-recognition', modelName, {
            device: 'cpu',
        });
        console.log('[OpenRouter] Whisper loaded');
        sendToRenderer('whisper-downloading', false);
        isWhisperLoading = false;
        return whisperPipeline;
    } catch (error) {
        console.error('[OpenRouter] Whisper load failed:', error);
        sendToRenderer('whisper-downloading', false);
        sendToRenderer('update-status', 'Whisper error: ' + error.message);
        isWhisperLoading = false;
        return null;
    }
}

async function transcribeAudio(pcm16kBuffer) {
    if (!whisperPipeline) return null;
    try {
        const float32Audio = pcm16ToFloat32(pcm16kBuffer);
        const opts = {
            sampling_rate: 16000,
            task: 'transcribe',
        };
        if (whisperXLang) opts.language = whisperXLang;
        const result = await whisperPipeline(float32Audio, opts);
        const text = result.text?.trim();
        console.log('[OpenRouter] Transcription:', text);
        return text;
    } catch (error) {
        console.error('[OpenRouter] Transcription error:', error);
        return null;
    }
}

// ── WhisperX Docker STT ──

async function transcribeWithWhisperX(pcm16kBuffer) {
    if (!whisperXUrl) return null;
    try {
        const wavBuffer = pcm16ToWavBuffer(pcm16kBuffer);

        // Use Node.js built-in FormData (available in Node 18+)
        const { Blob } = require('buffer');
        const blob = new Blob([wavBuffer], { type: 'audio/wav' });
        const formData = new FormData();
        formData.append('file', blob, 'audio.wav');

        const url = `${whisperXUrl}/service/transcribe?language=${whisperXLang}&model=${whisperXModel}`;
        const resp = await fetch(url, { method: 'POST', body: formData });

        if (!resp.ok) {
            console.error('[OpenRouter] WhisperX API error:', resp.status);
            return null;
        }

        const { identifier } = await resp.json();

        // Poll for result (max 30s)
        for (let i = 0; i < 60; i++) {
            await new Promise(r => setTimeout(r, 500));
            const taskResp = await fetch(`${whisperXUrl}/task/${identifier}`);
            const task = await taskResp.json();

            if (task.status === 'completed') {
                const segments = task.result?.segments || [];
                const text = segments.map(s => s.text).join(' ').trim();
                console.log('[OpenRouter] WhisperX transcription:', text);
                return text || null;
            }
            if (task.status === 'failed' || task.error) {
                console.error('[OpenRouter] WhisperX task failed:', task.error);
                return null;
            }
        }

        console.error('[OpenRouter] WhisperX timeout');
        return null;
    } catch (error) {
        console.error('[OpenRouter] WhisperX error:', error);
        return null;
    }
}

// ── Continuous Transcription ──

// isHallucination imported from audio-helpers.js

// START_CONTRACT: transcribeAccumulatedAudio
//   PURPOSE: Grab audio from ring buffer, transcribe via STT, push valid text to continuous buffer
//   INPUTS: (none — reads from audioRingBuffer state)
//   OUTPUTS: { void — side effects only }
//   SIDE_EFFECTS: Appends to continuousBuffer, trims old entries, updates renderer status
// END_CONTRACT: transcribeAccumulatedAudio
async function transcribeAccumulatedAudio() {
    if (isTranscribing || audioRingBuffer.length === 0) return;
    isTranscribing = true;

    const t0 = Date.now();
    try {
        // START_BLOCK_RING_BUFFER_MANAGEMENT
        // Grab entire ring buffer (last N seconds of audio)
        const audioData = Buffer.concat(audioRingBuffer.map(c => c.data));
        const audioDurationSec = (audioData.length / 2 / 16000).toFixed(1);

        if (audioData.length < 16000) return;

        const text = whisperXUrl
            ? await transcribeWithWhisperX(audioData)
            : await transcribeAudio(audioData);

        const sttMs = Date.now() - t0;

        // END_BLOCK_RING_BUFFER_MANAGEMENT

        if (text && text.trim().length > 1 && !isHallucination(text)) {
            continuousBuffer.push({
                text: text.trim(),
                timestamp: Date.now(),
            });

            const cutoff = Date.now() - (windowSizeSec * 1000);
            continuousBuffer = continuousBuffer.filter(entry => entry.timestamp >= cutoff);

            sendToRenderer('update-status', `Hearing: "${text.trim().substring(0, 50)}..."`);
            console.log(`[STT] ${sttMs}ms | ${audioDurationSec}s audio | buf=${continuousBuffer.length} entries | "${text.trim().substring(0, 100)}"`);
        } else {
            console.log(`[STT] ${sttMs}ms | ${audioDurationSec}s audio | ${text ? 'hallucination filtered: "' + text.trim().substring(0, 50) + '"' : 'no speech'}`);
        }
    } catch (error) {
        console.error('[OpenRouter] Transcription error:', error);
    } finally {
        isTranscribing = false;
    }
}

// ── Question Detection ──

// START_CONTRACT: buildDetectorPrompt
//   PURPOSE: Assemble the prompt sent to the detector LLM with recent transcription and known questions
//   INPUTS: (none — reads from continuousBuffer, detectedQuestions state)
//   OUTPUTS: { string|null — formatted prompt or null if no text available }
//   SIDE_EFFECTS: None
// END_CONTRACT: buildDetectorPrompt
// START_BLOCK_DETECTOR_PROMPT_BUILD
function buildDetectorPrompt() {
    return _buildDetectorPrompt(continuousBuffer, detectedQuestions, windowSizeSec);
}
// END_BLOCK_DETECTOR_PROMPT_BUILD

// START_CONTRACT: detectQuestion
//   PURPOSE: Call detector LLM to identify new questions in the continuous transcription buffer
//   INPUTS: (none — reads from continuousBuffer, openrouterApiKey, detectorModel state)
//   OUTPUTS: { void — triggers sendToOpenRouter on detected question }
//   SIDE_EFFECTS: Appends to detectedQuestions, sends to renderer, calls sendToOpenRouter
// END_CONTRACT: detectQuestion
async function detectQuestion() {
    if (isDetecting || !isActive || !openrouterApiKey) return;
    if (continuousBuffer.length === 0) return;

    isDetecting = true;
    const t0 = Date.now();
    const bufferText = continuousBuffer.map(e => e.text).join(' ');

    try {
        const prompt = buildDetectorPrompt();
        if (!prompt) return;

        console.log(`[DET] Sending to ${detectorModel} | buffer: ${bufferText.length} chars, ${continuousBuffer.length} entries | "${bufferText.substring(0, 120)}..."`);

        // START_BLOCK_DETECTOR_API_CALL
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openrouterApiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://cheatingdaddy.com',
                'X-Title': 'Cheating Daddy',
            },
            body: JSON.stringify({
                model: detectorModel,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.1,
                max_tokens: 256,
            }),
        });

        if (!response.ok) {
            console.error(`[DET] Error: HTTP ${response.status} (${Date.now() - t0}ms)`);
            return;
        }

        const data = await response.json();
        // END_BLOCK_DETECTOR_API_CALL

        // START_BLOCK_DETECTOR_RESULT_PROCESS
        const result = data.choices?.[0]?.message?.content?.trim();
        const detMs = Date.now() - t0;
        const tokens = data.usage?.total_tokens || '?';

        if (result && result !== '---' && result.length > 5) {
            const lastQ = detectedQuestions[detectedQuestions.length - 1];
            if (lastQ && lastQ.toLowerCase() === result.toLowerCase()) {
                console.log(`[DET] ${detMs}ms ${tokens}tok | DEDUP SKIP: "${result.substring(0, 80)}"`);
                return;
            }

            console.log(`[DET] ${detMs}ms ${tokens}tok | QUESTION FOUND: "${result}"`);

            detectedQuestions.push(result);
            if (detectedQuestions.length > 10) {
                detectedQuestions = detectedQuestions.slice(-10);
            }

            sendToRenderer('show-transcription', result);
            sendToRenderer('update-status', 'Generating response...');
            await sendToOpenRouter(result);
            sendToRenderer('update-status', 'Listening...');
        } else {
            console.log(`[DET] ${detMs}ms ${tokens}tok | no question | response: "${(result || '').substring(0, 50)}"`);
        }
        // END_BLOCK_DETECTOR_RESULT_PROCESS
    } catch (error) {
        console.error('[OpenRouter] Detector error:', error);
    } finally {
        isDetecting = false;
    }
}

// ── OpenRouter Chat API ──

// START_CONTRACT: sendToOpenRouter
//   PURPOSE: Stream a chat completion from OpenRouter API with conversation history
//   INPUTS: { text: string — user question/message to send }
//   OUTPUTS: { void — streams response tokens to renderer }
//   SIDE_EFFECTS: Appends to conversationHistory, sends streamed tokens to renderer, saves turn
// END_CONTRACT: sendToOpenRouter

// stripThinkingTags imported from audio-helpers.js

async function sendToOpenRouter(text) {
    if (!openrouterApiKey || !openrouterModel) {
        console.error('[OpenRouter] Not configured');
        return;
    }

    if (!text || text.trim() === '') return;

    const llmT0 = Date.now();
    console.log(`[LLM] Sending to ${openrouterModel} | question: "${text.substring(0, 120)}" | history: ${conversationHistory.length} msgs`);

    conversationHistory.push({ role: 'user', content: text.trim() });
    if (conversationHistory.length > 20) {
        conversationHistory = conversationHistory.slice(-20);
    }

    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openrouterApiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://cheatingdaddy.com',
                'X-Title': 'Cheating Daddy',
            },
            body: JSON.stringify({
                model: openrouterModel,
                messages: [
                    { role: 'system', content: currentSystemPrompt || 'You are a helpful assistant.' },
                    ...conversationHistory,
                ],
                stream: true,
                temperature: 0.7,
                max_tokens: 1024,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[OpenRouter] API error:', response.status, errorText);
            sendToRenderer('update-status', `OpenRouter error: ${response.status}`);
            return;
        }

        // START_BLOCK_SSE_STREAM_PARSE
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        let isFirst = true;
        let sseBuffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            sseBuffer += decoder.decode(value, { stream: true });
            const lines = sseBuffer.split('\n');
            sseBuffer = lines.pop() || '';

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || !trimmed.startsWith('data: ')) continue;
                const data = trimmed.slice(6);
                if (data === '[DONE]') continue;
                try {
                    const json = JSON.parse(data);
                    const token = json.choices?.[0]?.delta?.content || '';
                    if (token) {
                        fullText += token;
                        const displayText = stripThinkingTags(fullText);
                        if (displayText) {
                            sendToRenderer(isFirst ? 'new-response' : 'update-response', displayText);
                            isFirst = false;
                        }
                    }
                } catch {}
            }
        }
        // END_BLOCK_SSE_STREAM_PARSE

        // START_BLOCK_RESPONSE_CLEANUP
        const cleanedResponse = stripThinkingTags(fullText);
        if (cleanedResponse) {
            conversationHistory.push({ role: 'assistant', content: cleanedResponse });
            saveConversationTurn(text, cleanedResponse);
        }

        const llmMs = Date.now() - llmT0;
        console.log(`[LLM] ${llmMs}ms | ${openrouterModel} | response: ${cleanedResponse.length} chars | "${cleanedResponse.substring(0, 120)}..."`);
        sendToRenderer('update-status', 'Listening...');
        // END_BLOCK_RESPONSE_CLEANUP
    } catch (error) {
        console.error(`[LLM] Error after ${Date.now() - llmT0}ms:`, error.message);
        sendToRenderer('update-status', 'OpenRouter error: ' + error.message);
    }
}

// ── Vision (screenshot analysis) ──

async function sendImageToOpenRouter(base64Data, prompt) {
    if (!openrouterApiKey) {
        return { success: false, error: 'No OpenRouter API key' };
    }

    const visionModel = openrouterVisionModel || openrouterModel || 'openai/gpt-4o-mini';

    try {
        console.log('[OpenRouter] Sending image to', visionModel);
        sendToRenderer('update-status', 'Analyzing screenshot...');

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openrouterApiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://cheatingdaddy.com',
                'X-Title': 'Cheating Daddy',
            },
            body: JSON.stringify({
                model: visionModel,
                messages: [
                    {
                        role: 'user',
                        content: [
                            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Data}` } },
                            { type: 'text', text: prompt },
                        ],
                    },
                ],
                stream: true,
                max_tokens: 2048,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[OpenRouter] Vision error:', response.status, errorText);
            return { success: false, error: `API error: ${response.status}` };
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        let isFirst = true;
        let sseBuffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            sseBuffer += decoder.decode(value, { stream: true });
            const lines = sseBuffer.split('\n');
            sseBuffer = lines.pop() || '';

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || !trimmed.startsWith('data: ')) continue;
                const data = trimmed.slice(6);
                if (data === '[DONE]') continue;
                try {
                    const json = JSON.parse(data);
                    const token = json.choices?.[0]?.delta?.content || '';
                    if (token) {
                        fullText += token;
                        sendToRenderer(isFirst ? 'new-response' : 'update-response', fullText);
                        isFirst = false;
                    }
                } catch {}
            }
        }

        console.log('[OpenRouter] Vision response completed');
        sendToRenderer('update-status', 'Listening...');
        return { success: true, text: fullText, model: visionModel };
    } catch (error) {
        console.error('[OpenRouter] Vision error:', error);
        return { success: false, error: error.message };
    }
}

// ── Public API ──

// START_CONTRACT: initializeOpenRouterSession
//   PURPOSE: Configure API keys, load STT engine, and start continuous transcription + detection timers
//   INPUTS: { apiKey: string, model: string, visionModel: string, whisperModel: string, profile: string, customPrompt: string, whisperXConfig: object }
//   OUTPUTS: { boolean — true if session started successfully }
//   SIDE_EFFECTS: Sets module state, starts setInterval timers, initializes STT, sends renderer updates
// END_CONTRACT: initializeOpenRouterSession
async function initializeOpenRouterSession(apiKey, model, visionModel, whisperModel, profile, customPrompt, whisperXConfig) {
    console.log('[OpenRouter] Initializing session:', { model, visionModel, whisperModel, profile, whisperXConfig });
    sendToRenderer('session-initializing', true);

    try {
        openrouterApiKey = apiKey;
        openrouterModel = model;
        openrouterVisionModel = visionModel;
        currentSystemPrompt = getSystemPrompt(profile, customPrompt, false);
        conversationHistory = [];

        // WhisperX Docker config
        whisperXUrl = whisperXConfig?.url || null;
        whisperXModel = whisperXConfig?.model || 'large-v3';
        whisperXLang = whisperXConfig?.language || 'ru';
        console.log('[OpenRouter] WhisperX config:', { whisperXUrl, whisperXModel, whisperXLang, raw: whisperXConfig });

        // Test API connection
        try {
            const testResp = await fetch('https://openrouter.ai/api/v1/models', {
                headers: { 'Authorization': `Bearer ${apiKey}` },
            });
            if (!testResp.ok) {
                console.error('[OpenRouter] Auth failed:', testResp.status);
                sendToRenderer('session-initializing', false);
                sendToRenderer('update-status', 'OpenRouter auth failed');
                return false;
            }
            console.log('[OpenRouter] API connection verified');
        } catch (error) {
            console.error('[OpenRouter] Connection test failed:', error.message);
            sendToRenderer('session-initializing', false);
            sendToRenderer('update-status', 'Cannot connect to OpenRouter');
            return false;
        }

        // Load STT: WhisperX Docker or local Whisper
        if (whisperXUrl) {
            console.log('[OpenRouter] Using WhisperX Docker at', whisperXUrl);
            try {
                const healthResp = await fetch(`${whisperXUrl}/health`);
                if (!healthResp.ok) throw new Error(`HTTP ${healthResp.status}`);
                console.log('[OpenRouter] WhisperX Docker is healthy');
            } catch (error) {
                console.error('[OpenRouter] WhisperX Docker not available:', error.message);
                sendToRenderer('session-initializing', false);
                sendToRenderer('update-status', 'WhisperX Docker not available at ' + whisperXUrl);
                return false;
            }
        } else {
            const pipe = await loadWhisperPipeline(whisperModel);
            if (!pipe) {
                sendToRenderer('session-initializing', false);
                return false;
            }
        }

        // Continuous transcription config
        detectorModel = whisperXConfig?.detectorModel || 'openai/gpt-4o-mini';
        windowSizeSec = whisperXConfig?.windowSize || 15;
        checkFrequencyMs = whisperXConfig?.checkFrequency || 1000;
        transcriptionIntervalMs = whisperXConfig?.transcriptionInterval || 500;
        audioLookbackSec = whisperXConfig?.audioLookback || 3;

        // Reset continuous state
        continuousBuffer = [];
        detectedQuestions = [];
        audioRingBuffer = [];
        isTranscribing = false;
        isDetecting = false;
        resampleRemainder = Buffer.alloc(0);

        initializeNewSession(profile, customPrompt);
        isActive = true;

        // Start periodic transcription and question detection timers
        if (transcriptionTimer) clearInterval(transcriptionTimer);
        transcriptionTimer = setInterval(() => transcribeAccumulatedAudio(), transcriptionIntervalMs);

        if (detectorTimer) clearInterval(detectorTimer);
        detectorTimer = setInterval(() => detectQuestion(), checkFrequencyMs);
        console.log(`[OpenRouter] Started: STT every ${transcriptionIntervalMs}ms (${audioLookbackSec}s lookback), detector=${detectorModel} every ${checkFrequencyMs}ms, window=${windowSizeSec}s`);

        sendToRenderer('session-initializing', false);
        sendToRenderer('session-info', {
            stt: whisperXUrl ? `WhisperX Docker (${whisperXModel})` : `Local (${whisperModel})`,
            sttUrl: whisperXUrl || 'local',
            lang: whisperXLang || 'auto',
            detector: detectorModel.split('/').pop(),
        });
        sendToRenderer('update-status', 'Listening...');
        console.log('[OpenRouter] Session initialized');
        return true;
    } catch (error) {
        console.error('[OpenRouter] Init error:', error);
        sendToRenderer('session-initializing', false);
        sendToRenderer('update-status', 'OpenRouter error: ' + error.message);
        return false;
    }
}

// START_CONTRACT: processOpenRouterAudio
//   PURPOSE: Receive incoming 24kHz audio chunk, downsample to 16kHz, add to ring buffer
//   INPUTS: { monoChunk24k: Buffer — raw PCM16 mono audio at 24kHz }
//   OUTPUTS: { void }
//   SIDE_EFFECTS: Appends to audioRingBuffer, trims old entries beyond lookback window
// END_CONTRACT: processOpenRouterAudio
function processOpenRouterAudio(monoChunk24k) {
    if (!isActive) return;
    const pcm16k = resample24kTo16k(monoChunk24k);
    if (pcm16k.length === 0) return;

    // Add to ring buffer with timestamp
    audioRingBuffer.push({ data: Buffer.from(pcm16k), timestamp: Date.now() });

    // Trim ring buffer to lookback window
    const cutoff = Date.now() - (audioLookbackSec * 1000);
    audioRingBuffer = audioRingBuffer.filter(c => c.timestamp >= cutoff);
}

// START_CONTRACT: closeOpenRouterSession
//   PURPOSE: Stop all timers and reset module state to idle
//   INPUTS: (none)
//   OUTPUTS: { void }
//   SIDE_EFFECTS: Clears timers, resets all buffers and flags, clears conversation history
// END_CONTRACT: closeOpenRouterSession
function closeOpenRouterSession() {
    console.log('[OpenRouter] Closing session');
    isActive = false;

    if (transcriptionTimer) {
        clearInterval(transcriptionTimer);
        transcriptionTimer = null;
    }
    if (detectorTimer) {
        clearInterval(detectorTimer);
        detectorTimer = null;
    }

    continuousBuffer = [];
    detectedQuestions = [];
    audioRingBuffer = [];
    isTranscribing = false;
    isDetecting = false;
    resampleRemainder = Buffer.alloc(0);

    conversationHistory = [];
    currentSystemPrompt = null;
}

function isOpenRouterActive() {
    return isActive;
}

async function sendOpenRouterText(text) {
    if (!isActive || !openrouterApiKey) {
        return { success: false, error: 'No active OpenRouter session' };
    }
    try {
        await sendToOpenRouter(text);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// START_CHANGE_SUMMARY
//   LAST_CHANGE: [v2.0.0 — Replaced VAD with continuous transcription + LLM question detector]
// END_CHANGE_SUMMARY

module.exports = {
    initializeOpenRouterSession,
    processOpenRouterAudio,
    closeOpenRouterSession,
    isOpenRouterActive,
    sendOpenRouterText,
    sendImageToOpenRouter,
};
