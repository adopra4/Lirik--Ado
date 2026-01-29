
 * LYRICFLOW v1.3 - LYRICS MODULE
 * Synchronized Lyrics Display & Editor
 */

class LyricsManager {
    constructor(app) {
        this.app = app;
        this.lyrics = [];
        this.currentLine = -1;
        this.isSynced = false;
        this.syncMode = false;
        this.editMode = false;
        
        this.elements = {
            container: document.getElementById('lyrics-container'),
            content: document.getElementById('lyrics-content'),
            expandBtn: document.getElementById('lyrics-expand'),
            syncBtn: document.getElementById('sync-lyrics-btn'),
            editBtn: document.getElementById('edit-lyrics-btn')
        };

        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Expand/collapse lyrics
        if (this.elements.expandBtn) {
            this.elements.expandBtn.addEventListener('click', () => {
                this.toggleExpand();
            });
        }

        // Sync mode toggle
        if (this.elements.syncBtn) {
            this.elements.syncBtn.addEventListener('click', () => {
                this.toggleSyncMode();
            });
        }

        // Edit mode toggle
        if (this.elements.editBtn) {
            this.elements.editBtn.addEventListener('click', () => {
                this.toggleEditMode();
            });
        }

        // Click on lyrics line to seek
        if (this.elements.content) {
            this.elements.content.addEventListener('click', (e) => {
                if (e.target.classList.contains('lyrics-line')) {
                    const time = parseFloat(e.target.dataset.time);
                    if (!isNaN(time)) {
                        this.app.player.seekTo(time);
                    }
                }
            });
        }
    }

    load(lyricsText, format = 'auto') {
        this.lyrics = this.parseLyrics(lyricsText, format);
        this.isSynced = this.lyrics.some(line => line.time !== null);
        this.currentLine = -1;
        
        this.render();
        this.updateUI();
    }

    parseLyrics(text, format) {
        if (!text) return [];

        const lines = text.trim().split('\\n');
        const parsed = [];

        // Auto-detect format
        if (format === 'auto') {
            if (text.includes('[') && text.includes(']')) {
                format = 'lrc';
            } else {
                format = 'plain';
            }
        }

        if (format === 'lrc') {
            // LRC format: [mm:ss.xx] Lyrics text
            const lrcRegex = /\\[(\\d{2}):(\\d{2})\\.(\\d{2,3})\\](.*)/;
            
            lines.forEach((line, index) => {
                const match = line.match(lrcRegex);
                if (match) {
                    const minutes = parseInt(match[1]);
                    const seconds = parseInt(match[2]);
                    const milliseconds = parseInt(match[3].padEnd(3, '0'));
                    const time = minutes * 60 + seconds + milliseconds / 1000;
                    const text = match[4].trim();
                    
                    if (text) {
                        parsed.push({
                            time: time,
                            text: text,
                            index: index
                        });
                    }
                }
            });
        } else {
            // Plain text - no timestamps
            lines.forEach((line, index) => {
                if (line.trim()) {
                    parsed.push({
                        time: null,
                        text: line.trim(),
                        index: index
                    });
                }
            });
        }

        return parsed;
    }

    render() {
        if (!this.elements.content) return;

        if (this.lyrics.length === 0) {
            this.elements.content.innerHTML = `
                <p class="lyrics-placeholder">No lyrics available</p>
            `;
            return;
        }

        const html = this.lyrics.map((line, index) => {
            const timeAttr = line.time !== null ? `data-time="${line.time}"` : '';
            const syncedClass = line.time !== null ? 'synced' : '';
            
            return `
                <div class="lyrics-line ${syncedClass}" 
                     data-index="${index}" 
                     ${timeAttr}>
                    ${this.escapeHtml(line.text)}
                </div>
            `;
        }).join('');

        this.elements.content.innerHTML = html;
    }

    sync(currentTime) {
        if (!this.isSynced || this.lyrics.length === 0) return;

        // Find current line
        let newLine = -1;
        
        for (let i = 0; i < this.lyrics.length; i++) {
            if (this.lyrics[i].time !== null && this.lyrics[i].time <= currentTime) {
                newLine = i;
            } else if (this.lyrics[i].time > currentTime) {
                break;
            }
        }

        if (newLine !== this.currentLine) {
            this.currentLine = newLine;
            this.highlightCurrentLine();
        }
    }

