/**
 * LYRICFLOW v1.3 - SPATIAL AUDIO
 * 3D audio positioning and effects
 */

const LFSpatialAudio = {
    context: null,
    listener: null,
    sources: new Map(),
    
    init() {
        this.context = LFUtils.getAudioContext();
        this.listener = this.context.listener;
        
        // Set default listener position
        this.setListenerPosition(0, 0, 0);
        
        console.log('Spatial audio initialized');
    },
    
    createPanner() {
        const panner = this.context.createPanner();
        
        // HRTF panning model for realistic 3D audio
        panner.panningModel = 'HRTF';
        panner.distanceModel = 'inverse';
        panner.refDistance = 1;
        panner.maxDistance = 10000;
        panner.rolloffFactor = 1;
        panner.coneInnerAngle = 360;
        panner.coneOuterAngle = 0;
        panner.coneOuterGain = 0;
        
        return panner;
    },
    
    setListenerPosition(x, y, z) {
        if (!this.listener) return;
        
        this.listener.positionX.setValueAtTime(x, this.context.currentTime);
        this.listener.positionY.setValueAtTime(y, this.context.currentTime);
        this.listener.positionZ.setValueAtTime(z, this.context.currentTime);
    },
    
    setListenerOrientation(forwardX, forwardY, forwardZ, upX, upY, upZ) {
        if (!this.listener) return;
        
        this.listener.forwardX.setValueAtTime(forwardX, this.context.currentTime);
        this.listener.forwardY.setValueAtTime(forwardY, this.context.currentTime);
        this.listener.forwardZ.setValueAtTime(forwardZ, this.context.currentTime);
        this.listener.upX.setValueAtTime(upX, this.context.currentTime);
        this.listener.upY.setValueAtTime(upY, this.context.currentTime);
        this.listener.upZ.setValueAtTime(upZ, this.context.currentTime);
    },
    
    addSource(id, audioNode, position = { x: 0, y: 0, z: 0 }) {
        const panner = this.createPanner();
        
        panner.positionX.setValueAtTime(position.x, this.context.currentTime);
        panner.positionY.setValueAtTime(position.y, this.context.currentTime);
        panner.positionZ.setValueAtTime(position.z, this.context.currentTime);
        
        audioNode.connect(panner);
        panner.connect(this.context.destination);
        
        this.sources.set(id, { panner, position });
        
        return panner;
    },
    
    moveSource(id, position, duration = 0) {
        const source = this.sources.get(id);
        if (!source) return;
        
        const { panner } = source;
        const now = this.context.currentTime;
        
        if (duration > 0) {
            panner.positionX.linearRampToValueAtTime(position.x, now + duration);
            panner.positionY.linearRampToValueAtTime(position.y, now + duration);
            panner.positionZ.linearRampToValueAtTime(position.z, now + duration);
        } else {
            panner.positionX.setValueAtTime(position.x, now);
            panner.positionY.setValueAtTime(position.y, now);
            panner.positionZ.setValueAtTime(position.z, now);
        }
        
        source.position = position;
    },
    
    removeSource(id) {
        const source = this.sources.get(id);
        if (source) {
            source.panner.disconnect();
            this.sources.delete(id);
        }
    },
    
    // Concert hall simulation
    createConcertHall() {
        // Create convolver for reverb
        const convolver = this.context.createConvolver();
        
        // Generate impulse response (simplified)
        const rate = this.context.sampleRate;
        const length = rate * 2; // 2 seconds
        const impulse = this.context.createBuffer(2, length, rate);
        
        for (let channel = 0; channel < 2; channel++) {
            const data = impulse.getChannelData(channel);
            for (let i = 0; i < length; i++) {
                // Exponential decay
                data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
            }
        }
        
        convolver.buffer = impulse;
        return convolver;
    }
};
