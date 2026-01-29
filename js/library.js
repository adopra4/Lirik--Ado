
 * LYRICFLOW v1.3 - LIBRARY MODULE
 * Music Library Management & Discovery
 */

class LibraryManager {
    constructor(app) {
        this.app = app;
        this.songs = [];
        this.albums = [];
        this.artists = [];
        this.playlists = [];
        this.favorites = new Set();
        this.recentlyPlayed = [];
        
        this.filters = {
            search: '',
            genre: null,
            mood: null,
            sortBy: 'recent'
        };

        this.init();
    }

    async init() {
        await this.loadLibrary();
        this.loadFavorites();
        this.loadRecentlyPlayed();
        this.setupEventListeners();
    }

    async loadLibrary() {
        // Load from local storage first
        const stored = localStorage.getItem('lyricflow_library');
        if (stored) {
            this.songs = JSON.parse(stored);
        } else {
            // Load demo data
            this.songs = this.getDemoSongs();
            this.saveLibrary();
        }

        this.processLibrary();
        this.renderLibrary();
    }

    getDemoSongs() {
        return [
            {
                id: '1',
                title: 'Midnight Dreams',
                artist: 'Luna Eclipse',
                album: 'Night Vibes',
                year: '2024',
                genre: 'Electronic',
                duration: 245,
                cover: null,
                url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
                lyrics: `[00:00.00] Instrumental intro
[00:15.00] Walking through the midnight rain
[00:20.00] Memories fading like a dream
[00:25.00] Stars above are calling out your name
[00:30.00] Nothing is quite what it seems
[00:35.00] 
[00:40.00] Chorus:
[00:45.00] Midnight dreams take me away
[00:50.00] To a place where we can stay
[00:55.00] Forever in this endless night
[01:00.00] Everything will be alright`,
                plays: 1240,
                addedAt: Date.now() - 86400000 * 2
            },
            {
                id: '2',
                title: 'Ocean Waves',
                artist: 'Coastal Sounds',
                album: 'Blue Horizon',
                year: '2024',
                genre: 'Ambient',
                duration: 312,
                cover: null,
                url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
                lyrics: `[00:00.00] Waves crashing on the shore
[00:10.00] Washing away the pain
[00:20.00] I don't wanna fight no more
[00:30.00] Let the water heal the stain
[00:40.00] 
[00:50.00] Ocean waves carry me home
[01:00.00] To a place I've never known
[01:10.00] Where the heart can be alone
[01:20.00] And the spirit can be shown`,
                plays: 892,
                addedAt: Date.now() - 86400000 * 5
            },
            {
                id: '3',
                title: 'City Lights',
                artist: 'Urban Pulse',
                album: 'Metropolitan',
                year: '2023',
                genre: 'Pop',
                duration: 198,
                cover: null,
                url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
                lyrics: `[00:00.00] Neon signs and city lights
[00:08.00] Guiding me through endless nights
[00:16.00] Every corner holds a story
[00:24.00] Every face a different glory
[00:32.00] 
[00:40.00] In the city that never sleeps
[00:48.00] Secrets that the darkness keeps
[00:56.00] Dreams are born and dreams are lost
[01:04.00] Paying every city's cost`,
                plays: 2156,
                addedAt: Date.now() - 86400000 * 10
            },
            {
                id: '4',
                title: 'Mountain High',
                artist: 'Alpine Echo',
                album: 'Peak Performance',
                year: '2024',
                genre: 'Rock',
                duration: 267,
                cover: null,
                url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
                lyrics: `[00:00.00] Climbing up the mountain high
[00:12.00] Touching clouds up in the sky
[00:24.00] Every step a battle won
[00:36.00] Chasing after setting sun
[00:48.00] 
[01:00.00] Mountain high, valley low
[01:12.00] Places I was meant to go
[01:24.00] Standing on the peak so tall
[01:36.00] I can see beyond it all`,
                plays: 567,
                addedAt: Date.now() - 86400000 * 15
            },
            {
                id: '5',
                title: 'Rainy Day',
                artist: 'Storm Chaser',
                album: 'Weather Patterns',
                year: '2023',
                genre: 'Jazz',
                duration: 284,
                cover: null,
                url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3',
                lyrics: `[00:00.00] Raindrops falling on my window
[00:15.00] Creating rhythms soft and slow
[00:30.00] Perfect weather to stay inside
[00:45.00] With a book and coffee by my side
[01:00.00] 
[01:15.00] Rainy days and Mondays always
[01:30.00] Seem to blend in hazy ways
[01:45.00] But there's comfort in the grey
[02:00.00] Watching clouds drift far away`,
                plays: 1453,
                addedAt: Date.now() - 86400000 * 20
            },
            {
                id: '6',
                title: 'Electric Dreams',
                artist: 'Synth Wave',
                album: 'Future Nostalgia',
                year: '2024',
                genre: 'Electronic',
                duration: 225,
                cover: null,
                url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-15.mp3',
                lyrics: `[00:00.00] Digital heart, analog soul
[00:12.00] Technology taking control
[00:24.00] Electric dreams in neon light
[00:36.00] Dancing through the endless night
[00:48.00] 
[01:00.00] Future sounds from the past
[01:12.00] Memories that will last
[01:24.00] In a world of ones and zeros
[01:36.00] We become the true heroes`,
                plays: 2341,
                addedAt: Date.now() - 86400000 * 1
            }
        ];
    }

