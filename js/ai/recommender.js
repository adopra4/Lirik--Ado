/**
 * LYRICFLOW v1.3 - AI RECOMMENDER
 * Smart song recommendations
 */

const LFRecommender = {
    // User preference model
    userProfile: {
        favoriteGenres: new Map(),
        favoriteArtists: new Map(),
        moodPreferences: new Map(),
        timePatterns: new Map()
    },
    
    init() {
        this.loadUserProfile();
        this.startPatternTracking();
        console.log('Recommender initialized');
    },
    
    loadUserProfile() {
        const saved = LFUtils.storage.get('lf_user_profile');
        if (saved) {
            this.userProfile = {
                favoriteGenres: new Map(saved.favoriteGenres || []),
                favoriteArtists: new Map(saved.favoriteArtists || []),
                moodPreferences: new Map(saved.moodPreferences || []),
                timePatterns: new Map(saved.timePatterns || [])
            };
        }
    },
    
    saveUserProfile() {
        LFUtils.storage.set('lf_user_profile', {
            favoriteGenres: Array.from(this.userProfile.favoriteGenres),
            favoriteArtists: Array.from(this.userProfile.favoriteArtists),
            moodPreferences: Array.from(this.userProfile.moodPreferences),
            timePatterns: Array.from(this.userProfile.timePatterns)
        });
    },
    
    startPatternTracking() {
        // Track listening patterns
        LyricFlow.events.on('play', (song) => {
            this.trackPlay(song);
        });
        
        // Update recommendations periodically
        setInterval(() => {
            this.updateRecommendations();
        }, 60000); // Every minute
    },
    
    trackPlay(song) {
        const now = new Date();
        const hour = now.getHours();
        const day = now.getDay();
        
        // Track genre preference
        if (song.genre) {
            const current = this.userProfile.favoriteGenres.get(song.genre) || 0;
            this.userProfile.favoriteGenres.set(song.genre, current + 1);
        }
        
        // Track artist preference
        const artistCurrent = this.userProfile.favoriteArtists.get(song.artist) || 0;
        this.userProfile.favoriteArtists.set(song.artist, artistCurrent + 1);
        
        // Track time patterns
        const timeKey = `${day}-${hour}`;
        const timeCurrent = this.userProfile.timePatterns.get(timeKey) || 0;
        this.userProfile.timePatterns.set(timeKey, timeCurrent + 1);
        
        this.saveUserProfile();
    },
    
    getRecommendations(count = 10) {
        const songs = LFLibrary.getAllSongs();
        const currentMood = this.detectCurrentMood();
        const timeContext = this.getTimeContext();
        
        // Score each song
        const scored = songs.map(song => ({
            song,
            score: this.scoreSong(song, currentMood, timeContext)
        }));
        
        // Sort by score
        scored.sort((a, b) => b.score - a.score);
        
        // Return top recommendations, excluding recently played
        const recentIds = new Set(LyricFlow.state.recentSongs.slice(0, 5).map(s => s.id));
        return scored
            .filter(item => !recentIds.has(item.song.id))
            .slice(0, count)
            .map(item => item.song);
    },
    
    scoreSong(song, currentMood, timeContext) {
        let score = 0;
        
        // Genre preference
        if (song.genre && this.userProfile.favoriteGenres.has(song.genre)) {
            score += this.userProfile.favoriteGenres.get(song.genre) * 2;
        }
        
        // Artist preference
        const artistScore = this.userProfile.favoriteArtists.get(song.artist) || 0;
        score += artistScore * 3;
        
        // Mood match
        if (song.mood === currentMood) {
            score += 10;
        }
        
        // Time context match
        if (song.timeContext === timeContext) {
            score += 5;
        }
        
        // Play count (favor less played but not never played)
        const playCount = song.playCount || 0;
        score += Math.min(playCount, 5);
        
        // Random factor for variety
        score += Math.random() * 3;
        
        return score;
    },
    
    detectCurrentMood() {
        const hour = new Date().getHours();
        
        if (hour >= 6 && hour < 12) return 'energetic';
        if (hour >= 12 && hour < 14) return 'calm';
        if (hour >= 14 && hour < 18) return 'focus';
        if (hour >= 18 && hour < 22) return 'party';
        return 'calm';
    },
    
    getTimeContext() {
        const hour = new Date().getHours();
        
        if (hour >= 5 && hour < 12) return 'morning';
        if (hour >= 12 && hour < 17) return 'afternoon';
        if (hour >= 17 && hour < 22) return 'evening';
        return 'night';
    },
    
    updateRecommendations() {
        const recommendations = this.getRecommendations(6);
        this.renderRecommendations(recommendations);
    },
    
    renderRecommendations(songs) {
        const container = $('#recommendation-grid');
        if (!container) return;
        
        if (songs.length === 0) {
            container.innerHTML = '<p class="text-secondary">Listen to more songs to get recommendations</p>';
            return;
        }
        
        container.innerHTML = songs.map(song => LFLibrary.createSongCard(song)).join('');
    },
    
    // Smart shuffle based on user preferences
    smartShuffle(songs) {
        const scored = songs.map(song => ({
            song,
            score: this.scoreSong(song, this.detectCurrentMood(), this.getTimeContext())
        }));
        
        // Weighted random shuffle
        const result = [];
        while (scored.length > 0) {
            const totalWeight = scored.reduce((sum, item) => sum + item.score, 0);
            let random = Math.random() * totalWeight;
            
            let index = 0;
            while (random > 0 && index < scored.length) {
                random -= scored[index].score;
                index++;
            }
            
            result.push(scored.splice(index - 1, 1)[0].song);
        }
        
        return result;
    }
};
