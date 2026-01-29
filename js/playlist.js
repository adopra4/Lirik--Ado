/**
 * LYRICFLOW v1.3 - PLAYLIST MODULE
 * Playlist management and queue handling
 */

const LFPlaylist = {
    playlists: [],
    currentPlaylist: null,
    
    init() {
        this.loadPlaylists();
        this.setupEventListeners();
        console.log('Playlist module initialized');
    },
    
    setupEventListeners() {
        // Create playlist button
        $('#btn-create-playlist')?.addEventListener('click', () => {
            this.showCreateModal();
        });
        
        // Playlist form
        $('#playlist-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.createFromForm();
        });
        
        // Cover upload
        $('#playlist-cover-upload')?.addEventListener('click', () => {
            $('#playlist-cover-input')?.click();
        });
    },
    
    // Load playlists from storage
    async loadPlaylists() {
        try {
            // From IndexedDB
            const dbPlaylists = await LFUtils.db.getAll('playlists');
            this.playlists = dbPlaylists || [];
            
            // Merge with API if online
            if (LFUtils.isOnline()) {
                try {
                    const apiPlaylists = await LFAPI.playlists.list();
                    // Merge logic here
                } catch (e) {
                    // Use local only
                }
            }
            
            this.renderPlaylists();
        } catch (e) {
            console.error('Failed to load playlists:', e);
        }
    },
    
    // Create playlist
    async create(name, description = '', cover = null, songs = []) {
        const playlist = {
            id: LFUtils.generateUUID(),
            name,
            description,
            cover,
            songs,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            owner: LyricFlow.state.user?.id || 'guest'
        };
        
        this.playlists.push(playlist);
        
        // Save to IndexedDB
        await LFUtils.db.put('playlists', playlist);
        
        // Sync to API if online
        if (LFUtils.isOnline()) {
            try {
                await LFAPI.playlists.create(playlist);
            } catch (e) {
                // Mark for sync
                playlist._syncPending = true;
            }
        }
        
        this.renderPlaylists();
        LyricFlow.showToast('Playlist created!', 'success');
        
        return playlist;
    },
    
    createFromForm() {
        const name = $('#playlist-name')?.value.trim();
        const description = $('#playlist-description')?.value.trim();
        
        if (!name) {
            LyricFlow.showToast('Please enter a playlist name', 'warning');
            return;
        }
        
        this.create(name, description);
        this.hideCreateModal();
    },
    
    // Update playlist
    async update(id, updates) {
        const playlist = this.playlists.find(p => p.id === id);
        if (!playlist) return;
        
        Object.assign(playlist, updates, { updatedAt: Date.now() });
        
        await LFUtils.db.put('playlists', playlist);
        
        if (LFUtils.isOnline()) {
            try {
                await LFAPI.playlists.update(id, playlist);
            } catch (e) {
                playlist._syncPending = true;
            }
        }
        
        this.renderPlaylists();
    },
    
    // Delete playlist
    async delete(id) {
        if (!confirm('Delete this playlist?')) return;
        
        this.playlists = this.playlists.filter(p => p.id !== id);
        
        await LFUtils.db.delete('playlists', id);
        
        if (LFUtils.isOnline()) {
            try {
                await LFAPI.playlists.delete(id);
            } catch (e) {
                // Already deleted locally
            }
        }
        
        this.renderPlaylists();
        LyricFlow.showToast('Playlist deleted', 'info');
    },
    
    // Add song to playlist
    async addSong(playlistId, song) {
        const playlist = this.playlists.find(p => p.id === playlistId);
        if (!playlist) return;
        
        // Check duplicates
        if (playlist.songs.some(s => s.id === song.id)) {
            LyricFlow.showToast('Song already in playlist', 'warning');
            return;
        }
        
        playlist.songs.push(song);
        playlist.updatedAt = Date.now();
        
        await LFUtils.db.put('playlists', playlist);
        
        if (LFUtils.isOnline()) {
            try {
                await LFAPI.playlists.addSong(playlistId, song.id);
            } catch (e) {
                playlist._syncPending = true;
            }
        }
        
        LyricFlow.showToast('Added to playlist!', 'success');
    },
    
    // Remove song from playlist
    async removeSong(playlistId, songId) {
        const playlist = this.playlists.find(p => p.id === playlistId);
        if (!playlist) return;
        
        playlist.songs = playlist.songs.filter(s => s.id !== songId);
        playlist.updatedAt = Date.now();
        
        await LFUtils.db.put('playlists', playlist);
        
        if (LFUtils.isOnline()) {
            try {
                await LFAPI.playlists.removeSong(playlistId, songId);
            } catch (e) {
                playlist._syncPending = true;
            }
        }
        
        this.renderPlaylistDetail(playlist);
    },
    
    // Play playlist
    play(playlist, shuffle = false) {
        if (!playlist.songs.length) {
            LyricFlow.showToast('Playlist is empty', 'warning');
            return;
        }
        
        let songs = [...playlist.songs];
        
        if (shuffle) {
            songs = this.shuffleArray(songs);
        }
        
        LyricFlow.setState('queue', songs);
        LyricFlow.setState('queueIndex', 0);
        LyricFlow.playSong(songs[0]);
        
        this.currentPlaylist = playlist;
    },
    
    // Shuffle array
    shuffleArray(array) {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    },
    
    // Render playlists grid
    renderPlaylists() {
        const container = $('#playlist-grid');
        if (!container) return;
        
        if (this.playlists.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>No playlists yet</p>
                    <button class="btn-primary" onclick="LFPlaylist.showCreateModal()">Create Playlist</button>
                </div>
            `;
            return;
        }
        
        container.innerHTML = this.playlists.map(playlist => this.createPlaylistCard(playlist)).join('');
    },
    
    createPlaylistCard(playlist) {
        const songCount = playlist.songs.length;
        const coverHtml = playlist.cover 
            ? `<img src="${playlist.cover}" alt="${playlist.name}">`
            : this.generateCoverGrid(playlist.songs.slice(0, 4));
        
        return `
            <div class="playlist-card" onclick="LFPlaylist.showDetail('${playlist.id}')">
                <div class="playlist-cover">
                    ${coverHtml}
                    <button class="song-play-btn" onclick="event.stopPropagation(); LFPlaylist.playById('${playlist.id}')">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                    </button>
                </div>
                <div class="playlist-info">
                    <h4>${LFUtils.sanitize(playlist.name)}</h4>
                    <p>${songCount} song${songCount !== 1 ? 's' : ''}</p>
                </div>
            </div>
        `;
    },
    
    generateCoverGrid(songs) {
        if (songs.length === 0) {
            return `<svg class="playlist-cover-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`;
        }
        
        const images = songs.map(s => `<img src="${s.cover || 'assets/images/default-cover.png'}" alt="">`).join('');
        return `<div class="playlist-cover-grid">${images}</div>`;
    },
    
    // Show playlist detail
    showDetail(id) {
        const playlist = this.playlists.find(p => p.id === id);
        if (!playlist) return;
        
        this.currentPlaylist = playlist;
        this.renderPlaylistDetail(playlist);
        LyricFlow.navigateTo('playlist-detail');
    },
    
    renderPlaylistDetail(playlist) {
        const container = $('#playlist-detail-content');
        if (!container) return;
        
        const duration = playlist.songs.reduce((sum, s) => sum + (s.duration || 0), 0);
        
        container.innerHTML = `
            <div class="playlist-header">
                <img src="${playlist.cover || 'assets/images/default-cover.png'}" class="playlist-detail-cover">
                <div class="playlist-header-info">
                    <span class="playlist-type">Playlist</span>
                    <h1>${LFUtils.sanitize(playlist.name)}</h1>
                    <p>${LFUtils.sanitize(playlist.description || '')}</p>
                    <div class="playlist-meta">
                        <span>${playlist.songs.length} songs</span>
                        <span>•</span>
                        <span>${LFUtils.formatTime(duration)}</span>
                    </div>
                    <div class="playlist-actions">
                        <button class="btn-primary btn-large" onclick="LFPlaylist.play(LFPlaylist.currentPlaylist)">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                            Play
                        </button>
                        <button class="btn-secondary" onclick="LFPlaylist.play(LFPlaylist.currentPlaylist, true)">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></svg>
                            Shuffle
                        </button>
                        <button class="btn-icon" onclick="LFPlaylist.showEditModal()">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                    </div>
                </div>
            </div>
            <div class="song-list">
                ${playlist.songs.map((song, index) => this.createSongListItem(song, index, playlist.id)).join('')}
            </div>
        `;
    },
    
    createSongListItem(song, index, playlistId) {
        return `
            <div class="song-list-item" onclick="LFPlaylist.playSong('${song.id}')">
                <span class="song-number">${index + 1}</span>
                <img src="${song.cover || 'assets/images/default-cover.png'}" width="40" height="40" style="border-radius: 4px;">
                <div class="song-list-info">
                    <h4>${LFUtils.sanitize(song.title)}</h4>
                    <p>${LFUtils.sanitize(song.artist)}</p>
                </div>
                <span class="song-list-duration">${LFUtils.formatTime(song.duration || 0)}</span>
                <div class="song-list-actions">
                    <button class="btn-icon" onclick="event.stopPropagation(); LFPlaylist.removeSong('${playlistId}', '${song.id}')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                </div>
            </div>
        `;
    },
    
    playById(id) {
        const playlist = this.playlists.find(p => p.id === id);
        if (playlist) this.play(playlist);
    },
    
    playSong(songId) {
        const song = this.currentPlaylist?.songs.find(s => s.id === songId);
        if (song) {
            LyricFlow.playSong(song);
        }
    },
    
    // Modals
    showCreateModal() {
        $('#modal-overlay')?.classList.add('active');
        $('#modal-playlist')?.classList.add('active');
    },
    
    hideCreateModal() {
        $('#modal-overlay')?.classList.remove('active');
        $('#modal-playlist')?.classList.remove('active');
        $('#playlist-form')?.reset();
    },
    
    showEditModal() {
        // Implementation for edit modal
    },
    
    // Getters
    getPlaylist(id) {
        return this.playlists.find(p => p.id === id);
    },
    
    getAllPlaylists() {
        return this.playlists;
    }
};