    highlightCurrentLine() {
        const lines = this.elements.content?.querySelectorAll('.lyrics-line');
        if (!lines) return;

        lines.forEach((line, index) => {
            line.classList.remove('active');
            if (index === this.currentLine) {
                line.classList.add('active');
                // Scroll to line
                line.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        });
    }

    toggleExpand() {
        this.elements.container?.classList.toggle('expanded');
        
        const icon = this.elements.expandBtn?.querySelector('i');
        if (icon) {
            icon.classList.toggle('fa-expand');
            icon.classList.toggle('fa-compress');
        }
    }

    toggleSyncMode() {
        this.syncMode = !this.syncMode;
        
        if (this.syncMode) {
            this.startSyncMode();
        } else {
            this.stopSyncMode();
        }
    }

    startSyncMode() {
        this.app.showToast('Sync mode: Press SPACE to mark current line', 'info');
        
        // Convert plain lyrics to syncable format
        if (!this.isSynced) {
            this.lyrics = this.lyrics.map(line => ({
                ...line,
                time: 0
            }));
            this.isSynced = true;
            this.render();
        }

        this.currentSyncIndex = 0;
        this.highlightSyncLine();

        // Add keyboard listener
        this.syncKeyHandler = (e) => {
            if (e.code === 'Space' && !e.repeat) {
                e.preventDefault();
                this.markCurrentTime();
            }
        };
        
        document.addEventListener('keydown', this.syncKeyHandler);
    }

    stopSyncMode() {
        this.syncMode = false;
        
        if (this.syncKeyHandler) {
            document.removeEventListener('keydown', this.syncKeyHandler);
        }

        // Save synced lyrics
        this.saveLyrics();
        
        this.app.showToast('Lyrics synced!', 'success');
    }

    markCurrentTime() {
        if (this.currentSyncIndex >= this.lyrics.length) {
            this.stopSyncMode();
            return;
        }

        const currentTime = this.app.player.getCurrentTime();
        this.lyrics[this.currentSyncIndex].time = currentTime;
        
        // Update UI
        const line = this.elements.content?.querySelector(`[data-index="${this.currentSyncIndex}"]`);
        if (line) {
            line.dataset.time = currentTime;
            line.classList.add('synced');
        }

        this.currentSyncIndex++;
        this.highlightSyncLine();
    }

    highlightSyncLine() {
        const lines = this.elements.content?.querySelectorAll('.lyrics-line');
        if (!lines) return;

        lines.forEach((line, index) => {
            line.style.opacity = index === this.currentSyncIndex ? '1' : '0.5';
            if (index === this.currentSyncIndex) {
                line.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        });
    }

    toggleEditMode() {
        this.editMode = !this.editMode;
        
        if (this.editMode) {
            this.startEditMode();
        } else {
            this.stopEditMode();
        }
    }

    startEditMode() {
        if (!this.elements.content) return;

        // Convert to editable textarea
        const textarea = document.createElement('textarea');
        textarea.className = 'lyrics-editor';
        textarea.value = this.lyricsToText();
        textarea.style.cssText = `
            width: 100%;
            height: 100%;
            background: var(--bg-tertiary);
            border: 1px solid var(--border-light);
            border-radius: var(--radius-lg);
            padding: var(--space-md);
            color: var(--text-primary);
            font-family: var(--font-mono);
            font-size: 0.875rem;
            line-height: 1.8;
            resize: none;
        `;

        this.elements.content.innerHTML = '';
        this.elements.content.appendChild(textarea);
        textarea.focus();

        // Update button
        if (this.elements.editBtn) {
            this.elements.editBtn.innerHTML = '<i class="fas fa-save"></i> Save';
        }
    }

    stopEditMode() {
        const textarea = this.elements.content?.querySelector('.lyrics-editor');
        if (textarea) {
            const text = textarea.value;
            this.load(text, 'auto');
            this.saveLyrics();
        }

        // Update button
        if (this.elements.editBtn) {
            this.elements.editBtn.innerHTML = '<i class="fas fa-edit"></i> Edit';
        }

        this.app.showToast('Lyrics updated', 'success');
    }

    lyricsToText() {
        if (this.isSynced) {
            return this.lyrics.map(line => {
                const time = this.formatTime(line.time);
                return `[${time}] ${line.text}`;
            }).join('\\n');
        } else {
            return this.lyrics.map(line => line.text).join('\\n');
        }
    }

    formatTime(seconds) {
        if (seconds === null) return '00:00.00';
        
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 100);
        
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
    }

    saveLyrics() {
        if (!this.app.currentTrack) return;
        
        const trackId = this.app.currentTrack.id;
        const lyricsData = {
            lyrics: this.lyrics,
            isSynced: this.isSynced,
            updatedAt: Date.now()
        };
        
        localStorage.setItem(`lyrics_${trackId}`, JSON.stringify(lyricsData));
    }

    loadSavedLyrics(trackId) {
        const saved = localStorage.getItem(`lyrics_${trackId}`);
        if (saved) {
            const data = JSON.parse(saved);
            this.lyrics = data.lyrics || [];
            this.isSynced = data.isSynced || false;
            this.render();
            return true;
        }
        return false;
    }

    updateUI() {
        // Show/hide sync button based on whether lyrics exist
        if (this.elements.syncBtn) {
            this.elements.syncBtn.style.display = this.lyrics.length > 0 ? 'flex' : 'none';
        }

        // Show edit button for developers
        if (this.elements.editBtn) {
            this.elements.editBtn.style.display = this.app.isDeveloper() ? 'flex' : 'none';
        }
    }

    clear() {
        this.lyrics = [];
        this.currentLine = -1;
        this.isSynced = false;
        
        if (this.elements.content) {
            this.elements.content.innerHTML = `
                <p class="lyrics-placeholder">Select a song to view lyrics</p>
            `;
        }
        
        this.updateUI();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // AI-powered lyrics features
    async generateLyrics(audioUrl) {
        // This would integrate with AI service
        this.app.showToast('Generating lyrics from audio...', 'info');
        
        // Placeholder for AI integration
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve([
                    { time: 0, text: '[Instrumental]' },
                    { time: 15, text: 'Verse 1 starting...' },
                    { time: 30, text: 'AI-generated lyrics placeholder' }
                ]);
            }, 2000);
        });
    }

    async translateLyrics(targetLanguage) {
        if (!this.lyrics.length) return;
        
        this.app.showToast(`Translating to ${targetLanguage}...`, 'info');
        
        // Placeholder for translation API
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve(this.lyrics.map(line => ({
                    ...line,
                    text: `[${targetLanguage}] ${line.text}`
                })));
            }, 1500);
        });
    }

    export(format = 'lrc') {
        let content = '';
        
        if (format === 'lrc') {
            content = this.lyricsToText();
        } else if (format === 'txt') {
            content = this.lyrics.map(l => l.text).join('\\n');
        } else if (format === 'json') {
            content = JSON.stringify(this.lyrics, null, 2);
        }

        // Create download
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lyrics_${this.app.currentTrack?.title || 'song'}.${format}`;
        a.click();
        URL.revokeObjectURL(url);
    }
}