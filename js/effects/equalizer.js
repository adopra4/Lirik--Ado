/**
 * LYRICFLOW v1.3 - EQUALIZER
 * Multi-band graphic equalizer
 */

const LFEqualizer = {
    context: null,
    source: null,
    filters: [],
    gainNode: null,
    
    // 10-band EQ frequencies
    frequencies: [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000],
    bands: [],
    
    presets: {
        flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        bass: [8, 6, 4, 2, 0, 0, 0, 0, 0, 0],
        treble: [0, 0, 0, 0, 0, 0, 2, 4, 6, 8],
        vocal: [-2, -2, 0, 2, 4, 4, 2, 0, -2, -2],
        electronic: [4, 3, 0, -2, -2, 0, 3, 5, 4, 2],
        jazz: [0, 0, 0, 2, 4, 4, 2, 0, 0, 0],
        classical: [0, 0, 0, 0, 0, 0, -2, -2, 0, 0],
        rock: [5, 4, 2, 0, -1, -1, 0, 2, 4, 5]
    },
    
    init() {
        this.context = LFUtils.getAudioContext();
        this.createFilters();
        
        // Load saved preset
        const saved = LFUtils.storage.get('lf_eq');
        if (saved) {
            this.loadPreset(saved.preset, saved.values);
        }
        
        console.log('Equalizer initialized');
    },
    
    createFilters() {
        // Create filter chain
        let previousNode = null;
        
        this.frequencies.forEach((freq, index) => {
            const filter = this.context.createBiquadFilter();
            filter.type = 'peaking';
            filter.frequency.value = freq;
            filter.Q.value = 1.4;
            filter.gain.value = 0;
            
            this.bands.push({
                frequency: freq,
                filter: filter,
                value: 0
            });
            
            // Connect in series
            if (previousNode) {
                previousNode.connect(filter);
            }
            previousNode = filter;
        });
        
        // Final gain node
        this.gainNode = this.context.createGain();
        if (previousNode) {
            previousNode.connect(this.gainNode);
        }
        
        // Connect to destination
        this.gainNode.connect(this.context.destination);
    },
    
    connectSource(source) {
        // Connect audio source to first filter
        if (this.bands.length > 0) {
            source.connect(this.bands[0].filter);
        }
    },
    
    setBand(index, value) {
        if (index < 0 || index >= this.bands.length) return;
        
        const band = this.bands[index];
        band.value = value;
        band.filter.gain.setTargetAtTime(value, this.context.currentTime, 0.1);
        
        this.saveSettings();
    },
    
    setGain(value) {
        if (this.gainNode) {
            this.gainNode.gain.setTargetAtTime(value, this.context.currentTime, 0.1);
        }
    },
    
    loadPreset(name, values = null) {
        const presetValues = values || this.presets[name];
        if (!presetValues) return;
        
        presetValues.forEach((value, index) => {
            this.setBand(index, value);
        });
        
        this.currentPreset = name;
        this.updateUI();
    },
    
    reset() {
        this.loadPreset('flat');
    },
    
    saveSettings() {
        const values = this.bands.map(b => b.value);
        LFUtils.storage.set('lf_eq', {
            preset: this.currentPreset,
            values
        });
    },
    
    updateUI() {
        // Update EQ sliders if visible
        this.bands.forEach((band, index) => {
            const slider = $(`#eq-band-${index}`);
            if (slider) {
                slider.value = band.value;
            }
        });
        
        const presetSelect = $('#eq-preset');
        if (presetSelect) {
            presetSelect.value = this.currentPreset || 'custom';
        }
    },
    
    // Get frequency response for visualization
    getFrequencyResponse() {
        return this.bands.map(band => ({
            frequency: band.frequency,
            gain: band.value
        }));
    }
};
