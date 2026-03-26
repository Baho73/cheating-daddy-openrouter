import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';

export class MainView extends LitElement {
    static styles = css`
        * {
            font-family: var(--font);
            cursor: default;
            user-select: none;
            box-sizing: border-box;
        }

        :host {
            height: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: var(--space-xl) var(--space-lg);
        }

        .form-wrapper {
            width: 100%;
            max-width: 420px;
            display: flex;
            flex-direction: column;
            gap: var(--space-md);
        }

        .page-title {
            font-size: var(--font-size-xl);
            font-weight: var(--font-weight-semibold);
            color: var(--text-primary);
            margin-bottom: var(--space-xs);
        }

        .page-title .mode-suffix {
            opacity: 0.5;
        }

        .page-subtitle {
            font-size: var(--font-size-sm);
            color: var(--text-muted);
            margin-bottom: var(--space-md);
        }

        /* ── Cloud promo card ── */

        .cloud-promo {
            position: relative;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            gap: 10px;
            padding: 14px 16px;
            border-radius: var(--radius-md);
            border: 1px solid rgba(59, 130, 246, 0.45);
            background: linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, rgba(139, 92, 246, 0.09) 100%);
            cursor: pointer;
            transition: border-color 0.2s, background 0.2s;
        }

        .cloud-promo:hover {
            border-color: rgba(59, 130, 246, 0.65);
            background: linear-gradient(135deg, rgba(59, 130, 246, 0.16) 0%, rgba(139, 92, 246, 0.12) 100%);
            box-shadow: 0 0 20px rgba(59, 130, 246, 0.15), 0 0 40px rgba(139, 92, 246, 0.08);
        }

        .cloud-promo-glow {
            position: absolute;
            top: -40%;
            right: -20%;
            width: 120px;
            height: 120px;
            background: radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%);
            pointer-events: none;
        }

        .cloud-promo-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .cloud-promo-title {
            font-size: var(--font-size-sm);
            font-weight: var(--font-weight-semibold);
            color: var(--text-primary);
        }

        .cloud-promo-arrow {
            color: var(--accent);
            font-size: 16px;
            transition: transform 0.2s;
        }

        .cloud-promo:hover .cloud-promo-arrow {
            transform: translateX(2px);
        }

        .cloud-promo-desc {
            font-size: var(--font-size-xs);
            color: var(--text-secondary);
            line-height: var(--line-height);
        }

        /* ── Form controls ── */

        .form-group {
            display: flex;
            flex-direction: column;
            gap: var(--space-xs);
        }

        .form-label {
            font-size: var(--font-size-xs);
            font-weight: var(--font-weight-medium);
            color: var(--text-secondary);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        input, select, textarea {
            background: var(--bg-elevated);
            color: var(--text-primary);
            border: 1px solid var(--border);
            padding: 10px 12px;
            width: 100%;
            border-radius: var(--radius-sm);
            font-size: var(--font-size-sm);
            font-family: var(--font);
            transition: border-color var(--transition), box-shadow var(--transition);
        }

        input:hover:not(:focus), select:hover:not(:focus), textarea:hover:not(:focus) {
            border-color: var(--text-muted);
        }

        input:focus, select:focus, textarea:focus {
            outline: none;
            border-color: var(--accent);
            box-shadow: 0 0 0 1px var(--accent);
        }

        input::placeholder, textarea::placeholder {
            color: var(--text-muted);
        }

        input.error {
            border-color: var(--danger, #EF4444);
        }

        select {
            cursor: pointer;
            appearance: none;
            background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23999' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
            background-position: right 8px center;
            background-repeat: no-repeat;
            background-size: 14px;
            padding-right: 28px;
        }

        textarea {
            resize: vertical;
            min-height: 80px;
            line-height: var(--line-height);
        }

        .form-hint {
            font-size: var(--font-size-xs);
            color: var(--text-muted);
        }

        .form-hint a, .form-hint span.link {
            color: var(--accent);
            text-decoration: none;
            cursor: pointer;
        }

        .form-hint span.link:hover {
            text-decoration: underline;
        }

        .model-label-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .diag-section {
            border: 1px solid var(--border);
            border-radius: var(--radius-sm);
            padding: var(--space-sm);
            margin-top: var(--space-xs);
        }

        .diag-title {
            font-size: var(--font-size-sm);
            font-weight: var(--font-weight-semibold);
            color: var(--text-primary);
            margin-bottom: var(--space-xs);
        }

        .diag-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 4px 0;
            font-size: var(--font-size-xs);
            border-bottom: 1px solid var(--border);
        }

        .diag-row:last-child {
            border-bottom: none;
        }

        .diag-label {
            color: var(--text-secondary);
        }

        .diag-value {
            font-family: var(--font-mono);
            font-size: 11px;
        }

        .diag-ok { color: #4caf50; }
        .diag-warn { color: #ff9800; }
        .diag-err { color: #f44336; }
        .diag-loading { color: var(--text-muted); }

        .diag-btn {
            background: var(--bg-elevated);
            border: 1px solid var(--border);
            color: var(--text-secondary);
            font-size: var(--font-size-xs);
            padding: 4px 10px;
            border-radius: var(--radius-sm);
            cursor: pointer;
            transition: all var(--transition);
        }

        .diag-btn:hover {
            color: var(--text-primary);
            border-color: var(--text-secondary);
        }

        .diag-btn:disabled {
            opacity: 0.5;
            cursor: wait;
        }

        .refresh-btn {
            background: none;
            border: 1px solid var(--border);
            color: var(--text-secondary);
            font-size: var(--font-size-xs);
            padding: 2px 8px;
            border-radius: var(--radius-sm);
            cursor: pointer;
            transition: all var(--transition);
            display: inline-flex;
            align-items: center;
            gap: 4px;
        }

        .refresh-btn:hover {
            color: var(--text-primary);
            border-color: var(--text-secondary);
        }

        .refresh-btn.loading {
            opacity: 0.5;
            cursor: wait;
        }

        .whisper-label-row {
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .whisper-spinner {
            width: 12px;
            height: 12px;
            border: 2px solid var(--border);
            border-top-color: var(--accent);
            border-radius: 50%;
            animation: whisper-spin 0.8s linear infinite;
        }

        @keyframes whisper-spin {
            to { transform: rotate(360deg); }
        }

        /* ── Start button ── */

        .start-button {
            position: relative;
            overflow: hidden;
            background: #e8e8e8;
            color: #111111;
            border: none;
            padding: 12px var(--space-md);
            border-radius: var(--radius-sm);
            font-size: var(--font-size-base);
            font-weight: var(--font-weight-semibold);
            cursor: pointer;
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: var(--space-sm);
        }

        .start-button canvas.btn-aurora {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            z-index: 0;
        }

        .start-button canvas.btn-dither {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            z-index: 1;
            opacity: 0.1;
            mix-blend-mode: overlay;
            pointer-events: none;
            image-rendering: pixelated;
        }

        .start-button .btn-label {
            position: relative;
            z-index: 2;
            display: flex;
            align-items: center;
            gap: var(--space-sm);
        }

        .start-button:hover {
            opacity: 0.9;
        }

        .start-button.disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .start-button.disabled:hover {
            opacity: 0.5;
        }

        .shortcut-hint {
            display: inline-flex;
            align-items: center;
            gap: 2px;
            opacity: 0.5;
            font-family: var(--font-mono);
        }

        /* ── Divider ── */

        .divider {
            display: flex;
            align-items: center;
            gap: var(--space-md);
            margin: var(--space-sm) 0;
        }

        .divider-line {
            flex: 1;
            height: 1px;
            background: var(--border);
        }

        .divider-text {
            font-size: var(--font-size-xs);
            color: var(--text-muted);
            text-transform: lowercase;
        }

        /* ── Mode switch links ── */

        .mode-links {
            display: flex;
            justify-content: center;
            gap: var(--space-lg);
        }

        .mode-link {
            font-size: var(--font-size-sm);
            color: var(--text-secondary);
            cursor: pointer;
            background: none;
            border: none;
            padding: 0;
            transition: color var(--transition);
        }

        .mode-link:hover {
            color: var(--text-primary);
        }

        /* ── Mode option cards ── */

        .mode-cards {
            display: flex;
            gap: var(--space-sm);
        }

        .mode-card {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 4px;
            padding: 12px 14px;
            border-radius: var(--radius-md);
            border: 1px solid var(--border);
            background: var(--bg-elevated);
            cursor: pointer;
            transition: border-color 0.2s, background 0.2s;
        }

        .mode-card:hover {
            border-color: var(--text-muted);
            background: var(--bg-hover);
        }

        .mode-card-title {
            font-size: var(--font-size-sm);
            font-weight: var(--font-weight-semibold);
            color: var(--text-primary);
        }

        .mode-card-desc {
            font-size: var(--font-size-xs);
            color: var(--text-muted);
            line-height: var(--line-height);
        }

        /* ── Title row with help ── */

        .title-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: var(--space-xs);
        }

        .title-row .page-title {
            margin-bottom: 0;
        }

        .help-btn {
            background: none;
            border: none;
            color: var(--text-muted);
            cursor: pointer;
            padding: 4px;
            border-radius: var(--radius-sm);
            transition: color 0.2s;
            display: flex;
            align-items: center;
        }

        .help-btn:hover {
            color: var(--text-secondary);
        }

        .help-btn * {
            pointer-events: none;
        }

        /* ── Help content ── */

        .help-content {
            display: flex;
            flex-direction: column;
            gap: var(--space-md);
            max-height: 500px;
            overflow-y: auto;
        }

        .help-section {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        .help-section-title {
            font-size: var(--font-size-xs);
            font-weight: var(--font-weight-semibold);
            color: var(--text-primary);
        }

        .help-section-text {
            font-size: var(--font-size-xs);
            color: var(--text-secondary);
            line-height: var(--line-height);
        }

        .help-code {
            font-family: var(--font-mono);
            font-size: 11px;
            background: var(--bg-hover);
            padding: 6px 8px;
            border-radius: var(--radius-sm);
            color: var(--text-primary);
            display: block;
        }

        .help-link {
            color: var(--accent);
            cursor: pointer;
            text-decoration: none;
        }

        .help-link:hover {
            text-decoration: underline;
        }

        .help-models {
            display: flex;
            flex-direction: column;
            gap: 2px;
        }

        .help-model {
            font-size: var(--font-size-xs);
            color: var(--text-secondary);
            display: flex;
            justify-content: space-between;
        }

        .help-model-name {
            font-family: var(--font-mono);
            font-size: 11px;
            color: var(--text-primary);
        }

        .help-divider {
            border: none;
            border-top: 1px solid var(--border);
            margin: 0;
        }

        .help-cloud-btn {
            background: #e8e8e8;
            color: #111111;
            border: none;
            padding: 10px var(--space-md);
            border-radius: var(--radius-sm);
            font-size: var(--font-size-sm);
            font-family: var(--font);
            font-weight: var(--font-weight-semibold);
            cursor: pointer;
            width: 100%;
            transition: opacity 0.15s;
        }

        .help-cloud-btn:hover {
            opacity: 0.9;
        }

        .help-warn {
            font-size: var(--font-size-xs);
            color: var(--warning);
            line-height: var(--line-height);
        }
    `;

