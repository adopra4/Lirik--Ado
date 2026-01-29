/**
 * LIBRARY MODULE v1.2
 * Song Library Management with Auto-Scan
 */

App.library = {
    viewMode: 'grid', // grid or list
    sortBy: 'title', // title, artist, date, duration
    searchQuery: '',

    init() {
        this.setupEventListeners();
    },

    setupEventListeners() {
        // Sort toggle
        document.querySelector('.btn-sort')?.addEventListener('click', () => {
            const sorts = ['title', 'artist', 'date', 'duration'];
            const currentIndex = sorts.indexOf(this.sortBy);
            this.sortBy = sorts[(currentIndex + 1) % sorts.length];
            this.render();
            App.toast.show(`Sorted by: ${this.sortBy}`, 'info');
        });

        // View toggle
        document.querySelector('.btn-view')?.addEventListener('click', () => {
            this.viewMode = this.viewMode === 'grid' ? 'list' : 'grid';
            this.render();
        });
    },

    async load() {
        // Load from localStorage first
        const stored = localStorage.getItem('lf_songs');
        if (stored) {
            App.state.songs = JSON.parse(stored);
            this.render();
        }

        // Then scan for new songs
        await this.scanFolder();
    },

    async scanFolder() {
        // In real implementation, this would scan the songs/ folder
        // For now, we'll check for new song files dynamically
        
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
};

        // Merge with existing, avoiding duplicates
        const existingIds = new Set(App.state.songs.map(s => s.id));
        const newSongs = defaultSongs.filter(s => !existingIds.has(s.id));
        
        if (newSongs.length > 0) {
            App.state.songs = [...App.state.songs, ...newSongs];
            this.save();
            this.render();
            App.toast.show(`Found ${newSongs.length} new songs!`, 'success');
        }

        // Update system info
        document.getElementById('sysSongCount').textContent = App.state.songs.length;
    },

    render() {
        const container = document.getElementById('songGrid');
        let songs = this.getFilteredSongs();

        // Sort
        songs = this.sortSongs(songs);

        if (songs.length === 0) {
            container.innerHTML = '<div class="empty-state">No songs found</div>';
            return;
        }

        if (this.viewMode === 'grid') {
            container.className = 'song-grid';
            container.innerHTML = songs.map(song => this.createGridCard(song)).join('');
        } else {
            container.className = 'song-list-view';
            container.innerHTML = songs.map(song => this.createListItem(song)).join('');
        }
    },

    createGridCard(song) {
        const isActive = App.state.currentSong?.id === song.id;
        const isFav = App.state.favorites.has(song.id);
        
        return `
            <div class="song-card ${isActive ? 'active' : ''}" data-id="${song.id}">
                <div class="song-cover-wrapper" onclick="app.player.loadById('${song.id}')">
                    <img src="${song.cover}" alt="${song.title}" class="song-cover" loading="lazy">
                    <div class="song-overlay">
                        <button class="btn-play-overlay">▶</button>
                    </div>
                    ${App.state.editMode ? `<button class="btn-delete-song" onclick="event.stopPropagation(); app.dev.deleteSong('${song.id}')">×</button>` : ''}
                </div>
                <div class="song-info">
                    <div class="song-title">${this.escapeHtml(song.title)}</div>
                    <div class="song-artist">${this.escapeHtml(song.artist)}</div>
                </div>
            </div>
        `;
    },

    createListItem(song) {
        const isActive = App.state.currentSong?.id === song.id;
        const duration = this.formatDuration(song.duration);
        
        return `
            <div class="song-list-item ${isActive ? 'active' : ''}" onclick="app.player.loadById('${song.id}')">
                <img src="${song.cover}" alt="" class="list-cover">
                <div class="list-info">
                    <div class="list-title">${this.escapeHtml(song.title)}</div>
                    <div class="list-artist">${this.escapeHtml(song.artist)} • ${this.escapeHtml(song.album || 'Unknown Album')}</div>
                </div>
                <div class="list-duration">${duration}</div>
                <button class="list-fav ${App.state.favorites.has(song.id) ? 'active' : ''}" onclick="event.stopPropagation(); app.library.toggleFav('${song.id}')">
                    ${App.state.favorites.has(song.id) ? '❤️' : '🤍'}
                </button>
            </div>
        `;
    },

    getFilteredSongs() {
        let songs = [...App.state.songs];
        
        if (this.searchQuery) {
            const q = this.searchQuery.toLowerCase();
            songs = songs.filter(s => 
                s.title.toLowerCase().includes(q) ||
                s.artist.toLowerCase().includes(q) ||
                (s.album && s.album.toLowerCase().includes(q))
            );
        }
        
        return songs;
    },

    sortSongs(songs) {
        switch(this.sortBy) {
            case 'title':
                return songs.sort((a, b) => a.title.localeCompare(b.title));
            case 'artist':
                return songs.sort((a, b) => a.artist.localeCompare(b.artist));
            case 'date':
                return songs.sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
            case 'duration':
                return songs.sort((a, b) => (a.duration || 0) - (b.duration || 0));
            default:
                return songs;
        }
    },

    search(query) {
        this.searchQuery = query;
        this.render();
    },

    showFavorites() {
        const favs = App.state.songs.filter(s => App.state.favorites.has(s.id));
        const container = document.getElementById('songGrid');
        
        if (favs.length === 0) {
            container.innerHTML = '<div class="empty-state">No favorites yet. Click 🤍 on any song!</div>';
            return;
        }
        
        container.className = 'song-grid';
        container.innerHTML = favs.map(song => this.createGridCard(song)).join('');
    },

    showRecent() {
        const recentIds = App.state.recent.map(r => r.id);
        const recent = recentIds.map(id => App.state.songs.find(s => s.id === id)).filter(Boolean);
        
        const container = document.getElementById('songGrid');
        
        if (recent.length === 0) {
            container.innerHTML = '<div class="empty-state">No recent plays</div>';
            return;
        }
        
        container.className = 'song-grid';
        container.innerHTML = recent.map(song => this.createGridCard(song)).join('');
    },

    toggleFav(id) {
        if (App.state.favorites.has(id)) {
            App.state.favorites.delete(id);
        } else {
            App.state.favorites.add(id);
        }
        App.saveData();
        this.render();
    },

    toggleSort() {
        const sorts = ['title', 'artist', 'date', 'duration'];
        const currentIndex = sorts.indexOf(this.sortBy);
        this.sortBy = sorts[(currentIndex + 1) % sorts.length];
        this.render();
        return this.sortBy;
    },

    toggleView() {
        this.viewMode = this.viewMode === 'grid' ? 'list' : 'grid';
        this.render();
        return this.viewMode;
    },

    checkForNewSongs() {
        this.scanFolder();
    },

    save() {
        localStorage.setItem('lf_songs', JSON.stringify(App.state.songs));
        document.getElementById('sysSongCount').textContent = App.state.songs.length;
    },

    formatDuration(seconds) {
        if (!seconds) return '--:--';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};
