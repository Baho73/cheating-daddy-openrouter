// FILE: tests/audio-helpers.test.js
// VERSION: 1.0.0
// START_MODULE_CONTRACT
//   PURPOSE: Unit tests for audio-helpers.js pure functions
//   SCOPE: PCM conversion, WAV encoding, resampling, hallucination filter, text processing, SSE parsing
//   DEPENDS: jest, audio-helpers.js
//   LINKS: <M-AUDIO-HELPERS>
// END_MODULE_CONTRACT

const {
    pcm16ToFloat32,
    pcm16ToWavBuffer,
    resample24kTo16k,
    isHallucination,
    HALLUCINATION_PATTERNS,
    stripThinkingTags,
    buildDetectorPrompt,
    parseSSEChunk,
} = require('../src/utils/audio-helpers');

// ── pcm16ToFloat32 ──

describe('pcm16ToFloat32', () => {
    test('converts silence (zeros) to float zeros', () => {
        const pcm = Buffer.alloc(8); // 4 samples of silence
        const result = pcm16ToFloat32(pcm);
        expect(result).toBeInstanceOf(Float32Array);
        expect(result.length).toBe(4);
        expect(Array.from(result)).toEqual([0, 0, 0, 0]);
    });

    test('converts max positive sample', () => {
        const pcm = Buffer.alloc(2);
        pcm.writeInt16LE(32767, 0); // max positive
        const result = pcm16ToFloat32(pcm);
        expect(result[0]).toBeCloseTo(32767 / 32768, 4);
    });

    test('converts max negative sample', () => {
        const pcm = Buffer.alloc(2);
        pcm.writeInt16LE(-32768, 0); // max negative
        const result = pcm16ToFloat32(pcm);
        expect(result[0]).toBeCloseTo(-1.0, 4);
    });

    test('converts known waveform', () => {
        const pcm = Buffer.alloc(6); // 3 samples
        pcm.writeInt16LE(16384, 0);  // ~0.5
        pcm.writeInt16LE(0, 2);      // 0
        pcm.writeInt16LE(-16384, 4); // ~-0.5
        const result = pcm16ToFloat32(pcm);
        expect(result[0]).toBeCloseTo(0.5, 2);
        expect(result[1]).toBeCloseTo(0, 2);
        expect(result[2]).toBeCloseTo(-0.5, 2);
    });

    test('empty buffer returns empty array', () => {
        const result = pcm16ToFloat32(Buffer.alloc(0));
        expect(result.length).toBe(0);
    });
});

// ── pcm16ToWavBuffer ──

describe('pcm16ToWavBuffer', () => {
    test('creates valid WAV header for empty audio', () => {
        const pcm = Buffer.alloc(0);
        const wav = pcm16ToWavBuffer(pcm);
        expect(wav.length).toBe(44); // header only
        expect(wav.toString('ascii', 0, 4)).toBe('RIFF');
        expect(wav.toString('ascii', 8, 12)).toBe('WAVE');
        expect(wav.toString('ascii', 12, 16)).toBe('fmt ');
        expect(wav.toString('ascii', 36, 40)).toBe('data');
    });

    test('writes correct file size', () => {
        const pcm = Buffer.alloc(100);
        const wav = pcm16ToWavBuffer(pcm);
        expect(wav.length).toBe(144); // 44 header + 100 data
        expect(wav.readUInt32LE(4)).toBe(136); // 36 + 100
        expect(wav.readUInt32LE(40)).toBe(100); // data chunk size
    });

    test('writes correct sample rate', () => {
        const wav16k = pcm16ToWavBuffer(Buffer.alloc(0), 16000);
        expect(wav16k.readUInt32LE(24)).toBe(16000);

        const wav44k = pcm16ToWavBuffer(Buffer.alloc(0), 44100);
        expect(wav44k.readUInt32LE(24)).toBe(44100);
    });

    test('marks as mono PCM 16-bit', () => {
        const wav = pcm16ToWavBuffer(Buffer.alloc(0));
        expect(wav.readUInt16LE(20)).toBe(1);  // PCM format
        expect(wav.readUInt16LE(22)).toBe(1);  // mono
        expect(wav.readUInt16LE(34)).toBe(16); // 16-bit
    });

    test('preserves audio data after header', () => {
        const pcm = Buffer.from([0x01, 0x02, 0x03, 0x04]);
        const wav = pcm16ToWavBuffer(pcm);
        expect(wav.slice(44)).toEqual(pcm);
    });
});

// ── resample24kTo16k ──

