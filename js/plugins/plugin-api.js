/**
 * LYRICFLOW v1.3 - PLUGIN API
 * Public API for plugin developers
 */

const LFPluginAPI = {
    version: '1.3.0',
    
    // Plugin definition helper
    definePlugin(config) {
        return {
            ...config,
            _apiVersion: this.version
        };
    },
    
    // UI Components
    
    Components: {
        Button({ label, onClick, variant = 'primary' }) {
            return LFUtils.createElement('button', {
                className: `btn btn-${variant}`,
                onclick: onClick
            }, label);
        },
        
        Card({ title, children }) {
            return LFUtils.createElement('div', { className: 'card' },
                LFUtils.createElement('h3', {}, title),
                ...children
            );
        },
        
        Input({ type = 'text', value, onChange, placeholder }) {
            return LFUtils.createElement('input', {
                type,
                value,
                placeholder,
                oninput: (e) => onChange(e.target.value)
            });
        },
        
        Select({ options, value, onChange }) {
            return LFUtils.createElement('select', {
                onchange: (e) => onChange(e.target.value)
            }, ...options.map(opt => 
                LFUtils.createElement('option', { 
                    value: opt.value,
                    selected: opt.value === value 
                }, opt.label)
            ));
        }
    },
    
    // Audio utilities
    
    Audio: {
        createOscillator(type = 'sine', frequency = 440) {
            const ctx = LFUtils.getAudioContext();
            const osc = ctx.createOscillator();
            osc.type = type;
            osc.frequency.value = frequency;
            return osc;
        },
        
        createGain(value = 1) {
            const ctx = LFUtils.getAudioContext();
            const gain = ctx.createGain();
            gain.gain.value = value;
            return gain;
        },
        
        getAnalyser() {
            return LFPlayer.analyser;
        },
        
        getFrequencyData() {
            return LFPlayer.getFrequencyData();
        }
    },
    
    // Storage helpers
    
    Storage: {
        get(key, defaultValue = null) {
            return LFUtils.storage.get(`plugin_${key}`, defaultValue);
        },
        
        set(key, value) {
            return LFUtils.storage.set(`plugin_${key}`, value);
        },
        
        remove(key) {
            return LFUtils.storage.remove(`plugin_${key}`);
        }
    },
    
    // Event helpers
    
    Events: {
        on(event, callback) {
            return LyricFlow.events.on(event, callback);
        },
        
        once(event, callback) {
            return LyricFlow.events.once(event, callback);
        },
        
        emit(event, data) {
            return LyricFlow.events.emit(event, data);
        }
    },
    
    // Network
    
    Network: {
        async fetch(url, options = {}) {
            return fetch(url, {
                ...options,
                headers: {
                    'X-Plugin-Request': 'true',
                    ...options.headers
                }
            });
        },
        
        get(url) {
            return this.fetch(url);
        },
        
        post(url, data) {
            return this.fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        }
    },
    
    // Validation
    
    validate(config) {
        const required = ['name', 'version'];
        const missing = required.filter(field => !config[field]);
        
        if (missing.length > 0) {
            throw new Error(`Missing required fields: ${missing.join(', ')}`);
        }
        
        if (!/^\d+\.\d+\.\d+$/.test(config.version)) {
            throw new Error('Version must be in semver format (x.y.z)');
        }
        
        return true;
    }
};