    static properties = {
        onStart: { type: Function },
        onExternalLink: { type: Function },
        selectedProfile: { type: String },
        onProfileChange: { type: Function },
        isInitializing: { type: Boolean },
        whisperDownloading: { type: Boolean },
        // Internal state
        _mode: { state: true },
        _token: { state: true },
        _geminiKey: { state: true },
        _groqKey: { state: true },
        _openaiKey: { state: true },
        _tokenError: { state: true },
        _keyError: { state: true },
        // Local AI state
        _ollamaHost: { state: true },
        _ollamaModel: { state: true },
        _whisperModel: { state: true },
        _showLocalHelp: { state: true },
        // OpenRouter state
        _openrouterKey: { state: true },
        _openrouterModel: { state: true },
        _openrouterVisionModel: { state: true },
        _openrouterWhisperModel: { state: true },
        _openrouterModelsList: { state: true },
        _openrouterModelsLoading: { state: true },
        // Diagnostics
        _diagRunning: { state: true },
        _diagResults: { state: true },
        // WhisperX Docker
        _whisperXEnabled: { state: true },
        _whisperXUrl: { state: true },
        _whisperXModel: { state: true },
        _whisperXLang: { state: true },
        // Question Detector
        _detectorModel: { state: true },
        _windowSize: { state: true },
        _checkFrequency: { state: true },
        _transcriptionInterval: { state: true },
    };

    constructor() {
        super();
        this.onStart = () => {};
        this.onExternalLink = () => {};
        this.selectedProfile = 'interview';
        this.onProfileChange = () => {};
        this.isInitializing = false;
        this.whisperDownloading = false;

        this._mode = 'cloud';
        this._token = '';
        this._geminiKey = '';
        this._groqKey = '';
        this._openaiKey = '';
        this._tokenError = false;
        this._keyError = false;
        this._showLocalHelp = false;
        this._ollamaHost = 'http://127.0.0.1:11434';
        this._ollamaModel = 'llama3.1';
        this._whisperModel = 'Xenova/whisper-small';
        this._openrouterKey = '';
        this._openrouterModel = 'openai/gpt-4o-mini';
        this._openrouterVisionModel = 'openai/gpt-4o-mini';
        this._openrouterWhisperModel = 'Xenova/whisper-tiny';
        this._openrouterModelsList = null;
        this._openrouterModelsLoading = false;
        this._diagRunning = false;
        this._diagResults = {};
        this._whisperXEnabled = true;
        this._whisperXUrl = 'http://localhost:8000';
        this._whisperXModel = 'large-v3';
        this._whisperXLang = 'ru';
        this._detectorModel = 'openai/gpt-4o-mini';
        this._windowSize = 15;
        this._checkFrequency = 1000;
        this._transcriptionInterval = 1000;

        this._animId = null;
        this._time = 0;
        this._mouseX = -1;
        this._mouseY = -1;

        this.boundKeydownHandler = this._handleKeydown.bind(this);
        this._loadFromStorage();
    }

