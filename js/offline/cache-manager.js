/**
 * LYRICFLOW v1.3 - CACHE MANAGER
 * Service Worker and Cache API management
 */

const LFCache = {
    cacheName: 'lyricflow-v1',
    assets: [
        '/',
        '/index.html',
        '/css/core.css',
        '/css/components.css',
        '/css/animations.css',
        '/js/core.js',
        '/js/player.js'
    ],
    
    async init() {
        if (!('caches' in window)) {
            console.warn('Cache API not supported');
            return;
        }
        
        await this.precacheAssets();
        this.setupOfflineFallback();
        
        console.log('Cache manager initialized');
    },
    
    async precacheAssets() {
        const cache = await caches.open(this.cacheName);
        const existing = await cache.keys();
        
        // Only add new assets
        const newAssets = this.assets.filter(url => {
            return !existing.some(req => req.url.includes(url));
        });
        
        if (newAssets.length > 0) {
            await cache.addAll(newAssets);
            console.log('Precached assets:', newAssets);
        }
    },
    
    async cacheSong(songId, audioBlob, metadata) {
        const cache = await caches.open(`${this.cacheName}-songs`);
        
        const audioResponse = new Response(audioBlob);
        await cache.put(`/songs/${songId}/audio`, audioResponse);
        
        const metaResponse = new Response(JSON.stringify(metadata));
        await cache.put(`/songs/${songId}/meta`, metaResponse);
        
        // Update storage info
        this.updateStorageInfo();
    },
    
    async getCachedSong(songId) {
        const cache = await caches.open(`${this.cacheName}-songs`);
        
        const audioResponse = await cache.match(`/songs/${songId}/audio`);
        const metaResponse = await cache.match(`/songs/${songId}/meta`);
        
        if (!audioResponse) return null;
        
        return {
            audio: await audioResponse.blob(),
            metadata: metaResponse ? await metaResponse.json() : null
        };
    },
    
    async removeCachedSong(songId) {
        const cache = await caches.open(`${this.cacheName}-songs`);
        await cache.delete(`/songs/${songId}/audio`);
        await cache.delete(`/songs/${songId}/meta`);
        this.updateStorageInfo();
    },
    
    async clearAllSongs() {
        await caches.delete(`${this.cacheName}-songs`);
        this.updateStorageInfo();
    },
    
    async getCacheSize() {
        const cache = await caches.open(`${this.cacheName}-songs`);
        const keys = await cache.keys();
        let size = 0;
        
        for (const request of keys) {
            const response = await cache.match(request);
            if (response) {
                const blob = await response.blob();
                size += blob.size;
            }
        }
        
        return size;
    },
    
    async updateStorageInfo() {
        const size = await this.getCacheSize();
        const maxSize = 1024 * 1024 * 1024; // 1GB limit
        
        const percent = (size / maxSize) * 100;
        
        const bar = $('.storage-used');
        const text = $('.storage-text');
        
        if (bar) bar.style.width = `${percent}%`;
        if (text) text.textContent = `${LFUtils.formatFileSize(size)} / ${LFUtils.formatFileSize(maxSize)}`;
    },
    
    setupOfflineFallback() {
        // Show offline indicator
        window.addEventListener('offline', () => {
            document.body.classList.add('offline');
        });
        
        window.addEventListener('online', () => {
            document.body.classList.remove('offline');
        });
    }
};
