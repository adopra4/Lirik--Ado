/**
 * LYRICFLOW v1.3 - LYRICS MODULE
 * LRC parsing and synchronized lyrics display
 */

const LFLyrics = {
    // State
    state: {
        lyrics: [],
        parsedLyrics: [],
        currentIndex: -1,
        isSyncMode: false,
        syncIndex: 0,
        offset: 0,
        translation: null,
        fontSize: 1,
        isScrolling: false
    },
    
    // Events
    events: new LFUtils.EventEmitter(),
    
    // LRC regex
    timeRegex: /\[(\d{2}):(\d{2})\.(\d{2,3})\]/g,
    
    init() {
        this.setupEventListeners();
        console.log('Lyrics module initialized');
    },
    
    setupEventListeners() {
        // Sync mode controls
        $('#btn-lyrics-sync')?.addEventListener('click', () => this.toggleSyncMode());
        $('#sync-set-time')?.addEventListener('click', () => this.setSyncTime());
        $('#sync-prev')?.addEventListener('click', () => this.prevSyncLine());
        $('#sync-next')?.addEventListener('click', () => this.nextSyncLine());
        $('#sync-save')?.addEventListener('click', () => this.saveLRC());
        
        // Font size
        $('#btn-lyrics-font')?.addEventListener('click', () => this.cycleFontSize());
        
        // Translation
        $('#btn-lyrics-translate')?.addEventListener('click', () => this.toggleTranslation());
        
        // Click on lyrics line to seek
        $('#lyrics-content')?.addEventListener('click', (e) => {
            const line = e.target.closest('.lyrics-line');
            if (line && !this.state.isSyncMode) {
                const time = parseFloat(line.dataset.time);
                if (!isNaN(time)) {
                    LFPlayer.seekTo(time);
                }
            }
        });
    },
    
    // Load lyrics for song
    async load(songId) {
        this.reset();
        
        try {
            // Try to get from IndexedDB first
            const cached = await LFUtils.db.get('lyrics', songId);
            if (cached) {
                this.parse(cached.content);
                return;
            }
            
            // Try to fetch from API
            try {
                const data = await LFAPI.lyrics.get(songId);
                if (data && data.content) {
                    this.parse(data.content);
                    // Cache it
                    await LFUtils.db.put('lyrics', { songId, content: data.content });
                    return;
                }
            } catch (e) {
                // API failed, continue to file check
            }
            
            // Check if song has embedded lyrics file
            const song = LyricFlow.modules.library.getSong(songId);
            if (song?.lyricsFile) {
                const content = await LFUtils.readFileAsText(song.lyricsFile);
                this.parse(content);
            }
            
        } catch (e) {
            console.warn('Failed to load lyrics:', e);
            this.showPlaceholder();
        }
    },
    
    // Parse LRC content
    parse(content) {
        if (!content) {
            this.showPlaceholder();
            return;
        }
        
        this.state.lyrics = content;
        this.state.parsedLyrics = this.parseLRC(content);
        
        if (this.state.parsedLyrics.length === 0) {
            // Try plain text
            this.parsePlainText(content);
        }
        
        this.render();
        this.events.emit('loaded', this.state.parsedLyrics);
    },
    
    parseLRC(content) {
        const lines = content.split('\n');
        const result = [];
        
        lines.forEach(line => {
            line = line.trim();
            if (!line) return;
            
            // Match all time tags in line
            const timeMatches = [...line.matchAll(this.timeRegex)];
            
            if (timeMatches.length > 0) {
                const text = line.replace(this.timeRegex, '').trim();
                
                timeMatches.forEach(match => {
                    const minutes = parseInt(match[1]);
                    const seconds = parseInt(match[2]);
                    const milliseconds = parseInt(match[3].padEnd(3, '0'));
                    
                    const time = minutes * 60 + seconds + milliseconds / 1000;
                    
                    result.push({
                        time,
                        text,
                        originalText: text
                    });
                });
            } else if (line.startsWith('[ti:')) {
                // Title
                this.metadata = this.metadata || {};
                this.metadata.title = line.slice(4, -1);
            } else if (line.startsWith('[ar:')) {
                // Artist
                this.metadata = this.metadata || {};
                this.metadata.artist = line.slice(4, -1);
            } else if (line.startsWith('[al:')) {
                // Album
                this.metadata = this.metadata || {};
                this.metadata.album = line.slice(4, -1);
            } else if (line.startsWith('[offset:')) {
                // Offset
                this.state.offset = parseInt(line.slice(8, -1)) / 1000;
            }
        });
        
        // Sort by time
        result.sort((a, b) => a.time - b.time);
        
        return result;
    },
    
    parsePlainText(content) {
        const lines = content.split('\n').filter(line => line.trim());
        
        this.state.parsedLyrics = lines.map((text, index) => ({
            time: index * 5, // Estimate 5 seconds per line
            text: text.trim(),
            originalText: text.trim(),
            estimated: true
        }));
    },
    
    // Sync lyrics with current playback time
    sync(currentTime) {
        if (!this.state.parsedLyrics.length || this.state.isScrolling) return;
        
        const adjustedTime = currentTime - this.state.offset;
        
        // Find current line
        let newIndex = -1;
        for (let i = 0; i < this.state.parsedLyrics.length; i++) {
            if (this.state.parsedLyrics[i].time <= adjustedTime) {
                newIndex = i;
            } else {
                break;
            }
        }
        
        if (newIndex !== this.state.currentIndex) {
            this.state.currentIndex = newIndex;
            this.highlightLine(newIndex);
            this.events.emit('lineChange', newIndex);
        }
        
        // Update sync UI if in sync mode
        if (this.state.isSyncMode) {
            this.updateSyncProgress();
        }
    },
    
    // Render lyrics
    render() {
        const container = $('#lyrics-content');
        if (!container) return;
        
        if (this.state.parsedLyrics.length === 0) {
            this.showPlaceholder();
            return;
        }
        
        container.innerHTML = '';
        
        this.state.parsedLyrics.forEach((line, index) => {
            const lineEl = LFUtils.createElement('div', {
                className: 'lyrics-line',
                dataset: { time: line.time, index: index },
                style: `font-size: ${this.state.fontSize}em;`
            }, line.text);
            
            // Add translation if available
            if (this.state.translation && line.translation) {
                lineEl.appendChild(LFUtils.createElement('div', {
                    className: 'lyrics-translation',
                    style: 'font-size: 0.8em; opacity: 0.7; margin-top: 4px;'
                }, line.translation));
            }
            
            container.appendChild(lineEl);
        });
        
        // Scroll to active on load
        if (this.state.currentIndex >= 0) {
            this.highlightLine(this.state.currentIndex);
        }
    },
    
    highlightLine(index) {
        $$('.lyrics-line').forEach((el, i) => {
            el.classList.remove('active', 'passed');
            if (i === index) {
                el.classList.add('active');
                this.scrollToLine(el);
            } else if (i < index) {
                el.classList.add('passed');
            }
        });
    },
    
    scrollToLine(element) {
        if (!element) return;
        
        const container = $('#lyrics-content');
        if (!container) return;
        
        const containerRect = container.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();
        
        const scrollTop = element.offsetTop - container.offsetTop - containerRect.height / 2 + elementRect.height / 2;
        
        container.scrollTo({
            top: scrollTop,
            behavior: 'smooth'
        });
    },
    
    showPlaceholder() {
        const container = $('#lyrics-content');
        if (!container) return;
        
        container.innerHTML = `
            <div class="lyrics-placeholder">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                    <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
                </svg>
                <p>No lyrics available</p>
                <span>Upload an LRC file or generate with AI</span>
                <button class="btn-primary" style="margin-top: 1rem;" onclick="LyricFlow.navigateTo('ai-generator')">
                    Generate Lyrics
                </button>
            </div>
        `;
    },
    
    // Sync mode methods
    toggleSyncMode() {
        this.state.isSyncMode = !this.state.isSyncMode;
        $('#btn-lyrics-sync')?.classList.toggle('active', this.state.isSyncMode);
        $('#lyrics-sync-panel').style.display = this.state.isSyncMode ? 'block' : 'none';
        
        if (this.state.isSyncMode) {
            this.state.syncIndex = 0;
            LFPlayer.pause();
            this.updateSyncUI();
        }
    },
    
    setSyncTime() {
        if (!this.state.isSyncMode) return;
        
        const currentTime = LFPlayer.getCurrentTime();
        this.state.parsedLyrics[this.state.syncIndex].time = currentTime;
        
        // Auto advance
        this.nextSyncLine();
    },
    
    prevSyncLine() {
        if (this.state.syncIndex > 0) {
            this.state.syncIndex--;
            this.updateSyncUI();
        }
    },
    
    nextSyncLine() {
        if (this.state.syncIndex < this.state.parsedLyrics.length - 1) {
            this.state.syncIndex++;
            this.updateSyncUI();
        } else {
            this.saveLRC();
        }
    },
    
    updateSyncUI() {
        const line = this.state.parsedLyrics[this.state.syncIndex];
        if (!line) return;
        
        // Highlight current sync line
        $$('.lyrics-line').forEach((el, i) => {
            el.style.opacity = i === this.state.syncIndex ? '1' : '0.3';
        });
        
        this.scrollToLine($$('.lyrics-line')[this.state.syncIndex]);
        
        // Update progress text
        $('#sync-current').textContent = `Line ${this.state.syncIndex + 1} of ${this.state.parsedLyrics.length}`;
    },
    
    updateSyncProgress() {
        const progress = ((this.state.syncIndex + 1) / this.state.parsedLyrics.length) * 100;
        $('#sync-progress-bar').style.width = `${progress}%`;
    },
    
    // Save LRC file
    saveLRC() {
        let content = '';
        
        if (this.metadata) {
            if (this.metadata.title) content += `[ti:${this.metadata.title}]\n`;
            if (this.metadata.artist) content += `[ar:${this.metadata.artist}]\n`;
            if (this.metadata.album) content += `[al:${this.metadata.album}]\n`;
        }
        
        content += `[offset:${Math.round(this.state.offset * 1000)}]\n\n`;
        
        this.state.parsedLyrics.forEach(line => {
            const time = line.time;
            const mins = Math.floor(time / 60);
            const secs = Math.floor(time % 60);
            const ms = Math.round((time % 1) * 100);
            content += `[${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}]${line.originalText}\n`;
        });
        
        // Download
        const song = LyricFlow.state.currentSong;
        const filename = song ? `${song.artist} - ${song.title}.lrc` : 'lyrics.lrc';
        LFUtils.downloadFile(content, filename);
        
        // Save to DB
        if (song) {
            LFUtils.db.put('lyrics', {
                songId: song.id,
                content: content,
                synced: true
            });
        }
        
        LyricFlow.showToast('Lyrics saved!', 'success');
        this.toggleSyncMode();
    },
    
    // Font size
    cycleFontSize() {
        const sizes = [0.9, 1, 1.1, 1.2, 1.3];
        const currentIndex = sizes.indexOf(this.state.fontSize);
        this.state.fontSize = sizes[(currentIndex + 1) % sizes.length];
        
        $$('.lyrics-line').forEach(el => {
            el.style.fontSize = `${this.state.fontSize}em`;
        });
    },
    
    // Translation
    async toggleTranslation() {
        if (this.state.translation) {
            // Remove translation
            this.state.translation = null;
            $$('.lyrics-translation').forEach(el => el.remove());
            $('#btn-lyrics-translate')?.classList.remove('active');
        } else {
            // Add translation
            await this.loadTranslation();
        }
    },
    
    async loadTranslation() {
        const song = LyricFlow.state.currentSong;
        if (!song) return;
        
        try {
            const data = await LFAPI.lyrics.translate(song.id, 'id');
            if (data && data.translation) {
                this.state.translation = data.translation;
                
                // Merge translation
                const lines = data.translation.split('\n');
                this.state.parsedLyrics.forEach((line, i) => {
                    if (lines[i]) {
                        line.translation = lines[i];
                    }
                });
                
                this.render();
                $('#btn-lyrics-translate')?.classList.add('active');
                LyricFlow.showToast('Translation loaded', 'success');
            }
        } catch (e) {
            LyricFlow.showToast('Translation not available', 'warning');
        }
    },
    
    // Import LRC file
    async importFile(file) {
        try {
            const content = await LFUtils.readFileAsText(file);
            this.parse(content);
            
            // Save to current song
            const song = LyricFlow.state.currentSong;
            if (song) {
                await LFUtils.db.put('lyrics', {
                    songId: song.id,
                    content: content
                });
            }
            
            LyricFlow.showToast('Lyrics imported!', 'success');
        } catch (e) {
            LyricFlow.showToast('Failed to import lyrics', 'error');
        }
    },
    
    // Reset
    reset() {
        this.state.lyrics = [];
        this.state.parsedLyrics = [];
        this.state.currentIndex = -1;
        this.state.offset = 0;
        this.state.translation = null;
        this.metadata = null;
    }
};
