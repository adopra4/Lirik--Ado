/**
 * LYRICFLOW v1.3 - STATS TRACKER
 * Usage analytics and statistics
 */

const LFAnalytics = {
    sessionStart: Date.now(),
    events: [],
    batchSize: 50,
    
    init() {
        this.loadStoredEvents();
        this.startHeartbeat();
        this.trackPageView();
        
        // Track events
        this.setupEventTracking();
        
        console.log('Analytics initialized');
    },
    
    setupEventTracking() {
        // Playback events
        LyricFlow.events.on('play', (song) => {
            this.track('play', { songId: song.id, duration: song.duration });
        });
        
        LyricFlow.events.on('pause', () => {
            this.track('pause', { time: LFPlayer.getCurrentTime() });
        });
        
        LyricFlow.events.on('seek', (time) => {
            this.track('seek', { to: time });
        });
        
        // Navigation
        LyricFlow.events.on('navigate', ({ page }) => {
            this.track('page_view', { page });
        });
        
        // Search
        // Track via search function
        
        // Errors
        window.addEventListener('error', (e) => {
            this.track('error', {
                message: e.message,
                filename: e.filename,
                line: e.lineno
            });
        });
        
        // Performance
        window.addEventListener('load', () => {
            setTimeout(() => {
                const perf = performance.getEntriesByType('navigation')[0];
                if (perf) {
                    this.track('performance', {
                        loadTime: perf.loadEventEnd - perf.startTime,
                        domContentLoaded: perf.domContentLoadedEventEnd - perf.startTime
                    });
                }
            }, 0);
        });
    },
    
    track(eventName, properties = {}) {
        const event = {
            name: eventName,
            properties: {
                ...properties,
                timestamp: Date.now(),
                sessionId: this.getSessionId(),
                userId: LyricFlow.state.user?.id,
                version: LyricFlow.version
            }
        };
        
        this.events.push(event);
        
        // Flush if batch size reached
        if (this.events.length >= this.batchSize) {
            this.flush();
        }
    },
    
    async flush() {
        if (this.events.length === 0) return;
        
        const toSend = [...this.events];
        this.events = [];
        
        // Try to send to API
        if (LFUtils.isOnline()) {
            try {
                await LFAPI.post('/analytics/events', { events: toSend });
            } catch (e) {
                // Store for later
                this.storeEvents(toSend);
            }
        } else {
            this.storeEvents(toSend);
        }
    },
    
    storeEvents(events) {
        const stored = LFUtils.storage.get('lf_analytics_queue') || [];
        stored.push(...events);
        
        // Keep only last 1000 events
        if (stored.length > 1000) {
            stored.splice(0, stored.length - 1000);
        }
        
        LFUtils.storage.set('lf_analytics_queue', stored);
    },
    
    loadStoredEvents() {
        const stored = LFUtils.storage.get('lf_analytics_queue') || [];
        if (stored.length > 0) {
            this.events = stored;
            LFUtils.storage.remove('lf_analytics_queue');
        }
    },
    
    startHeartbeat() {
        // Send heartbeat every 30 seconds
        setInterval(() => {
            this.track('heartbeat', {
                sessionDuration: Date.now() - this.sessionStart
            });
            this.flush();
        }, 30000);
        
        // Flush on page hide
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.flush();
            }
        });
    },
    
    getSessionId() {
        if (!this.sessionId) {
            this.sessionId = LFUtils.generateUUID();
        }
        return this.sessionId;
    },
    
    // Get stats for display
    async getStats() {
        const songs = LFLibrary.getAllSongs();
        
        const totalPlays = songs.reduce((sum, s) => sum + (s.playCount || 0), 0);
        const totalTime = songs.reduce((sum, s) => sum + ((s.playCount || 0) * (s.duration || 0)), 0);
        
        const topArtists = this.getTopArtists(5);
        const topSongs = this.getTopSongs(5);
        
        return {
            totalSongs: songs.length,
            totalPlays,
            totalListeningTime: totalTime,
            topArtists,
            topSongs,
            favoriteGenre: this.getFavoriteGenre(),
            listeningPatterns: this.getListeningPatterns()
        };
    },
    
    getTopArtists(limit = 5) {
        const artists = new Map();
        
        LFLibrary.getAllSongs().forEach(song => {
            const count = artists.get(song.artist) || 0;
            artists.set(song.artist, count + (song.playCount || 0));
        });
        
        return Array.from(artists.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit);
    },
    
    getTopSongs(limit = 5) {
        return LFLibrary.getAllSongs()
            .sort((a, b) => (b.playCount || 0) - (a.playCount || 0))
            .slice(0, limit);
    },
    
    getFavoriteGenre() {
        const genres = new Map();
        
        LFLibrary.getAllSongs().forEach(song => {
            if (song.genre) {
                const count = genres.get(song.genre) || 0;
                genres.set(song.genre, count + (song.playCount || 0));
            }
        });
        
        return Array.from(genres.entries())
            .sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown';
    },
    
    getListeningPatterns() {
        // Analyze listening by hour
        const hourly = new Array(24).fill(0);
        
        // This would use actual timestamp data in production
        // For now, return placeholder
        
        return {
            hourly,
            peakHour: 20,
            averageSession: 45 // minutes
        };
    }
};
