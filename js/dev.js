/**
 * LyricFlow v1.3 - Main Application
 * Fixed initialization issues
 */

class LyricApp {
    constructor() {
        // State management
        this.state = {
            currentUser: null,
            isPlaying: false,
            currentSong: null,
            currentTime: 0,
            duration: 0,
            songs: [],
            users: [],
            favorites: new Set()
        };

        // Timer reference
        this.playbackTimer = null;
        
        // Initialize when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    init() {
        try {
            console.log('🎵 LyricFlow v1.3 Initializing...');
            
            this.loadData();
            this.renderSongs();
            this.setupEventListeners();
            this.updateUI();
            
            console.log('✅ App initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize app:', error);
            this.showError('Failed to initialize app. Please refresh.');
        }
    }

    loadData() {
        // Load from localStorage with error handling
        try {
            const savedSongs = localStorage.getItem('lyricflow_songs');
            const savedUsers = localStorage.getItem('lyricflow_users');
            const savedUser = localStorage.getItem('lyricflow_currentUser');
            const savedFavorites = localStorage.getItem('lyricflow_favorites');

            this.state.songs = savedSongs ? JSON.parse(savedSongs) : this.getDefaultSongs();
            this.state.users = savedUsers ? JSON.parse(savedUsers) : this.getDefaultUsers();
            this.state.currentUser = savedUser ? JSON.parse(savedUser) : null;
            this.state.favorites = savedFavorites ? new Set(JSON.parse(savedFavorites)) : new Set();
        } catch (e) {
            console.warn('Error loading data, using defaults:', e);
            this.state.songs = this.getDefaultSongs();
            this.state.users = this.getDefaultUsers();
        }
    }

    getDefaultSongs() {
        return [
            {
                id: 1,
                title: "Sample Song",
                artist: "Demo Artist",
                duration: "3:45",
                durationSeconds: 225,
                lyrics: [
                    { time: 0, text: "♪ Musik Dimulai ♪" },
                    { time: 10, text: "Ini adalah baris pertama lirik" },
                    { time: 20, text: "Ini adalah baris kedua lirik" },
                    { time: 30, text: "Lagu demo untuk testing" },
                    { time: 225, text: "♪ Musik Berakhir ♪" }
                ]
            }
        ];
    }

    getDefaultUsers() {
        return [
            { username: 'admin', password: 'admin123', role: 'admin' }
        ];
    }

    saveData() {
        try {
            localStorage.setItem('lyricflow_songs', JSON.stringify(this.state.songs));
            localStorage.setItem('lyricflow_users', JSON.stringify(this.state.users));
            localStorage.setItem('lyricflow_favorites', JSON.stringify([...this.state.favorites]));
            if (this.state.currentUser) {
                localStorage.setItem('lyricflow_currentUser', JSON.stringify(this.state.currentUser));
            }
        } catch (e) {
            console.error('Error saving data:', e);
        }
    }

