/**
 * PLAYER MODULE v1.2
 * Advanced Audio Engine with Crossfade, Equalizer, and Effects
 */

App.player = {
    audio: null,
    audioContext: null,
    analyser: null,
    gainNode: null,
    source: null,
    
    state: {
        currentTime: 0,
        duration: 0,
        volume: 0.8,
        isMuted: false,
        playbackRate: 1,
        sleepTimer: null,
        sleepTimeLeft: 0
    },

    init() {
        this.audio = document.getElementById('audioPlayer');
        this.setupAudioContext();
        this.setupEventListeners();
        this.loadSettings();
    },

    setupAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            
            this.gainNode = this.audioContext.createGain();
            this.gainNode.connect(this.audioContext.destination);
            
            // Connect audio element to context
            this.source = this.audioContext.createMediaElementSource(this.audio);
            this.source.connect(this.analyser);
            this.analyser.connect(this.gainNode);
            
        } catch (e) {
            console.warn('Web Audio API not supported');
        }
    },

    setupEventListeners() {
        // Time update
        this.audio.addEventListener('timeupdate', () => {
            this.updateProgress();
            App.lyrics.sync(this.audio.currentTime);
        });
        
        // Play/Pause
        this.audio.addEventListener('play', () => {
            App.state.isPlaying = true;
            this.updatePlayButton();
            document.querySelector('.vinyl-container')?.classList.add('playing');
            
            // Resume audio context
            if (this.audioContext?.state === 'suspended') {
                this.audioContext.resume();
            }
        });
        
        this.audio.addEventListener('pause', () => {
            App.state.isPlaying = false;
            this.updatePlayButton();
            document.querySelector('.vinyl-container')?.classList.remove('playing');
        });
        
        // Ended
        this.audio.addEventListener('ended', () => {
            this.handleEnded();
        });
        
        // Loaded metadata
        this.audio.addEventListener('loadedmetadata', () => {
            this.state.duration = this.audio.duration;
            document.getElementById('totalTime').textContent = this.formatTime(this.audio.duration);
        });
        
        // Progress bar click
        document.getElementById('progressBar').addEventListener('click', (e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const pos = (e.clientX - rect.left) / rect.width;
            this.seekTo(pos * this.audio.duration);
        });
        
        // Volume
        document.getElementById('volumeSlider').addEventListener('input', (e) => {
            this.setVolume(e.target.value / 100);
        });
    },

    load(song, autoPlay = true) {
        if (!song) return;
        
        App.state.currentSong = song;
        
        // Update UI
        this.updateTrackInfo(song);
        
        // Load audio
        this.audio.src = song.audio;
        this.audio.load();
        
        // Update recent
        this.addToRecent(song);
        
        // Auto play
        if (autoPlay) {
            this.play();
        }
        
        // Update lyrics
        App.lyrics.load(song);
        
        // Update queue
        this.updateQueue();
        
        // Broadcast event for plugins
        App.plugins.emit('songChange', song);
    },

    play() {
        const playPromise = this.audio.play();
        if (playPromise) {
            playPromise.catch(err => {
                console.error('Playback failed:', err);
                App.toast.show('Playback failed. Check audio source.', 'error');
            });
        }
    },

    pause() {
        this.audio.pause();
    },

    toggle() {
        if (this.audio.paused) {
            this.play();
        } else {
            this.pause();
        }
    },

    next() {
        const queue = App.state.queue;
        const current = App.state.currentSong;
        
        if (!current || queue.length === 0) return;
        
        const currentIndex = queue.findIndex(s => s.id === current.id);
        let nextIndex;
        
        if (App.state.shuffle) {
            nextIndex = Math.floor(Math.random() * queue.length);
        } else {
            nextIndex = (currentIndex + 1) % queue.length;
        }
        
        const nextSong = queue[nextIndex];
        this.load(nextSong);
        
        // Crossfade effect
        if (App.config.crossfadeDuration > 0) {
            this.crossfade(nextSong);
        }
    },

    prev() {
        const queue = App.state.queue;
        const current = App.state.currentSong;
        
        if (!current || queue.length === 0) return;
        
        const currentIndex = queue.findIndex(s => s.id === current.id);
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : queue.length - 1;
        
        this.load(queue[prevIndex]);
    },

    seek(seconds) {
        this.seekTo(this.audio.currentTime + seconds);
    },

    seekTo(time) {
        if (isNaN(time)) return;
        this.audio.currentTime = Math.max(0, Math.min(time, this.audio.duration));
    },

    setVolume(value) {
        this.state.volume = Math.max(0, Math.min(1, value));
        this.audio.volume = this.state.volume;
        
        if (this.gainNode) {
            this.gainNode.gain.value = this.state.volume;
        }
        
        // Update UI
        document.getElementById('volumeSlider').value = this.state.volume * 100;
        this.updateVolumeIcon();
    },

    adjustVolume(delta) {
        this.setVolume(this.state.volume + delta);
    },

    toggleMute() {
        this.state.isMuted = !this.state.isMuted;
        this.audio.muted = this.state.isMuted;
        this.updateVolumeIcon();
    },

    setPlaybackRate(rate) {
        this.state.playbackRate = Math.max(0.5, Math.min(2, rate));
        this.audio.playbackRate = this.state.playbackRate;
    },

    // Crossfade between songs
    crossfade(nextSong) {
        const duration = App.config.crossfadeDuration;
        const steps = 20;
        const stepTime = (duration * 1000) / steps;
        const volumeStep = this.state.volume / steps;
        
        let currentStep = 0;
        const fadeOut = setInterval(() => {
            currentStep++;
            this.setVolume(this.state.volume - volumeStep);
            
            if (currentStep >= steps) {
                clearInterval(fadeOut);
                this.setVolume(App.config.defaultVolume);
            }
        }, stepTime);
    },

    // Sleep Timer
    setSleepTimer(minutes) {
        this.cancelSleep();
        
        this.state.sleepTimeLeft = minutes * 60;
        const timerEl = document.getElementById('sleepTimer');
        const timeLeftEl = document.getElementById('sleepTimeLeft');
        
        timerEl.classList.add('active');
        
        this.state.sleepTimer = setInterval(() => {
            this.state.sleepTimeLeft--;
            
            const mins = Math.floor(this.state.sleepTimeLeft / 60);
            const secs = this.state.sleepTimeLeft % 60;
            timeLeftEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
            
            if (this.state.sleepTimeLeft <= 0) {
                this.pause();
                this.cancelSleep();
                App.toast.show('Sleep timer ended', 'info');
            }
        }, 1000);
        
        App.toast.show(`Sleep timer set for ${minutes} minutes`, 'success');
    },

    cancelSleep() {
        if (this.state.sleepTimer) {
            clearInterval(this.state.sleepTimer);
            this.state.sleepTimer = null;
        }
        document.getElementById('sleepTimer').classList.remove('active');
    },

    // UI Updates
    updateTrackInfo(song) {
        // Mini player
        document.getElementById('miniTitle').textContent = song.title;
        document.getElementById('miniArtist').textContent = song.artist;
        document.getElementById('miniCover').src = song.cover;
        
        // Expanded player
        document.getElementById('expandedTitle').textContent = song.title;
        document.getElementById('expandedArtist').textContent = song.artist;
        document.getElementById('expandedCover').src = song.cover;
        document.getElementById('expandedBg').style.backgroundImage = `url(${song.cover})`;
        
        // Mini floating player
        document.getElementById('miniPlayerTitle').textContent = song.title;
        document.getElementById('miniPlayerArtist').textContent = song.artist;
        document.getElementById('miniPlayerCover').src = song.cover;
        
        // Favorite button
        this.updateFavoriteButton();
        
        // Document title
        document.title = `${song.title} - ${song.artist} | LyricFlow`;
    },

    updateProgress() {
        const current = this.audio.currentTime;
        const duration = this.audio.duration || 0;
        const progress = duration ? (current / duration) * 100 : 0;
        
        document.getElementById('progressFill').style.width = `${progress}%`;
        document.getElementById('currentTime').textContent = this.formatTime(current);
    },

    updatePlayButton() {
        const btn = document.getElementById('playBtn');
        btn.textContent = App.state.isPlaying ? '⏸' : '▶';
    },

    updateVolumeIcon() {
        const btn = document.querySelector('.btn-volume');
        if (this.state.isMuted || this.state.volume === 0) {
            btn.textContent = '🔇';
        } else if (this.state.volume < 0.5) {
            btn.textContent = '🔉';
        } else {
            btn.textContent = '🔊';
        }
    },

    updateFavoriteButton() {
        const btn = document.querySelector('.btn-favorite');
        const isFav = App.state.favorites.has(App.state.currentSong?.id);
        btn.textContent = isFav ? '❤️' : '🤍';
        btn.classList.toggle('active', isFav);
    },

    toggleFavorite() {
        const song = App.state.currentSong;
        if (!song) return;
        
        if (App.state.favorites.has(song.id)) {
            App.state.favorites.delete(song.id);
            App.toast.show('Removed from favorites', 'info');
        } else {
            App.state.favorites.add(song.id);
            App.toast.show('Added to favorites', 'success');
        }
        
        this.updateFavoriteButton();
        App.saveData();
    },

    toggleShuffle() {
        App.state.shuffle = !App.state.shuffle;
        document.querySelector('.btn-shuffle').classList.toggle('active', App.state.shuffle);
        App.toast.show(App.state.shuffle ? 'Shuffle ON' : 'Shuffle OFF', 'info');
    },

    toggleRepeat() {
        const modes = ['none', 'all', 'one'];
        const currentIndex = modes.indexOf(App.state.repeat);
        App.state.repeat = modes[(currentIndex + 1) % modes.length];
        
        const icons = { none: '🔁', all: '🔁', one: '🔂' };
        document.querySelector('.btn-repeat').textContent = icons[App.state.repeat];
        
        const labels = { none: 'Repeat OFF', all: 'Repeat All', one: 'Repeat One' };
        App.toast.show(labels[App.state.repeat], 'info');
    },

    handleEnded() {
        if (App.state.repeat === 'one') {
            this.audio.currentTime = 0;
            this.play();
        } else {
            this.next();
        }
    },

    addToRecent(song) {
        App.state.recent = App.state.recent.filter(s => s.id !== song.id);
        App.state.recent.unshift({ ...song, playedAt: Date.now() });
        App.state.recent = App.state.recent.slice(0, 50);
        App.saveData();
    },

    updateQueue() {
        // Build queue based on current view
        switch(App.state.currentView) {
            case 'favorites':
                App.state.queue = App.state.songs.filter(s => App.state.favorites.has(s.id));
                break;
            case 'playlist':
                // Get current playlist songs
                break;
            default:
                App.state.queue = [...App.state.songs];
        }
        
        // Update up next
        this.renderUpNext();
    },

    renderUpNext() {
        const container = document.getElementById('upNextList');
        const currentIndex = App.state.queue.findIndex(s => s.id === App.state.currentSong?.id);
        const upNext = App.state.queue.slice(currentIndex + 1, currentIndex + 4);
        
        container.innerHTML = upNext.map(song => `
            <div class="up-next-item" onclick="app.player.loadById('${song.id}')">
                <img src="${song.cover}" alt="">
                <div>
                    <div class="up-next-title">${song.title}</div>
                    <div class="up-next-artist">${song.artist}</div>
                </div>
            </div>
        `).join('');
    },

    loadById(id) {
        const song = App.state.songs.find(s => s.id === id);
        if (song) this.load(song);
    },

    expand() {
        document.getElementById('expandedPlayer').classList.add('active');
        App.visualizer.start();
    },

    collapse() {
        document.getElementById('expandedPlayer').classList.remove('active');
        App.visualizer.stop();
    },

    formatTime(seconds) {
        if (isNaN(seconds)) return '00:00:00';
        
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hrs > 0) {
            return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        }
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    },

    loadSettings() {
        this.setVolume(App.config.defaultVolume);
    }
};
