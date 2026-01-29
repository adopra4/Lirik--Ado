// LyricFlow Player Controls
const Player = {
    isPlaying: false,
    volume: 1.0,
    
    init() {
        this.setupKeyboardControls();
        this.setupVolumeControl();
    },
    
    setupKeyboardControls() {
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && e.target.tagName !== 'INPUT') {
                e.preventDefault();
                App.togglePlay();
            }
            if (e.code === 'ArrowRight' && e.ctrlKey) {
                App.audio.currentTime += 5;
            }
            if (e.code === 'ArrowLeft' && e.ctrlKey) {
                App.audio.currentTime -= 5;
            }
        });
    },
    
    setupVolumeControl() {
        // Volume control akan ditambahkan di versi berikutnya
        console.log('Volume control ready for v00.00.01');
    },
    
    formatLyricsWithTime(lyrics) {
        // Helper untuk format lirik dengan timestamp
        return lyrics.split('\n').map(line => {
            const match = line.match(/\[(\d{2}):(\d{2})\](.*)/);
            if (match) {
                return {
                    minutes: parseInt(match[1]),
                    seconds: parseInt(match[2]),
                    text: match[3].trim()
                };
            }
            return null;
        }).filter(Boolean);
    }
};

// Initialize player
document.addEventListener('DOMContentLoaded', () => Player.init());
