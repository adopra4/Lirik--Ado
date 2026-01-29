/**
 * LYRICFLOW v1.3 - SMART SHUFFLE
 * Intelligent queue shuffling with variety control
 */

const LFSmartShuffle = {
    settings: {
        variety: 0.5, // 0-1, higher = more variety
        avoidRepeatArtist: true,
        avoidRepeatAlbum: true,
        balanceEnergy: true
    },
    
    history: [],
    maxHistory: 50,
    
    init() {
        this.loadSettings();
        console.log('Smart Shuffle initialized');
    },
    
    loadSettings() {
        const saved = LFUtils.storage.get('lf_shuffle_settings');
        if (saved) {
            Object.assign(this.settings, saved);
        }
    },
    
    saveSettings() {
        LFUtils.storage.set('lf_shuffle_settings', this.settings);
    },
    
    shuffle(songs, currentIndex = -1) {
        if (songs.length <= 1) return songs;
        
        const pool = [...songs];
        const result = [];
        
        // Keep current song first if playing
        if (currentIndex >= 0 && currentIndex < pool.length) {
            result.push(pool.splice(currentIndex, 1)[0]);
        }
        
        while (pool.length > 0) {
            const candidates = this.getCandidates(pool, result);
            const weights = this.calculateWeights(candidates, result);
            
            // Weighted random selection
            const selected = this.weightedRandomSelection(candidates, weights);
            result.push(selected);
            
            // Remove from pool
            const index = pool.findIndex(s => s.id === selected.id);
            if (index >= 0) pool.splice(index, 1);
        }
        
        // Update history
        this.updateHistory(result);
        
        return result;
    },
    
    getCandidates(pool, selected) {
        // Filter based on recent history
        const recentArtists = new Set(
            this.history.slice(-5).map(s => s.artist)
        );
        
        return pool.filter(song => {
            // Avoid recent repeats if variety is high
            if (this.settings.variety > 0.7 && recentArtists.has(song.artist)) {
                return false;
            }
            return true;
        });
    },
    
    calculateWeights(candidates, selected) {
        const lastSong = selected[selected.length - 1];
        
        return candidates.map(song => {
            let weight = 1;
            
            // Artist variety
            if (this.settings.avoidRepeatArtist && lastSong) {
                if (song.artist === lastSong.artist) {
                    weight *= 0.3;
                }
            }
            
            // Album variety
            if (this.settings.avoidRepeatAlbum && lastSong) {
                if (song.album === lastSong.album) {
                    weight *= 0.5;
                }
            }
            
            // Energy balance
            if (this.settings.balanceEnergy && lastSong && lastSong.energy && song.energy) {
                const energyDiff = Math.abs(lastSong.energy - song.energy);
                weight *= 1 - (energyDiff * 0.5);
            }
            
            // Boost underplayed songs
            const playCount = song.playCount || 0;
            weight *= 1 / (1 + playCount * 0.1);
            
            // Random factor based on variety setting
            weight *= 0.5 + Math.random() * this.settings.variety;
            
            return Math.max(weight, 0.1);
        });
    },
    
    weightedRandomSelection(items, weights) {
        const totalWeight = weights.reduce((a, b) => a + b, 0);
        let random = Math.random() * totalWeight;
        
        for (let i = 0; i < items.length; i++) {
            random -= weights[i];
            if (random <= 0) {
                return items[i];
            }
        }
        
        return items[items.length - 1];
    },
    
    updateHistory(songs) {
        this.history.push(...songs);
        if (this.history.length > this.maxHistory) {
            this.history = this.history.slice(-this.maxHistory);
        }
    },
    
    setVariety(value) {
        this.settings.variety = Math.max(0, Math.min(1, value));
        this.saveSettings();
    }
};
