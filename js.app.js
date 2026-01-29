// LyricFlow v00.00.00 - Main Application
const App = {
    version: '00.00.00',
    currentUser: null,
    isDev: false,
    songs: [],
    currentSong: null,
    audio: new Audio(),
    
    init() {
        console.log(`🎵 LyricFlow v${this.version} initialized`);
        this.loadSongs();
        this.setupEventListeners();
        this.checkAuth();
        
        // Hide loader
        setTimeout(() => {
            document.getElementById('loader').style.display = 'none';
        }, 1000);
    },
    
    async loadSongs() {
        try {
            // Default songs for v00.00.00
            this.songs = [
                {
                    id: 1,
                    title: "Sample Song 1",
                    artist: "Unknown Artist",
                    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
                    lyrics: `[00:00] Intro Music
[00:15] First verse starts here
[00:30] Lyrics line 2
[00:45] Chorus part 1
[01:00] Chorus part 2
[01:15] Second verse
[01:30] Bridge section
[01:45] Final chorus
[02:00] Outro music`
                }
            ];
            this.renderSongs();
        } catch (error) {
            console.error('Error loading songs:', error);
        }
    },
    
    renderSongs() {
        const container = document.getElementById('songList');
        container.innerHTML = this.songs.map(song => `
            <div class="song-card" onclick="App.playSong(${song.id})">
                <div class="song-cover">🎵</div>
                <div class="song-title">${song.title}</div>
                <div class="song-artist">${song.artist}</div>
            </div>
        `).join('');
        
        // Update library too
        const library = document.getElementById('libraryList');
        if (library) {
            library.innerHTML = this.songs.map(song => `
                <div class="song-card" onclick="App.playSong(${song.id})">
                    <div class="song-cover">🎵</div>
                    <div class="song-title">${song.title}</div>
                    <div class="song-artist">${song.artist}</div>
                </div>
            `).join('');
        }
    },
    
    playSong(id) {
        const song = this.songs.find(s => s.id === id);
        if (!song) return;
        
        this.currentSong = song;
        this.audio.src = song.url;
        this.audio.play();
        
        // Update player UI
        document.getElementById('playerTitle').textContent = song.title;
        document.getElementById('playerArtist').textContent = song.artist;
        document.getElementById('playBtn').textContent = '⏸';
        document.getElementById('player').classList.remove('hidden');
        
        // Load lyrics
        this.loadLyrics(song.lyrics);
        
        // Setup progress
        this.audio.ontimeupdate = () => this.updateProgress();
        this.audio.onended = () => {
            document.getElementById('playBtn').textContent = '▶';
        };
    },
    
    loadLyrics(lyricsText) {
        const lines = lyricsText.split('\n').map(line => {
            const match = line.match(/\[(\d{2}):(\d{2})\]\s*(.+)/);
            if (match) {
                const time = parseInt(match[1]) * 60 + parseInt(match[2]);
                return { time, text: match[3] };
            }
            return null;
        }).filter(Boolean);
        
        this.lyricsData = lines;
        
        const content = document.getElementById('lyricsContent');
        content.innerHTML = lines.map((line, i) => 
            `<div class="lyrics-line" data-time="${line.time}" id="line-${i}">${line.text}</div>`
        ).join('');
    },
    
    updateProgress() {
        const current = this.audio.currentTime;
        const duration = this.audio.duration || 0;
        
        document.getElementById('currentTime').textContent = this.formatTime(current);
        document.getElementById('duration').textContent = this.formatTime(duration);
        document.getElementById('progressBar').value = (current / duration) * 100 || 0;
        
        // Sync lyrics
        if (this.lyricsData) {
            const activeLine = this.lyricsData.reduce((prev, curr, i) => {
                return current >= curr.time ? i : prev;
            }, -1);
            
            document.querySelectorAll('.lyrics-line').forEach((el, i) => {
                el.classList.toggle('active', i === activeLine);
                if (i === activeLine) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            });
        }
    },
    
    formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    },
    
    setupEventListeners() {
        // Progress bar
        document.getElementById('progressBar').addEventListener('input', (e) => {
            const time = (e.target.value / 100) * this.audio.duration;
            this.audio.currentTime = time;
        });
        
        // Search
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.searchSongs(e.target.value);
        });
    },
    
    searchSongs(query) {
        const filtered = this.songs.filter(s => 
            s.title.toLowerCase().includes(query.toLowerCase()) ||
            s.artist.toLowerCase().includes(query.toLowerCase())
        );
        
        const container = document.getElementById('songList');
        container.innerHTML = filtered.map(song => `
            <div class="song-card" onclick="App.playSong(${song.id})">
                <div class="song-cover">🎵</div>
                <div class="song-title">${song.title}</div>
                <div class="song-artist">${song.artist}</div>
            </div>
        `).join('');
    },
    
    checkAuth() {
        const saved = localStorage.getItem('lyricflow_user');
        if (saved) {
            this.currentUser = JSON.parse(saved);
            this.updateUIForUser();
        }
    },
    
    updateUIForUser() {
        document.getElementById('userName').textContent = this.currentUser.username;
        document.getElementById('loginBtn').style.display = 'none';
        
        if (this.currentUser.role === 'developer') {
            this.isDev = true;
            document.getElementById('devMenuItem').classList.remove('hidden');
            document.getElementById('page-developer').classList.remove('hidden');
        }
    },
    
    togglePlay() {
        if (this.audio.paused) {
            this.audio.play();
            document.getElementById('playBtn').textContent = '⏸';
        } else {
            this.audio.pause();
            document.getElementById('playBtn').textContent = '▶';
        }
    },
    
    toggleLyrics() {
        document.getElementById('lyricsPanel').classList.toggle('hidden');
    },
    
    showPage(page) {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById(`page-${page}`).classList.add('active');
        
        document.querySelectorAll('.nav-links li').forEach(li => li.classList.remove('active'));
        event.target.closest('li').classList.add('active');
        
        if (page === 'developer' && this.isDev) {
            this.loadDevData();
        }
    },
    
    loadDevData() {
        document.getElementById('totalSongs').textContent = this.songs.length;
        document.getElementById('totalUsers').textContent = '1'; // Demo data
        
        // Load users table
        const tbody = document.querySelector('#usersTable tbody');
        tbody.innerHTML = `
            <tr>
                <td>${this.currentUser.username}</td>
                <td>${this.currentUser.role}</td>
                <td>${new Date().toLocaleDateString()}</td>
            </tr>
        `;
    },
    
    showAddSongForm() {
        document.getElementById('addSongForm').classList.toggle('hidden');
    },
    
    addNewSong() {
        const title = document.getElementById('newSongTitle').value;
        const artist = document.getElementById('newSongArtist').value;
        const url = document.getElementById('newSongUrl').value;
        const lyrics = document.getElementById('newSongLyrics').value;
        
        if (!title || !url) {
            alert('Judul dan URL wajib diisi!');
            return;
        }
        
        const newSong = {
            id: this.songs.length + 1,
            title,
            artist: artist || 'Unknown',
            url,
            lyrics: lyrics || '[00:00] No lyrics available'
        };
        
        this.songs.push(newSong);
        this.renderSongs();
        
        // Clear form
        document.getElementById('newSongTitle').value = '';
        document.getElementById('newSongArtist').value = '';
        document.getElementById('newSongUrl').value = '';
        document.getElementById('newSongLyrics').value = '';
        document.getElementById('addSongForm').classList.add('hidden');
        
        alert('Lagu berhasil ditambahkan!');
    },
    
    logout() {
        localStorage.removeItem('lyricflow_user');
        location.reload();
    }
};

// Global functions
function openLogin() {
    document.getElementById('loginModal').style.display = 'flex';
}

function closeLogin() {
    document.getElementById('loginModal').style.display = 'none';
}

function showDevLogin() {
    document.getElementById('devLoginModal').style.display = 'flex';
    document.getElementById('loginModal').style.display = 'none';
}

function closeDevLogin() {
    document.getElementById('devLoginModal').style.display = 'none';
    document.getElementById('loginModal').style.display = 'flex';
}

function showPage(page) {
    App.showPage(page);
}

function togglePlay() {
    App.togglePlay();
}

function toggleLyrics() {
    App.toggleLyrics();
}

function searchSongs() {
    const query = document.getElementById('searchInput').value;
    App.searchSongs(query);
}

function showAddSongForm() {
    App.showAddSongForm();
}

function addNewSong() {
    App.addNewSong();
}

function logout() {
    App.logout();
}

function prevSong() {
    console.log('Previous song - feature in next version');
}

function nextSong() {
    console.log('Next song - feature in next version');
}

// Close modal on outside click
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => App.init());