describe('resample24kTo16k', () => {
    test('reduces sample count by 2/3', () => {
        // 6 samples at 24kHz → 4 samples at 16kHz
        const input = Buffer.alloc(12); // 6 samples
        for (let i = 0; i < 6; i++) input.writeInt16LE(i * 1000, i * 2);
        const { output } = resample24kTo16k(input);
        expect(output.length / 2).toBe(4); // 4 samples
    });

    test('passes through silence as silence', () => {
        const input = Buffer.alloc(12); // 6 zero samples
        const { output } = resample24kTo16k(input);
        for (let i = 0; i < output.length / 2; i++) {
            expect(output.readInt16LE(i * 2)).toBe(0);
        }
    });

    test('returns remainder for incomplete samples', () => {
        const input = Buffer.alloc(10); // 5 samples — not divisible by 3
        const { output, remainder } = resample24kTo16k(input);
        expect(output.length).toBeGreaterThan(0);
        // remainder should be small
        expect(remainder.length).toBeLessThan(input.length);
    });

    test('remainder can be fed back for continuity', () => {
        const chunk1 = Buffer.alloc(12);
        const chunk2 = Buffer.alloc(12);
        for (let i = 0; i < 6; i++) {
            chunk1.writeInt16LE(1000, i * 2);
            chunk2.writeInt16LE(2000, i * 2);
        }

        const r1 = resample24kTo16k(chunk1);
        const r2 = resample24kTo16k(chunk2, r1.remainder);

        // Both outputs should have data
        expect(r1.output.length).toBeGreaterThan(0);
        expect(r2.output.length).toBeGreaterThan(0);
    });
});

// ── isHallucination ──

describe('isHallucination', () => {
    test('filters short text (< 3 chars)', () => {
        expect(isHallucination('')).toBe(true);
        expect(isHallucination('a')).toBe(true);
        expect(isHallucination('ab')).toBe(true);
    });

    test('filters known Russian hallucinations', () => {
        expect(isHallucination('Субтитры сделал DimaTorzok')).toBe(true);
        expect(isHallucination('Продолжение следует...')).toBe(true);
        expect(isHallucination('Спасибо за просмотр!')).toBe(true);
        expect(isHallucination('Подписывайтесь на канал')).toBe(true);
        expect(isHallucination('Музыка')).toBe(true);
        expect(isHallucination('Аплодисменты')).toBe(true);
    });

    test('filters known English hallucinations', () => {
        expect(isHallucination('Thanks for watching!')).toBe(true);
        expect(isHallucination('Like and subscribe')).toBe(true);
        expect(isHallucination('Subtitles by Amara.org')).toBe(true);
        expect(isHallucination('[INAUDIBLE]')).toBe(true);
        expect(isHallucination('[Music]')).toBe(true);
    });

    test('filters dots and brackets', () => {
        expect(isHallucination('...')).toBe(true);
        expect(isHallucination('[silence]')).toBe(true);
        expect(isHallucination('www.example.com')).toBe(true);
    });

    test('allows real speech', () => {
        expect(isHallucination('Расскажите про ваш опыт работы с TCP/IP')).toBe(false);
        expect(isHallucination('What is your experience with distributed systems?')).toBe(false);
        expect(isHallucination('Какие у вас сильные стороны?')).toBe(false);
        expect(isHallucination('Tell me about yourself')).toBe(false);
    });

    test('case insensitive', () => {
        expect(isHallucination('СУБТИТРЫ')).toBe(true);
        expect(isHallucination('SUBSCRIBE')).toBe(true);
        expect(isHallucination('Music')).toBe(true);
    });
});

// ── stripThinkingTags ──

describe('stripThinkingTags', () => {
    test('removes single think block', () => {
        expect(stripThinkingTags('<think>internal reasoning</think>Answer here'))
            .toBe('Answer here');
    });

    test('removes multiline think block', () => {
        const input = '<think>\nLet me think...\nStep 1\nStep 2\n</think>\nFinal answer';
        expect(stripThinkingTags(input)).toBe('Final answer');
    });

    test('removes multiple think blocks', () => {
        const input = '<think>first</think>Hello <think>second</think>World';
        expect(stripThinkingTags(input)).toBe('Hello World');
    });

    test('returns text as-is when no think tags', () => {
        expect(stripThinkingTags('Normal response text')).toBe('Normal response text');
    });

    test('trims whitespace', () => {
        expect(stripThinkingTags('  <think>x</think>  answer  ')).toBe('answer');
    });

    test('handles empty think tags', () => {
        expect(stripThinkingTags('<think></think>result')).toBe('result');
    });

    test('handles empty string', () => {
        expect(stripThinkingTags('')).toBe('');
    });
});

