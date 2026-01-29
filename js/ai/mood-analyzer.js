/**
 * LYRICFLOW v1.3 - MOOD ANALYZER
 * Analyze song mood and characteristics
 */

const LFMoodAnalyzer = {
    // Mood categories
    moods: {
        energetic: { color: '#ff006e', icon: '⚡' },
        calm: { color: '#3a86ff', icon: '🌊' },
        happy: { color: '#ffbe0b', icon: '☀️' },
        sad: { color: '#8338ec', icon: '🌧️' },
        angry: { color: '#fb5607', icon: '🔥' },
        romantic: { color: '#ff006e', icon: '💕' },
        focus: { color: '#06ffa5', icon: '🎯' },
        party: { color: '#ff006e', icon: '🎉' }
    },
    
    init() {
        console.log('Mood Analyzer initialized');
    },
    
    async analyzeAudio(audioBuffer) {
        const features = this.extractFeatures(audioBuffer);
        const mood = this.classifyMood(features);
        
        return {
            mood,
            features,
            confidence: 0.85 // Placeholder
        };
    },
    
    extractFeatures(buffer) {
        const channelData = buffer.getChannelData(0);
        const sampleRate = buffer.sampleRate;
        
        // Tempo estimation (BPM)
        const tempo = this.estimateTempo(channelData, sampleRate);
        
        // Energy (RMS)
        const energy = this.calculateEnergy(channelData);
        
        // Spectral features (using FFT would go here)
        const spectralCentroid = this.estimateSpectralCentroid(channelData);
        
        // Dynamic range
        const dynamicRange = this.calculateDynamicRange(channelData);
        
        return {
            tempo,
            energy,
            spectralCentroid,
            dynamicRange,
            duration: buffer.duration
        };
    },
    
    estimateTempo(data, sampleRate) {
        // Simplified tempo estimation using peak detection
        const bufferSize = 1024;
        const hopSize = 512;
        const energies = [];
        
        for (let i = 0; i < data.length - bufferSize; i += hopSize) {
            let sum = 0;
            for (let j = 0; j < bufferSize; j++) {
                sum += data[i + j] * data[i + j];
            }
            energies.push(Math.sqrt(sum / bufferSize));
        }
        
        // Find peaks
        const peaks = [];
        for (let i = 1; i < energies.length - 1; i++) {
            if (energies[i] > energies[i - 1] && energies[i] > energies[i + 1] && energies[i] > 0.1) {
                peaks.push(i);
            }
        }
        
        // Calculate average interval
        if (peaks.length < 2) return 120;
        
        const intervals = [];
        for (let i = 1; i < peaks.length; i++) {
            intervals.push(peaks[i] - peaks[i - 1]);
        }
        
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const secondsPerBeat = (avgInterval * hopSize) / sampleRate;
        const bpm = Math.round(60 / secondsPerBeat);
        
        return Math.min(Math.max(bpm, 60), 200);
    },
    
    calculateEnergy(data) {
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
            sum += data[i] * data[i];
        }
        return Math.sqrt(sum / data.length);
    },
    
    estimateSpectralCentroid(data) {
        // Simplified - would use FFT in real implementation
        let sum = 0;
        let weightedSum = 0;
        
        for (let i = 0; i < data.length; i++) {
            const magnitude = Math.abs(data[i]);
            sum += magnitude;
            weightedSum += i * magnitude;
        }
        
        return sum > 0 ? weightedSum / sum : 0;
    },
    
    calculateDynamicRange(data) {
        let min = Infinity;
        let max = -Infinity;
        
        for (let i = 0; i < data.length; i++) {
            min = Math.min(min, data[i]);
            max = Math.max(max, data[i]);
        }
        
        return max - min;
    },
    
    classifyMood(features) {
        const { tempo, energy, spectralCentroid, dynamicRange } = features;
        
        // Classification rules
        if (tempo > 140 && energy > 0.3) {
            return 'energetic';
        } else if (tempo < 90 && energy < 0.15) {
            return 'calm';
        } else if (tempo > 120 && energy > 0.2 && spectralCentroid > 0.5) {
            return 'happy';
        } else if (tempo < 100 && energy < 0.2) {
            return 'sad';
        } else if (energy > 0.4 && dynamicRange > 0.8) {
            return 'angry';
        } else if (tempo > 80 && tempo < 120 && energy < 0.25) {
            return 'romantic';
        } else if (tempo > 100 && tempo < 140 && energy > 0.15 && energy < 0.3) {
            return 'focus';
        } else {
            return 'party';
        }
    },
    
    getMoodColor(mood) {
        return this.moods[mood]?.color || '#888';
    },
    
    getMoodIcon(mood) {
        return this.moods[mood]?.icon || '🎵';
    },
    
    async analyzeCurrentSong() {
        const song = LyricFlow.state.currentSong;
        if (!song) return null;
        
        // Get audio buffer
        // This would need to be implemented based on how audio is stored
        return null;
    }
};
