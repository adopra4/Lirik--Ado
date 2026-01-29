
 * LYRICFLOW v1.3 - DEVELOPER TOOLS MODULE
 * Upload, Analytics & Management
 */

class DevTools {
    constructor(app) {
        this.app = app;
        this.uploadQueue = [];
        this.isUploading = false;
        
        this.init();
    }

    init() {
        this.setupUploadPage();
        this.setupDragAndDrop();
    }

    setupUploadPage() {
        // File input
        const fileInput = document.getElementById('audio-file-input');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                this.handleFileSelect(e.target.files);
            });
        }

        // Dropzone
        const dropzone = document.getElementById('upload-dropzone');
        if (dropzone) {
            dropzone.addEventListener('click', () => {
                fileInput?.click();
            });
        }

        // Artwork upload
        const artworkInput = document.getElementById('artwork-input');
        if (artworkInput) {
            artworkInput.addEventListener('change', (e) => {
                this.handleArtworkSelect(e.target.files[0]);
            });
        }

        // Submit button
        const submitBtn = document.getElementById('upload-submit');
        if (submitBtn) {
            submitBtn.addEventListener('click', () => {
                this.submitUpload();
            });
        }

        // Cancel button
        const cancelBtn = document.getElementById('upload-cancel');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.resetUploadForm();
            });
        }

        // Lyrics tabs
        document.querySelectorAll('.lyrics-input-tabs .tab-btn').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.lyrics-input-tabs .tab-btn').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                // Switch editor mode
            });
        });
    }

    setupDragAndDrop() {
        const dropzone = document.getElementById('upload-dropzone');
        if (!dropzone) return;

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropzone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            dropzone.addEventListener(eventName, () => {
                dropzone.classList.add('dragover');
            });
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropzone.addEventListener(eventName, () => {
                dropzone.classList.remove('dragover');
            });
        });

        dropzone.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            this.handleFileSelect(files);
        });
    }

    handleFileSelect(files) {
        if (!files.length) return;

        Array.from(files).forEach(file => {
            if (file.type.startsWith('audio/')) {
                this.processAudioFile(file);
            }
        });
    }

    async processAudioFile(file) {
        // Create object URL for preview
        const url = URL.createObjectURL(file);
        
        // Extract metadata
        const metadata = await this.extractMetadata(file);
        
        // Add to queue
        const uploadItem = {
            id: this.app.generateId(),
            file: file,
            url: url,
            metadata: metadata,
            status: 'pending'
        };
        
        this.uploadQueue.push(uploadItem);
        
        // Auto-fill form if first file
        if (this.uploadQueue.length === 1) {
            this.fillUploadForm(metadata);
        }
        
        this.app.showToast(`Added "${file.name}" to upload queue`, 'info');
    }

    async extractMetadata(file) {
        return new Promise((resolve) => {
            // Use jsmediatags if available, otherwise return basic info
            if (typeof jsmediatags !== 'undefined') {
                jsmediatags.read(file, {
                    onSuccess: (tag) => {
                        resolve({
                            title: tag.tags.title || file.name.replace(/\\.[^/.]+$/, ''),
                            artist: tag.tags.artist || 'Unknown Artist',
                            album: tag.tags.album || 'Unknown Album',
                            year: tag.tags.year || new Date().getFullYear(),
                            genre: tag.tags.genre || 'Unknown',
                            cover: tag.tags.picture ? this.getCoverUrl(tag.tags.picture) : null
                        });
                    },
                    onError: () => {
                        resolve(this.getBasicMetadata(file));
                    }
                });
            } else {
                resolve(this.getBasicMetadata(file));
            }
        });
    }

    getBasicMetadata(file) {
        return {
            title: file.name.replace(/\\.[^/.]+$/, ''),
            artist: 'Unknown Artist',
            album: 'Unknown Album',
            year: new Date().getFullYear(),
            genre: 'Unknown',
            cover: null
        };
    }

    getCoverUrl(picture) {
        const base64String = picture.data.reduce((acc, byte) => {
            return acc + String.fromCharCode(byte);
        }, '');
        return `data:${picture.format};base64,${window.btoa(base64String)}`;
    }

    fillUploadForm(metadata) {
        const titleInput = document.getElementById('upload-title');
        const artistInput = document.getElementById('upload-artist');
        const albumInput = document.getElementById('upload-album');

        if (titleInput) titleInput.value = metadata.title || '';
        if (artistInput) artistInput.value = metadata.artist || '';
        if (albumInput) albumInput.value = metadata.album || '';

        // Show artwork preview
        if (metadata.cover) {
            this.showArtworkPreview(metadata.cover);
        }
    }

    handleArtworkSelect(file) {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            this.showArtworkPreview(e.target.result);
            this.currentArtwork = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    showArtworkPreview(url) {
        const preview = document.querySelector('.image-preview');
        if (preview) {
            preview.innerHTML = `<img src="${url}" alt="Artwork">`;
        }
    }

    async submitUpload() {
        if (this.uploadQueue.length === 0) {
            this.app.showToast('Please select audio files first', 'warning');
            return;
        }

        const title = document.getElementById('upload-title')?.value;
        const artist = document.getElementById('upload-artist')?.value;
        const album = document.getElementById('upload-album')?.value;
        const lyrics = document.getElementById('upload-lyrics')?.value;

        if (!title || !artist) {
            this.app.showToast('Please fill in title and artist', 'warning');
            return;
        }

        this.isUploading = true;
        const submitBtn = document.getElementById('upload-submit');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
        }

        // Process each file in queue
        for (const item of this.uploadQueue) {
            await this.uploadSong(item, {
                title,
                artist,
                album,
                lyrics,
                cover: this.currentArtwork
            });
        }

        // Reset
        this.isUploading = false;
        this.uploadQueue = [];
        this.currentArtwork = null;
        
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-upload"></i> Upload Song';
        }

        this.resetUploadForm();
        this.app.showToast('Upload complete!', 'success');
        
        // Navigate to library
        this.app.navigateTo('library');
    }

    async uploadSong(item, formData) {
        return new Promise((resolve) => {
            // Simulate upload delay
            setTimeout(() => {
                // Get audio duration
                const audio = new Audio(item.url);
                audio.addEventListener('loadedmetadata', () => {
                    const song = {
                        id: this.app.generateId(),
                        title: formData.title,
                        artist: formData.artist,
                        album: formData.album,
                        year: new Date().getFullYear(),
                        genre: 'Unknown',
                        duration: Math.round(audio.duration),
                        cover: formData.cover,
                        url: item.url,
                        lyrics: formData.lyrics || '',
                        plays: 0,
                        addedAt: Date.now()
                    };

                    // Add to library
                    this.app.library.addSong(song);
                    
                    resolve();
                });
                
                audio.addEventListener('error', () => {
                    // Use default duration if can't load
                    const song = {
                        id: this.app.generateId(),
                        title: formData.title,
                        artist: formData.artist,
                        album: formData.album,
                        year: new Date().getFullYear(),
                        genre: 'Unknown',
                        duration: 180,
                        cover: formData.cover,
                        url: item.url,
                        lyrics: formData.lyrics || '',
                        plays: 0,
                        addedAt: Date.now()
                    };

                    this.app.library.addSong(song);
                    resolve();
                });
            }, 1000);
        });
    }

    resetUploadForm() {
        document.getElementById('upload-title') && (document.getElementById('upload-title').value = '');
        document.getElementById('upload-artist') && (document.getElementById('upload-artist').value = '');
        document.getElementById('upload-album') && (document.getElementById('upload-album').value = '');
        document.getElementById('upload-lyrics') && (document.getElementById('upload-lyrics').value = '');
        
        const preview = document.querySelector('.image-preview');
        if (preview) {
            preview.innerHTML = '<i class="fas fa-image"></i>';
        }
        
        this.uploadQueue = [];
        this.currentArtwork = null;
    }

    // Analytics
    loadAnalytics() {
        this.renderStatsOverview();
        this.renderListeningHistory();
        this.renderTopTracks();
        this.renderGenreDistribution();
    }

    renderStatsOverview() {
        const stats = this.calculateStats();
        
        const container = document.getElementById('analytics-stats');
        if (!container) return;

        container.innerHTML = `
            <div class="stat-card">
                <div class="stat-header">
                    <div class="stat-icon"><i class="fas fa-music"></i></div>
                    <div class="stat-trend up"><i class="fas fa-arrow-up"></i> 12%</div>
                </div>
                <div class="stat-value">${stats.totalSongs}</div>
                <div class="stat-label">Total Songs</div>
            </div>
            <div class="stat-card">
                <div class="stat-header">
                    <div class="stat-icon"><i class="fas fa-clock"></i></div>
                    <div class="stat-trend up"><i class="fas fa-arrow-up"></i> 8%</div>
                </div>
                <div class="stat-value">${this.formatDuration(stats.totalDuration)}</div>
                <div class="stat-label">Total Duration</div>
            </div>
            <div class="stat-card">
                <div class="stat-header">
                    <div class="stat-icon"><i class="fas fa-play-circle"></i></div>
                    <div class="stat-trend up"><i class="fas fa-arrow-up"></i> 24%</div>
                </div>
                <div class="stat-value">${stats.totalPlays.toLocaleString()}</div>
                <div class="stat-label">Total Plays</div>
            </div>
            <div class="stat-card">
                <div class="stat-header">
                    <div class="stat-icon"><i class="fas fa-heart"></i></div>
                    <div class="stat-trend">${stats.favorites}</div>
                </div>
                <div class="stat-value">${stats.favorites}</div>
                <div class="stat-label">Favorites</div>
            </div>
        `;
    }

    calculateStats() {
        const songs = this.app.library.songs;
        
        return {
            totalSongs: songs.length,
            totalDuration: songs.reduce((acc, s) => acc + (s.duration || 0), 0),
            totalPlays: songs.reduce((acc, s) => acc + (s.plays || 0), 0),
            favorites: this.app.library.favorites.size,
            artists: new Set(songs.map(s => s.artist)).size,
            albums: new Set(songs.map(s => s.album)).size
        };
    }

    formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        if (hours > 0) {
            return `${hours}h ${Math.floor((seconds % 3600) / 60)}m`;
        }
        return `${Math.floor(seconds / 60)}m`;
    }

    renderListeningHistory() {
        // Generate mock history data
        const days = 30;
        const data = Array.from({ length: days }, (_, i) => ({
            date: new Date(Date.now() - (days - i - 1) * 86400000),
            plays: Math.floor(Math.random() * 50) + 10
        }));

        const container = document.getElementById('listening-history');
        if (!container) return;

        const maxPlays = Math.max(...data.map(d => d.plays));
        
        container.innerHTML = `
            <div class="chart-container">
                <div class="chart-header">
                    <h3 class="chart-title">Listening History</h3>
                    <div class="chart-period">
                        <button class="period-btn">7 Days</button>
                        <button class="period-btn active">30 Days</button>
                        <button class="period-btn">90 Days</button>
                    </div>
                </div>
                <div class="bar-chart">
                    ${data.map(d => `
                        <div class="bar-item" style="height: ${(d.plays / maxPlays * 100)}%">
                            <div class="bar-tooltip">${d.plays} plays</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    renderTopTracks() {
        const topTracks = [...this.app.library.songs]
            .sort((a, b) => (b.plays || 0) - (a.plays || 0))
            .slice(0, 10);

        const container = document.getElementById('top-tracks');
        if (!container) return;

        container.innerHTML = `
            <div class="chart-container">
                <div class="chart-header">
                    <h3 class="chart-title">Top Tracks</h3>
                </div>
                <div class="top-tracks-list">
                    ${topTracks.map((track, index) => `
                        <div class="top-track-item">
                            <span class="top-track-rank">${index + 1}</span>
                            <div class="top-track-info">
                                <span class="top-track-title">${track.title}</span>
                                <span class="top-track-artist">${track.artist}</span>
                            </div>
                            <span class="top-track-plays">${(track.plays || 0).toLocaleString()} plays</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    renderGenreDistribution() {
        const genres = this.app.library.getGenres();
        const total = genres.reduce((acc, g) => acc + g.count, 0);

        const container = document.getElementById('genre-distribution');
        if (!container) return;

        container.innerHTML = `
            <div class="chart-container">
                <div class="chart-header">
                    <h3 class="chart-title">Genres</h3>
                </div>
                <div class="genre-bars">
                    ${genres.map(genre => {
                        const percentage = (genre.count / total * 100).toFixed(1);
                        return `
                            <div class="genre-bar-item">
                                <div class="genre-bar-label">
                                    <span>${genre.name}</span>
                                    <span>${percentage}%</span>
                                </div>
                                <div class="genre-bar-track">
                                    <div class="genre-bar-fill" style="width: ${percentage}%"></div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    // Data Management
    exportAllData() {
        const data = {
            version: this.app.version,
            exportedAt: new Date().toISOString(),
            songs: this.app.library.songs,
            favorites: [...this.app.library.favorites],
            settings: this.app.settings,
            history: this.app.history
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lyricflow_backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);

        this.app.showToast('Backup exported successfully', 'success');
    }

    async importData(file) {
        try {
            const text = await file.text();
            const data = JSON.parse(text);

            if (data.songs) {
                data.songs.forEach(song => {
                    if (!this.app.library.songs.find(s => s.id === song.id)) {
                        this.app.library.songs.push(song);
                    }
                });
                this.app.library.processLibrary();
                this.app.library.saveLibrary();
            }

            if (data.favorites) {
                data.favorites.forEach(id => this.app.library.favorites.add(id));
                this.app.library.saveFavorites();
            }

            if (data.settings) {
                Object.assign(this.app.settings, data.settings);
                this.app.saveSettings();
            }

            this.app.showToast('Data imported successfully', 'success');
            this.app.library.renderLibrary();
            
        } catch (error) {
            this.app.showToast('Failed to import data', 'error');
            console.error(error);
        }
    }

    clearAllData() {
        if (!confirm('Are you sure? This will delete all your data.')) return;

        localStorage.removeItem('lyricflow_library');
        localStorage.removeItem('lyricflow_favorites');
        localStorage.removeItem('lyricflow_recent');
        localStorage.removeItem('lyricflow_history');
        localStorage.removeItem('lyricflow_settings');

        location.reload();
    }

    // Batch operations
    batchEdit(songIds, updates) {
        songIds.forEach(id => {
            this.app.library.updateSong(id, updates);
        });
        this.app.showToast(`Updated ${songIds.length} songs`, 'success');
    }

    batchDelete(songIds) {
        if (!confirm(`Delete ${songIds.length} songs?`)) return;
        
        songIds.forEach(id => {
            this.app.library.removeSong(id);
        });
        this.app.showToast(`Deleted ${songIds.length} songs`, 'success');
    }

    // Advanced lyrics editor
    openLyricsEditor(songId) {
        const song = this.app.library.songs.find(s => s.id === songId);
        if (!song) return;

        // Create modal
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 800px; max-height: 90vh;">
                <div class="modal-header">
                    <h2>Edit Lyrics: ${song.title}</h2>
                    <button class="modal-close"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body">
                    <div class="lyrics-editor-container">
                        <div class="editor-toolbar">
                            <button class="btn btn-sm" id="editor-sync-mode">
                                <i class="fas fa-sync"></i> Sync Mode
                            </button>
                            <button class="btn btn-sm" id="editor-auto-sync">
                                <i class="fas fa-magic"></i> Auto Sync
                            </button>
                            <button class="btn btn-sm" id="editor-import">
                                <i class="fas fa-file-import"></i> Import LRC
                            </button>
                            <button class="btn btn-sm" id="editor-export">
                                <i class="fas fa-file-export"></i> Export
                            </button>
                        </div>
                        <textarea class="lyrics-textarea" id="lyrics-editor-text">${song.lyrics || ''}</textarea>
                        <div class="editor-preview" id="lyrics-preview"></div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" id="editor-cancel">Cancel</button>
                    <button class="btn btn-primary" id="editor-save">Save Changes</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Setup events
        modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
        modal.querySelector('#editor-cancel').addEventListener('click', () => modal.remove());
        modal.querySelector('#editor-save').addEventListener('click', () => {
            const newLyrics = modal.querySelector('#lyrics-editor-text').value;
            this.app.library.updateSong(songId, { lyrics: newLyrics });
            modal.remove();
            this.app.showToast('Lyrics updated', 'success');
        });

        // Sync mode
        modal.querySelector('#editor-sync-mode').addEventListener('click', () => {
            this.startEditorSyncMode(song);
        });
    }

    startEditorSyncMode(song) {
        this.app.showToast('Sync mode: Play the song and press SPACE to mark timestamps', 'info');
        
        // Load song in player
        this.app.player.load(song);
        
        let currentLine = 0;
        const textarea = document.querySelector('#lyrics-editor-text');
        const lines = textarea.value.split('\\n').filter(l => l.trim());
        
        const handler = (e) => {
            if (e.code === 'Space' && currentLine < lines.length) {
                e.preventDefault();
                const time = this.app.player.getCurrentTime();
                const timestamp = this.app.lyrics.formatTime(time);
                lines[currentLine] = `[${timestamp}] ${lines[currentLine].replace(/^\\[\\d{2}:\\d{2}\\.\\d{2,3}\\]\\s*/, '')}`;
                textarea.value = lines.join('\\n');
                currentLine++;
            }
        };

        document.addEventListener('keydown', handler);
        
        // Remove handler when done
        const cleanup = () => {
            document.removeEventListener('keydown', handler);
        };
        
        return cleanup;
    }
}