// ── buildDetectorPrompt ──

describe('buildDetectorPrompt', () => {
    test('returns null for empty buffer', () => {
        expect(buildDetectorPrompt([], [], 15)).toBeNull();
    });

    test('returns null for whitespace-only buffer', () => {
        expect(buildDetectorPrompt([{ text: '   ', timestamp: Date.now() }], [], 15)).toBeNull();
    });

    test('builds prompt with transcription text', () => {
        const buffer = [
            { text: 'Hello, tell me about yourself', timestamp: Date.now() },
        ];
        const prompt = buildDetectorPrompt(buffer, [], 15);
        expect(prompt).toContain('Hello, tell me about yourself');
        expect(prompt).toContain('last 15 seconds');
        expect(prompt).toContain('(none yet)');
    });

    test('includes recent questions for dedup', () => {
        const buffer = [{ text: 'Some speech', timestamp: Date.now() }];
        const questions = ['What is React?', 'Tell me about hooks'];
        const prompt = buildDetectorPrompt(buffer, questions, 20);
        expect(prompt).toContain('1. What is React?');
        expect(prompt).toContain('2. Tell me about hooks');
        expect(prompt).toContain('last 20 seconds');
    });

    test('only includes last 3 questions', () => {
        const buffer = [{ text: 'Speech', timestamp: Date.now() }];
        const questions = ['Q1', 'Q2', 'Q3', 'Q4', 'Q5'];
        const prompt = buildDetectorPrompt(buffer, questions, 15);
        expect(prompt).not.toContain('Q1');
        expect(prompt).not.toContain('Q2');
        expect(prompt).toContain('1. Q3');
        expect(prompt).toContain('2. Q4');
        expect(prompt).toContain('3. Q5');
    });

    test('concatenates multiple buffer entries', () => {
        const buffer = [
            { text: 'First part', timestamp: Date.now() },
            { text: 'Second part', timestamp: Date.now() },
        ];
        const prompt = buildDetectorPrompt(buffer, [], 15);
        expect(prompt).toContain('First part Second part');
    });

    test('includes rules in prompt', () => {
        const buffer = [{ text: 'Hello', timestamp: Date.now() }];
        const prompt = buildDetectorPrompt(buffer, [], 15);
        expect(prompt).toContain('Return ONLY the question text');
        expect(prompt).toContain('return exactly: ---');
        expect(prompt).toContain('COMPLETE question');
        expect(prompt).toContain('preserve the original language');
    });
});

// ── parseSSEChunk ──

describe('parseSSEChunk', () => {
    test('parses complete SSE line', () => {
        const chunk = 'data: {"choices":[{"delta":{"content":"Hello"}}]}\n';
        const { tokens, remaining } = parseSSEChunk(chunk, '');
        expect(tokens).toEqual(['Hello']);
        expect(remaining).toBe('');
    });

    test('handles multiple lines in one chunk', () => {
        const chunk = 'data: {"choices":[{"delta":{"content":"Hello"}}]}\ndata: {"choices":[{"delta":{"content":" World"}}]}\n';
        const { tokens, remaining } = parseSSEChunk(chunk, '');
        expect(tokens).toEqual(['Hello', ' World']);
    });

    test('buffers incomplete lines', () => {
        const chunk1 = 'data: {"choices":[{"delta":{"con';
        const r1 = parseSSEChunk(chunk1, '');
        expect(r1.tokens).toEqual([]);
        expect(r1.remaining).toBe('data: {"choices":[{"delta":{"con');

        const chunk2 = 'tent":"Hello"}}]}\n';
        const r2 = parseSSEChunk(chunk2, r1.remaining);
        expect(r2.tokens).toEqual(['Hello']);
        expect(r2.remaining).toBe('');
    });

    test('skips [DONE] marker', () => {
        const chunk = 'data: [DONE]\n';
        const { tokens } = parseSSEChunk(chunk, '');
        expect(tokens).toEqual([]);
    });

    test('skips empty lines', () => {
        const chunk = '\n\ndata: {"choices":[{"delta":{"content":"OK"}}]}\n\n';
        const { tokens } = parseSSEChunk(chunk, '');
        expect(tokens).toEqual(['OK']);
    });

    test('handles chunk with no content token', () => {
        const chunk = 'data: {"choices":[{"delta":{}}]}\n';
        const { tokens } = parseSSEChunk(chunk, '');
        expect(tokens).toEqual([]);
    });

    test('handles malformed JSON gracefully', () => {
        const chunk = 'data: {broken json}\n';
        const { tokens } = parseSSEChunk(chunk, '');
        expect(tokens).toEqual([]);
    });
});
