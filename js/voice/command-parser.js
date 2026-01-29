/**
 * LYRICFLOW v1.3 - COMMAND PARSER
 * Natural language command parsing
 */

const LFCommandParser = {
    // Intent patterns
    intents: {
        PLAY: ['play', 'putar', 'mainkan', 'lagu'],
        PAUSE: ['pause', 'jeda', 'berhenti', 'henti'],
        NEXT: ['next', 'lanjut', 'selanjutnya', 'berikutnya'],
        PREV: ['previous', 'back', 'sebelumnya', 'mundur'],
        VOLUME: ['volume', 'suara', 'keras', 'pelan'],
        SEARCH: ['search', 'cari', 'temukan', 'cariin'],
        NAVIGATE: ['go to', 'buka', 'tampilkan', 'lihat'],
        LIKE: ['like', 'suka', 'favorit', 'love'],
        SHUFFLE: ['shuffle', 'acak', 'random'],
        REPEAT: ['repeat', 'ulang', 'loop']
    },
    
    // Entity extractors
    extractors: {
        SONG: (text) => {
            // Extract song title between quotes or after "play"
            const match = text.match(/["'](.+?)["']/) || text.match(/(?:play|putar|mainkan)\s+(.+?)(?:\s+(?:by|oleh)\s+|$)/i);
            return match ? match[1].trim() : null;
        },
        
        ARTIST: (text) => {
            const match = text.match(/(?:by|oleh|artist|artis)\s+(.+?)(?:\s+(?:song|lagu)\s+|$)/i);
            return match ? match[1].trim() : null;
        },
        
        NUMBER: (text) => {
            const words = {
                'satu': 1, 'dua': 2, 'tiga': 3, 'empat': 4, 'lima': 5,
                'enam': 6, 'tujuh': 7, 'delapan': 8, 'sembilan': 9, 'sepuluh': 10,
                'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
                'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10
            };
            
            // Check for word numbers
            for (const [word, num] of Object.entries(words)) {
                if (text.includes(word)) return num;
            }
            
            // Check for digits
            const match = text.match(/\d+/);
            return match ? parseInt(match[0]) : null;
        },
        
        PERCENT: (text) => {
            const match = text.match(/(\d+)%/);
            if (match) return parseInt(match[1]);
            
            const words = { 'half': 50, 'separuh': 50, 'full': 100, 'penuh': 100 };
            for (const [word, percent] of Object.entries(words)) {
                if (text.includes(word)) return percent;
            }
            
            return null;
        }
    },
    
    parse(input) {
        const normalized = input.toLowerCase().trim();
        
        // Determine intent
        const intent = this.detectIntent(normalized);
        
        // Extract entities
        const entities = this.extractEntities(normalized);
        
        // Build command structure
        return {
            intent,
            entities,
            confidence: this.calculateConfidence(intent, entities),
            original: input
        };
    },
    
    detectIntent(text) {
        const scores = {};
        
        for (const [intent, keywords] of Object.entries(this.intents)) {
            scores[intent] = 0;
            for (const keyword of keywords) {
                if (text.includes(keyword.toLowerCase())) {
                    scores[intent] += 1;
                }
            }
        }
        
        // Find highest scoring intent
        let bestIntent = 'UNKNOWN';
        let bestScore = 0;
        
        for (const [intent, score] of Object.entries(scores)) {
            if (score > bestScore) {
                bestScore = score;
                bestIntent = intent;
            }
        }
        
        return bestIntent;
    },
    
    extractEntities(text) {
        const entities = {};
        
        for (const [type, extractor] of Object.entries(this.extractors)) {
            const value = extractor(text);
            if (value) {
                entities[type] = value;
            }
        }
        
        return entities;
    },
    
    calculateConfidence(intent, entities) {
        let score = 0;
        
        // Intent confidence
        if (intent !== 'UNKNOWN') score += 0.5;
        
        // Entity confidence
        const entityCount = Object.keys(entities).length;
        score += Math.min(entityCount * 0.25, 0.5);
        
        return Math.min(score, 1);
    },
    
    // Execute parsed command
    execute(parsed) {
        const { intent, entities } = parsed;
        
        switch (intent) {
            case 'PLAY':
                if (entities.SONG) {
                    const songs = LFLibrary.search(entities.SONG);
                    if (songs.length > 0) {
                        LyricFlow.playSong(songs[0]);
                        return { success: true, action: 'play', song: songs[0] };
                    }
                }
                LyricFlow.togglePlay();
                return { success: true, action: 'toggle_play' };
                
            case 'PAUSE':
                LFPlayer.pause();
                return { success: true, action: 'pause' };
                
            case 'NEXT':
                LyricFlow.playNext();
                return { success: true, action: 'next' };
                
            case 'PREV':
                LyricFlow.playPrevious();
                return { success: true, action: 'previous' };
                
            case 'VOLUME':
                if (entities.PERCENT !== null) {
                    LFPlayer.setVolume(entities.PERCENT / 100);
                    return { success: true, action: 'volume', value: entities.PERCENT };
                } else if (entities.NUMBER) {
                    const delta = entities.NUMBER > 5 ? 0.1 : -0.1;
                    LFPlayer.changeVolume(delta);
                    return { success: true, action: 'volume_change', delta };
                }
                break;
                
            case 'SEARCH':
                if (entities.SONG) {
                    LFUI.performSearch(entities.SONG, true);
                    return { success: true, action: 'search', query: entities.SONG };
                }
                break;
        }
        
        return { success: false, reason: 'Unknown command' };
    }
};
