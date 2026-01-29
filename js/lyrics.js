/**
 * LYRICS MODULE v1.2
 * Synchronized Lyrics with Offset Adjustment and Karaoke Mode
 */

App.lyrics = {
    data: [],
    offset: 0,
    currentLine: -1,
    isPanelOpen: false,
    karaokeMode: false,

    init() {
        this.setupEventListeners();
    },

    setupEventListeners() {
        // Click on lyrics line to seek
        document.getElementById('lyricsContent').addEventListener('click', (e) => {
            const line = e.target.closest('.lyric-line');
            if (line) {
                const time = parseFloat(line.dataset.time);
                App.player.seekTo(time);
            }
        });
    },

    load(song) {
        this.data = [];
        this.currentLine = -1;
        this.offset = 0;
        
        if (!song.lyrics) {
            this.renderEmpty();
            return;
        }
        
        this.parse(song.lyrics);
        this.render();
    },

    parse(lyricsText) {
        const lines = lyricsText.split('\n').filter(line => line.trim());
        
        this.data = lines.map(line => {
            // Match format: [HH:MM:SS] or HH:MM:SS| or [MM:SS]
            const match = line.match(/\[?(\d{1,2}):(\d{2}):(\d{2})\]?\|?(.+)/) ||
                         line.match(/\[?(\d{2}):(\d{2})\]?\|?(.+)/);
            
            if (match) {
                let hours = 0, minutes, seconds, text;
                
                if (match.length === 5) {
                    // HH:MM:SS format
                    hours = parseInt(match[1]);
                    minutes = parseInt(match[2]);
                    seconds = parseInt(match[3]);
                    text = match[4].trim();
                } else {
                    // MM:SS format
                    minutes = parseInt(match[1]);
                    seconds = parseInt(match[2]);
                    text = match[3].trim();
                }
                
                const time = hours * 3600 + minutes * 60 + seconds;
                
                return {
                    time: time,
                    text: text,
                    originalTime: match[0].replace(/[\[\]\|]/g, '')
                };
            }
            return null;
        }).filter(item => item !== null).sort((a, b) => a.time - b.time);
    },

    render() {
        const container = document.getElementById('lyricsContent');
        
        if (this.data.length === 0) {
            this.renderEmpty();
            return;
        }
        
        container.innerHTML = this.data.map((line, index) => `
            <div class="lyric-line" data-time="${line.time}" data-index="${index}">
                ${this.karaokeMode ? `<span class="lyric-time">${line.originalTime}</span>` : ''}
                <span class="lyric-text">${this.escapeHtml(line.text)}</span>
            </div>
        `).join('');
    },

    renderEmpty() {
        document.getElementById('lyricsContent').innerHTML = `
            <p class="lyrics-placeholder">No lyrics available for this song...</p>
            <p class="lyrics-hint">Developer can add lyrics in format:</p>
            <code>00:01:30|Line text here</code>
        `;
    },

    sync(currentTime) {
        if (this.data.length === 0) return;
        
        const adjustedTime = currentTime - this.offset;
        let activeIndex = -1;
        
        // Find current line
        for (let i = 0; i < this.data.length; i++) {
            if (adjustedTime >= this.data[i].time) {
                activeIndex = i;
            } else {
                break;
            }
        }
        
        if (activeIndex !== this.currentLine) {
            this.currentLine = activeIndex;
            this.highlightLine(activeIndex);
        }
        
        // Karaoke word highlighting
        if (this.karaokeMode && activeIndex >= 0) {
            this.updateKaraokeProgress(activeIndex, adjustedTime);
        }
    },

    highlightLine(index) {
        const lines = document.querySelectorAll('.lyric-line');
        
        lines.forEach((line, i) => {
            line.classList.toggle('active', i === index);
            
            if (i === index) {
                line.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        });
    },

    updateKaraokeProgress(lineIndex, currentTime) {
        const line = this.data[lineIndex];
        const nextLine = this.data[lineIndex + 1];
        const duration = nextLine ? nextLine.time - line.time : 5;
        const progress = (currentTime - line.time) / duration;
        
        // Could add word-by-word highlighting here
    },

    togglePanel() {
        this.isPanelOpen = !this.isPanelOpen;
        document.getElementById('lyricsPanel').classList.toggle('open', this.isPanelOpen);
    },

    adjustOffset(delta) {
        this.offset += delta;
        document.getElementById('lyricsOffset').textContent = `${this.offset}s`;
    },

    toggleKaraoke() {
        this.karaokeMode = !this.karaokeMode;
        this.render();
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};
