/**
 * LYRICFLOW v1.3 - DEVELOPER MODULE
 * Developer/Admin panel and advanced tools
 */

const LFDev = {
    isDev: false,
    currentUser: null,
    logs: [],
    maxLogs: 1000,
    
    // Mock database for demo
    mockDB: {
        users: [
            { id: '1', name: 'Admin', email: 'admin@lyricflow.app', role: 'developer', createdAt: Date.now() },
            { id: '2', name: 'User1', email: 'user1@test.com', role: 'user', createdAt: Date.now() - 86400000 },
            { id: '3', name: 'User2', email: 'user2@test.com', role: 'user', createdAt: Date.now() - 172800000 }
        ],
        songs: [],
        analytics: {
            totalPlays: 15420,
            totalUsers: 3,
            activeUsers: 2,
            storageUsed: 1024 * 1024 * 500 // 500MB
        }
    },
    
    init() {
        this.checkDevStatus();
        this.setupEventListeners();
        this.setupConsoleOverride();
        
        console.log('Developer module initialized');
    },
    
    checkDevStatus() {
        // Check URL params
        const params = LFUtils.parseQueryParams();
        if (params.dev === 'true' || params.admin === 'true') {
            this.enableDevMode();
        }
        
        // Check localStorage
        const devToken = LFUtils.storage.get('lf_dev_token');
        if (devToken) {
            this.validateDevToken(devToken);
        }
        
        // Check keyboard shortcut (Ctrl+Shift+D)
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'D') {
                e.preventDefault();
                this.showDevLogin();
            }
        });
    },
    
    setupEventListeners() {
        // Dev login
        $('#dev-login-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleDevLogin();
        });
        
        // Song management
        $('#dev-add-song')?.addEventListener('click', () => this.addSong());
        $('#dev-export-db')?.addEventListener('click', () => this.exportDatabase());
        $('#dev-import-db')?.addEventListener('click', () => this.importDatabase());
        $('#dev-clear-db')?.addEventListener('click', () => this.clearDatabase());
        
        // User management
        $('#dev-create-user')?.addEventListener('click', () => this.showCreateUserModal());
        
        // System tools
        $('#dev-clear-cache')?.addEventListener('click', () => this.clearCache());
        $('#dev-run-diagnostics')?.addEventListener('click', () => this.runDiagnostics());
        $('#dev-simulate-offline')?.addEventListener('click', () => this.simulateOffline());
        $('#dev-performance-test')?.addEventListener('click', () => this.runPerformanceTest());
        
        // Log viewer
        $('#dev-clear-logs')?.addEventListener('click', () => this.clearLogs());
        $('#dev-export-logs')?.addEventListener('click', () => this.exportLogs());
        $('#dev-filter-logs')?.addEventListener('change', (e) => this.filterLogs(e.target.value));
        
        // Theme editor
        $('#dev-save-theme')?.addEventListener('click', () => this.saveCustomTheme());
        $('#dev-preview-theme')?.addEventListener('click', () => this.previewTheme());
        
        // API tester
        $('#dev-test-api')?.addEventListener('click', () => this.testAPI());
        $('#dev-api-method')?.addEventListener('change', (e) => this.updateAPIBody(e.target.value));
    },
    
    setupConsoleOverride() {
        // Override console methods to capture logs
        const originalLog = console.log;
        const originalWarn = console.warn;
        const originalError = console.error;
        
        console.log = (...args) => {
            this.addLog('log', args);
            originalLog.apply(console, args);
        };
        
        console.warn = (...args) => {
            this.addLog('warn', args);
            originalWarn.apply(console, args);
        };
        
        console.error = (...args) => {
            this.addLog('error', args);
            originalError.apply(console, args);
        };
        
        // Capture unhandled errors
        window.addEventListener('error', (e) => {
            this.addLog('error', [e.message, e.filename, e.lineno]);
        });
        
        window.addEventListener('unhandledrejection', (e) => {
            this.addLog('error', ['Unhandled Promise Rejection:', e.reason]);
        });
    },
    
    // Dev mode control
    
    enableDevMode() {
        this.isDev = true;
        LyricFlow.setState('isDev', true);
        
        // Show dev section in sidebar
        $('#dev-section').style.display = 'block';
        
        // Add dev indicator
        this.addDevIndicator();
        
        // Load dev panel
        this.loadDevPanel();
        
        console.log('%c🔧 Developer Mode Enabled', 'color: #ff006e; font-size: 20px; font-weight: bold;');
    },
    
    disableDevMode() {
        this.isDev = false;
        LyricFlow.setState('isDev', false);
        $('#dev-section').style.display = 'none';
        $('.dev-indicator')?.remove();
        
        LFUtils.storage.remove('lf_dev_token');
    },
    
    addDevIndicator() {
        const indicator = LFUtils.createElement('div', {
            className: 'dev-indicator',
            style: 'position: fixed; bottom: 100px; right: 20px; background: linear-gradient(135deg, #ff006e, #8338ec); color: white; padding: 8px 16px; border-radius: 20px; font-size: 12px; font-weight: bold; z-index: 9999; box-shadow: 0 4px 12px rgba(255, 0, 110, 0.4);'
        }, 'DEV MODE');
        
        document.body.appendChild(indicator);
    },
    
    // Authentication
    
    showDevLogin() {
        const modal = LFUtils.createElement('div', {
            className: 'modal active',
            id: 'modal-dev-login'
        },
            LFUtils.createElement('div', { className: 'modal-header' },
                LFUtils.createElement('h2', {}, 'Developer Login'),
                LFUtils.createElement('button', {
                    className: 'modal-close',
                    onclick: () => modal.remove()
                }, '×')
            ),
            LFUtils.createElement('div', { className: 'modal-body' },
                LFUtils.createElement('form', { id: 'dev-login-form' },
                    LFUtils.createElement('div', { className: 'form-group' },
                        LFUtils.createElement('label', {}, 'Developer Key'),
                        LFUtils.createElement('input', {
                            type: 'password',
                            id: 'dev-key',
                            placeholder: 'Enter developer key',
                            required: true
                        })
                    ),
                    LFUtils.createElement('div', { className: 'form-group' },
                        LFUtils.createElement('label', {},
                            LFUtils.createElement('input', {
                                type: 'checkbox',
                                id: 'dev-remember'
                            }),
                            ' Remember me'
                        )
                    ),
                    LFUtils.createElement('button', {
                        type: 'submit',
                        className: 'btn-primary btn-block'
                    }, 'Login')
                )
            )
        );
        
        document.body.appendChild(modal);
        
        // Add overlay
        const overlay = LFUtils.createElement('div', {
            className: 'modal-overlay active',
            onclick: () => {
                modal.remove();
                overlay.remove();
            }
        });
        document.body.appendChild(overlay);
    },
    
    handleDevLogin() {
        const key = $('#dev-key')?.value;
        const remember = $('#dev-remember')?.checked;
        
        // Simple validation (in production, validate against server)
        if (key === 'lyricflow-dev-2024' || key === 'admin') {
            if (remember) {
                LFUtils.storage.set('lf_dev_token', btoa(key + Date.now()));
            }
            
            this.enableDevMode();
            $('#modal-dev-login')?.remove();
            $('.modal-overlay')?.remove();
            
            LyricFlow.showToast('Developer mode enabled!', 'success');
        } else {
            LyricFlow.showToast('Invalid developer key', 'error');
        }
    },
    
    validateDevToken(token) {
        // Validate token (simplified)
        try {
            const decoded = atob(token);
            if (decoded.includes('lyricflow-dev') || decoded.includes('admin')) {
                this.enableDevMode();
            }
        } catch (e) {
            LFUtils.storage.remove('lf_dev_token');
        }
    },
    
    // Dev Panel
    
    loadDevPanel() {
        if (!this.isDev) return;
        
        const panel = $('#page-dev-panel');
        if (!panel) return;
        
        this.renderDevStats();
        this.renderUsersList();
        this.renderLogs();
        this.renderSystemInfo();
    },
    
    renderDevStats() {
        const statsContainer = $('#dev-stats');
        if (!statsContainer) return;
        
        const stats = this.mockDB.analytics;
        
        statsContainer.innerHTML = `
            <div class="stat-item">
                <span class="stat-value">${stats.totalPlays.toLocaleString()}</span>
                <span class="stat-label">Total Plays</span>
            </div>
            <div class="stat-item">
                <span class="stat-value">${stats.totalUsers}</span>
                <span class="stat-label">Users</span>
            </div>
            <div class="stat-item">
                <span class="stat-value">${stats.activeUsers}</span>
                <span class="stat-label">Active Now</span>
            </div>
            <div class="stat-item">
                <span class="stat-value">${LFUtils.formatFileSize(stats.storageUsed)}</span>
                <span class="stat-label">Storage Used</span>
            </div>
        `;
    },
    
    renderUsersList() {
        const container = $('#dev-users-list');
        if (!container) return;
        
        container.innerHTML = this.mockDB.users.map(user => `
            <div class="user-item">
                <div class="user-info">
                    <img src="assets/images/default-avatar.png" class="user-avatar-small">
                    <div>
                        <div class="user-name">${LFUtils.sanitize(user.name)}</div>
                        <div class="user-email">${LFUtils.sanitize(user.email)}</div>
                        <span class="badge ${user.role}">${user.role}</span>
                    </div>
                </div>
                <div class="user-actions">
                    <button class="btn-icon" onclick="LFDev.editUser('${user.id}')" title="Edit">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button class="btn-icon danger" onclick="LFDev.deleteUser('${user.id}')" title="Delete">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                </div>
            </div>
        `).join('');
    },
    
    // Song Management
    
    async addSong() {
        const title = $('#dev-song-title')?.value;
        const artist = $('#dev-song-artist')?.value;
        const album = $('#dev-song-album')?.value;
        const audioFile = $('#dev-audio-file')?.files[0];
        const lrcFile = $('#dev-lrc-file')?.files[0];
        
        if (!title || !artist || !audioFile) {
            LyricFlow.showToast('Please fill in required fields', 'warning');
            return;
        }
        
        try {
            // Process audio file
            const arrayBuffer = await LFUtils.readFileAsArrayBuffer(audioFile);
            const audioBuffer = await LFUtils.decodeAudioData(arrayBuffer);
            
            // Create song object
            const song = {
                id: LFUtils.generateUUID(),
                title,
                artist,
                album: album || 'Unknown Album',
                duration: audioBuffer.duration,
                addedAt: Date.now(),
                addedBy: 'developer'
            };
            
            // Save audio
            await LFUtils.db.put('offline', {
                id: `audio_${song.id}`,
                data: arrayBuffer,
                type: audioFile.type
            });
            
            // Process lyrics if provided
            if (lrcFile) {
                const lrcContent = await LFUtils.readFileAsText(lrcFile);
                await LFUtils.db.put('lyrics', {
                    songId: song.id,
                    content: lrcContent
                });
            }
            
            // Add to library
            await LFUtils.db.put('songs', song);
            LFLibrary.songs.push(song);
            
            // Clear form
            $('#dev-song-title').value = '';
            $('#dev-song-artist').value = '';
            $('#dev-song-album').value = '';
            $('#dev-audio-file').value = '';
            $('#dev-lrc-file').value = '';
            
            LyricFlow.showToast('Song added successfully!', 'success');
            LFLibrary.renderSongs();
            
        } catch (e) {
            console.error('Failed to add song:', e);
            LyricFlow.showToast('Failed to add song', 'error');
        }
    },
    
    // Database Management
    
    async exportDatabase() {
        const data = {
            songs: await LFUtils.db.getAll('songs'),
            playlists: await LFUtils.db.getAll('playlists'),
            lyrics: await LFUtils.db.getAll('lyrics'),
            settings: await LFUtils.db.getAll('settings'),
            exportedAt: new Date().toISOString(),
            version: LyricFlow.version
        };
        
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lyricflow-backup-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        LyricFlow.showToast('Database exported!', 'success');
    },
    
    async importDatabase() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            try {
                const text = await LFUtils.readFileAsText(file);
                const data = JSON.parse(text);
                
                if (!confirm(`Import ${data.songs?.length || 0} songs? This will merge with existing data.`)) {
                    return;
                }
                
                // Import songs
                if (data.songs) {
                    for (const song of data.songs) {
                        await LFUtils.db.put('songs', song);
                    }
                }
                
                // Import playlists
                if (data.playlists) {
                    for (const playlist of data.playlists) {
                        await LFUtils.db.put('playlists', playlist);
                    }
                }
                
                // Import lyrics
                if (data.lyrics) {
                    for (const lyric of data.lyrics) {
                        await LFUtils.db.put('lyrics', lyric);
                    }
                }
                
                // Reload library
                const songs = await LFUtils.db.getAll('songs');
                LFLibrary.setSongs(songs);
                
                LyricFlow.showToast('Database imported!', 'success');
                
            } catch (e) {
                console.error('Import failed:', e);
                LyricFlow.showToast('Import failed', 'error');
            }
        };
        
        input.click();
    },
    
    async clearDatabase() {
        if (!confirm('WARNING: This will delete ALL data! Are you sure?')) return;
        if (!confirm('Really sure? This cannot be undone!')) return;
        
        // Clear all stores
        await LFUtils.db.clear('songs');
        await LFUtils.db.clear('playlists');
        await LFUtils.db.clear('lyrics');
        await LFUtils.db.clear('offline');
        
        // Clear localStorage
        LFUtils.storage.clear();
        
        LyricFlow.showToast('Database cleared. Reloading...', 'info');
        
        setTimeout(() => location.reload(), 1500);
    },
    
    // User Management
    
    showCreateUserModal() {
        // Implementation for creating new users
        const name = prompt('User name:');
        const email = prompt('Email:');
        const role = confirm('Make developer?') ? 'developer' : 'user';
        
        if (name && email) {
            const user = {
                id: LFUtils.generateUUID(),
                name,
                email,
                role,
                createdAt: Date.now()
            };
            
            this.mockDB.users.push(user);
            this.renderUsersList();
            LyricFlow.showToast('User created!', 'success');
        }
    },
    
    editUser(id) {
        const user = this.mockDB.users.find(u => u.id === id);
        if (!user) return;
        
        const newName = prompt('Name:', user.name);
        const newEmail = prompt('Email:', user.email);
        
        if (newName) user.name = newName;
        if (newEmail) user.email = newEmail;
        
        this.renderUsersList();
    },
    
    deleteUser(id) {
        if (!confirm('Delete this user?')) return;
        
        this.mockDB.users = this.mockDB.users.filter(u => u.id !== id);
        this.renderUsersList();
        LyricFlow.showToast('User deleted', 'info');
    },
    
    // System Tools
    
    async clearCache() {
        if ('caches' in window) {
            const keys = await caches.keys();
            await Promise.all(keys.map(key => caches.delete(key)));
        }
        
        LyricFlow.showToast('Cache cleared!', 'success');
    },
    
    runDiagnostics() {
        const results = [];
        
        // Check APIs
        results.push(['Service Worker', 'serviceWorker' in navigator]);
        results.push(['Cache API', 'caches' in window]);
        results.push(['IndexedDB', 'indexedDB' in window]);
        results.push(['Web Audio', 'AudioContext' in window || 'webkitAudioContext' in window]);
        results.push(['WebRTC', 'RTCPeerConnection' in window]);
        results.push(['Speech Recognition', 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window]);
        results.push(['Notifications', 'Notification' in window]);
        
        // Check storage
        const storageEstimate = navigator.storage?.estimate;
        if (storageEstimate) {
            storageEstimate().then(estimate => {
                const used = LFUtils.formatFileSize(estimate.usage || 0);
                const total = estimate.quota ? LFUtils.formatFileSize(estimate.quota) : 'unknown';
                results.push(['Storage', `${used} / ${total}`]);
            });
        }
        
        // Display results
        const report = results.map(([name, status]) => 
            `${name}: ${status === true ? '✅' : status === false ? '❌' : status}`
        ).join('\n');
        
        alert('Diagnostics Report:\n\n' + report);
    },
    
    simulateOffline() {
        // Simulate offline mode
        Object.defineProperty(navigator, 'onLine', {
            writable: true,
            value: false
        });
        
        window.dispatchEvent(new Event('offline'));
        
        setTimeout(() => {
            Object.defineProperty(navigator, 'onLine', {
                writable: true,
                value: true
            });
            window.dispatchEvent(new Event('online'));
        }, 5000);
    },
    
    runPerformanceTest() {
        const tests = {
            render: () => {
                const start = performance.now();
                LFLibrary.renderSongs();
                return performance.now() - start;
            },
            search: () => {
                const start = performance.now();
                LFLibrary.search('test');
                return performance.now() - start;
            },
            storage: async () => {
                const start = performance.now();
                await LFUtils.db.getAll('songs');
                return performance.now() - start;
            }
        };
        
        const results = {};
        
        for (const [name, test] of Object.entries(tests)) {
            const time = test();
            results[name] = typeof time === 'number' ? `${time.toFixed(2)}ms` : 'async';
        }
        
        console.table(results);
        alert('Performance results logged to console');
    },
    
    // Logging
    
    addLog(level, args) {
        const log = {
            timestamp: new Date().toISOString(),
            level,
            message: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')
        };
        
        this.logs.push(log);
        
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }
        
        // Update log viewer if visible
        if ($('#dev-logs')?.classList.contains('active')) {
            this.renderLogs();
        }
    },
    
    renderLogs() {
        const container = $('#dev-logs-content');
        if (!container) return;
        
        const filter = $('#dev-filter-logs')?.value || 'all';
        
        const filtered = this.logs.filter(log => 
            filter === 'all' || log.level === filter
        ).slice(-100); // Show last 100
        
        container.innerHTML = filtered.map(log => `
            <div class="log-entry log-${log.level}">
                <span class="log-time">${new Date(log.timestamp).toLocaleTimeString()}</span>
                <span class="log-level">${log.level.toUpperCase()}</span>
                <span class="log-message">${LFUtils.sanitize(log.message)}</span>
            </div>
        `).join('');
        
        // Auto-scroll
        container.scrollTop = container.scrollHeight;
    },
    
    clearLogs() {
        this.logs = [];
        this.renderLogs();
    },
    
    exportLogs() {
        const text = this.logs.map(l => 
            `[${l.timestamp}] ${l.level.toUpperCase()}: ${l.message}`
        ).join('\n');
        
        LFUtils.downloadFile(text, `lyricflow-logs-${Date.now()}.txt`);
    },
    
    filterLogs(level) {
        this.renderLogs();
    },
    
    // System Info
    
    renderSystemInfo() {
        const container = $('#dev-system-info');
        if (!container) return;
        
        const info = {
            'User Agent': navigator.userAgent,
            'Platform': navigator.platform,
            'Language': navigator.language,
            'Screen': `${screen.width}x${screen.height}`,
            'Viewport': `${window.innerWidth}x${window.innerHeight}`,
            'Device Pixel Ratio': window.devicePixelRatio,
            'Memory': navigator.deviceMemory ? `${navigator.deviceMemory} GB` : 'unknown',
            'Cores': navigator.hardwareConcurrency || 'unknown',
            'Connection': navigator.connection?.effectiveType || 'unknown'
        };
        
        container.innerHTML = Object.entries(info).map(([key, value]) => `
            <div class="info-row">
                <span class="info-key">${key}:</span>
                <span class="info-value">${LFUtils.sanitize(String(value))}</span>
            </div>
        `).join('');
    },
    
    // Theme Editor
    
    saveCustomTheme() {
        const name = prompt('Theme name:');
        if (!name) return;
        
        const colors = {
            primary: $('#dev-theme-primary')?.value,
            secondary: $('#dev-theme-secondary')?.value,
            accent: $('#dev-theme-accent')?.value
        };
        
        const theme = {
            id: 'custom_' + Date.now(),
            name,
            colors,
            isCustom: true
        };
        
        LFThemes.createCustomTheme(name, colors);
        LyricFlow.showToast('Theme saved!', 'success');
    },
    
    previewTheme() {
        const colors = {
            primary: $('#dev-theme-primary')?.value || '#ff006e',
            secondary: $('#dev-theme-secondary')?.value || '#8338ec',
            accent: $('#dev-theme-accent')?.value || '#3a86ff'
        };
        
        LFThemes.applyColors(colors);
    },
    
    // API Tester
    
    async testAPI() {
        const method = $('#dev-api-method')?.value;
        const endpoint = $('#dev-api-endpoint')?.value;
        const body = $('#dev-api-body')?.value;
        
        try {
            let response;
            
            switch (method) {
                case 'GET':
                    response = await LFAPI.get(endpoint);
                    break;
                case 'POST':
                    response = await LFAPI.post(endpoint, JSON.parse(body || '{}'));
                    break;
                case 'PUT':
                    response = await LFAPI.put(endpoint, JSON.parse(body || '{}'));
                    break;
                case 'DELETE':
                    response = await LFAPI.delete(endpoint);
                    break;
            }
            
            $('#dev-api-response').value = JSON.stringify(response, null, 2);
            
        } catch (e) {
            $('#dev-api-response').value = `Error: ${e.message}`;
        }
    },
    
    updateAPIBody(method) {
        const bodyField = $('#dev-api-body');
        if (method === 'GET' || method === 'DELETE') {
            bodyField.disabled = true;
            bodyField.placeholder = 'No body for ' + method;
        } else {
            bodyField.disabled = false;
            bodyField.placeholder = 'Request body (JSON)';
        }
    },
    
    // Utilities
    
    injectCSS(css) {
        const style = document.createElement('style');
        style.textContent = css;
        document.head.appendChild(style);
        return style;
    },
    
    injectScript(code) {
        const script = document.createElement('script');
        script.textContent = code;
        document.head.appendChild(script);
        return script;
    },
    
    measurePerformance(fn, iterations = 1000) {
        const times = [];
        
        for (let i = 0; i < iterations; i++) {
            const start = performance.now();
            fn();
            times.push(performance.now() - start);
        }
        
        const avg = times.reduce((a, b) => a + b, 0) / times.length;
        const min = Math.min(...times);
        const max = Math.max(...times);
        
        return { avg, min, max, iterations };
    },
    
    // Easter eggs
    
    konamiCode() {
        const code = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
        let index = 0;
        
        document.addEventListener('keydown', (e) => {
            if (e.key === code[index]) {
                index++;
                if (index === code.length) {
                    this.activateEasterEgg();
                    index = 0;
                }
            } else {
                index = 0;
            }
        });
    },
    
    activateEasterEgg() {
        document.body.style.animation = 'spin 2s ease-in-out';
        setTimeout(() => {
            document.body.style.animation = '';
            LyricFlow.showToast('🎮 Konami Code Activated!', 'success');
        }, 2000);
    }
};

// Initialize Konami code listener
LFDev.konamiCode();
