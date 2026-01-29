/**
 * LYRICFLOW v1.3 - LIBRARY MODULE
 * Local song management and metadata handling
 */

const LFLibrary = {
    songs: [],
    artists: new Map(),
    albums: new Map(),
    genres: new Set(),
    
    // Metadata cache
    metadataCache: new Map(),
    
    init() {
        this.setupEventListeners();
        this.setupDropZone();
        console.log('Library module initialized');
    },
    
    setupEventListeners() {
        // Upload button
        $('#btn-hero-upload')?.addEventListener('click', () => {
            $('#file-upload')?.click();
        });
        
        $('#file-upload')?.addEventListener('change', (e) => {
            this.handleFileSelect(e.target.files);
        });
        
        // Import menu
        $('#btn-import')?.addEventListener('click', () => {
            this.showImportModal();
        });
    },
    
    setupDropZone() {
        const dropZones = $$('.upload-zone, #page-home');
        
        dropZones.forEach(zone => {
            zone.addEventListener('dragover', (e) => {
                e.preventDefault();
                zone.classList.add('dragover');
            });
            
            zone.addEventListener('dragleave', () => {
                zone.classList.remove('dragover');
            });
            
            zone.addEventListener('drop', (e) => {
                e.preventDefault();
                zone.classList.remove('dragover');
                this.handleFileSelect(e.dataTransfer.files);
            });
        });
    },
    
    // Handle file selection
    async handleFileSelect(files) {
        const audioFiles = Array.from(files).filter(f => 
            f.type.startsWith('audio/') || f.name.endsWith('.mp3') || f.name.endsWith('.flac')
        );
        
        const lrcFiles = Array.from(files).filter(f => 
            f.name.endsWith('.lrc') || f.name.endsWith('.txt')
        );
        
        if (audioFiles.length === 0 && lrcFiles.length === 0) {
            LyricFlow.showToast('No valid files selected', 'warning');
            return;
        }
        
        LyricFlow.showToast(`Processing ${audioFiles.length} files...`, 'info');
        
        // Process audio files
        for (const file of audioFiles) {
            await this.processAudioFile(file);
        }
        
        // Process lyrics files
        for (const file of lrcFiles) {
            await this.processLyricsFile(file);
        }
        
        this.renderSongs();
        LyricFlow.showToast('Files added to library!', 'success');
    },
    
    // Process audio file
    async processAudioFile(file) {
        try {
            // Generate ID
            const id = LFUtils.generateUUID();
            
            // Extract metadata
            const metadata = await this.extractMetadata(file);
            
            // Generate cover if not present
            let cover = metadata.cover;
            if (!cover) {
                cover = await this.generateCoverFromFile(file);
            }
            
            // Create song object
            const song = {
                id,
                title: metadata.title || this.cleanFileName(file.name),
                artist: metadata.artist || 'Unknown Artist',
                album: metadata.album || 'Unknown Album',
                year: metadata.year || '',
                genre: metadata.genre || '',
                duration: metadata.duration || 0,
                track: metadata.track || 0,
                file: URL.createObjectURL(file),
                cover,
                fileName: file.name,
                fileSize: file.size,
                addedAt: Date.now(),
                playCount: 0
            };
            
            // Save to IndexedDB
            await this.saveSongFile(id, file);
            await LFUtils.db.put('songs', song);
            
            // Add to library
            this.songs.push(song);
            this.indexSong(song);
            
        } catch (e) {
            console.error('Failed to process file:', file.name, e);
        }
    },
    
    // Extract metadata from audio file
    async extractMetadata(file) {
        return new Promise((resolve) => {
            const metadata = {
                title: '',
                artist: '',
                album: '',
                year: '',
                genre: '',
                track: 0,
                duration: 0,
                cover: null
            };
            
            // Use jsmediatags if available
            if (window.jsmediatags) {
                jsmediatags.read(file, {
                    onSuccess: (tag) => {
                        const tags = tag.tags;
                        metadata.title = tags.title;
                        metadata.artist = tags.artist;
                        metadata.album = tags.album;
                        metadata.year = tags.year;
                        metadata.genre = tags.genre;
                        metadata.track = tags.track;
                        
                        if (tags.picture) {
                            const { data, format } = tags.picture;
                            const byteArray = new Uint8Array(data);
                            const blob = new Blob([byteArray], { type: format });
                            metadata.cover = URL.createObjectURL(blob);
                        }
                        
                        // Get duration
                        this.getAudioDuration(file).then(duration => {
                            metadata.duration = duration;
                            resolve(metadata);
                        });
                    },
                    onError: () => {
                        // Fallback to basic info
                        this.getAudioDuration(file).then(duration => {
                            metadata.duration = duration;
                            resolve(metadata);
                        });
                    }
                });
            } else {
                // No metadata library, just get duration
                this.getAudioDuration(file).then(duration => {
                    metadata.duration = duration;
                    resolve(metadata);
                });
            }
        });
    },
    
    // Get audio duration
    getAudioDuration(file) {
        return new Promise((resolve) => {
            const audio = new Audio();
            audio.preload = 'metadata';
            
            audio.onloadedmetadata = () => {
                URL.revokeObjectURL(audio.src);
                resolve(audio.duration);
            };
            
            audio.onerror = () => {
                resolve(0);
            };
            
            audio.src = URL.createObjectURL(file);
        });
    },
    
    // Generate cover from file (placeholder or color)
    async generateCoverFromFile(file) {
        // Generate a color based on filename
        const hash = file.name.split('').reduce((a, b) => {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a;
        }, 0);
        
        const hue = Math.abs(hash % 360);
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 400;
        const ctx = canvas.getContext('2d');
        
        // Gradient background
        const gradient = ctx.createLinearGradient(0, 0, 400, 400);
        gradient.addColorStop(0, `hsl(${hue}, 70%, 50%)`);
        gradient.addColorStop(1, `hsl(${(hue + 40) % 360}, 70%, 30%)`);
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 400, 400);
        
        // Add pattern
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        for (let i = 0; i < 5; i++) {
            ctx.beginPath();
            ctx.arc(200, 200, 50 + i * 30, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Add initial
        ctx.fillStyle = 'white';
        ctx.font = 'bold 120px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const initial = (file.name[0] || '?').toUpperCase();
        ctx.fillText(initial, 200, 200);
        
        return canvas.toDataURL('image/jpeg', 0.8);
    },
    
    // Save song file to IndexedDB
    async saveSongFile(id, file) {
        const arrayBuffer = await LFUtils.readFileAsArrayBuffer(file);
        await LFUtils.db.put('offline', {
            id: `audio_${id}`,
            data: arrayBuffer,
            type: file.type
        });
    },
    
    // Process lyrics file
    async processLyricsFile(file) {
        try {
            const content = await LFUtils.readFileAsText(file);
            
            // Try to match with existing song
            const fileName = file.name.replace('.lrc', '').replace('.txt', '');
            const matchingSong = this.songs.find(s => 
                fileName.includes(s.title) || 
                s.fileName.includes(fileName)
            );
            
            if (matchingSong) {
                await LFUtils.db.put('lyrics', {
                    songId: matchingSong.id,
                    content,
                    source: 'file'
                });
                LyricFlow.showToast(`Lyrics matched: ${matchingSong.title}`, 'success');
            } else {
                // Store for manual matching
                this.pendingLyrics = { fileName, content };
                LyricFlow.showToast('Lyrics file saved for manual matching', 'info');
            }
        } catch (e) {
            console.error('Failed to process lyrics file:', e);
        }
    },
    
    // Index song for search/browse
    indexSong(song) {
        // Artist index
        if (!this.artists.has(song.artist)) {
            this.artists.set(song.artist, []);
        }
        this.artists.get(song.artist).push(song);
        
        // Album index
        const albumKey = `${song.artist}|${song.album}`;
        if (!this.albums.has(albumKey)) {
            this.albums.set(albumKey, {
                artist: song.artist,
                album: song.album,
                year: song.year,
                songs: []
            });
        }
        this.albums.get(albumKey).songs.push(song);
        
        // Genre index
        if (song.genre) {
            this.genres.add(song.genre);
        }
    },
    
    // Clean file name for title
    cleanFileName(name) {
        return name
            .replace(/\.[^/.]+$/, '') // Remove extension
            .replace(/[_-]/g, ' ') // Replace underscores/dashes
            .replace(/\s+/g, ' ') // Normalize spaces
            .trim();
    },
    
    // Set songs (from DB)
    setSongs(songs) {
        this.songs = songs || [];
        this.rebuildIndexes();
        this.renderSongs();
    },
    
    rebuildIndexes() {
        this.artists.clear();
        this.albums.clear();
        this.genres.clear();
        
        this.songs.forEach(song => this.indexSong(song));
    },
    
    // Getters
    getSong(id) {
        return this.songs.find(s => s.id === id);
    },
    
    getAllSongs() {
        return this.songs;
    },
    
    getSongsByArtist(artist) {
        return this.artists.get(artist) || [];
    },
    
    getAlbum(artist, album) {
        return this.albums.get(`${artist}|${album}`);
    },
    
    getAllAlbums() {
        return Array.from(this.albums.values());
    },
    
    getAllArtists() {
        return Array.from(this.artists.keys());
    },
    
    // Search
    search(query) {
        const lowerQuery = query.toLowerCase();
        
        return this.songs.filter(song => 
            song.title.toLowerCase().includes(lowerQuery) ||
            song.artist.toLowerCase().includes(lowerQuery) ||
            song.album.toLowerCase().includes(lowerQuery)
        );
    },
    
    // Render methods
    renderSongs(containerId = 'trending-grid', songs = this.songs) {
        const container = $(`#${containerId}`);
        if (!container) return;
        
        if (songs.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>No songs in library</p>
                    <button class="btn-primary" onclick="$('#file-upload').click()">Add Songs</button>
                </div>
            `;
            return;
        }
        
        container.innerHTML = songs.map(song => this.createSongCard(song)).join('');
    },
    
    createSongCard(song) {
        const isPlaying = LyricFlow.state.currentSong?.id === song.id;
        const isFavorite = LyricFlow.isFavorite(song.id);
        
        return `
            <div class="song-card ${isPlaying ? 'playing' : ''}" data-id="${song.id}">
                <div class="song-cover">
                    <img src="${song.cover || 'assets/images/default-cover.png'}" alt="${LFUtils.sanitize(song.title)}" loading="lazy">
                    <div class="song-play" style="opacity: ${isPlaying ? '1' : ''}">
                        <button class="song-play-btn" onclick="event.stopPropagation(); LyricFlow.playSong(LFLibrary.getSong('${song.id}'))">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                ${isPlaying && LyricFlow.state.isPlaying 
                                    ? '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>' 
                                    : '<polygon points="5 3 19 12 5 21 5 3"/>'}
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="song-info">
                    <h4>${LFUtils.sanitize(song.title)}</h4>
                    <p>${LFUtils.sanitize(song.artist)}</p>
                </div>
            </div>
        `;
    },
    
    // Delete song
    async deleteSong(id) {
        if (!confirm('Delete this song from library?')) return;
        
        // Remove from arrays
        this.songs = this.songs.filter(s => s.id !== id);
        
        // Remove from DB
        await LFUtils.db.delete('songs', id);
        await LFUtils.db.delete('offline', `audio_${id}`);
        await LFUtils.db.delete('lyrics', id);
        
        // Rebuild indexes
        this.rebuildIndexes();
        
        // Update UI
        this.renderSongs();
        LyricFlow.showToast('Song deleted', 'info');
    },
    
    // Update song metadata
    async updateSong(id, updates) {
        const song = this.getSong(id);
        if (!song) return;
        
        Object.assign(song, updates, { updatedAt: Date.now() });
        
        await LFUtils.db.put('songs', song);
        this.rebuildIndexes();
        this.renderSongs();
    },
    
    // Get recent songs
    getRecentSongs(limit = 10) {
        return [...this.songs]
            .sort((a, b) => (b.lastPlayed || 0) - (a.lastPlayed || 0))
            .slice(0, limit);
    },
    
    // Get most played
    getMostPlayed(limit = 10) {
        return [...this.songs]
            .sort((a, b) => (b.playCount || 0) - (a.playCount || 0))
            .slice(0, limit);
    }
};
