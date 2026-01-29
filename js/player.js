
 * LYRICFLOW v1.3 - PLAYER MODULE
 * Advanced Audio Player with Visualization
 */

class Player {
    constructor(app) {
        this.app = app;
        this.audio = new Audio();
        this.audioContext = null;
        this.analyser = null;
        this.source = null;
        this.gainNode = null;
        
        this.isPlaying = false;
        this.currentTrack = null;
        this.queue = [];
        this.currentIndex = 0;
        
        this.repeatMode = 'none'; // none, all, one
        this.shuffleMode = false;
        this.volume = 0.7;
        this.muted = false;
        this.playbackRate = 1;
        
        this.visualizer = null;
        this.equalizer = null;
        
        this.init();
    }

    async init() {
        this.setupAudioContext();
        this.setupEventListeners();
        this.loadSavedState();
        
        // Initialize visualizer
        if (window.Visualizer) {
            this.visualizer = new Visualizer(this.app);
        }
    }

    setupAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            
            this.gainNode = this.audioContext.createGain();
            this.gainNode.gain.value = this.volume;
            
            this.source = this.audioContext.createMediaElementSource(this.audio);
            this.source.connect(this.analyser);
            this.analyser.connect(this.gainNode);
            this.gainNode.connect(this.audioContext.destination);
            
        } catch (error) {
            console.warn('Web Audio API not supported:', error);
        }
    }

    setupEventListeners() {
        // Audio events
        this.audio.addEventListener('loadedmetadata', () => {
            this.onLoadedMetadata();
        });

        this.audio.addEventListener('timeupdate', () => {
            this.onTimeUpdate();
        });

        this.audio.addEventListener('ended', () => {
            this.onEnded();
        });

        this.audio.addEventListener('error', (e) => {
            this.onError(e);
        });

        this.audio.addEventListener('waiting', () => {
            this.showBuffering(true);
        });

        this.audio.addEventListener('playing', () => {
            this.showBuffering(false);
        });

        // Control buttons
        const btnPlay = document.getElementById('btn-play');
        const btnPrev = document.getElementById('btn-prev');
        const btnNext = document.getElementById('btn-next');
        const btnShuffle = document.getElementById('btn-shuffle');
        const btnRepeat = document.getElementById('btn-repeat');
        const btnMute = document.getElementById('btn-mute');
        const progressBar = document.getElementById('progress-bar');
        const volumeSlider = document.getElementById('volume-slider');

        if (btnPlay) {
            btnPlay.addEventListener('click', () => this.togglePlay());
        }
        
        if (btnPrev) {
            btnPrev.addEventListener('click', () => this.previous());
        }
        
        if (btnNext) {
            btnNext.addEventListener('click', () => this.next());
        }
        
        if (btnShuffle) {
            btnShuffle.addEventListener('click', () => this.toggleShuffle());
        }
        
        if (btnRepeat) {
            btnRepeat.addEventListener('click', () => this.toggleRepeat());
        }
        
        if (btnMute) {
            btnMute.addEventListener('click', () => this.toggleMute());
        }

        if (progressBar) {
            progressBar.addEventListener('click', (e) => this.seekToClick(e));
            
            // Drag functionality
            let isDragging = false;
            
            progressBar.addEventListener('mousedown', () => isDragging = true);
            document.addEventListener('mouseup', () => isDragging = false);
            document.addEventListener('mousemove', (e) => {
                if (isDragging) this.seekToClick(e);
            });
        }

        if (volumeSlider) {
            volumeSlider.addEventListener('click', (e) => this.setVolumeFromClick(e));
        }

        // Mini player controls
        const miniPlay = document.getElementById('mini-play');
        const miniPrev = document.getElementById('mini-prev');
        const miniNext = document.getElementById('mini-next');

        if (miniPlay) {
            miniPlay.addEventListener('click', () => this.togglePlay());
        }
        if (miniPrev) {
            miniPrev.addEventListener('click', () => this.previous());
        }
        if (miniNext) {
            miniNext.addEventListener('click', () => this.next());
        }

        // Speed control
        const btnSpeed = document.getElementById('btn-speed');
        if (btnSpeed) {
            btnSpeed.addEventListener('click', () => this.cyclePlaybackSpeed());
        }
    }

    load(track) {
        if (!track) return;
        
        this.currentTrack = track;
        this.audio.src = track.url;
        this.audio.load();
        
        // Update UI
        this.updateTrackInfo(track);
        this.updateMediaSession(track);
        
        // Resume audio context if suspended
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }

    play() {
        if (!this.audio.src) return;
        
        const playPromise = this.audio.play();
        
        if (playPromise !== undefined) {
            playPromise
                .then(() => {
                    this.isPlaying = true;
                    this.updatePlayButton(true);
                    this.startVisualizer();
                    this.app.isPlaying = true;
                })
                .catch(error => {
                    console.error('Playback failed:', error);
                    this.app.showToast('Playback failed. Please try again.', 'error');
                });
        }
    }

    pause() {
        this.audio.pause();
        this.isPlaying = false;
        this.updatePlayButton(false);
        this.stopVisualizer();
        this.app.isPlaying = false;
    }

    togglePlay() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    previous() {
        if (this.queue.length === 0) return;
        
        if (this.audio.currentTime > 3) {
            // Restart current track if more than 3 seconds in
            this.seek(0);
        } else {
            // Go to previous track
            if (this.shuffleMode) {
                this.currentIndex = Math.floor(Math.random() * this.queue.length);
            } else {
                this.currentIndex = (this.currentIndex - 1 + this.queue.length) % this.queue.length;
            }
            
            const track = this.queue[this.currentIndex];
            this.load(track);
            this.play();
        }
    }

    next() {
        if (this.queue.length === 0) return;
        
        if (this.shuffleMode) {
            this.currentIndex = Math.floor(Math.random() * this.queue.length);
        } else {
            this.currentIndex = (this.currentIndex + 1) % this.queue.length;
        }
        
        const track = this.queue[this.currentIndex];
        this.load(track);
        this.play();
    }

    seek(seconds) {
        if (this.audio.duration) {
            this.audio.currentTime = Math.max(0, Math.min(
                this.audio.duration,
                this.audio.currentTime + seconds
            ));
        }
    }

    seekTo(time) {
        if (this.audio.duration) {
            this.audio.currentTime = Math.max(0, Math.min(this.audio.duration, time));
        }
    }

    seekToClick(e) {
        const progressBar = e.currentTarget;
        const rect = progressBar.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        
        if (this.audio.duration) {
            this.audio.currentTime = percent * this.audio.duration;
        }
    }

    setVolume(value) {
        this.volume = Math.max(0, Math.min(1, value));
        
        if (this.gainNode) {
            this.gainNode.gain.value = this.muted ? 0 : this.volume;
        } else {
            this.audio.volume = this.muted ? 0 : this.volume;
        }
        
        this.updateVolumeUI();
        this.saveState();
    }

    adjustVolume(delta) {
        this.setVolume(this.volume + delta);
    }

    setVolumeFromClick(e) {
        const slider = e.currentTarget;
        const rect = slider.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        this.setVolume(percent);
    }

    toggleMute() {
        this.muted = !this.muted;
        
        if (this.gainNode) {
            this.gainNode.gain.value = this.muted ? 0 : this.volume;
        } else {
            this.audio.volume = this.muted ? 0 : this.volume;
        }
        
        this.updateVolumeUI();
    }

    toggleShuffle() {
        this.shuffleMode = !this.shuffleMode;
        
        const btnShuffle = document.getElementById('btn-shuffle');
        if (btnShuffle) {
            btnShuffle.classList.toggle('active', this.shuffleMode);
            btnShuffle.style.color = this.shuffleMode ? 'var(--primary)' : '';
        }
        
        this.app.showToast(`Shuffle ${this.shuffleMode ? 'enabled' : 'disabled'}`, 'info');
    }

    toggleRepeat() {
        const modes = ['none', 'all', 'one'];
        const currentIndex = modes.indexOf(this.repeatMode);
        this.repeatMode = modes[(currentIndex + 1) % modes.length];
        
        const btnRepeat = document.getElementById('btn-repeat');
        if (btnRepeat) {
            btnRepeat.classList.remove('active');
            btnRepeat.style.color = '';
            
            if (this.repeatMode !== 'none') {
                btnRepeat.classList.add('active');
                btnRepeat.style.color = 'var(--primary)';
            }
            
            // Update icon for one-track repeat
            const icon = btnRepeat.querySelector('i');
            if (icon) {
                if (this.repeatMode === 'one') {
                    icon.classList.remove('fa-redo');
                    icon.classList.add('fa-redo-alt');
                } else {
                    icon.classList.remove('fa-redo-alt');
                    icon.classList.add('fa-redo');
                }
            }
        }
        
        const labels = {
            none: 'Repeat off',
            all: 'Repeat all',
            one: 'Repeat one'
        };
        this.app.showToast(labels[this.repeatMode], 'info');
    }

    cyclePlaybackSpeed() {
        const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
        const currentIndex = speeds.indexOf(this.playbackRate);
        this.playbackRate = speeds[(currentIndex + 1) % speeds.length];
        
        this.audio.playbackRate = this.playbackRate;
        
        const btnSpeed = document.getElementById('btn-speed');
        if (btnSpeed) {
            btnSpeed.innerHTML = `<span>${this.playbackRate}x</span>`;
        }
        
        this.app.showToast(`Playback speed: ${this.playbackRate}x`, 'info');
    }

    onLoadedMetadata() {
        this.updateDuration();
        this.updateProgress();
    }

    onTimeUpdate() {
        this.updateProgress();
        this.updateCurrentTime();
        
        // Update lyrics sync
        if (this.app.lyrics) {
            this.app.lyrics.sync(this.audio.currentTime);
        }
        
        // Update mini player progress
        this.updateMiniProgress();
    }

    onEnded() {
        if (this.repeatMode === 'one') {
            this.audio.currentTime = 0;
            this.play();
        } else if (this.currentIndex < this.queue.length - 1 || this.repeatMode === 'all') {
            this.next();
        } else {
            this.pause();
            this.audio.currentTime = 0;
        }
    }

    onError(error) {
        console.error('Audio error:', error);
        this.app.showToast('Error playing track', 'error');
    }

    updateTrackInfo(track) {
        // Update main player
        const titleEl = document.getElementById('current-title');
        const artistEl = document.getElementById('current-artist');
        const albumEl = document.getElementById('current-album');
        const yearEl = document.getElementById('current-year');
        const albumArt = document.getElementById('current-album-art');
        const blurBg = document.getElementById('player-blur-bg');

        if (titleEl) titleEl.textContent = track.title || 'Unknown Title';
        if (artistEl) artistEl.textContent = track.artist || 'Unknown Artist';
        if (albumEl) albumEl.textContent = track.album || 'Unknown Album';
        if (yearEl) yearEl.textContent = track.year || '2024';

        if (albumArt) {
            if (track.cover) {
                albumArt.innerHTML = `<img src="${track.cover}" alt="${track.title}">`;
                if (blurBg) {
                    blurBg.style.backgroundImage = `url(${track.cover})`;
                    blurBg.style.backgroundSize = 'cover';
                    blurBg.style.backgroundPosition = 'center';
                }
            } else {
                albumArt.innerHTML = `
                    <div class="album-art-placeholder">
                        <i class="fas fa-music"></i>
                    </div>
                `;
            }
        }

        // Update document title
        document.title = `${track.title} - ${track.artist} | LyricFlow`;
    }

    updatePlayButton(playing) {
        const buttons = [
            document.getElementById('btn-play'),
            document.getElementById('mini-play')
        ];

        buttons.forEach(btn => {
            if (btn) {
                const icon = btn.querySelector('i');
                if (icon) {
                    icon.classList.remove('fa-play', 'fa-pause');
                    icon.classList.add(playing ? 'fa-pause' : 'fa-play');
                }
            }
        });

        // Update playing indicator
        const indicator = document.querySelector('.playing-indicator');
        if (indicator) {
            indicator.classList.toggle('active', playing);
        }
    }

    updateProgress() {
        if (!this.audio.duration) return;
        
        const percent = (this.audio.currentTime / this.audio.duration) * 100;
        
        const progressFill = document.getElementById('progress-fill');
        const progressHandle = document.getElementById('progress-handle');
        
        if (progressFill) progressFill.style.width = percent + '%';
        if (progressHandle) progressHandle.style.left = percent + '%';
    }

    updateMiniProgress() {
        if (!this.audio.duration) return;
        
        const percent = (this.audio.currentTime / this.audio.duration) * 100;
        const miniProgress = document.getElementById('mini-progress');
        
        if (miniProgress) miniProgress.style.width = percent + '%';
    }

    updateCurrentTime() {
        const currentTimeEl = document.getElementById('current-time');
        if (currentTimeEl) {
            currentTimeEl.textContent = this.app.formatTime(this.audio.currentTime);
        }
    }

    updateDuration() {
        const totalTimeEl = document.getElementById('total-time');
        if (totalTimeEl) {
            totalTimeEl.textContent = this.app.formatTime(this.audio.duration);
        }
    }

    updateVolumeUI() {
        const volumeFill = document.getElementById('volume-fill');
        const btnMute = document.getElementById('btn-mute');
        
        if (volumeFill) {
            volumeFill.style.width = (this.muted ? 0 : this.volume * 100) + '%';
        }
        
        if (btnMute) {
            const icon = btnMute.querySelector('i');
            if (icon) {
                icon.classList.remove('fa-volume-up', 'fa-volume-down', 'fa-volume-off', 'fa-volume-mute');
                
                if (this.muted || this.volume === 0) {
                    icon.classList.add('fa-volume-mute');
                } else if (this.volume < 0.3) {
                    icon.classList.add('fa-volume-off');
                } else if (this.volume < 0.7) {
                    icon.classList.add('fa-volume-down');
                } else {
                    icon.classList.add('fa-volume-up');
                }
            }
        }
    }

    updateMediaSession(track) {
        if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: track.title,
                artist: track.artist,
                album: track.album,
                artwork: track.cover ? [{ src: track.cover }] : []
            });

            navigator.mediaSession.setActionHandler('play', () => this.play());
            navigator.mediaSession.setActionHandler('pause', () => this.pause());
            navigator.mediaSession.setActionHandler('previoustrack', () => this.previous());
            navigator.mediaSession.setActionHandler('nexttrack', () => this.next());
            navigator.mediaSession.setActionHandler('seekbackward', () => this.seek(-10));
            navigator.mediaSession.setActionHandler('seekforward', () => this.seek(10));
        }
    }

    startVisualizer() {
        if (this.visualizer) {
            this.visualizer.start(this.analyser);
        }
    }

    stopVisualizer() {
        if (this.visualizer) {
            this.visualizer.stop();
        }
    }

    showBuffering(show) {
        const btnPlay = document.getElementById('btn-play');
        if (btnPlay) {
            if (show) {
                btnPlay.classList.add('buffering');
            } else {
                btnPlay.classList.remove('buffering');
            }
        }
    }

    setQueue(tracks, startIndex = 0) {
        this.queue = tracks;
        this.currentIndex = startIndex;
    }

    addToQueue(track) {
        this.queue.push(track);
        this.app.showToast('Added to queue', 'success');
    }

    removeFromQueue(index) {
        this.queue.splice(index, 1);
        if (index < this.currentIndex) {
            this.currentIndex--;
        }
    }

    clearQueue() {
        this.queue = [];
        this.currentIndex = 0;
    }

    saveState() {
        const state = {
            volume: this.volume,
            muted: this.muted,
            repeatMode: this.repeatMode,
            shuffleMode: this.shuffleMode,
            playbackRate: this.playbackRate
        };
        localStorage.setItem('lyricflow_player', JSON.stringify(state));
    }

    loadSavedState() {
        const saved = localStorage.getItem('lyricflow_player');
        if (saved) {
            const state = JSON.parse(saved);
            this.volume = state.volume ?? 0.7;
            this.muted = state.muted ?? false;
            this.repeatMode = state.repeatMode ?? 'none';
            this.shuffleMode = state.shuffleMode ?? false;
            this.playbackRate = state.playbackRate ?? 1;
            
            // Apply settings
            this.setVolume(this.volume);
            this.audio.playbackRate = this.playbackRate;
            
            // Update UI
            const btnSpeed = document.getElementById('btn-speed');
            if (btnSpeed) {
                btnSpeed.innerHTML = `<span>${this.playbackRate}x</span>`;
            }
        }
    }

    getCurrentTime() {
        return this.audio.currentTime;
    }

    getDuration() {
        return this.audio.duration;
    }

    getProgress() {
        if (!this.audio.duration) return 0;
        return (this.audio.currentTime / this.audio.duration) * 100;
    }
}