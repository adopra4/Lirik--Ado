
 * LYRICFLOW v1.3 - API MODULE
 * Backend Communication & External Services
 */

class APIManager {
    constructor(app) {
        this.app = app;
        this.baseURL = localStorage.getItem('lyricflow_api_url') || '';
        this.apiKey = localStorage.getItem('lyricflow_api_key') || '';
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
        
        this.init();
    }

    init() {
        // Setup request interceptor
        this.setupInterceptors();
    }

    setupInterceptors() {
        // Add global error handling
        window.addEventListener('unhandledrejection', (event) => {
            if (event.reason?.name === 'APIError') {
                console.error('API Error:', event.reason);
                this.app.showToast(event.reason.message, 'error');
            }
        });
    }

    // Generic request method
    async request(endpoint, options = {}) {
        const url = this.baseURL + endpoint;
        
        const config = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': this.apiKey ? `Bearer ${this.apiKey}` : '',
                ...options.headers
            },
            ...options
        };

        // Check cache for GET requests
        if (options.method === 'GET' || !options.method) {
            const cached = this.getFromCache(url);
            if (cached) return cached;
        }

        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                throw this.createError(response);
            }

            const data = await response.json();
            
            // Cache successful GET requests
            if (options.method === 'GET' || !options.method) {
                this.setCache(url, data);
            }
            
            return data;
            
        } catch (error) {
            if (error.name === 'APIError') throw error;
            
            // Network error
            throw {
                name: 'APIError',
                message: 'Network error. Please check your connection.',
                status: 0
            };
        }
    }

    // HTTP methods
    async get(endpoint, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const url = queryString ? `${endpoint}?${queryString}` : endpoint;
        
        return this.request(url, { method: 'GET' });
    }

    async post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async put(endpoint, data) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }

    async upload(endpoint, file, onProgress = null) {
        const formData = new FormData();
        formData.append('file', file);

        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            
            if (onProgress) {
                xhr.upload.addEventListener('progress', (e) => {
                    if (e.lengthComputable) {
                        const percent = (e.loaded / e.total) * 100;
                        onProgress(percent);
                    }
                });
            }
            
            xhr.addEventListener('load', () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve(JSON.parse(xhr.responseText));
                } else {
                    reject(this.createError({ status: xhr.status, statusText: xhr.statusText }));
                }
            });
            
            xhr.addEventListener('error', () => {
                reject({ name: 'APIError', message: 'Upload failed', status: 0 });
            });
            
            xhr.open('POST', this.baseURL + endpoint);
            if (this.apiKey) {
                xhr.setRequestHeader('Authorization', `Bearer ${this.apiKey}`);
            }
            xhr.send(formData);
        });
    }

    // Cache management
    getFromCache(key) {
        const cached = this.cache.get(key);
        if (!cached) return null;
        
        if (Date.now() - cached.timestamp > this.cacheTimeout) {
            this.cache.delete(key);
            return null;
        }
        
        return cached.data;
    }

    setCache(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    clearCache() {
        this.cache.clear();
    }

    // Error handling
    createError(response) {
        const error = new Error(response.statusText);
        error.name = 'APIError';
        error.status = response.status;
        
        switch(response.status) {
            case 401:
                error.message = 'Unauthorized. Please log in again.';
                // Trigger logout
                this.app.logout();
                break;
            case 403:
                error.message = 'Access denied.';
                break;
            case 404:
                error.message = 'Resource not found.';
                break;
            case 429:
                error.message = 'Too many requests. Please try again later.';
                break;
            case 500:
                error.message = 'Server error. Please try again later.';
                break;
            default:
                error.message = `Error ${response.status}: ${response.statusText}`;
        }
        
        return error;
    }

    // API Endpoints
    
    // Authentication
    async login(credentials) {
        return this.post('/auth/login', credentials);
    }

    async register(userData) {
        return this.post('/auth/register', userData);
    }

    async refreshToken() {
        return this.post('/auth/refresh');
    }

    // Songs
    async getSongs(params = {}) {
        return this.get('/songs', params);
    }

    async getSong(id) {
        return this.get(`/songs/${id}`);
    }

    async createSong(songData) {
        return this.post('/songs', songData);
    }

    async updateSong(id, songData) {
        return this.put(`/songs/${id}`, songData);
    }

    async deleteSong(id) {
        return this.delete(`/songs/${id}`);
    }

    // Playlists
    async getPlaylists() {
        return this.get('/playlists');
    }

    async createPlaylist(playlistData) {
        return this.post('/playlists', playlistData);
    }

    async addToPlaylist(playlistId, songId) {
        return this.post(`/playlists/${playlistId}/songs`, { songId });
    }

    // Lyrics
    async getLyrics(songId) {
        return this.get(`/songs/${songId}/lyrics`);
    }

    async saveLyrics(songId, lyrics) {
        return this.put(`/songs/${songId}/lyrics`, { lyrics });
    }

    async syncLyrics(songId, syncData) {
        return this.post(`/songs/${songId}/lyrics/sync`, syncData);
    }

    // Search
    async search(query, type = 'all') {
        return this.get('/search', { q: query, type });
    }

    // User
    async getUserProfile() {
        return this.get('/user/profile');
    }

    async updateUserProfile(data) {
        return this.put('/user/profile', data);
    }

    async getUserStats() {
        return this.get('/user/stats');
    }

    // Analytics
    async getAnalytics(period = '30d') {
        return this.get('/analytics', { period });
    }

    async trackEvent(event, data = {}) {
        return this.post('/analytics/events', { event, data, timestamp: Date.now() });
    }

    // AI Features
    async generateLyrics(audioUrl, options = {}) {
        return this.post('/ai/generate-lyrics', { audioUrl, ...options });
    }

    async analyzeMood(audioUrl) {
        return this.post('/ai/analyze-mood', { audioUrl });
    }

    async getRecommendations(seed) {
        return this.post('/ai/recommendations', { seed });
    }

    // External APIs
    
    // Fetch lyrics from external source
    async fetchExternalLyrics(artist, title) {
        // This would integrate with lyrics APIs
        try {
            // Mock implementation
            return {
                found: false,
                lyrics: null
            };
        } catch (error) {
            console.error('Failed to fetch external lyrics:', error);
            return { found: false, lyrics: null };
        }
    }

    // Fetch album art
    async fetchAlbumArt(artist, album) {
        // This would integrate with music APIs like Last.fm, MusicBrainz
        try {
            // Mock implementation
            return null;
        } catch (error) {
            console.error('Failed to fetch album art:', error);
            return null;
        }
    }

    // WebSocket connection for real-time features
    connectWebSocket() {
        if (!this.baseURL) return null;
        
        const wsUrl = this.baseURL.replace(/^http/, 'ws') + '/ws';
        const ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
            console.log('WebSocket connected');
            // Authenticate
            ws.send(JSON.stringify({
                type: 'auth',
                token: this.apiKey
            }));
        };
        
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleWebSocketMessage(data);
        };
        
        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
        
        ws.onclose = () => {
            console.log('WebSocket disconnected');
            // Reconnect after delay
            setTimeout(() => this.connectWebSocket(), 5000);
        };
        
        this.ws = ws;
        return ws;
    }

    handleWebSocketMessage(data) {
        switch(data.type) {
            case 'sync':
                // Handle sync update
                break;
            case 'notification':
                this.app.showToast(data.message, data.level || 'info');
                break;
            case 'player_update':
                // Handle remote player update
                break;
        }
    }

    // Settings
    setBaseURL(url) {
        this.baseURL = url;
        localStorage.setItem('lyricflow_api_url', url);
    }

    setApiKey(key) {
        this.apiKey = key;
        localStorage.setItem('lyricflow_api_key', key);
    }

    // Offline support
    async syncOfflineData() {
        const offlineData = JSON.parse(localStorage.getItem('lyricflow_offline_queue') || '[]');
        
        if (offlineData.length === 0) return;
        
        const results = [];
        for (const item of offlineData) {
            try {
                await this.request(item.endpoint, item.options);
                results.push({ success: true, item });
            } catch (error) {
                results.push({ success: false, item, error });
            }
        }
        
        // Clear successful items from queue
        const failed = results.filter(r => !r.success).map(r => r.item);
        localStorage.setItem('lyricflow_offline_queue', JSON.stringify(failed));
        
        return results;
    }

    queueOfflineRequest(endpoint, options) {
        const queue = JSON.parse(localStorage.getItem('lyricflow_offline_queue') || '[]');
        queue.push({ endpoint, options, timestamp: Date.now() });
        localStorage.setItem('lyricflow_offline_queue', JSON.stringify(queue));
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = APIManager;
}