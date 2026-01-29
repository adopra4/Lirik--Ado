/**
 * LYRICFLOW v1.2 - Core Application
 * Modular Architecture with Plugin System
 */

const App = {
    version: '1.2.0',
    config: {
        autoRefreshInterval: 30000,
        defaultVolume: 0.8,
        crossfadeDuration: 2,
        theme: 'dark'
    },
    
    state: {
        songs: [],
        playlists: [],
        currentSong: null,
        isPlaying: false,
        currentView: 'library',
        favorites: new Set(),
        recent: [],
        queue: [],
        shuffle: false,
        repeat: 'none', // none, all, one
        editMode: false
    },

    // Initialize Application
    init() {
        console.log(`🎵 LyricFlow v${this.version} initializing...`);
        
        this.loadConfig();
        this.loadData();
        this.setupEventListeners();
        this.setupKeyboardShortcuts();
        
        // Initialize modules
        this.player.init();
        this.lyrics.init();
        this.playlists.init();
        this.visualizer.init();
        this.themes.init();
        this.plugins.init();
        
        // Load songs
        this.library.load();
        
        // Start auto-refresh
        this.startAutoRefresh();
        
        console.log('✅ LyricFlow ready!');
        this.toast.show('Welcome to LyricFlow v1.2!', 'success');
    },

    // Configuration Management
    loadConfig() {
        const saved = localStorage.getItem('lf_config');
        if (saved) {
            this.config = { ...this.config, ...JSON.parse(saved) };
        }
        this.applyConfig();
    },

    saveConfig() {
        localStorage.setItem('lf_config', JSON.stringify(this.config));
    },

    applyConfig() {
        // Apply theme
        document.documentElement.setAttribute('data-theme', this.config.theme);
        
        // Apply volume
        const player = document.getElementById('audioPlayer');
        if (player) player.volume = this.config.defaultVolume;
        
        // Apply other settings
        document.getElementById('volumeSlider').value = this.config.defaultVolume * 100;
    },

    // Data Management
    loadData() {
        // Load playlists
        const playlists = localStorage.getItem('lf_playlists');
        if (playlists) this.state.playlists = JSON.parse(playlists);
        
        // Load favorites
        const favorites = localStorage.getItem('lf_favorites');
        if (favorites) this.state.favorites = new Set(JSON.parse(favorites));
        
        // Load recent
        const recent = localStorage.getItem('lf_recent');
        if (recent) this.state.recent = JSON.parse(recent);
    },

    saveData() {
        localStorage.setItem('lf_playlists', JSON.stringify(this.state.playlists));
        localStorage.setItem('lf_favorites', JSON.stringify([...this.state.favorites]));
        localStorage.setItem('lf_recent', JSON.stringify(this.state.recent));
    },

    // Event Listeners
    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const view = e.currentTarget.dataset.view;
                this.switchView(view);
            });
        });
        
        // Search
        const searchInput = document.getElementById('searchInput');
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.library.search(e.target.value);
            }, 300);
        });
        
        // Window events
        window.addEventListener('beforeunload', () => {
            this.saveData();
            this.saveConfig();
        });
        
        // Online/Offline
        window.addEventListener('online', () => {
            this.toast.show('Back online', 'success');
        });
        window.addEventListener('offline', () => {
            this.toast.show('Offline mode', 'warning');
        });
    },

    // Keyboard Shortcuts
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ignore if typing in input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                if (e.key === 'Escape') e.target.blur();
                return;
            }
            
            switch(e.code) {
                case 'Space':
                    e.preventDefault();
                    this.player.toggle();
                    break;
                case 'ArrowRight':
                    if (e.ctrlKey) {
                        e.preventDefault();
                        this.player.seek(5);
                    }
                    break;
                case 'ArrowLeft':
                    if (e.ctrlKey) {
                        e.preventDefault();
                        this.player.seek(-5);
                    }
                    break;
                case 'ArrowUp':
                    if (e.ctrlKey) {
                        e.preventDefault();
                        this.player.adjustVolume(0.1);
                    }
                    break;
                case 'ArrowDown':
                    if (e.ctrlKey) {
                        e.preventDefault();
                        this.player.adjustVolume(-0.1);
                    }
                    break;
                case 'KeyN':
                    if (e.ctrlKey) {
                        e.preventDefault();
                        this.player.next();
                    }
                    break;
                case 'KeyP':
                    if (e.ctrlKey) {
                        e.preventDefault();
                        this.player.prev();
                    }
                    break;
                case 'KeyL':
                    if (e.ctrlKey) {
                        e.preventDefault();
                        this.lyrics.togglePanel();
                    }
                    break;
                case 'KeyF':
                    if (e.ctrlKey) {
                        e.preventDefault();
                        this.player.toggleFavorite();
                    }
                    break;
                case 'KeyS':
                    if (e.ctrlKey) {
                        e.preventDefault();
                        this.toggleSettings();
                    }
                    break;
                case 'KeyD':
                    if (e.ctrlKey && e.shiftKey) {
                        e.preventDefault();
                        this.dev.toggle();
                    }
                    break;
                case 'Escape':
                    this.closeAllModals();
                    break;
            }
        });
    },

    // View Management
    switchView(viewName) {
        // Update nav
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.view === viewName);
        });
        
        // Update view
        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active');
        });
        
        const targetView = document.getElementById(viewName + 'View') || 
                          document.getElementById('libraryView');
        targetView.classList.add('active');
        
        this.state.currentView = viewName;
        
        // Load view data
        switch(viewName) {
            case 'favorites':
                this.library.showFavorites();
                break;
            case 'recent':
                this.library.showRecent();
                break;
        }
    },

    // Auto-refresh songs
    startAutoRefresh() {
        setInterval(() => {
            this.library.checkForNewSongs();
        }, this.config.autoRefreshInterval);
    },

    // Modal Management
    toggleSettings() {
        document.getElementById('settingsModal').classList.toggle('active');
    },

    closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
        document.getElementById('devPanel').classList.remove('active');
        document.getElementById('lyricsPanel').classList.remove('open');
    },

    // Mini Player
    toggleMiniPlayer() {
        const mini = document.getElementById('miniPlayer');
        mini.classList.toggle('active');
    },

    // Toast Notifications
    toast: {
        show(message, type = 'info', duration = 3000) {
            const container = document.getElementById('toastContainer');
            const toast = document.createElement('div');
            toast.className = `toast ${type}`;
            
            const icons = {
                success: '✓',
                error: '✕',
                warning: '⚠',
                info: 'ℹ'
            };
            
            toast.innerHTML = `
                <span>${icons[type] || '•'}</span>
                <span>${message}</span>
            `;
            
            container.appendChild(toast);
            
            setTimeout(() => {
                toast.style.animation = 'slideInRight 0.3s ease reverse';
                setTimeout(() => toast.remove(), 300);
            }, duration);
        }
    },

    // Import/Export
    data: {
        export() {
            const data = {
                version: App.version,
                timestamp: new Date().toISOString(),
                songs: App.state.songs,
                playlists: App.state.playlists,
                favorites: [...App.state.favorites],
                recent: App.state.recent,
                config: App.config
            };
            
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `lyricflow-backup-${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
            
            App.toast.show('Data exported successfully!', 'success');
        },

        import() {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) return;
                
                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const data = JSON.parse(event.target.result);
                        
                        if (confirm(`Import ${data.songs?.length || 0} songs and ${data.playlists?.length || 0} playlists?`)) {
                            if (data.songs) App.state.songs = [...App.state.songs, ...data.songs];
                            if (data.playlists) App.state.playlists = [...App.state.playlists, ...data.playlists];
                            if (data.favorites) App.state.favorites = new Set([...App.state.favorites, ...data.favorites]);
                            
                            App.saveData();
                            App.library.render();
                            App.toast.show('Data imported successfully!', 'success');
                        }
                    } catch (err) {
                        App.toast.show('Invalid file format!', 'error');
                    }
                };
                reader.readAsText(file);
            };
            input.click();
        },

        clear() {
            if (confirm('⚠️ WARNING: This will delete ALL your data! Are you sure?')) {
                localStorage.clear();
                location.reload();
            }
        }
    }
};

// Initialize when DOM ready
document.addEventListener('DOMContentLoaded', () => App.init());

// Expose to global for debugging
window.app = App;
