// Global Variables
let songs = [];
let currentSong = null;
let lyricsData = [];
let isPlaying = false;
let editMode = false;
let autoRefreshInterval;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadSongs();
    setupAudioPlayer();
    startAutoRefresh();
});

// Auto-refresh setiap 30 detik untuk cek lagu baru
function startAutoRefresh() {
    autoRefreshInterval = setInterval(() => {
        loadSongs();
    }, 30000);
}

// Load semua lagu dari folder songs/
async function loadSongs() {
    try {
        // Cek localStorage dulu untuk data developer
        const storedSongs = localStorage.getItem('lyricflow_songs');
        if (storedSongs) {
            songs = JSON.parse(storedSongs);
        } else {
            // Load default songs dari template HTML
            songs = getDefaultSongs();
        }
        
        renderSongList();
        
        // Jika ada lagu yang sedang diputar, update UI
        if (currentSong) {
            const updatedSong = songs.find(s => s.id === currentSong.id);
            if (updatedSong) {
                currentSong = updatedSong;
                updateLyricsData();
            }
        }
    } catch (error) {
        console.error('Error loading songs:', error);
    }
}

async function loadSongs() {
    try {
        const songFiles = [
            'songs/song1.html',
            'songs/song2.html'
        ];

        songs = [];

        for (const file of songFiles) {
            const song = await loadSongFromHTML(file);
            if (song) songs.push(song);
        }

        renderSongList();

    } catch (err) {
        console.error('Gagal load lagu:', err);
        songs = [];
        renderSongList();
    }
}

// Render daftar lagu
function renderSongList() {
    const container = document.getElementById('songList');
    container.innerHTML = '';
    
    songs.forEach(song => {
        const card = createSongCard(song);
        container.appendChild(card);
    });
}

// Buat kartu lagu
function createSongCard(song) {
    const card = document.createElement('div');
    card.className = 'song-card';
    card.dataset.id = song.id;
    card.onclick = () => playSong(song);
    
    if (currentSong && currentSong.id === song.id) {
        card.classList.add('active');
    }
    
    card.innerHTML = `
        <button class="delete-btn" onclick="deleteSong(event, '${song.id}')">×</button>
        <img src="${song.cover}" alt="${song.title}" class="song-cover">
        <div class="play-icon">▶</div>
        <div class="song-info">
            <div class="song-title">${song.title}</div>
            <div class="song-artist">${song.artist}</div>
        </div>
    `;
    
    return card;
}

// Putar lagu
function playSong(song) {
    currentSong = song;
    const player = document.getElementById('audioPlayer');
    const playerSection = document.getElementById('playerSection');
    
    // Update UI
    document.getElementById('currentTitle').textContent = song.title;
    document.getElementById('currentArtist').textContent = song.artist;
    document.getElementById('currentCover').src = song.cover;
    player.src = song.audio;
    
    // Parse lyrics
    updateLyricsData();
    renderLyrics();
    
    // Show player
    playerSection.style.display = 'block';
    playerSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    
    // Update active card
    document.querySelectorAll('.song-card').forEach(card => {
        card.classList.toggle('active', card.dataset.id === song.id);
    });
    
    // Auto play
    player.play().catch(e => console.log('Auto-play prevented:', e));
    
    // Update URL hash untuk deep linking
    window.location.hash = song.id;
}

// Parse lyrics dengan format HH:MM:SS
function updateLyricsData() {
    if (!currentSong || !currentSong.lyrics) {
        lyricsData = [];
        return;
    }
    
    lyricsData = currentSong.lyrics.split('\n')
        .filter(line => line.trim())
        .map(line => {
            const match = line.match(/(\d{2}):(\d{2}):(\d{2})\|(.+)/);
            if (match) {
                const hours = parseInt(match[1]);
                const minutes = parseInt(match[2]);
                const seconds = parseInt(match[3]);
                const time = hours * 3600 + minutes * 60 + seconds;
                return {
                    time: time,
                    text: match[4].trim(),
                    timeStr: `${match[1]}:${match[2]}:${match[3]}`
                };
            }
            return null;
        })
        .filter(item => item !== null)
        .sort((a, b) => a.time - b.time);
}

// Render lyrics ke DOM
function renderLyrics() {
    const container = document.getElementById('lyricsDisplay');
    
    if (lyricsData.length === 0) {
        container.innerHTML = '<p class="lyrics-placeholder">Tidak ada lirik tersedia...</p>';
        return;
    }
    
    container.innerHTML = lyricsData.map((line, index) => `
        <div class="lyric-line" data-time="${line.time}" data-index="${index}">
            <span class="lyric-time">${line.timeStr}</span>
            ${line.text}
        </div>
    `).join('');
}

