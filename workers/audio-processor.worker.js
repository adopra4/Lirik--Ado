/**
 * LYRICFLOW v1.3 - AUDIO PROCESSOR WORKER
 * Off-main-thread audio processing
 */

self.onmessage = function(e) {
    const { type, data } = e.data;
    
    switch (type) {
        case 'process':
            processAudio(data);
            break;
        case 'analyze':
            analyzeAudio(data);
            break;
        case 'generateWaveform':
            generateWaveform(data);
            break;
        case 'extractFeatures':
            extractFeatures(data);
            break;
    }
};

function processAudio({ buffer, sampleRate, channels }) {
    // Process audio data
    // This runs in worker thread to avoid blocking main thread
    
    const processed = new Float32Array(buffer.length);
    
    // Example: Apply gain
    const gain = data.gain || 1.0;
    for (let i = 0; i < buffer.length; i++) {
        processed[i] = buffer[i] * gain;
    }
    
    self.postMessage({
        type: 'processed',
        buffer: processed
    }, [processed.buffer]);
}

function analyzeAudio({ buffer, sampleRate }) {
    // FFT analysis
    const fftSize = 2048;
    const hopSize = 512;
    
    const frames = [];
    for (let i = 0; i < buffer.length - fftSize; i += hopSize) {
        const frame = buffer.slice(i, i + fftSize);
        const spectrum = computeFFT(frame);
        frames.push(spectrum);
    }
    
    // Extract features
    const features = {
        rms: computeRMS(buffer),
        spectralCentroid: computeSpectralCentroid(frames),
        zeroCrossingRate: computeZCR(buffer),
        tempo: estimateTempo(frames, sampleRate)
    };
    
    self.postMessage({
        type: 'analysis',
        features
    });
}

function generateWaveform({ buffer, samples }) {
    const step = Math.floor(buffer.length / samples);
    const waveform = new Float32Array(samples);
    
    for (let i = 0; i < samples; i++) {
        let sum = 0;
        const start = i * step;
        const end = Math.min(start + step, buffer.length);
        
        for (let j = start; j < end; j++) {
            sum += Math.abs(buffer[j]);
        }
        
        waveform[i] = sum / (end - start);
    }
    
    self.postMessage({
        type: 'waveform',
        data: waveform
    }, [waveform.buffer]);
}

function extractFeatures({ buffer, sampleRate }) {
    const features = {
        // Temporal features
        energy: computeEnergy(buffer),
        rms: computeRMS(buffer),
        zcr: computeZCR(buffer),
        
        // Spectral features (would need FFT)
        // spectralCentroid: ...,
        // spectralRolloff: ...,
        
        // Rhythm features
        tempo: 120 // Placeholder
    };
    
    self.postMessage({
        type: 'features',
        features
    });
}

// Helper functions

function computeFFT(frame) {
    // Simplified FFT - in production use a library like kissfft-js
    const n = frame.length;
    const result = new Float32Array(n / 2);
    
    // Placeholder implementation
    for (let i = 0; i < n / 2; i++) {
        result[i] = Math.abs(frame[i]);
    }
    
    return result;
}

function computeRMS(buffer) {
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
        sum += buffer[i] * buffer[i];
    }
    return Math.sqrt(sum / buffer.length);
}

function computeEnergy(buffer) {
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
        sum += Math.abs(buffer[i]);
    }
    return sum / buffer.length;
}

function computeZCR(buffer) {
    let crossings = 0;
    for (let i = 1; i < buffer.length; i++) {
        if ((buffer[i] >= 0) !== (buffer[i - 1] >= 0)) {
            crossings++;
        }
    }
    return crossings / (buffer.length - 1);
}

function computeSpectralCentroid(spectra) {
    // Average spectral centroid across frames
    let totalCentroid = 0;
    
    for (const spectrum of spectra) {
        let numerator = 0;
        let denominator = 0;
        
        for (let i = 0; i < spectrum.length; i++) {
            numerator += i * spectrum[i];
            denominator += spectrum[i];
        }
        
        totalCentroid += denominator > 0 ? numerator / denominator : 0;
    }
    
    return totalCentroid / spectra.length;
}

function estimateTempo(frames, sampleRate) {
    // Simplified tempo estimation
    // In production, use onset detection and autocorrelation
    
    const energyCurve = frames.map(f => f.reduce((a, b) => a + b, 0));
    
    // Find peaks
    const peaks = [];
    for (let i = 1; i < energyCurve.length - 1; i++) {
        if (energyCurve[i] > energyCurve[i - 1] && energyCurve[i] > energyCurve[i + 1]) {
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
    const hopSize = 512;
    const secondsPerBeat = (avgInterval * hopSize) / sampleRate;
    
    return Math.round(60 / secondsPerBeat);
}
