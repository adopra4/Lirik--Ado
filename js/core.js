
 * LYRICFLOW v1.3 - CORE MODULE
 * Main Application Controller
 */

class LyricFlowApp {
    constructor() {
        this.version = '1.3.0';
        this.initialized = false;
        this.currentUser = null;
        this.currentPage = 'home';
        this.isPlaying = false;
        this.currentTrack = null;
        this.queue = [];
        this.history = [];
        this.settings = {
            theme: 'dark',
            volume: 0.7,
            autoplay: true,
            crossfade: true,
            normalizeAudio: true,
            showVisualizer: true,
            lyricsSync: true,
            offlineMode: false
        };
        
        this.init();
    }

    async init() {
        console.log(`🎵 LyricFlow v${this.version} initializing...`);
        
        try {
            // Show loading screen
            this.showLoadingScreen();
            
            // Load settings from storage
            await this.loadSettings();
            
            // Initialize modules
            await this.initializeModules();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Check authentication
            await this.checkAuth();
            
            // Hide loading screen
            this.hideLoadingScreen();
            
            this.initialized = true;
            console.log('✅ LyricFlow initialized successfully');
            
            // Show welcome toast
            this.showToast('Welcome to LyricFlow v' + this.version, 'info');
            
        } catch (error) {
            console.error('❌ Failed to initialize LyricFlow:', error);
            this.showLoadingError(error);
        }
    }

    showLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        const app = document.getElementById('app');
        
        if (loadingScreen) {
            loadingScreen.classList.remove('hidden');
        }
        if (app) {
            app.classList.add('hidden');
        }

        // Simulate loading progress
        const progressBar = document.querySelector('.loading-progress');
        const statusText = document.querySelector('.loading-status');
        const stages = [
            { progress: 20, text: 'Loading assets...' },
            { progress: 40, text: 'Initializing audio engine...' },
            { progress: 60, text: 'Loading library...' },
            { progress: 80, text: 'Setting up UI...' },
            { progress: 100, text: 'Ready!' }
        ];

