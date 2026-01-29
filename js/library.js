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
        
        const defaultSongs = [
            {
                id: 'demo_001',
                title: 'Midnight City',
                artist: 'Neon Dreams',
                album: 'Night Drive',
                cover: 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?w=400',
                audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
                duration: 372,
                addedAt: Date.now(),
                lyrics: `00:00:05|Walking through the midnight city
00:00:12|Neon lights are shining bright
00:00:20|Every street tells a story
00:00:28|In the electric night
00:00:35|Dreams are made of shadows
00:00:42|Reflections in the rain
00:00:50|Memories will follow
00:00:58|Until we meet again
00:01:10|Midnight city, take me away
00:01:18|To a place where I can stay
00:01:25|Forever in this moment
00:01:35|Time is frozen, never spent`
            },
            {
                id: 'demo_002',
                title: 'Ocean Waves',
                artist: 'Coastal Vibes',
                album: 'Serenity',
                cover: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400',
                audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
                duration: 285,
                addedAt: Date.now() - 86400000,
                lyrics: `00:00:03|Hear the ocean calling
00:00:10|Waves upon the shore
00:00:18|Salt air in the morning
00:00:25|I couldn't ask for more
00:00:32|Endless blue horizon
00:00:40|Where the sea meets sky
00:00:48|Nature's perfect rhythm
00:00:55|As the seagulls fly
00:01:05|Ocean waves, carry me home
00:01:12|To the place where I belong
00:01:20|In your depths I find my peace
00:01:30|All my worries cease`
            },
            {
                id: 'demo_003',
                title: 'Mountain High',
                artist: 'Alpine Echo',
                album: 'Peak Performance',
                cover: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400',
                audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
                duration: 420,
                addedAt: Date.now() - 172800000,
                lyrics: `00:00:08|Climbing up the mountain
00:00:15|Higher than before
00:00:22|Breathing thin air slowly
00:00:30|As we explore
00:00:38|Snow caps in the distance
00:00:45|Eagles soaring high
00:00:52|Nature's grand resistance
00:01:00|Touching the sky
00:01:15|Mountain high, valley low
00:01:22|Places only few will go
00:01:30|Standing on the edge of world
00:01:40|Flags of victory unfurled`
            }
        ];

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
