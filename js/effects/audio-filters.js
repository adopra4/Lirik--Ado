/**
 * LYRICFLOW v1.3 - AUDIO FILTERS
 * Advanced audio processing filters
 */

const LFAudioFilters = {
    context: null,
    source: null,
    activeFilters: new Map(),
    
    // Filter types
    filters: {
        lowpass: { type: 'lowpass', defaultFreq: 350 },
        highpass: { type: 'highpass', defaultFreq: 350 },
        bandpass: { type: 'bandpass', defaultFreq: 1000, defaultQ: 1 },
        lowshelf: { type: 'lowshelf', defaultFreq: 500, defaultGain: 0 },
        highshelf: { type: 'highshelf', defaultFreq: 5000, defaultGain: 0 },
        peaking: { type: 'peaking', defaultFreq: 1000, defaultQ: 1, defaultGain: 0 },
        notch: { type: 'notch', defaultFreq: 1000, defaultQ: 1 },
        allpass: { type: 'allpass', defaultFreq: 1000, defaultQ: 1 }
    },
    
    init() {
        this.context = LFUtils.getAudioContext();
        console.log('Audio filters initialized');
    },
    
    createFilter(type, options = {}) {
        const filter = this.context.createBiquadFilter();
        const config = this.filters[type];
        
        filter.type = config.type;
        filter.frequency.value = options.frequency || config.defaultFreq;
        
        if (config.defaultQ !== undefined) {
            filter.Q.value = options.Q || config.defaultQ;
        }
        
        if (config.defaultGain !== undefined) {
            filter.gain.value = options.gain || config.defaultGain;
        }
        
        return filter;
    },
    
    addFilter(id, type, options = {}) {
        const filter = this.createFilter(type, options);
        this.activeFilters.set(id, { filter, type, options });
        
        // Reconnect audio chain
        this.reconnectChain();
        
        return filter;
    },
    
    removeFilter(id) {
        const filterData = this.activeFilters.get(id);
        if (filterData) {
            filterData.filter.disconnect();
            this.activeFilters.delete(id);
            this.reconnectChain();
        }
    },
    
    updateFilter(id, options) {
        const filterData = this.activeFilters.get(id);
        if (!filterData) return;
        
        const { filter } = filterData;
        const now = this.context.currentTime;
        
        if (options.frequency !== undefined) {
            filter.frequency.setTargetAtTime(options.frequency, now, 0.1);
        }
        
        if (options.Q !== undefined) {
            filter.Q.setTargetAtTime(options.Q, now, 0.1);
        }
        
        if (options.gain !== undefined) {
            filter.gain.setTargetAtTime(options.gain, now, 0.1);
        }
        
        Object.assign(filterData.options, options);
    },
    
    reconnectChain() {
        // This would reconnect the audio processing chain
        // Implementation depends on the specific audio graph structure
    },
    
    // Special effects
    
    createCompressor(options = {}) {
        const compressor = this.context.createDynamicsCompressor();
        
        compressor.threshold.value = options.threshold || -24;
        compressor.knee.value = options.knee || 30;
        compressor.ratio.value = options.ratio || 12;
        compressor.attack.value = options.attack || 0.003;
        compressor.release.value = options.release || 0.25;
        
        return compressor;
    },
    
    createDelay(options = {}) {
        const delay = this.context.createDelay(5.0);
        delay.delayTime.value = options.delayTime || 0.5;
        
        const feedback = this.context.createGain();
        feedback.gain.value = options.feedback || 0.5;
        
        const wet = this.context.createGain();
        wet.gain.value = options.wet || 0.3;
        
        const dry = this.context.createGain();
        dry.gain.value = 1 - options.wet || 0.7;
        
        return { delay, feedback, wet, dry };
    },
    
    createReverb(options = {}) {
        const convolver = this.context.createConvolver();
        
        // Generate impulse response
        const rate = this.context.sampleRate;
        const length = rate * (options.duration || 2);
        const impulse = this.context.createBuffer(2, length, rate);
        
        for (let channel = 0; channel < 2; channel++) {
            const data = impulse.getChannelData(channel);
            for (let i = 0; i < length; i++) {
                const decay = Math.pow(1 - i / length, options.decay || 2);
                data[i] = (Math.random() * 2 - 1) * decay;
            }
        }
        
        convolver.buffer = impulse;
        
        const wet = this.context.createGain();
        wet.gain.value = options.wet || 0.3;
        
        return { convolver, wet };
    },
    
    createDistortion(options = {}) {
        const waveshaper = this.context.createWaveShaper();
        waveshaper.curve = this.makeDistortionCurve(options.amount || 20);
        waveshaper.oversample = options.oversample || '4x';
        
        return waveshaper;
    },
    
    makeDistortionCurve(amount) {
        const samples = 44100;
        const curve = new Float32Array(samples);
        const deg = Math.PI / 180;
        
        for (let i = 0; i < samples; i++) {
            const x = (i * 2) / samples - 1;
            curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
        }
        
        return curve;
    },
    
    // Preset effects
    
    applyVinylEffect() {
        this.removeAllFilters();
        
        // Add subtle high-frequency roll-off
        this.addFilter('vinyl-lowpass', 'lowpass', { frequency: 15000 });
        
        // Add subtle crackle (would need noise generator)
        
        return 'Vinyl effect applied';
    },
    
    applyRadioEffect() {
        this.removeAllFilters();
        
        // Bandpass for radio frequency range
        this.addFilter('radio-band', 'bandpass', { frequency: 1000, Q: 0.5 });
        
        // Compressor
        const compressor = this.createCompressor({
            threshold: -20,
            ratio: 8
        });
        
        return 'Radio effect applied';
    },
    
    applyTelephoneEffect() {
        this.removeAllFilters();
        
        // Bandpass for telephone frequency range (300-3400 Hz)
        this.addFilter('tel-highpass', 'highpass', { frequency: 300 });
        this.addFilter('tel-lowpass', 'lowpass', { frequency: 3400 });
        
        return 'Telephone effect applied';
    },
    
    applyUnderwaterEffect() {
        this.removeAllFilters();
        
        // Lowpass with resonance
        this.addFilter('underwater', 'lowpass', { frequency: 400, Q: 5 });
        
        return 'Underwater effect applied';
    },
    
    removeAllFilters() {
        this.activeFilters.forEach((data, id) => {
            data.filter.disconnect();
        });
        this.activeFilters.clear();
    }
};
