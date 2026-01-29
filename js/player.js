/**
 * LYRICFLOW v1.3 - PLAYER MODULE
 * Audio playback engine with advanced features
 */

const LFPlayer = {
    audio: null,
    context: null,
    source: null,
    gainNode: null,
    analyser: null,
    buffer: null,
    
    // State
    state: {
        isPlaying: false,
        isLoading: false,
        currentTime: 0,
        duration: 0,
        volume: 0.8,
        isMuted: false,
        playbackRate: 1,
        pitchShift: 0,
        eqSettings: {},
        filters: []
    },
    
    // Events
    events: new LFUtils.EventEmitter(),
    
    // Initialization
    async init() {
        this.audio = $('#audio-player');
        if (!this.audio) {
            console.error('Audio element not found');
            return;
        }
        
        // Setup audio context
        this.setupAudioContext();
        
        // Bind events
        this.bindAudioEvents();
        
        // Load saved volume
        const savedVolume = LFUtils.storage.get('lf_volume');
        if (savedVolume !== null) {
            this.setVolume(savedVolume);
        }
        
        console.log('Player module initialized');
    },
    
    setupAudioContext() {
        try {
            this.context = LFUtils.getAudioContext();
            
            // Create nodes
            this.gainNode = this.context.createGain();
            this.analyser = this.context.createAnalyser();
            this.analyser.fftSize = 2048;
            
            // Connect nodes
            const source = this.context.createMediaElementSource(this.audio);
            source.connect(this.gainNode);
            this.gainNode.connect(this.analyser);
            this.analyser.connect(this.context.destination);
            
        } catch (e) {
            console.warn('Web Audio API not supported:', e);
        }
    },
    
    bindAudioEvents() {
        if (!this.audio) return;
        
        // Play/Pause
        this.audio.addEventListener('play', () => {
            this.state.isPlaying = true;
            LyricFlow.setState('isPlaying', true);
            this.events.emit('play');
            this.updatePlayButton(true);
        });
        
        this.audio.addEventListener('pause', () => {
            this.state.isPlaying = false;
            LyricFlow.setState('isPlaying', false);
            this.events.emit('pause');
            this.updatePlayButton(false);
        });
        
        // Time update
        this.audio.addEventListener('timeupdate', () => {
            this.state.currentTime = this.audio.currentTime;
            this.updateProgress();
            this.events.emit('timeupdate', this.audio.currentTime);
        });
        
        // Loaded metadata
        this.audio.addEventListener('loadedmetadata', () => {
            this.state.duration = this.audio.duration;
            this.updateDuration();
            this.events.emit('loadedmetadata', this.audio.duration);
        });
        
        // Ended
        this.audio.addEventListener('ended', () => {
            this.handleEnded();
        });
        
        // Progress (buffering)
        this.audio.addEventListener('progress', () => {
            if (this.audio.buffered.length > 0) {
                const buffered = this.audio.buffered.end(this.audio.buffered.length - 1);
                this.updateBuffered(buffered);
            }
        });
        
        // Error
        this.audio.addEventListener('error', (e) => {
            console.error('Audio error:', e);
            this.events.emit('error', e);
            LyricFlow.showToast('Error playing audio', 'error');
        });
        
        // Waiting (buffering)
        this.audio.addEventListener('waiting', () => {
            this.state.isLoading = true;
            this.events.emit('waiting');
        });
        
        this.audio.addEventListener('canplay', () => {
            this.state.isLoading = false;
            this.events.emit('canplay');
        });
        
        // Volume change
        this.audio.addEventListener('volumechange', () => {
            this.state.volume = this.audio.volume;
            this.state.isMuted = this.audio.muted;
            LFUtils.storage.set('lf_volume', this.audio.volume);
        });
    },
    
    // Load song
    async load(song, startTime = 0) {
        if (!this.audio) return;
        
        this.state.isLoading = true;
        
        try {
            // Get audio URL
            let audioUrl = song.audioUrl || song.file;
            
            // Check offline cache
            if (LyricFlow.state.offlineMode) {
                const cached = await LFOffline.getAudio(song.id);
                if (cached) {
                    audioUrl = cached;
                } else {
                    throw new Error('Song not available offline');
                }
            }
            
            // Set source
            this.audio.src = audioUrl;
            this.audio.currentTime = startTime;
            
            // Preload
            this.audio.load();
            
            // Resume context if suspended
            if (this.context && this.context.state === 'suspended') {
                await this.context.resume();
            }
            
            // Update UI
            this.updateDuration();
            
        } catch (e) {
            console.error('Failed to load song:', e);
            LyricFlow.showToast('Failed to load song', 'error');
        } finally {
            this.state.isLoading = false;
        }
    },
    
    // Playback controls
    play() {
        if (!this.audio) return;
        
        const playPromise = this.audio.play();
        if (playPromise) {
            playPromise.catch(e => {
                console.error('Play failed:', e);
                // Auto-play blocked
                if (e.name === 'NotAllowedError') {
                    LyricFlow.showToast('Click to play audio', 'info');
                }
            });
        }
    },
    
    pause() {
        if (!this.audio) return;
        this.audio.pause();
    },
    
    toggle() {
        if (this.state.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    },
    
    // Seeking
    seekTo(timeOrPercent) {
        if (!this.audio || !this.state.duration) return;
        
        let targetTime;
        if (typeof timeOrPercent === 'number' && timeOrPercent <= 1) {
            // Percentage (0-1)
            targetTime = timeOrPercent * this.state.duration;
        } else {
            // Absolute time
            targetTime = timeOrPercent;
        }
        
        targetTime = Math.max(0, Math.min(targetTime, this.state.duration));
        this.audio.currentTime = targetTime;
        this.events.emit('seek', targetTime);
    },
    
    // Volume control
    setVolume(volume) {
        if (!this.audio) return;
        
        volume = Math.max(0, Math.min(1, volume));
        this.audio.volume = volume;
        this.state.volume = volume;
        
        // Update UI
        const miniVolume = $('#mini-volume');
        const fsVolume = $('#fs-volume-slider');
        
        if (miniVolume) miniVolume.value = volume * 100;
        if (fsVolume) fsVolume.value = volume * 100;
        
        // Unmute if setting volume
        if (volume > 0 && this.state.isMuted) {
            this.setMuted(false);
        }
    },
    
    changeVolume(delta) {
        this.setVolume(this.state.volume + delta);
    },
    
    // Mute control
    setMuted(muted) {
        if (!this.audio) return;
        
        this.audio.muted = muted;
        this.state.isMuted = muted;
        
        // Update UI
        const muteBtns = $$('#mini-mute, #fs-btn-mute');
        muteBtns.forEach(btn => {
            btn.classList.toggle('active', muted);
        });
        
        // Update icon
        this.updateVolumeIcon();
    },
    
    toggleMute() {
        this.setMuted(!this.state.isMuted);
    },
    
    // Playback rate
    setPlaybackRate(rate) {
        if (!this.audio) return;
        this.audio.playbackRate = rate;
        this.state.playbackRate = rate;
    },
    
    // Pitch shift (using Web Audio API)
    setPitchShift(semitones) {
        // Implementation would require a pitch shifter node
        // This is a placeholder for future implementation
        this.state.pitchShift = semitones;
    },
    
    // Get current time
    getCurrentTime() {
        return this.audio?.currentTime || 0;
    },
    
    // Get duration
    getDuration() {
        return this.state.duration || 0;
    },
    
    // Get progress (0-1)
    getProgress() {
        if (!this.state.duration) return 0;
        return this.state.currentTime / this.state.duration;
    },
    
    // Handle song ended
    handleEnded() {
        const { repeatMode } = LyricFlow.state;
        
        if (repeatMode === 'one') {
            this.audio.currentTime = 0;
            this.play();
        } else {
            LyricFlow.playNext();
        }
        
        this.events.emit('ended');
    },
    
    // Update UI methods
    updatePlayButton(isPlaying) {
        // Mini player
        const miniPlayIcon = $('#mini-icon-play');
        const miniPauseIcon = $('#mini-icon-pause');
        
        if (miniPlayIcon) miniPlayIcon.style.display = isPlaying ? 'none' : 'block';
        if (miniPauseIcon) miniPauseIcon.style.display = isPlaying ? 'block' : 'none';
        
        // Fullscreen player
        const fsPlayIcon = $('#fs-icon-play');
        const fsPauseIcon = $('#fs-icon-pause');
        
        if (fsPlayIcon) fsPlayIcon.style.display = isPlaying ? 'none' : 'block';
        if (fsPauseIcon) fsPauseIcon.style.display = isPlaying ? 'block' : 'none';
        
        // Vinyl animation
        const vinyl = $('#hero-vinyl, .vinyl-record');
        vinyl?.classList.toggle('playing', isPlaying);
    },
    
    updateProgress() {
        const progress = this.getProgress() * 100;
        
        // Mini player
        const miniFill = $('#mini-progress-fill');
        if (miniFill) miniFill.style.width = `${progress}%`;
        
        const miniTime = $('#mini-time');
        if (miniTime) miniTime.textContent = LFUtils.formatTime(this.state.currentTime);
        
        // Fullscreen player
        const fsFill = $('#fs-progress-fill');
        if (fsFill) fsFill.style.width = `${progress}%`;
        
        const fsHandle = $('#fs-progress-handle');
        if (fsHandle) fsHandle.style.left = `${progress}%`;
        
        const fsTime = $('#fs-time-current');
        if (fsTime) fsTime.textContent = LFUtils.formatTime(this.state.currentTime);
        
        // Update lyrics sync
        LFLyrics?.sync(this.state.currentTime);
    },
    
    updateDuration() {
        const duration = this.state.duration;
        
        // Mini player
        const miniDuration = $('#mini-duration');
        if (miniDuration) miniDuration.textContent = LFUtils.formatTime(duration);
        
        // Fullscreen player
        const fsDuration = $('#fs-time-total');
        if (fsDuration) fsDuration.textContent = LFUtils.formatTime(duration);
    },
    
    updateBuffered(buffered) {
        const duration = this.state.duration;
        if (!duration) return;
        
        const percent = (buffered / duration) * 100;
        
        // Could add buffered progress bar here
        // const bufferedBar = $('#buffered-bar');
        // if (bufferedBar) bufferedBar.style.width = `${percent}%`;
    },
    
    updateVolumeIcon() {
        const icons = $$('#mini-mute svg, #fs-btn-mute svg');
        const volume = this.state.isMuted ? 0 : this.state.volume;
        
        let iconPath;
        if (volume === 0) {
            iconPath = '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>';
        } else if (volume < 0.5) {
            iconPath = '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>';
        } else {
            iconPath = '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>';
        }
        
        icons.forEach(icon => {
            icon.innerHTML = iconPath;
        });
    },
    
    // Audio analysis for visualizer
    getFrequencyData() {
        if (!this.analyser) return new Uint8Array(0);
        
        const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        this.analyser.getByteFrequencyData(dataArray);
        return dataArray;
    },
    
    getWaveformData() {
        if (!this.analyser) return new Uint8Array(0);
        
        const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        this.analyser.getByteTimeDomainData(dataArray);
        return dataArray;
    },
    
    // Equalizer
    setEQ(bands) {
        // Implementation would create BiquadFilter nodes for each band
        this.state.eqSettings = bands;
    },
    
    // Effects
    addFilter(filter) {
        this.state.filters.push(filter);
        // Reconnect audio graph with filter
    },
    
    removeFilter(filter) {
        this.state.filters = this.state.filters.filter(f => f !== filter);
    },
    
    // Crossfade between songs
    async crossfade(nextSong, duration = 2) {
        const currentVolume = this.state.volume;
        
        // Fade out
        await this.fadeVolume(0, duration / 2);
        
        // Load and play next
        await this.load(nextSong);
        this.play();
        
        // Fade in
        await this.fadeVolume(currentVolume, duration / 2);
    },
    
    fadeVolume(targetVolume, duration) {
        return new Promise((resolve) => {
            if (!this.gainNode) {
                this.setVolume(targetVolume);
                resolve();
                return;
            }
            
            const startVolume = this.gainNode.gain.value;
            const startTime = this.context.currentTime;
            
            this.gainNode.gain.setTargetAtTime(targetVolume, startTime, duration / 3);
            
            setTimeout(resolve, duration * 1000);
        });
    },
    
    // Preload next song
    preload(song) {
        const audio = new Audio();
        audio.src = song.audioUrl || song.file;
        audio.preload = 'metadata';
    },
    
    // Cleanup
    destroy() {
        if (this.audio) {
            this.audio.pause();
            this.audio.src = '';
        }
        if (this.context) {
            this.context.close();
        }
    }
};