// Setup audio player events
function setupAudioPlayer() {
    const player = document.getElementById('audioPlayer');
    const progressBar = document.getElementById('progressBar');
    const currentTimeEl = document.getElementById('currentTime');
    const durationEl = document.getElementById('duration');
    
    player.addEventListener('timeupdate', () => {
        const current = player.currentTime;
        const duration = player.duration || 0;
        
        // Update progress bar
        const progress = (current / duration) * 100;
        progressBar.style.width = `${progress}%`;
        
        // Update time display dengan format HH:MM:SS
        currentTimeEl.textContent = formatTime(current);
        durationEl.textContent = formatTime(duration);
        
        // Update lyrics highlighting
        updateLyricsHighlight(current);
    });
    
    player.addEventListener('play', () => {
        isPlaying = true;
        document.querySelector('.album-art').classList.add('playing');
    });
    
    player.addEventListener('pause', () => {
        isPlaying = false;
        document.querySelector('.album-art').classList.remove('playing');
    });
    
    player.addEventListener('ended', () => {
        // Auto next song
        const currentIndex = songs.findIndex(s => s.id === currentSong.id);
        if (currentIndex < songs.length - 1) {
            playSong(songs[currentIndex + 1]);
        }
    });
    
    // Click on progress bar to seek
    document.querySelector('.progress-bar').addEventListener('click', (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        player.currentTime = pos * player.duration;
    });
}

// Format detik ke HH:MM:SS
function formatTime(seconds) {
    if (isNaN(seconds)) return '00:00:00';
    
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// Update highlight lirik berdasarkan waktu
function updateLyricsHighlight(currentTime) {
    const lines = document.querySelectorAll('.lyric-line');
    let activeIndex = -1;
    
    // Cari line yang sedang aktif
    for (let i = 0; i < lyricsData.length; i++) {
        if (currentTime >= lyricsData[i].time) {
            activeIndex = i;
        } else {
            break;
        }
    }
    
    // Update classes
    lines.forEach((line, index) => {
        line.classList.toggle('active', index === activeIndex);
        if (index === activeIndex) {
            line.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    });
}

// Developer Mode Functions
function activateDevMode() {
    // Tekan 3x untuk aktifkan dev mode
    const trigger = document.getElementById('devTrigger');
    trigger.clickCount = (trigger.clickCount || 0) + 1;
    
    if (trigger.clickCount >= 3) {
        document.getElementById('devPanel').classList.remove('hidden');
        trigger.style.opacity = '1';
        trigger.clickCount = 0;
    }
    
    setTimeout(() => { trigger.clickCount = 0; }, 1000);
}

function toggleDevPanel() {
    document.getElementById('devPanel').classList.add('hidden');
}

function toggleEditMode() {
    editMode = !editMode;
    document.body.classList.toggle('edit-mode', editMode);
    
    const btn = document.querySelector('.btn-edit');
    btn.textContent = editMode ? '✓ Edit Mode ON' : '✏️ Edit Mode';
    btn.style.background = editMode ? 'var(--success)' : 'var(--secondary)';
}

function showAddForm() {
    const form = document.getElementById('addSongForm');
    form.classList.toggle('hidden');
}

function addNewSong() {
    const id = document.getElementById('newSongId').value.trim();
    const title = document.getElementById('newSongTitle').value.trim();
    const artist = document.getElementById('newSongArtist').value.trim();
    const cover = document.getElementById('newSongCover').value.trim();
    const audio = document.getElementById('newSongAudio').value.trim();
    const lyrics = document.getElementById('newSongLyrics').value.trim();
    
    if (!id || !title || !audio) {
        alert('ID, Title, dan Audio URL wajib diisi!');
        return;
    }
    
    // Cek ID unik
    if (songs.find(s => s.id === id)) {
        alert('ID sudah digunakan! Gunakan ID lain.');
        return;
    }
    
    const newSong = {
        id,
        title,
        artist: artist || 'Unknown Artist',
        cover: cover || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400',
        audio,
        lyrics: lyrics || ''
    };
    
    songs.push(newSong);
    saveSongs();
    renderSongList();
    
    // Reset form
    document.getElementById('newSongId').value = '';
    document.getElementById('newSongTitle').value = '';
    document.getElementById('newSongArtist').value = '';
    document.getElementById('newSongCover').value = '';
    document.getElementById('newSongAudio').value = '';
    document.getElementById('newSongLyrics').value = '';
    document.getElementById('addSongForm').classList.add('hidden');
    
    alert('Lagu berhasil ditambahkan!');
}

function deleteSong(event, id) {
    event.stopPropagation();
    if (!confirm('Yakin mau hapus lagu ini?')) return;
    
    songs = songs.filter(s => s.id !== id);
    saveSongs();
    renderSongList();
    
    if (currentSong && currentSong.id === id) {
        document.getElementById('playerSection').style.display = 'none';
        currentSong = null;
    }
}

function saveSongs() {
    localStorage.setItem('lyricflow_songs', JSON.stringify(songs));
}

function refreshSongs() {
    const btn = document.querySelector('.btn-refresh');
    btn.style.animation = 'spin 1s linear';
    
    loadSongs();
    
    setTimeout(() => {
        btn.style.animation = '';
        alert('Playlist diperbarui!');
    }, 1000);
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    const player = document.getElementById('audioPlayer');
    
    if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        if (player.paused) player.play();
        else player.pause();
    }
    
    if (e.code === 'ArrowRight' && e.ctrlKey) {
        player.currentTime += 5;
    }
    if (e.code === 'ArrowLeft' && e.ctrlKey) {
        player.currentTime -= 5;
    }
});

// Check URL hash on load
window.addEventListener('load', () => {
    const hash = window.location.hash.slice(1);
    if (hash) {
        const song = songs.find(s => s.id === hash);
        if (song) playSong(song);
    }
});