    async _loadFromStorage() {
        try {
            const [prefs, creds] = await Promise.all([
                cheatingDaddy.storage.getPreferences(),
                cheatingDaddy.storage.getCredentials().catch(() => ({})),
            ]);

            this._mode = prefs.providerMode || 'cloud';

            // Load keys
            this._token = creds.cloudToken || '';
            this._geminiKey = await cheatingDaddy.storage.getApiKey().catch(() => '') || '';
            this._groqKey = await cheatingDaddy.storage.getGroqApiKey().catch(() => '') || '';
            this._openaiKey = creds.openaiKey || '';

            // Load local AI settings
            this._ollamaHost = prefs.ollamaHost || 'http://127.0.0.1:11434';
            this._ollamaModel = prefs.ollamaModel || 'llama3.1';
            this._whisperModel = prefs.whisperModel || 'Xenova/whisper-small';

            // Load OpenRouter settings
            this._openrouterKey = await cheatingDaddy.storage.getOpenRouterApiKey().catch(() => '') || '';
            this._openrouterModel = prefs.openrouterModel || 'openai/gpt-4o-mini';
            this._openrouterVisionModel = prefs.openrouterVisionModel || 'openai/gpt-4o-mini';
            this._openrouterWhisperModel = prefs.openrouterWhisperModel || 'Xenova/whisper-tiny';

            // Load WhisperX Docker settings
            this._whisperXEnabled = prefs.whisperXEnabled !== undefined ? prefs.whisperXEnabled : true;
            this._whisperXUrl = prefs.whisperXUrl || 'http://localhost:8000';
            this._whisperXModel = prefs.whisperXModel || 'large-v3';
            this._whisperXLang = prefs.whisperXLang || 'ru';

            // Load Question Detector settings
            this._detectorModel = prefs.detectorModel || 'openai/gpt-4o-mini';
            this._windowSize = prefs.windowSize || 15;
            this._checkFrequency = prefs.checkFrequency || 1000;
            this._transcriptionInterval = prefs.transcriptionInterval || 1000;

            // Load cached OpenRouter models list
            const cachedModels = prefs.openrouterCachedModels;
            if (cachedModels && cachedModels.length > 0) {
                this._openrouterModelsList = cachedModels;
            }

            this.requestUpdate();
        } catch (e) {
            console.error('Error loading MainView storage:', e);
        }
    }

    connectedCallback() {
        super.connectedCallback();
        document.addEventListener('keydown', this.boundKeydownHandler);
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        document.removeEventListener('keydown', this.boundKeydownHandler);
        if (this._animId) cancelAnimationFrame(this._animId);
    }

    updated(changedProperties) {
        super.updated(changedProperties);
        if (changedProperties.has('_mode')) {
            // Stop old animation when switching modes
            if (this._animId) {
                cancelAnimationFrame(this._animId);
                this._animId = null;
            }
            // Only start aurora for cloud mode
            if (this._mode === 'cloud') {
                this._initButtonAurora();
            }
        }
        // Initial boot — no _mode change yet but need to start
        if (!this._animId && this._mode === 'cloud') {
            this._initButtonAurora();
        }
    }

    _initButtonAurora() {
        const btn = this.shadowRoot.querySelector('.start-button');
        const aurora = this.shadowRoot.querySelector('canvas.btn-aurora');
        const dither = this.shadowRoot.querySelector('canvas.btn-dither');
        if (!aurora || !dither || !btn) return;

        // Mouse tracking
        this._mouseX = -1;
        this._mouseY = -1;
        btn.addEventListener('mousemove', (e) => {
            const rect = btn.getBoundingClientRect();
            this._mouseX = (e.clientX - rect.left) / rect.width;
            this._mouseY = (e.clientY - rect.top) / rect.height;
        });
        btn.addEventListener('mouseleave', () => {
            this._mouseX = -1;
            this._mouseY = -1;
        });

        // Dither
        const blockSize = 8;
        const cols = Math.ceil(aurora.offsetWidth / blockSize);
        const rows = Math.ceil(aurora.offsetHeight / blockSize);
        dither.width = cols;
        dither.height = rows;
        const dCtx = dither.getContext('2d');
        const img = dCtx.createImageData(cols, rows);
        for (let i = 0; i < img.data.length; i += 4) {
            const v = Math.random() > 0.5 ? 255 : 0;
            img.data[i] = v; img.data[i+1] = v; img.data[i+2] = v; img.data[i+3] = 255;
        }
        dCtx.putImageData(img, 0, 0);

        // Aurora
        const ctx = aurora.getContext('2d');
        const scale = 0.4;
        aurora.width = Math.floor(aurora.offsetWidth * scale);
        aurora.height = Math.floor(aurora.offsetHeight * scale);

        const blobs = [
            { color: [120, 160, 230], x: 0.1, y: 0.3, vx: 0.25, vy: 0.2, phase: 0 },
            { color: [150, 120, 220], x: 0.8, y: 0.5, vx: -0.2, vy: 0.25, phase: 1.5 },
            { color: [200, 140, 210], x: 0.5, y: 0.6, vx: 0.18, vy: -0.22, phase: 3.0 },
            { color: [100, 190, 190], x: 0.3, y: 0.7, vx: 0.3, vy: 0.15, phase: 4.5 },
            { color: [220, 170, 130], x: 0.7, y: 0.4, vx: -0.22, vy: -0.25, phase: 6.0 },
        ];

        const draw = () => {
            this._time += 0.008;
            const w = aurora.width;
            const h = aurora.height;
            const maxDim = Math.max(w, h);

            ctx.fillStyle = '#f0f0f0';
            ctx.fillRect(0, 0, w, h);

            const hovering = this._mouseX >= 0;

            for (const blob of blobs) {
                const t = this._time;
                const cx = (blob.x + Math.sin(t * blob.vx + blob.phase) * 0.4) * w;
                const cy = (blob.y + Math.cos(t * blob.vy + blob.phase * 0.7) * 0.4) * h;
                const r = maxDim * 0.45;

                let boost = 1;
                if (hovering) {
                    const dx = cx / w - this._mouseX;
                    const dy = cy / h - this._mouseY;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    boost = 1 + 2.5 * Math.max(0, 1 - dist / 0.6);
                }

                const a0 = Math.min(1, 0.18 * boost);
                const a1 = Math.min(1, 0.08 * boost);
                const a2 = Math.min(1, 0.02 * boost);

                const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
                grad.addColorStop(0, `rgba(${blob.color[0]}, ${blob.color[1]}, ${blob.color[2]}, ${a0})`);
                grad.addColorStop(0.3, `rgba(${blob.color[0]}, ${blob.color[1]}, ${blob.color[2]}, ${a1})`);
                grad.addColorStop(0.6, `rgba(${blob.color[0]}, ${blob.color[1]}, ${blob.color[2]}, ${a2})`);
                grad.addColorStop(1, `rgba(${blob.color[0]}, ${blob.color[1]}, ${blob.color[2]}, 0)`);
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, w, h);
            }

            this._animId = requestAnimationFrame(draw);
        };