    setupEventListeners() {
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
                this.togglePlay();
            }
        });

        // Window beforeunload
        window.addEventListener('beforeunload', () => {
            this.saveData();
        });
    }

    // Navigation
    navigate(view) {
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
        
        const targetView = document.getElementById(view + 'View');
        if (targetView) {
            targetView.classList.add('active');
        }
        
        event.target?.classList.add('active');
        
        if (view === 'admin' && (!this.state.currentUser || this.state.currentUser.role !== 'admin')) {
            this.showLogin();
            return;
        }
        
        if (view === 'admin') {
            this.renderAdminSongs();
            this.renderUsers();
        }
    }

    // Song Management
    renderSongs(filter = '') {
        const container = document.getElementById('songList');
        if (!container) return;

        const filtered = this.state.songs.filter(song => 
            song.title.toLowerCase().includes(filter.toLowerCase()) ||
            song.artist.toLowerCase().includes(filter.toLowerCase())
        );

        container.innerHTML = filtered.map(song => `
            <div class="song-card" onclick="app.playSong(${song.id})">
                <div class="song-art">🎵</div>
                <h3>${this.escapeHtml(song.title)}</h3>
                <p>${this.escapeHtml(song.artist)}</p>
                <small>${song.duration}</small>
            </div>
        `).join('');
    }

    playSong(id) {
        const song = this.state.songs.find(s => s.id === id);
        if (!song) return;

        this.state.currentSong = song;
        this.state.currentTime = 0;
        this.state.isPlaying = true;

        // Update UI
        document.getElementById('currentTitle').textContent = song.title;
        document.getElementById('currentArtist').textContent = song.artist;
        document.getElementById('totalTime').textContent = song.duration;
        document.getElementById('playBtn').textContent = '⏸️';

        this.renderLyrics();
        this.startPlayback();
        this.navigate('player');
    }

    renderLyrics() {
        const container = document.getElementById('lyricsDisplay');
        if (!container || !this.state.currentSong) return;

        const lyrics = this.state.currentSong.lyrics || [];
        container.innerHTML = lyrics.map((line, index) => `
            <p data-time="${line.time}" data-index="${index}">${this.escapeHtml(line.text)}</p>
        `).join('');
    }

    startPlayback() {
        if (this.playbackTimer) clearInterval(this.playbackTimer);
        
        this.playbackTimer = setInterval(() => {
            if (!this.state.isPlaying || !this.state.currentSong) return;
            
            this.state.currentTime++;
            
            // Update progress
            const progress = (this.state.currentTime / this.state.currentSong.durationSeconds) * 100;
            document.getElementById('progressFill').style.width = progress + '%';
            document.getElementById('currentTime').textContent = this.formatTime(this.state.currentTime);
            
            // Update lyrics highlighting
            this.highlightLyrics();
            
            // Auto stop
            if (this.state.currentTime >= this.state.currentSong.durationSeconds) {
                this.nextSong();
            }
        }, 1000);
    }

    highlightLyrics() {
        if (!this.state.currentSong) return;
        
        const lines = document.querySelectorAll('#lyricsDisplay p');
        lines.forEach(line => {
            const time = parseFloat(line.dataset.time);
            const nextTime = parseFloat(line.nextElementSibling?.dataset.time || Infinity);
            
            if (this.state.currentTime >= time && this.state.currentTime < nextTime) {
                line.classList.add('active');
                line.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else {
                line.classList.remove('active');
            }
        });
    }

    togglePlay() {
        if (!this.state.currentSong) return;
        
        this.state.isPlaying = !this.state.isPlaying;
        document.getElementById('playBtn').textContent = this.state.isPlaying ? '⏸️' : '▶️';
    }

    prevSong() {
        if (!this.state.currentSong) return;
        const currentIndex = this.state.songs.findIndex(s => s.id === this.state.currentSong.id);
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : this.state.songs.length - 1;
        this.playSong(this.state.songs[prevIndex].id);
    }

    nextSong() {
        if (!this.state.currentSong) return;
        const currentIndex = this.state.songs.findIndex(s => s.id === this.state.currentSong.id);
        const nextIndex = currentIndex < this.state.songs.length - 1 ? currentIndex + 1 : 0;
        this.playSong(this.state.songs[nextIndex].id);
    }

    seek(event) {
        if (!this.state.currentSong) return;
        const rect = event.currentTarget.getBoundingClientRect();
        const percent = (event.clientX - rect.left) / rect.width;
        this.state.currentTime = Math.floor(percent * this.state.currentSong.durationSeconds);
    }

    // Admin Functions
    addSong(event) {
        event.preventDefault();
        
        const title = document.getElementById('songTitle').value;
        const artist = document.getElementById('songArtist').value;
        const duration = document.getElementById('songDuration').value;
        const lyricsText = document.getElementById('songLyrics').value;

        const lyrics = this.parseLyrics(lyricsText);
        const durationSeconds = this.parseDuration(duration);

        const newSong = {
            id: Date.now(),
            title,
            artist,
            duration,
            durationSeconds,
            lyrics
        };

        this.state.songs.push(newSong);
        this.saveData();
        this.renderSongs();
        this.renderAdminSongs();
        
        document.getElementById('addSongForm').reset();
        alert('Lagu berhasil ditambahkan!');
    }

    parseLyrics(text) {
        const lines = text.split('\n');
        return lines.map((line, index) => {
            const match = line.match(/\[(\d+):(\d+\.?\d*)\](.*)/);
            if (match) {
                const minutes = parseInt(match[1]);
                const seconds = parseFloat(match[2]);
                return {
                    time: minutes * 60 + seconds,
                    text: match[3].trim()
                };
            }
            return { time: index * 10, text: line.trim() };
        }).filter(l => l.text);
    }

    parseDuration(duration) {
        const [mins, secs] = duration.split(':').map(Number);
        return (mins * 60) + secs;
    }

    deleteSong(id) {
        if (!confirm('Yakin ingin menghapus lagu ini?')) return;
        this.state.songs = this.state.songs.filter(s => s.id !== id);
        this.saveData();
        this.renderSongs();
        this.renderAdminSongs();
    }

    renderAdminSongs() {
        const container = document.getElementById('adminSongList');
        if (!container) return;

        container.innerHTML = this.state.songs.map(song => `
            <div class="admin-item">
                <div>
                    <strong>${this.escapeHtml(song.title)}</strong>
                    <p>${this.escapeHtml(song.artist)}</p>
                </div>
                <button class="btn-delete" onclick="app.deleteSong(${song.id})">Hapus</button>
            </div>
        `).join('');
    }

    // User Management
    handleLogin(event) {
        event.preventDefault();
        
        const username = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;
        const role = document.getElementById('loginRole').value;

        const user = this.state.users.find(u => 
            u.username === username && 
            u.password === password &&
            u.role === role
        );

        if (user) {
            this.state.currentUser = user;
            this.saveData();
            this.closeLogin();
            this.updateUI();
            alert(`Selamat datang, ${user.username}!`);
        } else {
            alert('Username, password, atau role salah!');
        }
    }

    handleRegister(event) {
        event.preventDefault();
        
        const username = document.getElementById('regUsername').value;
        const password = document.getElementById('regPassword').value;
        const confirmPassword = document.getElementById('regConfirmPassword').value;

        if (password !== confirmPassword) {
            alert('Password tidak cocok!');
            return;
        }

        if (this.state.users.find(u => u.username === username)) {
            alert('Username sudah terdaftar!');
            return;
        }

        const newUser = {
            username,
            password,
            role: 'user'
        };

        this.state.users.push(newUser);
        this.saveData();
        this.closeRegister();
        alert('Akun berhasil dibuat! Silakan login.');
    }

    logout() {
        this.state.currentUser = null;
        localStorage.removeItem('lyricflow_currentUser');
        this.updateUI();
        this.navigate('home');
    }

    updateUI() {
        const userSection = document.getElementById('userSection');
        const adminLink = document.getElementById('adminLink');
        
        if (this.state.currentUser) {
            userSection.innerHTML = `
                <div class="user-info">
                    <span>${this.state.currentUser.username}</span>
                    <span class="user-badge">${this.state.currentUser.role}</span>
                    <button onclick="app.logout()" class="btn-login">Logout</button>
                </div>
            `;
            
            if (this.state.currentUser.role === 'admin') {
                adminLink.style.display = 'block';
            }
        } else {
            userSection.innerHTML = `<button onclick="app.showLogin()" class="btn-login">Login</button>`;
            adminLink.style.display = 'none';
        }
    }

    showLogin() {
        document.getElementById('loginModal').style.display = 'block';
    }

    closeLogin() {
        document.getElementById('loginModal').style.display = 'none';
    }

    showRegister() {
        this.closeLogin();
        document.getElementById('registerModal').style.display = 'block';
    }

    closeRegister() {
        document.getElementById('registerModal').style.display = 'none';
    }

    showAdminTab(tab) {
        document.querySelectorAll('.admin-tab-content').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        
        document.getElementById(tab + 'Tab').classList.add('active');
        event.target.classList.add('active');
    }

    renderUsers() {
        const container = document.getElementById('userList');
        if (!container) return;

        container.innerHTML = this.state.users.map(user => `
            <div class="admin-item">
                <div>
                    <strong>${this.escapeHtml(user.username)}</strong>
                    <span class="user-badge">${user.role}</span>
                </div>
                ${user.username !== 'admin' ? `<button class="btn-delete" onclick="app.deleteUser('${user.username}')">Hapus</button>` : ''}
            </div>
        `).join('');
    }

    deleteUser(username) {
        if (!confirm(`Yakin ingin menghapus user ${username}?`)) return;
        this.state.users = this.state.users.filter(u => u.username !== username);
        this.saveData();
        this.renderUsers();
    }

    search() {
        const query = document.getElementById('searchInput').value;
        this.renderSongs(query);
    }

    // Utilities
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showError(message) {
        alert(message);
    }
}

// Initialize App
const app = new LyricApp();
