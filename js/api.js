/**
 * LYRICFLOW v1.3 - API MODULE
 * Handles all external API communications
 */

const LFAPI = {
    baseURL: 'https://api.lyricflow.app/v1',
    token: null,
    
    // Initialize API
    init() {
        this.token = LFUtils.storage.get('auth_token');
    },
    
    // Set auth token
    setToken(token) {
        this.token = token;
        LFUtils.storage.set('auth_token', token);
    },
    
    // Clear auth token
    clearToken() {
        this.token = null;
        LFUtils.storage.remove('auth_token');
    },
    
    // Generic request method
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...(this.token && { 'Authorization': `Bearer ${this.token}` }),
                ...options.headers
            },
            ...options
        };
        
        if (config.body && typeof config.body === 'object') {
            config.body = JSON.stringify(config.body);
        }
        
        try {
            const response = await fetch(url, config);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || `HTTP ${response.status}`);
            }
            
            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },
    
    // GET request
    get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    },
    
    // POST request
    post(endpoint, body) {
        return this.request(endpoint, { method: 'POST', body });
    },
    
    // PUT request
    put(endpoint, body) {
        return this.request(endpoint, { method: 'PUT', body });
    },
    
    // DELETE request
    delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    },
    
    // ==========================================
    // AUTH ENDPOINTS
    // ==========================================
    
    auth: {
        async login(credentials) {
            const data = await LFAPI.post('/auth/login', credentials);
            LFAPI.setToken(data.token);
            return data;
        },
        
        async register(userData) {
            const data = await LFAPI.post('/auth/register', userData);
            LFAPI.setToken(data.token);
            return data;
        },
        
        async logout() {
            try {
                await LFAPI.post('/auth/logout');
            } finally {
                LFAPI.clearToken();
            }
        },
        
        async refresh() {
            const data = await LFAPI.post('/auth/refresh');
            LFAPI.setToken(data.token);
            return data;
        },
        
        async me() {
            return LFAPI.get('/auth/me');
        }
    },
    
    // ==========================================
    // SONG ENDPOINTS
    // ==========================================
    
    songs: {
        async list(params = {}) {
            const query = LFUtils.buildQueryString(params);
            return LFAPI.get(`/songs?${query}`);
        },
        
        async get(id) {
            return LFAPI.get(`/songs/${id}`);
        },
        
        async create(songData) {
            return LFAPI.post('/songs', songData);
        },
        
        async update(id, songData) {
            return LFAPI.put(`/songs/${id}`, songData);
        },
        
        async delete(id) {
            return LFAPI.delete(`/songs/${id}`);
        },
        
        async search(query) {
            return LFAPI.get(`/songs/search?q=${encodeURIComponent(query)}`);
        },
        
        async upload(file, onProgress) {
            const formData = new FormData();
            formData.append('file', file);
            
            return new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                
                xhr.upload.addEventListener('progress', (e) => {
                    if (e.lengthComputable && onProgress) {
                        onProgress((e.loaded / e.total) * 100);
                    }
                });
                
                xhr.addEventListener('load', () => {
                    if (xhr.status === 200) {
                        resolve(JSON.parse(xhr.response));
                    } else {
                        reject(new Error('Upload failed'));
                    }
                });
                
                xhr.addEventListener('error', () => reject(new Error('Upload failed')));
                
                xhr.open('POST', `${LFAPI.baseURL}/songs/upload`);
                if (LFAPI.token) {
                    xhr.setRequestHeader('Authorization', `Bearer ${LFAPI.token}`);
                }
                xhr.send(formData);
            });
        }
    },
    
    // ==========================================
    // LYRICS ENDPOINTS
    // ==========================================
    
    lyrics: {
        async get(songId) {
            return LFAPI.get(`/lyrics/${songId}`);
        },
        
        async save(songId, lyricsData) {
            return LFAPI.post(`/lyrics/${songId}`, lyricsData);
        },
        
        async generate(songId, options = {}) {
            return LFAPI.post(`/lyrics/${songId}/generate`, options);
        },
        
        async translate(songId, language) {
            return LFAPI.post(`/lyrics/${songId}/translate`, { language });
        }
    },
    
    // ==========================================
    // PLAYLIST ENDPOINTS
    // ==========================================
    
    playlists: {
        async list() {
            return LFAPI.get('/playlists');
        },
        
        async get(id) {
            return LFAPI.get(`/playlists/${id}`);
        },
        
        async create(playlistData) {
            return LFAPI.post('/playlists', playlistData);
        },
        
        async update(id, playlistData) {
            return LFAPI.put(`/playlists/${id}`, playlistData);
        },
        
        async delete(id) {
            return LFAPI.delete(`/playlists/${id}`);
        },
        
        async addSong(playlistId, songId) {
            return LFAPI.post(`/playlists/${playlistId}/songs`, { songId });
        },
        
        async removeSong(playlistId, songId) {
            return LFAPI.delete(`/playlists/${playlistId}/songs/${songId}`);
        }
    },
    
    // ==========================================
    // USER ENDPOINTS
    // ==========================================
    
    users: {
        async list() {
            return LFAPI.get('/users');
        },
        
        async get(id) {
            return LFAPI.get(`/users/${id}`);
        },
        
        async update(id, userData) {
            return LFAPI.put(`/users/${id}`, userData);
        },
        
        async delete(id) {
            return LFAPI.delete(`/users/${id}`);
        }
    },
    
    // ==========================================
    // STATS ENDPOINTS
    // ==========================================
    
    stats: {
        async overview() {
            return LFAPI.get('/stats/overview');
        },
        
        async listening() {
            return LFAPI.get('/stats/listening');
        },
        
        async popular() {
            return LFAPI.get('/stats/popular');
        }
    }
};

// Initialize on load
LFUtils.ready(() => LFAPI.init());