        let currentStage = 0;
        const interval = setInterval(() => {
            if (currentStage < stages.length) {
                const stage = stages[currentStage];
                if (progressBar) progressBar.style.width = stage.progress + '%';
                if (statusText) statusText.textContent = stage.text;
                currentStage++;
            } else {
                clearInterval(interval);
            }
        }, 400);
    }

    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        const app = document.getElementById('app');
        
        setTimeout(() => {
            if (loadingScreen) {
                loadingScreen.classList.add('hidden');
            }
            if (app) {
                app.classList.remove('hidden');
            }
        }, 500);
    }

    showLoadingError(error) {
        const statusText = document.querySelector('.loading-status');
        if (statusText) {
            statusText.textContent = 'Failed to initialize. Please refresh.';
            statusText.style.color = '#ef4444';
        }
        
        const progressBar = document.querySelector('.loading-progress');
        if (progressBar) {
            progressBar.style.background = '#ef4444';
        }
    }

    async initializeModules() {
        // Initialize Player
        if (window.Player) {
            this.player = new Player(this);
            await this.player.init();
        }

        // Initialize Lyrics
        if (window.LyricsManager) {
            this.lyrics = new LyricsManager(this);
        }

        // Initialize Library
        if (window.LibraryManager) {
            this.library = new LibraryManager(this);
            await this.library.init();
        }

        // Initialize UI
        if (window.UIManager) {
            this.ui = new UIManager(this);
            this.ui.init();
        }

        // Initialize Themes
        if (window.ThemeManager) {
            this.themes = new ThemeManager(this);
            this.themes.init();
        }

        // Initialize Dev Tools (if developer)
        if (window.DevTools && this.isDeveloper()) {
            this.dev = new DevTools(this);
        }
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-section a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.dataset.page;
                this.navigateTo(page);
            });
        });

        // Sidebar toggle
        const sidebarToggle = document.getElementById('sidebar-toggle');
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', () => {
                document.getElementById('sidebar').classList.toggle('collapsed');
            });
        }

        // Login button
        const loginBtn = document.getElementById('login-btn');
        if (loginBtn) {
            loginBtn.addEventListener('click', () => {
                this.showLoginModal();
            });
        }

        // Login form
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        // Close modal
        const closeLogin = document.getElementById('close-login');
        if (closeLogin) {
            closeLogin.addEventListener('click', () => {
                this.hideLoginModal();
            });
        }

        // Guest login
        const guestLogin = document.getElementById('guest-login');
        if (guestLogin) {
            guestLogin.addEventListener('click', () => {
                this.loginAsGuest();
            });
        }

        // Theme toggle
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                this.toggleTheme();
            });
        }

        // Mini player expand
        const miniExpand = document.getElementById('mini-expand');
        if (miniExpand) {
            miniExpand.addEventListener('click', () => {
                this.navigateTo('player');
            });
        }

        // Global keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboard(e);
        });

        // Handle page visibility change
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.isPlaying) {
                // Reduce visual effects when tab is hidden
                this.setVisualQuality('low');
            } else {
                this.setVisualQuality('high');
            }
        });

        // Handle online/offline
        window.addEventListener('online', () => {
            this.showToast('Back online', 'success');
        });

        window.addEventListener('offline', () => {
            this.showToast('You are offline. Using cached content.', 'warning');
        });
    }

    navigateTo(page) {
        // Update active nav
        document.querySelectorAll('.nav-section li').forEach(li => {
            li.classList.remove('active');
        });
        
        const activeLink = document.querySelector(`[data-page="${page}"]`);
        if (activeLink) {
            activeLink.parentElement.classList.add('active');
        }

        // Hide all pages
        document.querySelectorAll('.page').forEach(p => {
            p.classList.remove('active');
        });

        // Show target page
        const targetPage = document.getElementById(`page-${page}`);
        if (targetPage) {
            targetPage.classList.add('active');
            this.currentPage = page;
        }

        // Special handling for player page
        if (page === 'player') {
            document.body.classList.add('player-open');
        } else {
            document.body.classList.remove('player-open');
        }

        // Update page title
        this.updatePageTitle(page);

        // Trigger page-specific logic
        this.onPageChange(page);
    }

    onPageChange(page) {
        switch(page) {
            case 'library':
                if (this.library) this.library.loadLibrary();
                break;
            case 'upload':
                if (this.dev) this.dev.initUploadPage();
                break;
            case 'analytics':
                if (this.dev) this.dev.loadAnalytics();
                break;
        }
    }

    updatePageTitle(page) {
        const titles = {
            home: 'Home',
            search: 'Search',
            library: 'Your Library',
            playlists: 'Playlists',
            favorites: 'Favorites',
            recent: 'Recently Played',
            offline: 'Offline',
            upload: 'Upload Music',
            analytics: 'Analytics',
            settings: 'Settings',
            player: 'Now Playing'
        };
        
        const title = titles[page] || page;
        document.title = `${title} - LyricFlow v${this.version}`;
    }

    async checkAuth() {
        // Check for stored session
        const session = localStorage.getItem('lyricflow_session');
        if (session) {
            try {
                const user = JSON.parse(session);
                await this.setCurrentUser(user);
            } catch (e) {
                localStorage.removeItem('lyricflow_session');
            }
        }
    }

    async handleLogin() {
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        const role = document.querySelector('.login-tabs .tab-btn.active')?.dataset.tab || 'user';

        if (!username || !password) {
            this.showToast('Please fill in all fields', 'error');
            return;
        }

        try {
            // Simulate API call
            const user = await this.authenticate(username, password, role);
            
            if (user) {
                await this.setCurrentUser(user);
                this.hideLoginModal();
                this.showToast(`Welcome back, ${user.username}!`, 'success');
            } else {
                this.showToast('Invalid credentials', 'error');
            }
        } catch (error) {
            this.showToast('Login failed. Please try again.', 'error');
        }
    }

    async authenticate(username, password, role) {
        // Demo authentication - replace with real API
        return new Promise((resolve) => {
            setTimeout(() => {
                // Demo users
                const users = {
                    'admin': { username: 'admin', role: 'developer', id: '1' },
                    'user': { username: 'user', role: 'user', id: '2' }
                };

                if (users[username] && password === 'password') {
                    resolve({ ...users[username], token: 'demo-token-' + Date.now() });
                } else {
                    resolve(null);
                }
            }, 500);
        });
    }

    async setCurrentUser(user) {
        this.currentUser = user;
        
        // Update UI
        const usernameEl = document.querySelector('.username');
        const userRoleEl = document.querySelector('.user-role');
        const loginBtn = document.getElementById('login-btn');
        const devSection = document.getElementById('dev-section');

        if (usernameEl) usernameEl.textContent = user.username;
        if (userRoleEl) userRoleEl.textContent = user.role === 'developer' ? 'Developer' : 'Free Plan';
        if (loginBtn) {
            loginBtn.textContent = 'Logout';
            loginBtn.onclick = () => this.logout();
        }

        // Show dev section for developers
        if (devSection && user.role === 'developer') {
            devSection.style.display = 'block';
        }

        // Store session
        localStorage.setItem('lyricflow_session', JSON.stringify(user));

        // Load user data
        await this.loadUserData();
    }

    loginAsGuest() {
        const guestUser = {
            username: 'Guest',
            role: 'guest',
            id: 'guest-' + Date.now()
        };
        
        this.setCurrentUser(guestUser);
        this.hideLoginModal();
        this.showToast('Welcome, Guest!', 'info');
    }

    logout() {
        this.currentUser = null;
        localStorage.removeItem('lyricflow_session');
        
        // Reset UI
        const usernameEl = document.querySelector('.username');
        const userRoleEl = document.querySelector('.user-role');
        const loginBtn = document.getElementById('login-btn');
        const devSection = document.getElementById('dev-section');

        if (usernameEl) usernameEl.textContent = 'Guest User';
        if (userRoleEl) userRoleEl.textContent = 'Free Plan';
        if (loginBtn) {
            loginBtn.textContent = 'Login';
            loginBtn.onclick = () => this.showLoginModal();
        }
        if (devSection) devSection.style.display = 'none';

        this.showToast('Logged out successfully', 'info');
    }

    showLoginModal() {
        const modal = document.getElementById('login-modal');
        if (modal) {
            modal.classList.add('active');
        }
    }

    hideLoginModal() {
        const modal = document.getElementById('login-modal');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    isDeveloper() {
        return this.currentUser?.role === 'developer';
    }

    isLoggedIn() {
        return this.currentUser !== null && this.currentUser.role !== 'guest';
    }

    async loadSettings() {
        const stored = localStorage.getItem('lyricflow_settings');
        if (stored) {
            this.settings = { ...this.settings, ...JSON.parse(stored) };
        }
    }

    saveSettings() {
        localStorage.setItem('lyricflow_settings', JSON.stringify(this.settings));
    }

    async loadUserData() {
        // Load user's playlists, favorites, etc.
        if (this.library) {
            await this.library.loadUserData(this.currentUser.id);
        }
    }

    toggleTheme() {
        const themes = ['dark', 'light', 'neon', 'ocean', 'minimal'];
        const currentIndex = themes.indexOf(this.settings.theme);
        const nextIndex = (currentIndex + 1) % themes.length;
        const newTheme = themes[nextIndex];
        
        this.setTheme(newTheme);
    }

    setTheme(theme) {
        this.settings.theme = theme;
        this.saveSettings();

        // Update stylesheet
        const themeLink = document.getElementById('theme-stylesheet');
        if (themeLink) {
            themeLink.href = `css/themes/${theme}.css`;
        }

        // Update UI
        document.body.className = theme + '-theme';
        
        // Update icon
        const themeIcon = document.querySelector('#theme-toggle i');
        if (themeIcon) {
            const icons = {
                dark: 'fa-moon',
                light: 'fa-sun',
                neon: 'fa-bolt',
                ocean: 'fa-water',
                minimal: 'fa-circle'
            };
            themeIcon.className = `fas ${icons[theme] || 'fa-moon'}`;
        }

        this.showToast(`Theme changed to ${theme}`, 'info');
    }

    handleKeyboard(e) {
        // Ignore if typing in input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }

        switch(e.code) {
            case 'Space':
                e.preventDefault();
                this.togglePlay();
                break;
            case 'ArrowLeft':
                if (e.ctrlKey || e.metaKey) {
                    this.previousTrack();
                } else if (this.player) {
                    this.player.seek(-5);
                }
                break;
            case 'ArrowRight':
                if (e.ctrlKey || e.metaKey) {
                    this.nextTrack();
                } else if (this.player) {
                    this.player.seek(5);
                }
                break;
            case 'ArrowUp':
                if (this.player) {
                    this.player.adjustVolume(0.1);
                }
                break;
            case 'ArrowDown':
                if (this.player) {
                    this.player.adjustVolume(-0.1);
                }
                break;
            case 'KeyM':
                if (this.player) {
                    this.player.toggleMute();
                }
                break;
            case 'KeyL':
                this.toggleLike();
                break;
            case 'KeyS':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    document.getElementById('global-search')?.focus();
                }
                break;
            case 'Escape':
                if (this.currentPage === 'player') {
                    this.navigateTo('home');
                }
                break;
        }
    }

    togglePlay() {
        if (this.player) {
            this.player.togglePlay();
        }
    }

    previousTrack() {
        if (this.player) {
            this.player.previous();
        }
    }

    nextTrack() {
        if (this.player) {
            this.player.next();
        }
    }

    toggleLike() {
        if (this.currentTrack) {
            this.library?.toggleFavorite(this.currentTrack.id);
        }
    }

    playTrack(track, queue = null) {
        this.currentTrack = track;
        
        if (queue) {
            this.queue = queue;
        }

        if (this.player) {
            this.player.load(track);
            this.player.play();
        }

        this.updateMiniPlayer(track);
        this.addToHistory(track);
    }

    updateMiniPlayer(track) {
        const miniTitle = document.getElementById('mini-title');
        const miniArtist = document.getElementById('mini-artist');
        const miniArt = document.getElementById('mini-art');

        if (miniTitle) miniTitle.textContent = track.title;
        if (miniArtist) miniArtist.textContent = track.artist;
        if (miniArt) {
            if (track.cover) {
                miniArt.innerHTML = `<img src="${track.cover}" alt="${track.title}">`;
            } else {
                miniArt.innerHTML = '<i class="fas fa-music"></i>';
            }
        }
    }

    addToHistory(track) {
        this.history.unshift(track);
        if (this.history.length > 50) {
            this.history.pop();
        }
        localStorage.setItem('lyricflow_history', JSON.stringify(this.history));
    }

    setVisualQuality(quality) {
        // Adjust visual effects based on performance
        document.body.dataset.quality = quality;
    }

    showToast(message, type = 'info', duration = 3000) {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };

        toast.innerHTML = `
            <i class="fas ${icons[type]}"></i>
            <span>${message}</span>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    formatTime(seconds) {
        if (!seconds || isNaN(seconds)) return '0:00';
        
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    formatDuration(ms) {
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    generateId() {
        return 'id-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    throttle(func, limit) {
        let inThrottle;
        return function executedFunction(...args) {
            if (!inThrottle) {
                func(...args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new LyricFlowApp();
});