        draw();
    }

    _handleKeydown(e) {
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        if ((isMac ? e.metaKey : e.ctrlKey) && e.key === 'Enter') {
            e.preventDefault();
            this._handleStart();
        }
    }

    // ── Persistence ──

    async _saveMode(mode) {
        this._mode = mode;
        this._tokenError = false;
        this._keyError = false;
        await cheatingDaddy.storage.updatePreference('providerMode', mode);
        this.requestUpdate();
    }

    async _saveToken(val) {
        this._token = val;
        this._tokenError = false;
        try {
            const creds = await cheatingDaddy.storage.getCredentials().catch(() => ({}));
            await cheatingDaddy.storage.setCredentials({ ...creds, cloudToken: val });
        } catch (e) {}
        this.requestUpdate();
    }

    async _saveGeminiKey(val) {
        this._geminiKey = val;
        this._keyError = false;
        await cheatingDaddy.storage.setApiKey(val);
        this.requestUpdate();
    }

    async _saveGroqKey(val) {
        this._groqKey = val;
        await cheatingDaddy.storage.setGroqApiKey(val);
        this.requestUpdate();
    }

    async _saveOpenaiKey(val) {
        this._openaiKey = val;
        try {
            const creds = await cheatingDaddy.storage.getCredentials().catch(() => ({}));
            await cheatingDaddy.storage.setCredentials({ ...creds, openaiKey: val });
        } catch (e) {}
        this.requestUpdate();
    }

    async _saveOllamaHost(val) {
        this._ollamaHost = val;
        await cheatingDaddy.storage.updatePreference('ollamaHost', val);
        this.requestUpdate();
    }

    async _saveOllamaModel(val) {
        this._ollamaModel = val;
        await cheatingDaddy.storage.updatePreference('ollamaModel', val);
        this.requestUpdate();
    }

    async _saveWhisperModel(val) {
        this._whisperModel = val;
        await cheatingDaddy.storage.updatePreference('whisperModel', val);
        this.requestUpdate();
    }

    async _saveOpenRouterKey(val) {
        this._openrouterKey = val;
        this._keyError = false;
        await cheatingDaddy.storage.setOpenRouterApiKey(val);
        this.requestUpdate();
    }

    async _saveOpenRouterModel(val) {
        this._openrouterModel = val;
        await cheatingDaddy.storage.updatePreference('openrouterModel', val);
        this.requestUpdate();
    }

    async _saveOpenRouterVisionModel(val) {
        this._openrouterVisionModel = val;
        await cheatingDaddy.storage.updatePreference('openrouterVisionModel', val);
        this.requestUpdate();
    }

    async _saveOpenRouterWhisperModel(val) {
        this._openrouterWhisperModel = val;
        await cheatingDaddy.storage.updatePreference('openrouterWhisperModel', val);
        this.requestUpdate();
    }

    async _saveWhisperXEnabled(val) {
        this._whisperXEnabled = val;
        await cheatingDaddy.storage.updatePreference('whisperXEnabled', val);
        this.requestUpdate();
    }

    async _saveWhisperXUrl(val) {
        this._whisperXUrl = val;
        await cheatingDaddy.storage.updatePreference('whisperXUrl', val);
        this.requestUpdate();
    }

    async _saveWhisperXModel(val) {
        this._whisperXModel = val;
        await cheatingDaddy.storage.updatePreference('whisperXModel', val);
        this.requestUpdate();
    }

    async _saveWhisperXLang(val) {
        this._whisperXLang = val;
        await cheatingDaddy.storage.updatePreference('whisperXLang', val);
        this.requestUpdate();
    }

    async _saveDetectorModel(val) {
        this._detectorModel = val;
        await cheatingDaddy.storage.updatePreference('detectorModel', val);
        this.requestUpdate();
    }
    async _saveWindowSize(val) {
        this._windowSize = parseInt(val) || 15;
        await cheatingDaddy.storage.updatePreference('windowSize', this._windowSize);
        this.requestUpdate();
    }
    async _saveCheckFrequency(val) {
        this._checkFrequency = parseInt(val) || 1000;
        await cheatingDaddy.storage.updatePreference('checkFrequency', this._checkFrequency);
        this.requestUpdate();
    }
    async _saveTranscriptionInterval(val) {
        this._transcriptionInterval = parseInt(val) || 1000;
        await cheatingDaddy.storage.updatePreference('transcriptionInterval', this._transcriptionInterval);
        this.requestUpdate();
    }

    async _fetchOpenRouterModels() {
        if (this._openrouterModelsLoading) return;
        this._openrouterModelsLoading = true;
        this.requestUpdate();

        try {
            const models = await cheatingDaddy.fetchOpenRouterModels();
            if (models && models.length > 0) {
                this._openrouterModelsList = models;
                await cheatingDaddy.storage.updatePreference('openrouterCachedModels', models);
            }
        } catch (e) {
            console.error('Failed to fetch OpenRouter models:', e);
        } finally {
            this._openrouterModelsLoading = false;
            this.requestUpdate();
        }
    }

    // ── Diagnostics ──

    async _runDiagnostics() {
        if (this._diagRunning) return;
        this._diagRunning = true;
        this._diagResults = {};
        this.requestUpdate();

        // 1. Test WhisperX Docker
        if (this._whisperXEnabled && this._whisperXUrl) {
            await this._testWhisperXDocker();
        }

        // 2. Test Chat Model speed
        if (this._openrouterKey && this._openrouterModel) {
            await this._testChatModel();
        }

        // 3. Test Vision Model
        if (this._openrouterKey && this._openrouterVisionModel) {
            await this._testVisionModel();
        }

        this._diagRunning = false;
        this.requestUpdate();
    }

    _setDiag(key, value) {
        this._diagResults = { ...this._diagResults, [key]: value };
        this.requestUpdate();
    }

    async _testWhisperXDocker() {
        this._setDiag('whisperx', { status: 'loading', text: 'Connecting...' });
        try {
            const t0 = performance.now();
            const resp = await fetch(`${this._whisperXUrl}/health`);
            const elapsed = Math.round(performance.now() - t0);
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const data = await resp.json();
            this._setDiag('whisperx', { status: 'ok', text: `OK — ${elapsed}ms ping` });

            // Test transcription speed with a tiny audio
            this._setDiag('whisperx_speed', { status: 'loading', text: 'Testing transcription...' });
            const wavBuffer = this._generateTestWav(1.0);
            const blob = new Blob([wavBuffer], { type: 'audio/wav' });
            const formData = new FormData();
            formData.append('file', blob, 'test.wav');

            const t1 = performance.now();
            const txResp = await fetch(
                `${this._whisperXUrl}/service/transcribe?language=${this._whisperXLang}&model=${this._whisperXModel}`,
                { method: 'POST', body: formData }
            );
            if (!txResp.ok) throw new Error(`Transcribe HTTP ${txResp.status}`);
            const { identifier } = await txResp.json();

            // Poll for result
            for (let i = 0; i < 60; i++) {
                await new Promise(r => setTimeout(r, 500));
                const taskResp = await fetch(`${this._whisperXUrl}/task/${identifier}`);
                const task = await taskResp.json();
                if (task.status === 'completed') {
                    const elapsed2 = Math.round(performance.now() - t1);
                    this._setDiag('whisperx_speed', { status: 'ok', text: `${elapsed2}ms (1s audio)` });
                    return;
                }
                if (task.status === 'failed' || task.error) throw new Error(task.error || 'Task failed');
            }
            throw new Error('Timeout');
        } catch (e) {
            const key = this._diagResults.whisperx_speed ? 'whisperx_speed' : 'whisperx';
            this._setDiag(key, { status: 'err', text: e.message });
        }
    }

    _generateTestWav(durationSec) {
        const sampleRate = 16000;
        const numSamples = Math.floor(sampleRate * durationSec);
        const buffer = new ArrayBuffer(44 + numSamples * 2);
        const view = new DataView(buffer);
        const writeStr = (off, str) => { for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i)); };
        writeStr(0, 'RIFF');
        view.setUint32(4, 36 + numSamples * 2, true);
        writeStr(8, 'WAVE');
        writeStr(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, 1, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * 2, true);
        view.setUint16(32, 2, true);
        view.setUint16(34, 16, true);
        writeStr(36, 'data');
        view.setUint32(40, numSamples * 2, true);
        // Generate a 440Hz sine wave for better test
        for (let i = 0; i < numSamples; i++) {
            const sample = Math.round(Math.sin(2 * Math.PI * 440 * i / sampleRate) * 16000);
            view.setInt16(44 + i * 2, sample, true);
        }
        return buffer;
    }

    async _testChatModel() {
        this._setDiag('chat', { status: 'loading', text: `Testing ${this._openrouterModel}...` });
        try {
            const t0 = performance.now();
            const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this._openrouterKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: this._openrouterModel,
                    messages: [{ role: 'user', content: 'Count from 1 to 20, one number per line.' }],
                    stream: true,
                    max_tokens: 200,
                }),
            });

            if (!resp.ok) {
                const errText = await resp.text();
                throw new Error(`HTTP ${resp.status}: ${errText.substring(0, 100)}`);
            }

            const reader = resp.body.getReader();
            const decoder = new TextDecoder();
            let tokens = 0;
            let firstTokenTime = null;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                for (const line of chunk.split('\n')) {
                    if (!line.startsWith('data: ') || line.includes('[DONE]')) continue;
                    try {
                        const json = JSON.parse(line.slice(6));
                        const t = json.choices?.[0]?.delta?.content;
                        if (t) {
                            tokens++;
                            if (!firstTokenTime) firstTokenTime = performance.now();
                        }
                    } catch {}
                }
            }

            const totalMs = Math.round(performance.now() - t0);
            const ttft = firstTokenTime ? Math.round(firstTokenTime - t0) : 0;
            const genMs = firstTokenTime ? Math.round(performance.now() - firstTokenTime) : totalMs;
            const tps = genMs > 0 ? (tokens / (genMs / 1000)).toFixed(1) : '?';

            this._setDiag('chat', {
                status: 'ok',
                text: `${tps} tok/s — ${tokens} tokens in ${totalMs}ms (TTFT: ${ttft}ms)`,
            });
        } catch (e) {
            this._setDiag('chat', { status: 'err', text: e.message });
        }
    }

    async _testVisionModel() {
        this._setDiag('vision', { status: 'loading', text: `Testing ${this._openrouterVisionModel}...` });
        try {
            // Generate a simple test image (red square on white, 64x64 PNG via canvas)
            const canvas = document.createElement('canvas');
            canvas.width = 100; canvas.height = 100;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, 100, 100);
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(20, 20, 60, 60);
            ctx.fillStyle = '#000000';
            ctx.font = '16px sans-serif';
            ctx.fillText('TEST', 28, 58);
            const dataUrl = canvas.toDataURL('image/png');
            const base64 = dataUrl.split(',')[1];

            const t0 = performance.now();
            const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this._openrouterKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: this._openrouterVisionModel,
                    messages: [{
                        role: 'user',
                        content: [
                            { type: 'image_url', image_url: { url: `data:image/png;base64,${base64}` } },
                            { type: 'text', text: 'What text and colors do you see? Answer in 10 words max.' },
                        ],
                    }],
                    max_tokens: 50,
                }),
            });

            if (!resp.ok) {
                const errText = await resp.text();
                throw new Error(`HTTP ${resp.status}: ${errText.substring(0, 100)}`);
            }

            const data = await resp.json();
            const totalMs = Math.round(performance.now() - t0);
            const answer = data.choices?.[0]?.message?.content?.trim() || '(empty)';
            const hasRed = /red|красн/i.test(answer);
            const hasTest = /test|тест/i.test(answer);

            this._setDiag('vision', {
                status: hasRed || hasTest ? 'ok' : 'warn',
                text: `${totalMs}ms — "${answer.substring(0, 60)}"`,
            });
        } catch (e) {
            this._setDiag('vision', { status: 'err', text: e.message });
        }
    }

    _handleProfileChange(e) {
        this.onProfileChange(e.target.value);
    }

    // ── Start ──

    _handleStart() {
        if (this.isInitializing) return;

        if (this._mode === 'cloud') {
            if (!this._token.trim()) {
                this._tokenError = true;
                this.requestUpdate();
                return;
            }
        } else if (this._mode === 'byok') {
            if (!this._geminiKey.trim()) {
                this._keyError = true;
                this.requestUpdate();
                return;
            }
        } else if (this._mode === 'local') {
            // Local mode doesn't need API keys, just Ollama host
            if (!this._ollamaHost.trim()) {
                return;
            }
        } else if (this._mode === 'openrouter') {
            if (!this._openrouterKey.trim()) {
                this._keyError = true;
                this.requestUpdate();
                return;
            }
        }

        this.onStart();
    }

    triggerApiKeyError() {
        if (this._mode === 'cloud') {
            this._tokenError = true;
        } else {
            this._keyError = true;
        }
        this.requestUpdate();
        setTimeout(() => {
            this._tokenError = false;
            this._keyError = false;
            this.requestUpdate();
        }, 2000);
    }

    // ── Render helpers ──

    _renderStartButton() {
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

        const cmdIcon = html`<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z"/></svg>`;
        const ctrlIcon = html`<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M6 15l6-6 6 6"/></svg>`;
        const enterIcon = html`<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M9 10l-5 5 5 5"/><path d="M20 4v7a4 4 0 0 1-4 4H4"/></svg>`;

        return html`
            <button
                class="start-button ${this.isInitializing ? 'disabled' : ''}"
                @click=${() => this._handleStart()}
            >
                <canvas class="btn-aurora"></canvas>
                <canvas class="btn-dither"></canvas>
                <span class="btn-label">
                    Start Session
                    <span class="shortcut-hint">${isMac ? cmdIcon : ctrlIcon}${enterIcon}</span>
                </span>
            </button>
        `;
    }

    _renderDivider() {
        return html`
            <div class="divider">
                <div class="divider-line"></div>
                <span class="divider-text">or</span>
                <div class="divider-line"></div>
            </div>
        `;
    }

    // ── Cloud mode ──

    _renderCloudMode() {
        return html`
            <div class="form-group">
                <label class="form-label">Invite Code</label>
                <input
                    type="password"
                    placeholder="Enter your invite code"
                    .value=${this._token}
                    @input=${e => this._saveToken(e.target.value)}
                    class=${this._tokenError ? 'error' : ''}
                />
                <div class="form-hint">DM soham to get your invite code</div>
            </div>

            ${this._renderStartButton()}
            ${this._renderDivider()}

            <div class="mode-cards">
                <div class="mode-card" @click=${() => this._saveMode('openrouter')}>
                    <span class="mode-card-title">OpenRouter</span>
                    <span class="mode-card-desc">Any model, one API key</span>
                </div>
                <div class="mode-card" @click=${() => this._saveMode('byok')}>
                    <span class="mode-card-title">BYOK</span>
                    <span class="mode-card-desc">Gemini / Groq keys</span>
                </div>
                <div class="mode-card" @click=${() => this._saveMode('local')}>
                    <span class="mode-card-title">Local AI</span>
                    <span class="mode-card-desc">Ollama + Whisper</span>
                </div>
            </div>
        `;
    }

    // ── BYOK mode ──

    _renderByokMode() {
        return html`
            <div class="form-group">
                <label class="form-label">Gemini API Key</label>
                <input
                    type="password"
                    placeholder="Required"
                    .value=${this._geminiKey}
                    @input=${e => this._saveGeminiKey(e.target.value)}
                    class=${this._keyError ? 'error' : ''}
                />
                <div class="form-hint">
                    <span class="link" @click=${() => this.onExternalLink('https://aistudio.google.com/apikey')}>Get Gemini key</span>
                </div>
            </div>

            <div class="form-group">
                <label class="form-label">Groq API Key</label>
                <input
                    type="password"
                    placeholder="Optional"
                    .value=${this._groqKey}
                    @input=${e => this._saveGroqKey(e.target.value)}
                />
                <div class="form-hint">
                    <span class="link" @click=${() => this.onExternalLink('https://console.groq.com/keys')}>Get Groq key</span>
                </div>
            </div>

            ${this._renderStartButton()}
            ${this._renderDivider()}

            <div class="cloud-promo" @click=${() => this._saveMode('cloud')}>
                <div class="cloud-promo-glow"></div>
                <div class="cloud-promo-header">
                    <span class="cloud-promo-title">Switch to Cheating Daddy Cloud</span>
                    <span class="cloud-promo-arrow">&rarr;</span>
                </div>
                <div class="cloud-promo-desc">No API keys, no setup, no billing headaches. It just works.</div>
            </div>

            <div class="mode-links">
                <button class="mode-link" @click=${() => this._saveMode('openrouter')}>OpenRouter</button>
                <button class="mode-link" @click=${() => this._saveMode('local')}>Local AI</button>
            </div>
        `;
    }

    // ── Local AI mode ──

    _renderLocalMode() {
        return html`
            <div class="form-group">
                <label class="form-label">Ollama Host</label>
                <input
                    type="text"
                    placeholder="http://127.0.0.1:11434"
                    .value=${this._ollamaHost}
                    @input=${e => this._saveOllamaHost(e.target.value)}
                />
                <div class="form-hint">Ollama must be running locally</div>
            </div>

            <div class="form-group">
                <label class="form-label">Ollama Model</label>
                <input
                    type="text"
                    placeholder="llama3.1"
                    .value=${this._ollamaModel}
                    @input=${e => this._saveOllamaModel(e.target.value)}
                />
                <div class="form-hint">Run <code style="font-family: var(--font-mono); font-size: 11px; background: var(--bg-elevated); padding: 1px 4px; border-radius: 3px;">ollama pull ${this._ollamaModel}</code> first</div>
            </div>

            <div class="form-group">
                <div class="whisper-label-row">
                    <label class="form-label">Whisper Model</label>
                    ${this.whisperDownloading ? html`<div class="whisper-spinner"></div>` : ''}
                </div>
                <select
                    .value=${this._whisperModel}
                    @change=${e => this._saveWhisperModel(e.target.value)}
                >
                    <option value="Xenova/whisper-tiny" ?selected=${this._whisperModel === 'Xenova/whisper-tiny'}>Tiny (fastest, least accurate)</option>
                    <option value="Xenova/whisper-base" ?selected=${this._whisperModel === 'Xenova/whisper-base'}>Base</option>
                    <option value="Xenova/whisper-small" ?selected=${this._whisperModel === 'Xenova/whisper-small'}>Small (recommended)</option>
                    <option value="Xenova/whisper-medium" ?selected=${this._whisperModel === 'Xenova/whisper-medium'}>Medium (most accurate, slowest)</option>
                </select>
                <div class="form-hint">${this.whisperDownloading ? 'Downloading model...' : 'Downloaded automatically on first use'}</div>
            </div>

            ${this._renderStartButton()}
            ${this._renderDivider()}

            <div class="cloud-promo" @click=${() => this._saveMode('cloud')}>
                <div class="cloud-promo-glow"></div>
                <div class="cloud-promo-header">
                    <span class="cloud-promo-title">Switch to Cheating Daddy Cloud</span>
                    <span class="cloud-promo-arrow">&rarr;</span>
                </div>
                <div class="cloud-promo-desc">No API keys, no setup, no billing headaches. It just works.</div>
            </div>

            <div class="mode-links">
                <button class="mode-link" @click=${() => this._saveMode('openrouter')}>OpenRouter</button>
                <button class="mode-link" @click=${() => this._saveMode('byok')}>BYOK</button>
            </div>
        `;
    }

    // ── OpenRouter mode ──

    _renderOpenRouterMode() {
        const models = this._openrouterModelsList;
        const hasModels = models && models.length > 0;

        // Group models by provider for display
        const chatModels = hasModels ? models.filter(m => m.type === 'chat' || m.type === 'both') : [];
        const visionModels = hasModels ? models.filter(m => m.type === 'vision' || m.type === 'both') : [];

        // Group by provider prefix
        const groupByProvider = (list) => {
            const groups = {};
            for (const m of list) {
                const provider = m.id.split('/')[0];
                if (!groups[provider]) groups[provider] = [];
                groups[provider].push(m);
            }
            return groups;
        };

        const renderModelOptions = (list, selectedValue) => {
            const groups = groupByProvider(list);
            return Object.entries(groups).map(([provider, items]) => html`
                <optgroup label=${provider}>
                    ${items.map(m => html`
                        <option value=${m.id} ?selected=${selectedValue === m.id}>${m.name}${m.price ? ` — ${m.price}` : ''}</option>
                    `)}
                </optgroup>
            `);
        };

        const refreshBtn = html`
            <button class="refresh-btn ${this._openrouterModelsLoading ? 'loading' : ''}"
                @click=${() => this._fetchOpenRouterModels()}
                ?disabled=${this._openrouterModelsLoading}>
                ${this._openrouterModelsLoading ? '...' : '↻'} ${this._openrouterModelsLoading ? 'Loading' : 'Refresh'}
            </button>
        `;

        return html`
            <div class="form-group">
                <label class="form-label">OpenRouter API Key</label>
                <input
                    type="password"
                    placeholder="sk-or-..."
                    .value=${this._openrouterKey}
                    @input=${e => this._saveOpenRouterKey(e.target.value)}
                    class=${this._keyError ? 'error' : ''}
                />
                <div class="form-hint">
                    <span class="link" @click=${() => this.onExternalLink('https://openrouter.ai/keys')}>Get OpenRouter key</span>
                </div>
            </div>

            <div class="form-group">
                <div class="model-label-row">
                    <label class="form-label">Chat Model</label>
                    ${refreshBtn}
                </div>
                <select
                    .value=${this._openrouterModel}
                    @change=${e => this._saveOpenRouterModel(e.target.value)}
                >
                    ${hasModels ? renderModelOptions(chatModels, this._openrouterModel) : html`
                        <option value=${this._openrouterModel} selected>${this._openrouterModel}</option>
                    `}
                </select>
                <div class="form-hint">${hasModels ? `${chatModels.length} models available` : 'Click Refresh to load models from OpenRouter'}</div>
            </div>

            <div class="form-group">
                <div class="model-label-row">
                    <label class="form-label">Vision Model</label>
                </div>
                <select
                    .value=${this._openrouterVisionModel}
                    @change=${e => this._saveOpenRouterVisionModel(e.target.value)}
                >
                    ${hasModels ? renderModelOptions(visionModels, this._openrouterVisionModel) : html`
                        <option value=${this._openrouterVisionModel} selected>${this._openrouterVisionModel}</option>
                    `}
                </select>
                <div class="form-hint">${hasModels ? `${visionModels.length} vision models` : 'Models with image input support'}</div>
            </div>

            <div class="form-group">
                <div class="model-label-row">
                    <label class="form-label">Speech-to-Text</label>
                    <label style="display:flex;align-items:center;gap:4px;font-size:var(--font-size-xs);cursor:pointer">
                        <input type="checkbox"
                            .checked=${this._whisperXEnabled}
                            @change=${e => this._saveWhisperXEnabled(e.target.checked)}
                        /> WhisperX Docker
                    </label>
                </div>
                ${this._whisperXEnabled ? html`
                    <input
                        type="text"
                        placeholder="http://localhost:8000"
                        .value=${this._whisperXUrl}
                        @input=${e => this._saveWhisperXUrl(e.target.value)}
                        style="margin-bottom:6px"
                    />
                    <div style="display:flex;gap:6px">
                        <select style="flex:1"
                            .value=${this._whisperXModel}
                            @change=${e => this._saveWhisperXModel(e.target.value)}
                        >
                            <option value="large-v3" ?selected=${this._whisperXModel === 'large-v3'}>large-v3</option>
                            <option value="large-v3-turbo" ?selected=${this._whisperXModel === 'large-v3-turbo'}>large-v3-turbo</option>
                            <option value="medium" ?selected=${this._whisperXModel === 'medium'}>medium</option>
                            <option value="small" ?selected=${this._whisperXModel === 'small'}>small</option>
                        </select>
                        <select style="flex:1"
                            .value=${this._whisperXLang}
                            @change=${e => this._saveWhisperXLang(e.target.value)}
                        >
                            <option value="ru" ?selected=${this._whisperXLang === 'ru'}>Russian</option>
                            <option value="en" ?selected=${this._whisperXLang === 'en'}>English</option>
                            <option value="uk" ?selected=${this._whisperXLang === 'uk'}>Ukrainian</option>
                            <option value="de" ?selected=${this._whisperXLang === 'de'}>German</option>
                            <option value="fr" ?selected=${this._whisperXLang === 'fr'}>French</option>
                            <option value="es" ?selected=${this._whisperXLang === 'es'}>Spanish</option>
                            <option value="zh" ?selected=${this._whisperXLang === 'zh'}>Chinese</option>
                            <option value="ja" ?selected=${this._whisperXLang === 'ja'}>Japanese</option>
                        </select>
                    </div>
                    <div class="form-hint">WhisperX with CUDA — large-v3 for best Russian accuracy</div>
                ` : html`
                    <div class="whisper-label-row">
                        ${this.whisperDownloading ? html`<div class="whisper-spinner"></div>` : ''}
                    </div>
                    <select
                        .value=${this._openrouterWhisperModel}
                        @change=${e => this._saveOpenRouterWhisperModel(e.target.value)}
                    >
                        <option value="Xenova/whisper-tiny" ?selected=${this._openrouterWhisperModel === 'Xenova/whisper-tiny'}>Tiny (fastest)</option>
                        <option value="Xenova/whisper-base" ?selected=${this._openrouterWhisperModel === 'Xenova/whisper-base'}>Base</option>
                        <option value="Xenova/whisper-small" ?selected=${this._openrouterWhisperModel === 'Xenova/whisper-small'}>Small (more accurate)</option>
                    </select>
                    <div class="form-hint">${this.whisperDownloading ? 'Downloading model...' : 'Local Whisper on CPU — enable WhisperX Docker for better accuracy'}</div>
                `}
            </div>

            <div class="form-group">
                <label class="form-label">Question Detector</label>
                <select
                    .value=${this._detectorModel}
                    @change=${e => this._saveDetectorModel(e.target.value)}
                >
                    ${hasModels ? renderModelOptions(chatModels, this._detectorModel) : html`
                        <option value=${this._detectorModel} selected>${this._detectorModel}</option>
                    `}
                </select>
                <div class="form-hint">Fast/cheap model to detect questions in speech stream</div>
            </div>

            <div class="form-group">
                <label class="form-label">Detection Settings</label>
                <div style="display:flex;gap:6px;align-items:center">
                    <div style="flex:1">
                        <label style="font-size:var(--font-size-xs);color:var(--text-secondary)">Window (sec)</label>
                        <select .value=${String(this._windowSize)} @change=${e => this._saveWindowSize(e.target.value)}>
                            <option value="10">10s</option>
                            <option value="15">15s</option>
                            <option value="20">20s</option>
                            <option value="30">30s</option>
                        </select>
                    </div>
                    <div style="flex:1">
                        <label style="font-size:var(--font-size-xs);color:var(--text-secondary)">Check every</label>
                        <select .value=${String(this._checkFrequency)} @change=${e => this._saveCheckFrequency(e.target.value)}>
                            <option value="500">500ms</option>
                            <option value="1000">1s</option>
                            <option value="1500">1.5s</option>
                            <option value="2000">2s</option>
                        </select>
                    </div>
                    <div style="flex:1">
                        <label style="font-size:var(--font-size-xs);color:var(--text-secondary)">STT chunk</label>
                        <select .value=${String(this._transcriptionInterval)} @change=${e => this._saveTranscriptionInterval(e.target.value)}>
                            <option value="500">0.5s</option>
                            <option value="1000">1s</option>
                            <option value="1500">1.5s</option>
                            <option value="2000">2s</option>
                            <option value="2500">2.5s</option>
                        </select>
                    </div>
                </div>
                <div class="form-hint">Window — how much speech context. Check — how often to detect questions. STT chunk — how often to transcribe audio.</div>
            </div>

            <div class="diag-section">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
                    <span class="diag-title" style="margin-bottom:0">Diagnostics</span>
                    <button class="diag-btn" @click=${() => this._runDiagnostics()} ?disabled=${this._diagRunning}>
                        ${this._diagRunning ? '...' : '▶'} Run tests
                    </button>
                </div>
                ${this._diagResults.whisperx ? html`
                    <div class="diag-row">
                        <span class="diag-label">WhisperX Docker</span>
                        <span class="diag-value diag-${this._diagResults.whisperx.status}">${this._diagResults.whisperx.text}</span>
                    </div>
                ` : ''}
                ${this._diagResults.whisperx_speed ? html`
                    <div class="diag-row">
                        <span class="diag-label">WhisperX Speed</span>
                        <span class="diag-value diag-${this._diagResults.whisperx_speed.status}">${this._diagResults.whisperx_speed.text}</span>
                    </div>
                ` : ''}
                ${this._diagResults.chat ? html`
                    <div class="diag-row">
                        <span class="diag-label">Chat: ${this._openrouterModel.split('/').pop()}</span>
                        <span class="diag-value diag-${this._diagResults.chat.status}">${this._diagResults.chat.text}</span>
                    </div>
                ` : ''}
                ${this._diagResults.vision ? html`
                    <div class="diag-row">
                        <span class="diag-label">Vision: ${this._openrouterVisionModel.split('/').pop()}</span>
                        <span class="diag-value diag-${this._diagResults.vision.status}">${this._diagResults.vision.text}</span>
                    </div>
                ` : ''}
                ${Object.keys(this._diagResults).length === 0 && !this._diagRunning ? html`
                    <div style="font-size:var(--font-size-xs);color:var(--text-muted);text-align:center;padding:4px">
                        Test Docker, model speed & vision
                    </div>
                ` : ''}
            </div>

            ${this._renderStartButton()}
            ${this._renderDivider()}

            <div class="mode-cards">
                <div class="mode-card" @click=${() => this._saveMode('cloud')}>
                    <span class="mode-card-title">Cloud</span>
                    <span class="mode-card-desc">Zero setup, invite code</span>
                </div>
                <div class="mode-card" @click=${() => this._saveMode('byok')}>
                    <span class="mode-card-title">BYOK</span>
                    <span class="mode-card-desc">Gemini + Groq keys</span>
                </div>
                <div class="mode-card" @click=${() => this._saveMode('local')}>
                    <span class="mode-card-title">Local AI</span>
                    <span class="mode-card-desc">Ollama + Whisper</span>
                </div>
            </div>
        `;
    }

    // ── Main render ──

    render() {
        const helpIcon = html`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M3 12a9 9 0 1 0 18 0a9 9 0 1 0-18 0m9 5v.01" /><path d="M12 13.5a1.5 1.5 0 0 1 1-1.5a2.6 2.6 0 1 0-3-4" /></g></svg>`;
        const closeIcon = html`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 6L6 18M6 6l12 12" /></svg>`;

        return html`
            <div class="form-wrapper">
                ${this._mode === 'local' || this._mode === 'openrouter' ? html`
                    <div class="title-row">
                        <div class="page-title">Cheating Daddy <span class="mode-suffix">${this._mode === 'local' ? 'Local AI' : 'OpenRouter'}</span></div>
                        ${this._mode === 'local' ? html`
                            <button class="help-btn" @click=${() => { this._showLocalHelp = !this._showLocalHelp; }}>${this._showLocalHelp ? closeIcon : helpIcon}</button>
                        ` : ''}
                    </div>
                ` : html`
                    <div class="page-title">
                        ${this._mode === 'cloud' ? 'Cheating Daddy Cloud'
                            : this._mode === 'openrouter' ? html`Cheating Daddy <span class="mode-suffix">OpenRouter</span>`
                            : html`Cheating Daddy <span class="mode-suffix">BYOK</span>`}
                    </div>
                `}
                <div class="page-subtitle">
                    ${this._mode === 'cloud' ? 'Enter your invite code to get started'
                        : this._mode === 'openrouter' ? 'Use any model via OpenRouter'
                        : this._mode === 'byok' ? 'Bring your own API keys'
                        : 'Run models locally on your machine'}
                </div>

                ${this._mode === 'cloud' ? this._renderCloudMode() : ''}
                ${this._mode === 'byok' ? this._renderByokMode() : ''}
                ${this._mode === 'local' ? (this._showLocalHelp ? this._renderLocalHelp() : this._renderLocalMode()) : ''}
                ${this._mode === 'openrouter' ? this._renderOpenRouterMode() : ''}
            </div>
        `;
    }

    _renderLocalHelp() {
        return html`
            <div class="help-content">
                <div class="help-section">
                    <div class="help-section-title">What is Ollama?</div>
                    <div class="help-section-text">Ollama lets you run large language models locally on your machine. Everything stays on your computer — no data leaves your device.</div>
                </div>

                <div class="help-section">
                    <div class="help-section-title">Install Ollama</div>
                    <div class="help-section-text">Download from <span class="help-link" @click=${() => this.onExternalLink('https://ollama.com/download')}>ollama.com/download</span> and install it.</div>
                </div>

                <div class="help-section">
                    <div class="help-section-title">Ollama must be running</div>
                    <div class="help-section-text">Ollama needs to be running before you start a session. If it's not running, open your terminal and type:</div>
                    <code class="help-code">ollama serve</code>
                </div>

                <div class="help-section">
                    <div class="help-section-title">Pull a model</div>
                    <div class="help-section-text">Download a model before first use:</div>
                    <code class="help-code">ollama pull gemma3:4b</code>
                </div>

                <div class="help-section">
                    <div class="help-section-title">Recommended models</div>
                    <div class="help-models">
                        <div class="help-model"><span class="help-model-name">gemma3:4b</span><span>4B — fast, multimodal (images + text)</span></div>
                        <div class="help-model"><span class="help-model-name">mistral-small</span><span>8B — solid all-rounder, text only</span></div>
                    </div>
                    <div class="help-section-text">gemma3:4b and above supports images — screenshots will work with these models.</div>
                </div>

                <div class="help-section">
                    <div class="help-warn">Avoid "thinking" models (e.g. deepseek-r1, qwq). Local inference is already slower — a thinking model adds extra delay before responding.</div>
                </div>

                <div class="help-section">
                    <div class="help-section-title">Whisper</div>
                    <div class="help-section-text">The Whisper speech-to-text model is downloaded automatically the first time you start a session. This is a one-time download.</div>
                </div>

                <hr class="help-divider" />

                <div class="help-section">
                    <div class="help-section-title">Computer hanging or slow?</div>
                    <div class="help-section-text">Running models locally uses a lot of RAM and CPU. If your computer slows down or freezes, it's likely the LLM. Cloud mode gives you faster, better responses without any load on your machine.</div>
                </div>

                <button class="help-cloud-btn" @click=${() => { this._showLocalHelp = false; this._saveMode('cloud'); }}>Switch to Cloud</button>
            </div>
        `;
    }
}

customElements.define('main-view', MainView);
