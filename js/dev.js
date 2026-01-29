/**
 * DEVELOPER MODULE v1.2
 * Advanced Developer Tools
 */

App.dev = {
    panelOpen: false,
    currentTab: 'songs',

    init() {
        // Setup tab switching
        document.querySelectorAll('.dev-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                this.switchTab(tabName);
            });
        });
    },

    toggle() {
        this.panelOpen = !this.panelOpen;
        document.getElementById('devPanel').classList.toggle('active', this.panelOpen);
        
        if (this.panelOpen) {
            this.renderSongList();
            this.updateSystemInfo();
        }
    },

    switchTab(tabName) {
        this.currentTab = tabName;
        
        // Update buttons
        document.querySelectorAll('.dev-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.tab === tabName);
        });
        
        // Update content
        document.querySelectorAll('.dev-tab-content').forEach(c => {
            c.classList.toggle('active', c.id === `dev${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`);
        });
    },

    showAddForm() {
        document.getElementById('addSongForm').classList.remove('hidden');
    },

    hideAddForm() {
        document.getElementById('addSongForm').classList.add('hidden');
    },

    saveSong() {
        const id = document.getElementById('devSongId').value.trim();
        const title = document.getElementById('devSongTitle').value.trim();
        const artist = document.getElementById('devSongArtist').value.trim();
        const album = document.getElementById('devSongAlbum').value.trim();
        const cover = document.getElementById('devSongCover').value.trim();
        const audio = document.getElementById('devSongAudio').value.trim();
        const lyrics = document.getElementById('devSongLyrics').value.trim();

        if (!id || !title || !audio) {
            App.toast.show('ID, Title, and Audio URL are required!', 'error');
            return;
        }

        if (App.state.songs.find(s => s.id === id)) {
            App.toast.show('Song ID already exists!', 'error');
            return;
        }

        const song = {
            id,
            title,
            artist: artist || 'Unknown Artist',
            album: album || 'Unknown Album',
            cover: cover || 'https://via.placeholder.com/400x400/6366f1/ffffff?text=No+Cover',
            audio,
            lyrics: lyrics || '',
            addedAt: Date.now()
        };

        App.state.songs.push(song);
        App.library.save();
        App.library.render();
        
        this.renderSongList();
        this.hideAddForm();
        
        // Clear form
        document.getElementById('devSongId').value = '';
        document.getElementById('devSongTitle').value = '';
        document.getElementById('devSongArtist').value = '';
        document.getElementById('devSongAlbum').value = '';
        document.getElementById('devSongCover').value = '';
        document.getElementById('devSongAudio').value = '';
        document.getElementById('devSongLyrics').value = '';

        App.toast.show('Song added successfully!', 'success');
    },

    deleteSong(id) {
        if (!confirm('Are you sure you want to delete this song?')) return;

        App.state.songs = App.state.songs.filter(s => s.id !== id);
        App.state.favorites.delete(id);
        
        // Remove from playlists
        App.state.playlists.forEach(pl => {
            pl.songs = pl.songs.filter(sid => sid !== id);
        });
        
        App.library.save();
        App.saveData();
        App.library.render();
        this.renderSongList();
        
        if (App.state.currentSong?.id === id) {
            App.player.pause();
            App.state.currentSong = null;
        }
        
        App.toast.show('Song deleted', 'info');
    },

    renderSongList() {
        const container = document.getElementById('devSongList');
        
        if (App.state.songs.length === 0) {
            container.innerHTML = '<p>No songs in library</p>';
            return;
        }

        container.innerHTML = App.state.songs.map(song => `
            <div class="dev-song-item">
                <div>
                    <strong>${song.title}</strong>
                    <small>${song.artist}</small>
                </div>
                <button onclick="app.dev.deleteSong('${song.id}')">Delete</button>
            </div>
        `).join('');
    },

    refresh() {
        App.library.scanFolder();
        this.renderSongList();
        App.toast.show('Library refreshed!', 'success');
    },

    scanFolder() {
        // Simulate folder scan
        App.library.scanFolder();
    },

    bulkImport() {
        const data = document.getElementById('bulkImportData').value.trim();
        if (!data) {
            App.toast.show('Please paste JSON data', 'warning');
            return;
        }

        try {
            const songs = JSON.parse(data);
            if (!Array.isArray(songs)) {
                throw new Error('Data must be an array');
            }

            let added = 0;
            let skipped = 0;

            songs.forEach(song => {
                if (!song.id || !song.title || !song.audio) {
                    skipped++;
                    return;
                }

                if (App.state.songs.find(s => s.id === song.id)) {
                    skipped++;
                    return;
                }

                App.state.songs.push({
                    ...song,
                    addedAt: Date.now()
                });
                added++;
            });

            App.library.save();
            App.library.render();
            this.renderSongList();
            
            document.getElementById('bulkImportData').value = '';
            
            App.toast.show(`Added ${added} songs, skipped ${skipped}`, 'success');
        } catch (err) {
            App.toast.show('Invalid JSON format!', 'error');
            console.error(err);
        }
    },

    updateSystemInfo() {
        // Calculate storage usage
        const songsSize = new Blob([JSON.stringify(App.state.songs)]).size;
        const playlistsSize = new Blob([JSON.stringify(App.state.playlists)]).size;
        const totalSize = ((songsSize + playlistsSize) / 1024 / 1024).toFixed(2);
        
        document.getElementById('sysSongCount').textContent = App.state.songs.length;
        document.getElementById('sysPlaylistCount').textContent = App.state.playlists.length;
        document.getElementById('sysStorage').textContent = `${totalSize} MB`;
    },

    clearCache() {
        if (!confirm('Clear all cached data? This will not delete your songs.')) return;
        
        // Keep songs and playlists, clear other cache
        localStorage.removeItem('lf_recent');
        App.state.recent = [];
        
        App.toast.show('Cache cleared!', 'success');
    },

    restart() {
        if (!confirm('Restart the application?')) return;
        location.reload();
    },

    toggleEditMode() {
        App.state.editMode = !App.state.editMode;
        App.library.render();
        
        const btn = document.querySelector('.btn-edit');
        btn.textContent = App.state.editMode ? '✓ Edit Mode ON' : '✏️ Edit Mode';
        btn.classList.toggle('active', App.state.editMode);
        
        App.toast.show(App.state.editMode ? 'Edit mode enabled' : 'Edit mode disabled', 'info');
    }
};
