/**
 * LYRICFLOW v1.3 - CORE MODULE
 * Main application initialization and coordination
 */

const LyricFlow = {
    version: '1.3.0',
    initialized: false,
    events: new LFUtils.EventEmitter(),
    
    // Core modules
    modules: {},
    
    // App state
    state: {
        currentPage: 'home',
        isPlaying: false,
        currentSong: null,
        currentTime: 0,
        duration: 0,
        volume: 0.8,
        isMuted: false,
        isShuffled: false,
        repeatMode: 'none', // none, all, one
        queue: [],
        queueIndex: 0,
        favorites: new Set(),
        recentSongs: [],
        user: null,
        isDev: false,
        p2pConnected: false,
        offlineMode: false,
        theme: 'dark'
    },
    
    // ==========================================
    // INITIALIZATION
    // ==========================================
    
    async init() {
        if (this.initialized) return;
        
        console.log(`🎵 LyricFlow v${this.version} initializing...`);
        
        try {
            // Show loader
            this.updateLoader('Loading core modules...', 10);
            
            // Initialize database
            await LFUtils.db.init();
            this.updateLoader('Database ready', 20);
            
            // Load saved state
            await this.loadState();
            this.updateLoader('State restored', 30);
            
            // Initialize modules
            await this.initModules();
            this.updateLoader('Modules loaded', 50);
            
            // Setup event listeners
            this.setupEventListeners();
            this.updateLoader('Event listeners ready', 60);
            
            // Initialize UI
            this.initUI();
            this.updateLoader('UI initialized', 70);
            
            // Check auth status
            await this.checkAuth();
            this.updateLoader('Auth checked', 80);
            
            // Load initial data
            await this.loadInitialData();
            this.updateLoader('Data loaded', 90);
            
            // Hide loader
            this.updateLoader('Ready!', 100);
            setTimeout(() => this.hideLoader(), 500);
            
            this.initialized = true;
            this.events.emit('ready');
            
            console.log('✅ LyricFlow initialized successfully');
            
        } catch (error) {
            console.error('❌ Initialization failed:', error);
            this.showError('Failed to initialize app. Please refresh.');
        }
    },
    
    updateLoader(text, progress) {
        const statusEl = $('#loader-status');
        const barEl = $('.loader-bar');
        
        if (statusEl) statusEl.textContent = text;
        if (barEl) barEl.style.width = `${progress}%`;
    },
    
    hideLoader() {
        const loader = $('#app-loader');
        const app = $('#app');
        
        if (loader) loader.classList.add('hidden');
        if (app) app.classList.add('loaded');
    },
    
    showError(message) {
        const loader = $('#app-loader');
        if (loader) {
            loader.innerHTML = `
                <div style="text-align: center; padding: 2rem;">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#fb5607" stroke-width="2" style="margin-bottom: 1rem;">
                        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    <h2 style="color: #fb5607; margin-bottom: 0.5rem;">Error</h2>
                    <p style="color: var(--text-secondary);">${message}</p>
                    <button onclick="location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: var(--primary); border: none; border-radius: 0.5rem; color: white; cursor: pointer;">Refresh</button>
                </div>
            `;
        }
    },
    
    // ==========================================
    // MODULE INITIALIZATION
    // ==========================================
    
    async initModules() {
        // Core modules are loaded via script tags in order
        // This ensures proper initialization order
        
        this.modules.player = LFPlayer;
        this.modules.lyrics = LFLyrics;
        this.modules.playlist = LFPlaylist;
        this.modules.library = LFLibrary;
        this.modules.themes = LFThemes;
        this.modules.ui = LFUI;
        this.modules.visualizer = LFVisualizer;
        this.modules.p2p = LFP2P;
        this.modules.offline = LFOffline;
        this.modules.voice = LFVoice;
        this.modules.analytics = LFAnalytics;
        this.modules.dev = LFDev;
        
        // Initialize each module
        for (const [name, module] of Object.entries(this.modules)) {
            if (module && typeof module.init === 'function') {
                try {
                    await module.init();
                    console.log(`  ✓ ${name} initialized`);
                } catch (e) {
                    console.warn(`  ✗ ${name} failed:`, e);
                }
            }
        }
    },
    
    // ==========================================
    // STATE MANAGEMENT
    // ==========================================
    
    async loadState() {
        const saved = LFUtils.storage.get('lf_state');
        if (saved) {
            Object.assign(this.state, saved);
            this.state.favorites = new Set(saved.favorites || []);
        }
        
        // Load theme
        const savedTheme = LFUtils.storage.get('lf_theme') || 'dark';
        this.setTheme(savedTheme, false);
    },
    
    saveState() {
        const toSave = {
            ...this.state,
            favorites: Array.from(this.state.favorites),
            currentTime: this.modules.player?.getCurrentTime() || 0
        };
        LFUtils.storage.set('lf_state', toSave);
    },
    
    setState(key, value) {
        this.state[key] = value;
        this.events.emit('stateChange', { key, value });
        this.debouncedSave();
    },
    
    debouncedSave: LFUtils.debounce(() => {
        LyricFlow.saveState();
    }, 1000),
    
    // ==========================================
    // THEME MANAGEMENT
    // ==========================================
    
    setTheme(theme, save = true) {
        document.documentElement.setAttribute('data-theme', theme);
        this.state.theme = theme;
        
        // Update theme stylesheet
        const themeLink = $('#theme-stylesheet');
        if (themeLink) {
            themeLink.href = `css/themes/${theme}.css`;
        }
        
        if (save) {
            LFUtils.storage.set('lf_theme', theme);
        }
        
        this.events.emit('themeChange', theme);
    },
    
    // ==========================================
    // AUTHENTICATION
    // ==========================================
    
    async checkAuth() {
        const token = LFUtils.storage.get('auth_token');
        if (!token) return;
        
        try {
            const user = await LFAPI.auth.me();
            this.setState('user', user);
            this.updateUserUI(user);
        } catch (e) {
            // Token invalid
            LFAPI.clearToken();
        }
    },
    
    async login(credentials) {
        try {
            const data = await LFAPI.auth.login(credentials);
            this.setState('user', data.user);
            this.updateUserUI(data.user);
            this.events.emit('login', data.user);
            return data;
        } catch (e) {
            throw e;
        }
    },
    
    async logout() {
        try {
            await LFAPI.auth.logout();
        } catch (e) {
            console.error('Logout error:', e);
        } finally {
            this.setState('user', null);
            this.setState('isDev', false);
            this.updateUserUI(null);
            this.events.emit('logout');
        }
    },
    
    updateUserUI(user) {
        const nameEl = $('#user-name');
        const dropdownName = $('#dropdown-name');
        const dropdownEmail = $('#dropdown-email');
        const avatarEl = $('#user-avatar');
        const devSection = $('#dev-section');
        const devLoginItem = $('#dev-login-item');
        
        if (user) {
            if (nameEl) nameEl.textContent = user.name || user.username;
            if (dropdownName) dropdownName.textContent = user.name || user.username;
            if (dropdownEmail) dropdownEmail.textContent = user.email;
            if (avatarEl) avatarEl.src = user.avatar || 'assets/images/default-avatar.png';
            if (devSection) devSection.style.display = user.role === 'developer' ? 'block' : 'none';
            if (devLoginItem) devLoginItem.style.display = 'none';
        } else {
            if (nameEl) nameEl.textContent = 'Guest';
            if (dropdownName) dropdownName.textContent = 'Guest User';
            if (dropdownEmail) dropdownEmail.textContent = 'guest@lyricflow.app';
            if (avatarEl) avatarEl.src = 'assets/images/default-avatar.png';
            if (devSection) devSection.style.display = 'none';
            if (devLoginItem) devLoginItem.style.display = 'block';
        }
    },
    
    // ==========================================
    // DATA LOADING
    // ==========================================
    
    async loadInitialData() {
        // Load songs from IndexedDB
        try {
            const songs = await LFUtils.db.getAll('songs');
            this.modules.library.setSongs(songs);
        } catch (e) {
            console.warn('Failed to load songs from DB:', e);
        }
        
        // Load recent songs
        const recent = LFUtils.storage.get('lf_recent') || [];
        this.setState('recentSongs', recent);
        
        // Load favorites
        const favs = LFUtils.storage.get('lf_favorites') || [];
        this.setState('favorites', new Set(favs));
        
        // Update UI
        this.updateFavoritesCount();
    },
    
    // ==========================================
    // NAVIGATION
    // ==========================================
    
    navigateTo(pageId, params = {}) {
        // Hide all pages
        $$('.page').forEach(page => {
            page.classList.remove('active');
        });
        
        // Show target page
        const targetPage = $(`#page-${pageId}`);
        if (targetPage) {
            targetPage.classList.add('active');
            this.setState('currentPage', pageId);
        }
        
        // Update nav
        $$('.nav-link').forEach(link => {
            link.classList.toggle('active', link.dataset.page === pageId);
        });
        
        // Emit event
        this.events.emit('navigate', { page: pageId, params });
        
        // Save to history
        if (pageId !== 'player') {
            history.pushState({ page: pageId }, '', `#${pageId}`);
        }
    },
    
    // ==========================================
    // SONG MANAGEMENT
    // ==========================================
    
    async playSong(song, startTime = 0) {
        if (!song) return;
        
        // Add to recent
        this.addToRecent(song);
        
        // Update state
        this.setState('currentSong', song);
        this.setState('isPlaying', true);
        
        // Load in player
        await this.modules.player.load(song, startTime);
        this.modules.player.play();
        
        // Load lyrics
        await this.modules.lyrics.load(song.id);
        
        // Update UI
        this.updateNowPlaying(song);
        
        // Emit event
        this.events.emit('play', song);
    },
    
    togglePlay() {
        if (this.state.isPlaying) {
            this.modules.player.pause();
        } else {
            this.modules.player.play();
        }
    },
    
    playNext() {
        const { queue, queueIndex, isShuffled } = this.state;
        
        let nextIndex;
        if (isShuffled) {
            nextIndex = Math.floor(Math.random() * queue.length);
        } else {
            nextIndex = queueIndex + 1;
        }
        
        if (nextIndex < queue.length) {
            this.setState('queueIndex', nextIndex);
            this.playSong(queue[nextIndex]);
        } else if (this.state.repeatMode === 'all') {
            this.setState('queueIndex', 0);
            this.playSong(queue[0]);
        }
    },
    
    playPrevious() {
        const { queue, queueIndex } = this.state;
        
        if (queueIndex > 0) {
            this.setState('queueIndex', queueIndex - 1);
            this.playSong(queue[queueIndex - 1]);
        }
    },
    
    addToQueue(song) {
        const queue = [...this.state.queue, song];
        this.setState('queue', queue);
        this.showToast('Added to queue', 'success');
    },
    
    clearQueue() {
        this.setState('queue', []);
        this.setState('queueIndex', 0);
    },
    
    // ==========================================
    // FAVORITES
    // ==========================================
    
    toggleFavorite(songId) {
        const favs = this.state.favorites;
        
        if (favs.has(songId)) {
            favs.delete(songId);
            this.showToast('Removed from favorites', 'info');
        } else {
            favs.add(songId);
            this.showToast('Added to favorites', 'success');
        }
        
        this.setState('favorites', new Set(favs));
        LFUtils.storage.set('lf_favorites', Array.from(favs));
        this.updateFavoritesCount();
        this.events.emit('favoritesChange', songId);
    },
    
    isFavorite(songId) {
        return this.state.favorites.has(songId);
    },
    
    updateFavoritesCount() {
        const countEl = $('#fav-count');
        if (countEl) {
            const count = this.state.favorites.size;
            countEl.textContent = count;
            countEl.style.display = count > 0 ? 'inline-flex' : 'none';
        }
    },
    
    // ==========================================
    // RECENT SONGS
    // ==========================================
    
    addToRecent(song) {
        let recent = this.state.recentSongs.filter(s => s.id !== song.id);
        recent.unshift(song);
        recent = recent.slice(0, 50); // Keep last 50
        
        this.setState('recentSongs', recent);
        LFUtils.storage.set('lf_recent', recent);
    },
    
    clearRecent() {
        this.setState('recentSongs', []);
        LFUtils.storage.remove('lf_recent');
        this.showToast('History cleared', 'info');
    },
    
    // ==========================================
    // UI UPDATES
    // ==========================================
    
    updateNowPlaying(song) {
        // Mini player
        const miniTitle = $('#mini-title');
        const miniArtist = $('#mini-artist');
        const miniCover = $('#mini-cover');
        const miniLike = $('#mini-like');
        
        if (miniTitle) miniTitle.textContent = song.title;
        if (miniArtist) miniArtist.textContent = song.artist;
        if (miniCover) miniCover.src = song.cover || 'assets/images/default-cover.png';
        if (miniLike) {
            miniLike.classList.toggle('active', this.isFavorite(song.id));
        }
        
        // Fullscreen player
        const fsTitle = $('#fs-song-title');
        const fsArtist = $('#fs-song-artist');
        const fsCover = $('#fs-album-art');
        const fsBackdrop = $('#player-backdrop');
        
        if (fsTitle) fsTitle.textContent = song.title;
        if (fsArtist) fsArtist.textContent = song.artist;
        if (fsCover) fsCover.src = song.cover || 'assets/images/default-cover.png';
        
        // Update backdrop
        if (fsBackdrop && song.cover) {
            fsBackdrop.style.backgroundImage = `url(${song.cover})`;
        }
        
        // Update document title
        document.title = `${song.title} - ${song.artist} | LyricFlow`;
    },
    
    // ==========================================
    // TOAST NOTIFICATIONS
    // ==========================================
    
    showToast(message, type = 'info', duration = 3000) {
        const container = $('#toast-container');
        if (!container) return;
        
        const icons = {
            success: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
            error: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
            warning: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
            info: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
        };
        
        const toast = LFUtils.createElement('div', {
            className: `toast toast-${type}`
        }, 
            LFUtils.createElement('div', { className: 'toast-icon' }, icons[type]),
            LFUtils.createElement('div', { className: 'toast-content' },
                LFUtils.createElement('div', { className: 'toast-title' }, type.charAt(0).toUpperCase() + type.slice(1)),
                LFUtils.createElement('div', { className: 'toast-message' }, message)
            ),
            LFUtils.createElement('button', { 
                className: 'toast-close',
                onclick: () => this.removeToast(toast)
            }, '×')
        );
        
        container.appendChild(toast);
        
        // Auto remove
        if (duration > 0) {
            setTimeout(() => this.removeToast(toast), duration);
        }
        
        return toast;
    },
    
    removeToast(toast) {
        toast.classList.add('toast-out');
        setTimeout(() => toast.remove(), 300);
    },
    
    // ==========================================
    // EVENT LISTENERS
    // ==========================================
    
    setupEventListeners() {
        // Navigation
        $$('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.dataset.page;
                if (page) this.navigateTo(page);
            });
        });
        
        // Sidebar toggle
        $('#sidebar-toggle')?.addEventListener('click', () => {
            $('.sidebar')?.classList.toggle('active');
            $('.sidebar-overlay')?.classList.toggle('active');
        });
        
        // Theme switcher
        $('#btn-theme')?.addEventListener('click', (e) => {
            e.stopPropagation();
            $('#theme-dropdown')?.classList.toggle('active');
        });
        
        $$('#theme-dropdown button').forEach(btn => {
            btn.addEventListener('click', () => {
                this.setTheme(btn.dataset.theme);
                $('#theme-dropdown')?.classList.remove('active');
            });
        });
        
        // User menu
        $('#user-menu-btn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            $('#user-dropdown')?.classList.toggle('active');
        });
        
        // Close dropdowns on click outside
        document.addEventListener('click', () => {
            $('#theme-dropdown')?.classList.remove('active');
            $('#user-dropdown')?.classList.remove('active');
            $('#search-suggestions')?.classList.remove('active');
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboard(e);
        });
        
        // Before unload
        window.addEventListener('beforeunload', () => {
            this.saveState();
        });
        
        // Online/offline
        window.addEventListener('online', () => {
            this.setState('offlineMode', false);
            this.showToast('Back online', 'success');
        });
        
        window.addEventListener('offline', () => {
            this.setState('offlineMode', true);
            this.showToast('Offline mode', 'warning');
        });
        
        // Pop state
        window.addEventListener('popstate', (e) => {
            if (e.state?.page) {
                this.navigateTo(e.state.page);
            }
        });
    },
    
    handleKeyboard(e) {
        // Space - toggle play (unless in input)
        if (e.code === 'Space' && !['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
            e.preventDefault();
            this.togglePlay();
        }
        
        // Arrow keys
        if (e.code === 'ArrowRight' && e.ctrlKey) {
            e.preventDefault();
            this.playNext();
        }
        
        if (e.code === 'ArrowLeft' && e.ctrlKey) {
            e.preventDefault();
            this.playPrevious();
        }
        
        // Volume
        if (e.code === 'ArrowUp' && e.ctrlKey) {
            e.preventDefault();
            this.modules.player?.changeVolume(0.1);
        }
        
        if (e.code === 'ArrowDown' && e.ctrlKey) {
            e.preventDefault();
            this.modules.player?.changeVolume(-0.1);
        }
        
        // Mute
        if (e.code === 'KeyM' && e.ctrlKey) {
            e.preventDefault();
            this.modules.player?.toggleMute();
        }
        
        // Fullscreen
        if (e.code === 'KeyF' && e.ctrlKey) {
            e.preventDefault();
            this.toggleFullscreen();
        }
        
        // Search
        if (e.code === 'KeyK' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            $('#global-search')?.focus();
        }
    },
    
    // ==========================================
    // UI INITIALIZATION
    // ==========================================
    
    initUI() {
        // Initialize mini player controls
        $('#mini-play')?.addEventListener('click', () => this.togglePlay());
        $('#mini-prev')?.addEventListener('click', () => this.playPrevious());
        $('#mini-next')?.addEventListener('click', () => this.playNext());
        $('#mini-like')?.addEventListener('click', () => {
            if (this.state.currentSong) {
                this.toggleFavorite(this.state.currentSong.id);
            }
        });
        
        // Fullscreen toggle
        $('#mini-fullscreen')?.addEventListener('click', () => this.toggleFullscreen());
        $('#close-fullscreen')?.addEventListener('click', () => this.toggleFullscreen());
        
        // Progress bar seeking
        $('#mini-progress-container')?.addEventListener('click', (e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            this.modules.player?.seekTo(percent);
        });
        
        // Volume
        $('#mini-volume')?.addEventListener('input', (e) => {
            this.modules.player?.setVolume(e.target.value / 100);
        });
        
        // Fullscreen player controls
        $('#fs-btn-play')?.addEventListener('click', () => this.togglePlay());
        $('#fs-btn-prev')?.addEventListener('click', () => this.playPrevious());
        $('#fs-btn-next')?.addEventListener('click', () => this.playNext());
        
        $('#fs-btn-shuffle')?.addEventListener('click', () => {
            this.setState('isShuffled', !this.state.isShuffled);
            $('#fs-btn-shuffle')?.classList.toggle('active', this.state.isShuffled);
        });
        
        $('#fs-btn-repeat')?.addEventListener('click', () => {
            const modes = ['none', 'all', 'one'];
            const currentIndex = modes.indexOf(this.state.repeatMode);
            const nextMode = modes[(currentIndex + 1) % modes.length];
            this.setState('repeatMode', nextMode);
            
            // Update icon
            const btn = $('#fs-btn-repeat');
            btn.classList.toggle('active', nextMode !== 'none');
            btn.dataset.mode = nextMode;
        });
        
        // Lyrics toggle
        $('#fs-btn-lyrics')?.addEventListener('click', () => {
            $('.player-layout')?.classList.toggle('lyrics-hidden');
        });
    },
    
    toggleFullscreen() {
        const playerPage = $('#page-player');
        const isFullscreen = playerPage?.classList.contains('active');
        
        if (isFullscreen) {
            this.navigateTo(this.state.currentPage === 'player' ? 'home' : this.state.currentPage);
        } else {
            this.navigateTo('player');
        }
    },
    
    // ==========================================
    // UTILITY METHODS
    // ==========================================
    
    generateId() {
        return LFUtils.generateUUID();
    }
};

// Initialize on DOM ready
LFUtils.ready(() => LyricFlow.init());
