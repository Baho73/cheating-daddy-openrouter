// FILE: src/utils/audio-helpers.js
// VERSION: 1.0.0
// START_MODULE_CONTRACT
//   PURPOSE: Pure utility functions for audio processing, hallucination filtering, and text processing
//   SCOPE: PCM conversion, WAV encoding, resampling, hallucination detection, SSE parsing, tag stripping
//   DEPENDS: (none — pure functions, no side effects)
//   LINKS: <M-AUDIO-HELPERS>
// END_MODULE_CONTRACT
//
// START_MODULE_MAP
//   pcm16ToFloat32 — Convert PCM16 buffer to Float32Array normalized to [-1, 1]
//   pcm16ToWavBuffer — Encode PCM16 buffer as WAV file with proper headers
//   resample24kTo16k — Downsample 24kHz PCM16 to 16kHz with linear interpolation
//   isHallucination — Check if transcription matches known Whisper hallucination patterns
//   HALLUCINATION_PATTERNS — Array of regex patterns for hallucination detection
//   stripThinkingTags — Remove <think>...</think> tags from LLM responses
//   buildDetectorPrompt — Assemble question detection prompt from text buffer and known questions
//   parseSSEChunk — Parse a chunk of SSE data, handling line buffering
// END_MODULE_MAP

// ── PCM Conversion ──

function pcm16ToFloat32(pcm16Buffer) {
    const samples = pcm16Buffer.length / 2;
    const float32 = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
        float32[i] = pcm16Buffer.readInt16LE(i * 2) / 32768;
    }
    return float32;
}

function pcm16ToWavBuffer(pcm16Buffer, sampleRate = 16000) {
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

// ── Resampling ──

function resample24kTo16k(inputBuffer, remainder = Buffer.alloc(0)) {
    const combined = Buffer.concat([remainder, inputBuffer]);
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
    const newRemainder = remainderStart < combined.length ? combined.slice(remainderStart) : Buffer.alloc(0);
    return { output: outputBuffer, remainder: newRemainder };
}

// ── Hallucination Filter ──

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

// ── Text Processing ──

function stripThinkingTags(text) {
    return text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
}

function buildDetectorPrompt(continuousBuffer, detectedQuestions, windowSizeSec) {
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

// ── SSE Parsing ──

function parseSSEChunk(chunk, buffer) {
    buffer += chunk;
    const lines = buffer.split('\n');
    const remaining = lines.pop() || '';
    const tokens = [];

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        const data = trimmed.slice(6);
        if (data === '[DONE]') continue;
        try {
            const json = JSON.parse(data);
            const token = json.choices?.[0]?.delta?.content || '';
            if (token) tokens.push(token);
        } catch {
            // Incomplete JSON — will be handled in next chunk
        }
    }

    return { tokens, remaining };
}

// START_CHANGE_SUMMARY
//   LAST_CHANGE: [v1.0.0 — Extracted pure functions from openrouter.js for testability]
// END_CHANGE_SUMMARY

module.exports = {
    pcm16ToFloat32,
    pcm16ToWavBuffer,
    resample24kTo16k,
    isHallucination,
    HALLUCINATION_PATTERNS,
    stripThinkingTags,
    buildDetectorPrompt,
    parseSSEChunk,
};
