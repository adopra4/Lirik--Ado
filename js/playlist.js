/**
 * PLAYLIST MODULE v1.2
 * Playlist Creation and Management
 */

App.playlists = {
    currentPlaylist: null,

    init() {
        this.renderNav();
    },

    create() {
        const name = prompt('Playlist name:');
        if (!name) return;
        
        const playlist = {
            id: `pl_${Date.now()}`,
            name: name,
            description: '',
            cover: null,
            songs: [],
            createdAt: Date.now()
        };
        
        App.state.playlists.push(playlist);
        App.saveData();
        this.renderNav();
        
        // Open the new playlist
        this.open(playlist.id);
        
        App.toast.show(`Playlist "${name}" created!`, 'success');
    },

    open(playlistId) {
        const playlist = App.state.playlists.find(p => p.id === playlistId);
        if (!playlist) return;
        
        this.currentPlaylist = playlist;
        
        // Update view
        App.switchView('playlist');
        
        // Render playlist header
        document.getElementById('playlistTitle').textContent = playlist.name;
        document.getElementById('playlistDesc').textContent = playlist.description || `${playlist.songs.length} songs`;
        document.getElementById('playlistCount').textContent = `${playlist.songs.length} songs`;
        
        // Calculate duration
        const totalDuration = playlist.songs.reduce((acc, songId) => {
            const song = App.state.songs.find(s => s.id === songId);
            return acc + (song?.duration || 0);
        }, 0);
        document.getElementById('playlistDuration').textContent = this.formatDuration(totalDuration);
        
        // Render songs
        this.renderSongs();
        
        // Update nav active state
        document.querySelectorAll('.playlist-nav-item').forEach(el => {
            el.classList.toggle('active', el.dataset.id === playlistId);
        });
    },

    renderSongs() {
        const container = document.getElementById('playlistSongs');
        
        if (!this.currentPlaylist || this.currentPlaylist.songs.length === 0) {
            container.innerHTML = '<div class="empty-playlist">No songs in this playlist. Add songs from your library!</div>';
            return;
        }
        
        const songs = this.currentPlaylist.songs
            .map(id => App.state.songs.find(s => s.id === id))
            .filter(Boolean);
        
        container.innerHTML = songs.map((song, index) => `
            <div class="playlist-song-item" data-index="${index}">
                <span class="song-number">${index + 1}</span>
                <img src="${song.cover}" alt="" class="song-thumb">
                <div class="song-details">
                    <div class="song-name">${song.title}</div>
                    <div class="song-meta">${song.artist}</div>
                </div>
                <div class="song-actions">
                    <button onclick="app.playlists.play(${index})">▶</button>
                    <button onclick="app.playlists.remove(${index})">🗑️</button>
                </div>
            </div>
        `).join('');
    },

    renderNav() {
        const container = document.getElementById('playlistNav');
        
        if (App.state.playlists.length === 0) {
            container.innerHTML = '<div class="no-playlists">No playlists yet</div>';
            return;
        }
        
        container.innerHTML = App.state.playlists.map(pl => `
            <div class="playlist-nav-item" data-id="${pl.id}" onclick="app.playlists.open('${pl.id}')">
                <span>📑</span>
                <span>${pl.name}</span>
            </div>
        `).join('');
        
        document.getElementById('sysPlaylistCount').textContent = App.state.playlists.length;
    },

    addToCurrent(songId) {
        if (!this.currentPlaylist) {
            App.toast.show('Open a playlist first!', 'warning');
            return;
        }
        
        if (this.currentPlaylist.songs.includes(songId)) {
            App.toast.show('Song already in playlist', 'info');
            return;
        }
        
        this.currentPlaylist.songs.push(songId);
        App.saveData();
        this.renderSongs();
        App.toast.show('Added to playlist', 'success');
    },

    remove(index) {
        if (!this.currentPlaylist) return;
        
        this.currentPlaylist.songs.splice(index, 1);
        App.saveData();
        this.renderSongs();
    },

    play(index) {
        if (!this.currentPlaylist) return;
        
        const songId = this.currentPlaylist.songs[index];
        const song = App.state.songs.find(s => s.id === songId);
        
        if (song) {
            // Set queue to playlist songs from this index
            App.state.queue = this.currentPlaylist.songs
                .slice(index)
                .map(id => App.state.songs.find(s => s.id === id))
                .filter(Boolean);
            
            App.player.load(song);
        }
    },

    playAll() {
        if (!this.currentPlaylist || this.currentPlaylist.songs.length === 0) return;
        
        App.state.queue = this.currentPlaylist.songs
            .map(id => App.state.songs.find(s => s.id === id))
            .filter(Boolean);
        
        if (App.state.queue.length > 0) {
            App.player.load(App.state.queue[0]);
        }
    },

    shuffle() {
        this.playAll();
        App.state.shuffle = true;
        App.player.toggleShuffle();
    },

    delete(playlistId) {
        if (!confirm('Delete this playlist?')) return;
        
        App.state.playlists = App.state.playlists.filter(p => p.id !== playlistId);
        App.saveData();
        this.renderNav();
        
        if (this.currentPlaylist?.id === playlistId) {
            App.switchView('library');
            this.currentPlaylist = null;
        }
        
        App.toast.show('Playlist deleted', 'info');
    },

    formatDuration(seconds) {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        
        if (hrs > 0) {
            return `${hrs} hr ${mins} min`;
        }
        return `${mins} min`;
    }
};
