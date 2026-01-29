/**
 * LYRICFLOW v1.3 - SYNC ENGINE
 * Background synchronization when back online
 */

const LFSync = {
    queue: [],
    isSyncing: false,
    
    init() {
        this.loadQueue();
        this.setupSync();
        
        // Sync when coming back online
        window.addEventListener('online', () => {
            this.processQueue();
        });
        
        // Periodic sync check
        setInterval(() => {
            if (navigator.onLine && this.queue.length > 0) {
                this.processQueue();
            }
        }, 30000);
    },
    
    loadQueue() {
        this.queue = LFUtils.storage.get('lf_sync_queue') || [];
    },
    
    saveQueue() {
        LFUtils.storage.set('lf_sync_queue', this.queue);
    },
    
    addToQueue(operation) {
        this.queue.push({
            ...operation,
            timestamp: Date.now(),
            retries: 0
        });
        this.saveQueue();
        
        // Try to sync immediately if online
        if (navigator.onLine) {
            this.processQueue();
        }
    },
    
    async processQueue() {
        if (this.isSyncing || this.queue.length === 0) return;
        
        this.isSyncing = true;
        
        const toProcess = [...this.queue];
        const failed = [];
        
        for (const operation of toProcess) {
            try {
                await this.executeOperation(operation);
                // Success - remove from queue
                this.queue = this.queue.filter(o => o.timestamp !== operation.timestamp);
            } catch (e) {
                // Failed
                operation.retries++;
                if (operation.retries < 3) {
                    failed.push(operation);
                } else {
                    // Max retries - log error
                    console.error('Sync failed after retries:', operation);
                    this.queue = this.queue.filter(o => o.timestamp !== operation.timestamp);
                }
            }
        }
        
        this.saveQueue();
        this.isSyncing = false;
        
        // Notify if items were synced
        if (toProcess.length > failed.length) {
            LyricFlow.showToast(`${toProcess.length - failed.length} items synced`, 'success');
        }
    },
    
    async executeOperation(operation) {
        switch (operation.type) {
            case 'song:add':
                await LFAPI.songs.create(operation.data);
                break;
            case 'song:update':
                await LFAPI.songs.update(operation.id, operation.data);
                break;
            case 'song:delete':
                await LFAPI.songs.delete(operation.id);
                break;
            case 'playlist:create':
                await LFAPI.playlists.create(operation.data);
                break;
            case 'playlist:update':
                await LFAPI.playlists.update(operation.id, operation.data);
                break;
            case 'lyrics:save':
                await LFAPI.lyrics.save(operation.songId, operation.data);
                break;
        }
    },
    
    setupSync() {
        // Background Sync API
        if ('serviceWorker' in navigator && 'sync' in window.registration) {
            navigator.serviceWorker.ready.then(registration => {
                registration.sync.register('sync-data');
            });
        }
    }
};
