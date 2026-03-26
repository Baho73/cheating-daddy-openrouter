const { BrowserWindow } = require('electron');
const { getSystemPrompt } = require('./prompts');
const { sendToRenderer, initializeNewSession, saveConversationTurn } = require('./gemini');

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

function resample24kTo16k(inputBuffer) {
    const combined = Buffer.concat([resampleRemainder, inputBuffer]);
    const inputSamples = Math.floor(combined.length / 2);
    const outputSamples = Math.floor((inputSamples * 2) / 3);
    const outputBuffer = Buffer.alloc(outputSamples * 2);

    for (let i = 0; i < outputSamples; i++) {
        const srcPos = (i * 3) / 2;
        const srcIndex = Math.floor(srcPos);
        const frac = srcPos - srcIndex;
        const s0 = combined.readInt16LE(srcIndex * 2);
        const s1 = srcIndex + 1 < inputSamples ? combined.readInt16LE((srcIndex + 1) * 2) : s0;
        const interpolated = Math.round(s0 + frac * (s1 - s0));
        outputBuffer.writeInt16LE(Math.max(-32768, Math.min(32767, interpolated)), i * 2);
    }

    const consumedInputSamples = Math.ceil((outputSamples * 3) / 2);
    const remainderStart = consumedInputSamples * 2;
    resampleRemainder = remainderStart < combined.length ? combined.slice(remainderStart) : Buffer.alloc(0);
    return outputBuffer;
}

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

function pcm16ToFloat32(pcm16Buffer) {
    const samples = pcm16Buffer.length / 2;
    const float32 = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
        float32[i] = pcm16Buffer.readInt16LE(i * 2) / 32768;
    }
    return float32;
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

function pcm16ToWavBuffer(pcm16Buffer, sampleRate = 16000) {
    const numSamples = pcm16Buffer.length / 2;
    const header = Buffer.alloc(44);
    header.write('RIFF', 0);
    header.writeUInt32LE(36 + pcm16Buffer.length, 4);
    header.write('WAVE', 8);
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20); // PCM
    header.writeUInt16LE(1, 22); // mono
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(sampleRate * 2, 28);
    header.writeUInt16LE(2, 32);
    header.writeUInt16LE(16, 34);
    header.write('data', 36);
    header.writeUInt32LE(pcm16Buffer.length, 40);
    return Buffer.concat([header, pcm16Buffer]);
}

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

// Whisper hallucination filter — common patterns when no real speech
const HALLUCINATION_PATTERNS = [
    /субтитры/i, /продолжение следу/i, /спасибо за просмотр/i, /подпис/i,
    /subtitles/i, /subscribe/i, /thanks for watching/i, /like and subscribe/i,
    /\bDimaTorzok\b/i, /\bAmara\.org\b/i, /\bwww\./i,
    /^\.+$/, /^\[.*\]$/, /^INAUDIBLE$/i,
    /продолжение следует/i, /музыка/i, /аплодисменты/i,
    /music/i, /applause/i, /\blaughter\b/i,
];

function isHallucination(text) {
    const t = text.trim();
    if (t.length < 3) return true;
    return HALLUCINATION_PATTERNS.some(p => p.test(t));
}

async function transcribeAccumulatedAudio() {
    if (isTranscribing || audioRingBuffer.length === 0) return;
    isTranscribing = true;

    const t0 = Date.now();
    try {
        // Grab entire ring buffer (last N seconds of audio)
        const audioData = Buffer.concat(audioRingBuffer.map(c => c.data));
        const audioDurationSec = (audioData.length / 2 / 16000).toFixed(1);

        if (audioData.length < 16000) return;

        const text = whisperXUrl
            ? await transcribeWithWhisperX(audioData)
            : await transcribeAudio(audioData);

        const sttMs = Date.now() - t0;

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

function buildDetectorPrompt() {
    const fullText = continuousBuffer.map(e => e.text).join(' ');
    if (!fullText.trim()) return null;

    const recentQuestions = detectedQuestions.slice(-3);
    const recentList = recentQuestions.length > 0
        ? recentQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')
        : '(none yet)';

    return `You are a question detector for a live interview/meeting. Below is the last ${windowSizeSec} seconds of transcribed speech.

Your task: identify if there is a NEW question being asked to the candidate/participant.

Rules:
- Return ONLY the question text, nothing else
- If there is no new question, return exactly: ---
- If the question is the same or very similar to a recently detected one, return: ---
- Extract the COMPLETE question, not fragments
- The question may be in any language — preserve the original language

Recently detected questions (do NOT repeat these):
${recentList}

Transcription:
"${fullText}"`;
}

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
    } catch (error) {
        console.error('[OpenRouter] Detector error:', error);
    } finally {
        isDetecting = false;
    }
}

// ── OpenRouter Chat API ──

function stripThinkingTags(text) {
    return text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
}

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

        const cleanedResponse = stripThinkingTags(fullText);
        if (cleanedResponse) {
            conversationHistory.push({ role: 'assistant', content: cleanedResponse });
            saveConversationTurn(text, cleanedResponse);
        }

        const llmMs = Date.now() - llmT0;
        console.log(`[LLM] ${llmMs}ms | ${openrouterModel} | response: ${cleanedResponse.length} chars | "${cleanedResponse.substring(0, 120)}..."`);
        sendToRenderer('update-status', 'Listening...');
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

module.exports = {
    initializeOpenRouterSession,
    processOpenRouterAudio,
    closeOpenRouterSession,
    isOpenRouterActive,
    sendOpenRouterText,
    sendImageToOpenRouter,
};