    processLibrary() {
        // Extract albums
        const albumMap = new Map();
        this.songs.forEach(song => {
            if (!albumMap.has(song.album)) {
                albumMap.set(song.album, {
                    name: song.album,
                    artist: song.artist,
                    year: song.year,
                    cover: song.cover,
                    songs: []
                });
            }
            albumMap.get(song.album).songs.push(song);
        });
        this.albums = Array.from(albumMap.values());

        // Extract artists
        const artistMap = new Map();
        this.songs.forEach(song => {
            if (!artistMap.has(song.artist)) {
                artistMap.set(song.artist, {
                    name: song.artist,
                    songs: [],
                    albums: new Set()
                });
            }
            artistMap.get(song.artist).songs.push(song);
            artistMap.get(song.artist).albums.add(song.album);
        });
        this.artists = Array.from(artistMap.values()).map(a => ({
            ...a,
            albums: Array.from(a.albums)
        }));
    }

    setupEventListeners() {
        // Search
        const searchInput = document.getElementById('global-search');
        if (searchInput) {
            searchInput.addEventListener('input', this.app.debounce((e) => {
                this.filters.search = e.target.value.toLowerCase();
                this.renderLibrary();
            }, 300));
        }

        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                // Apply filter logic
            });
        });

        // Mood cards
        document.querySelectorAll('.mood-card').forEach(card => {
            card.addEventListener('click', () => {
                const mood = card.dataset.mood;
                this.playMoodPlaylist(mood);
            });
        });

        // Library tabs
        document.querySelectorAll('.library-tabs .tab-btn').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.library-tabs .tab-btn').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.renderLibrary(tab.dataset.tab);
            });
        });
    }

    renderLibrary(view = 'songs') {
        const container = document.getElementById('library-content') || 
                         document.getElementById('trending-songs');
        
        if (!container) return;

        let html = '';

        switch(view) {
            case 'songs':
                html = this.renderSongsList();
                break;
            case 'albums':
                html = this.renderAlbumsGrid();
                break;
            case 'artists':
                html = this.renderArtistsGrid();
                break;
            case 'genres':
                html = this.renderGenresList();
                break;
        }

        container.innerHTML = html;

        // Attach event listeners to rendered items
        this.attachItemListeners();
    }

    renderSongsList() {
        const filtered = this.getFilteredSongs();
        
        if (filtered.length === 0) {
            return this.renderEmptyState('No songs found');
        }

        return `
            <div class="song-table-container">
                <table class="song-table">
                    <thead>
                        <tr>
                            <th class="col-number">#</th>
                            <th class="col-title">Title</th>
                            <th class="col-artist">Artist</th>
                            <th class="col-album">Album</th>
                            <th class="col-date">Date Added</th>
                            <th class="col-duration"><i class="far fa-clock"></i></th>
                            <th class="col-actions"></th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filtered.map((song, index) => `
                            <tr data-song-id="${song.id}" class="${this.currentTrack?.id === song.id ? 'playing' : ''}">
                                <td class="col-number">
                                    <span class="song-number">${index + 1}</span>
                                    <button class="play-btn-small">
                                        <i class="fas fa-play"></i>
                                    </button>
                                </td>
                                <td class="col-title">
                                    <div class="song-info-cell">
                                        <div class="song-thumb">
                                            ${song.cover ? `<img src="${song.cover}" alt="">` : '<i class="fas fa-music"></i>'}
                                        </div>
                                        <div class="song-meta">
                                            <span class="song-title">${song.title}</span>
                                        </div>
                                    </div>
                                </td>
                                <td class="col-artist">${song.artist}</td>
                                <td class="col-album">${song.album}</td>
                                <td class="col-date">${this.formatDate(song.addedAt)}</td>
                                <td class="col-duration">${this.app.formatTime(song.duration)}</td>
                                <td class="col-actions">
                                    <button class="action-btn-small ${this.favorites.has(song.id) ? 'active' : ''}" data-action="favorite">
                                        <i class="${this.favorites.has(song.id) ? 'fas' : 'far'} fa-heart"></i>
                                    </button>
                                    <button class="action-btn-small" data-action="more">
                                        <i class="fas fa-ellipsis-v"></i>
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    renderAlbumsGrid() {
        return `
            <div class="song-grid">
                ${this.albums.map(album => `
                    <div class="song-card" data-album="${album.name}">
                        <div class="song-card-art">
                            ${album.cover ? `<img src="${album.cover}" alt="${album.name}">` : '<i class="fas fa-compact-disc"></i>'}
                            <div class="play-overlay">
                                <div class="play-button">
                                    <i class="fas fa-play"></i>
                                </div>
                            </div>
                        </div>
                        <div class="song-card-info">
                            <h4>${album.name}</h4>
                            <p>${album.artist} • ${album.year}</p>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderArtistsGrid() {
        return `
            <div class="song-grid">
                ${this.artists.map(artist => `
                    <div class="song-card" data-artist="${artist.name}">
                        <div class="song-card-art" style="border-radius: 50%;">
                            <i class="fas fa-user"></i>
                        </div>
                        <div class="song-card-info">
                            <h4>${artist.name}</h4>
                            <p>${artist.songs.length} songs • ${artist.albums.length} albums</p>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderGenresList() {
        const genres = this.getGenres();
        
        return `
            <div class="genre-grid">
                ${genres.map(genre => `
                    <div class="genre-card" data-genre="${genre.name}">
                        <div class="genre-header">
                            <h3>${genre.name}</h3>
                            <span>${genre.count} songs</span>
                        </div>
                        <div class="genre-preview">
                            ${genre.songs.slice(0, 3).map(s => `
                                <div class="genre-song">
                                    <i class="fas fa-music"></i>
                                    <span>${s.title}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderEmptyState(message) {
        return `
            <div class="empty-state">
                <div class="empty-icon">
                    <i class="fas fa-music"></i>
                </div>
                <h3 class="empty-title">${message}</h3>
                <p class="empty-text">Start by adding some music to your library</p>
                <button class="btn btn-primary" onclick="document.getElementById('upload-dropzone').click()">
                    <i class="fas fa-plus"></i>
                    Add Music
                </button>
            </div>
        `;
    }

    attachItemListeners() {
        // Song row clicks
        document.querySelectorAll('.song-table tbody tr').forEach(row => {
            row.addEventListener('dblclick', () => {
                const songId = row.dataset.songId;
                this.playSong(songId);
            });

            // Play button
            const playBtn = row.querySelector('.play-btn-small');
            if (playBtn) {
                playBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.playSong(row.dataset.songId);
                });
            }

            // Favorite button
            const favBtn = row.querySelector('[data-action="favorite"]');
            if (favBtn) {
                favBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.toggleFavorite(row.dataset.songId);
                });
            }
        });

        // Album cards
        document.querySelectorAll('[data-album]').forEach(card => {
            card.addEventListener('click', () => {
                this.playAlbum(card.dataset.album);
            });
        });

        // Artist cards
        document.querySelectorAll('[data-artist]').forEach(card => {
            card.addEventListener('click', () => {
                this.playArtist(card.dataset.artist);
            });
        });
    }

    getFilteredSongs() {
        let filtered = [...this.songs];

        // Search filter
        if (this.filters.search) {
            const search = this.filters.search.toLowerCase();
            filtered = filtered.filter(song => 
                song.title.toLowerCase().includes(search) ||
                song.artist.toLowerCase().includes(search) ||
                song.album.toLowerCase().includes(search)
            );
        }

        // Sort
        switch(this.filters.sortBy) {
            case 'recent':
                filtered.sort((a, b) => b.addedAt - a.addedAt);
                break;
            case 'plays':
                filtered.sort((a, b) => b.plays - a.plays);
                break;
            case 'title':
                filtered.sort((a, b) => a.title.localeCompare(b.title));
                break;
            case 'artist':
                filtered.sort((a, b) => a.artist.localeCompare(b.artist));
                break;
        }

        return filtered;
    }

    getGenres() {
        const genreMap = new Map();
        
        this.songs.forEach(song => {
            if (!genreMap.has(song.genre)) {
                genreMap.set(song.genre, {
                    name: song.genre,
                    count: 0,
                    songs: []
                });
            }
            genreMap.get(song.genre).count++;
            genreMap.get(song.genre).songs.push(song);
        });

        return Array.from(genreMap.values());
    }

    playSong(songId) {
        const song = this.songs.find(s => s.id === songId);
        if (!song) return;

        // Update plays
        song.plays++;
        this.saveLibrary();

        // Set queue to all songs
        this.app.player.setQueue(this.songs, this.songs.indexOf(song));
        
        // Play
        this.app.playTrack(song);

        // Load lyrics
        if (this.app.lyrics) {
            if (!this.app.lyrics.loadSavedLyrics(song.id)) {
                this.app.lyrics.load(song.lyrics);
            }
        }

        // Add to recently played
        this.addToRecentlyPlayed(song);
    }

    playAlbum(albumName) {
        const album = this.albums.find(a => a.name === albumName);
        if (!album) return;

        this.app.player.setQueue(album.songs);
        this.app.playTrack(album.songs[0], album.songs);
    }

    playArtist(artistName) {
        const artist = this.artists.find(a => a.name === artistName);
        if (!artist) return;

        this.app.player.setQueue(artist.songs);
        this.app.playTrack(artist.songs[0], artist.songs);
    }

    playMoodPlaylist(mood) {
        // Simple mood-based filtering
        const moodGenres = {
            happy: ['Pop', 'Electronic'],
            sad: ['Ambient', 'Jazz'],
            energetic: ['Rock', 'Electronic'],
            chill: ['Ambient', 'Jazz'],
            focus: ['Ambient', 'Electronic'],
            workout: ['Rock', 'Electronic', 'Pop']
        };

        const genres = moodGenres[mood] || [];
        const playlist = this.songs.filter(s => genres.includes(s.genre));
        
        if (playlist.length > 0) {
            this.app.player.setQueue(playlist);
            this.app.playTrack(playlist[0], playlist);
            this.app.showToast(`Playing ${mood} playlist`, 'success');
        }
    }

    toggleFavorite(songId) {
        if (this.favorites.has(songId)) {
            this.favorites.delete(songId);
            this.app.showToast('Removed from favorites', 'info');
        } else {
            this.favorites.add(songId);
            this.app.showToast('Added to favorites', 'success');
        }

        this.saveFavorites();
        this.renderLibrary();
    }

    addToRecentlyPlayed(song) {
        // Remove if exists
        this.recentlyPlayed = this.recentlyPlayed.filter(s => s.id !== song.id);
        
        // Add to front
        this.recentlyPlayed.unshift(song);
        
        // Keep only last 20
        if (this.recentlyPlayed.length > 20) {
            this.recentlyPlayed.pop();
        }

        localStorage.setItem('lyricflow_recent', JSON.stringify(this.recentlyPlayed.map(s => s.id)));
        this.renderRecentlyPlayed();
    }

    renderRecentlyPlayed() {
        const container = document.getElementById('recently-played');
        if (!container) return;

        container.innerHTML = this.recentlyPlayed.slice(0, 5).map(song => `
            <div class="song-list-item" data-song-id="${song.id}">
                <div class="song-thumb-small">
                    ${song.cover ? `<img src="${song.cover}" alt="">` : '<i class="fas fa-music"></i>'}
                </div>
                <div class="song-list-info">
                    <span class="song-list-title">${song.title}</span>
                    <span class="song-list-artist">${song.artist}</span>
                </div>
                <button class="song-list-play">
                    <i class="fas fa-play"></i>
                </button>
            </div>
        `).join('');
    }

    addSong(songData) {
        const song = {
            id: this.app.generateId(),
            ...songData,
            addedAt: Date.now(),
            plays: 0
        };

        this.songs.push(song);
        this.processLibrary();
        this.saveLibrary();
        this.renderLibrary();

        return song;
    }

    removeSong(songId) {
        this.songs = this.songs.filter(s => s.id !== songId);
        this.favorites.delete(songId);
        this.processLibrary();
        this.saveLibrary();
        this.renderLibrary();
    }

    updateSong(songId, updates) {
        const index = this.songs.findIndex(s => s.id === songId);
        if (index !== -1) {
            this.songs[index] = { ...this.songs[index], ...updates };
            this.processLibrary();
            this.saveLibrary();
            this.renderLibrary();
        }
    }

    saveLibrary() {
        localStorage.setItem('lyricflow_library', JSON.stringify(this.songs));
    }

    saveFavorites() {
        localStorage.setItem('lyricflow_favorites', JSON.stringify([...this.favorites]));
    }

    loadFavorites() {
        const stored = localStorage.getItem('lyricflow_favorites');
        if (stored) {
            this.favorites = new Set(JSON.parse(stored));
        }
    }

    loadRecentlyPlayed() {
        const stored = localStorage.getItem('lyricflow_recent');
        if (stored) {
            const ids = JSON.parse(stored);
            this.recentlyPlayed = ids.map(id => this.songs.find(s => s.id === id)).filter(Boolean);
            this.renderRecentlyPlayed();
        }
    }

    formatDate(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        const days = Math.floor(diff / 86400000);
        
        if (days === 0) return 'Today';
        if (days === 1) return 'Yesterday';
        if (days < 7) return `${days} days ago`;
        if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
        
        return date.toLocaleDateString();
    }

    getRecommendations() {
        // Simple recommendation based on favorites and recent plays
        const favoriteGenres = new Set();
        
        this.favorites.forEach(id => {
            const song = this.songs.find(s => s.id === id);
            if (song) favoriteGenres.add(song.genre);
        });

        return this.songs
            .filter(s => !this.favorites.has(s.id))
            .filter(s => favoriteGenres.has(s.genre))
            .slice(0, 10);
    }

    async importFromFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    if (Array.isArray(data)) {
                        data.forEach(song => {
                            if (!this.songs.find(s => s.id === song.id)) {
                                this.songs.push({
                                    ...song,
                                    addedAt: Date.now()
                                });
                            }
                        });
                        this.processLibrary();
                        this.saveLibrary();
                        this.renderLibrary();
                        resolve(data.length);
                    } else {
                        reject(new Error('Invalid file format'));
                    }
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }

    exportLibrary() {
        const data = JSON.stringify(this.songs, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lyricflow_library_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }
}