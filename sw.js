/**
 * LYRICFLOW v1.3 - SERVICE WORKER
 * Offline support and background sync
 */

const CACHE_NAME = 'lyricflow-v1.3';
const STATIC_CACHE = `${CACHE_NAME}-static`;
const DYNAMIC_CACHE = `${CACHE_NAME}-dynamic`;
const AUDIO_CACHE = `${CACHE_NAME}-audio`;

const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/css/core.css',
    '/css/components.css',
    '/css/animations.css',
    '/css/responsive.css',
    '/css/themes/dark.css',
    '/css/themes/light.css',
    '/js/utils.js',
    '/js/api.js',
    '/js/core.js',
    '/js/player.js',
    '/js/lyrics.js',
    '/js/playlist.js',
    '/js/library.js',
    '/js/themes.js',
    '/js/ui.js',
    '/manifest.json'
];

// Install event
self.addEventListener('install', (event) => {
    console.log('Service Worker installing...');
    
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => {
                console.log('Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate event
self.addEventListener('activate', (event) => {
    console.log('Service Worker activating...');
    
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames
                    .filter(name => name.startsWith('lyricflow-') && !name.includes(CACHE_NAME))
                    .map(name => {
                        console.log('Deleting old cache:', name);
                        return caches.delete(name);
                    })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch event
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Skip non-GET requests
    if (request.method !== 'GET') return;
    
    // Skip API requests
    if (url.pathname.startsWith('/api/')) {
        return;
    }
    
    // Audio files - cache with different strategy
    if (request.url.match(/\.(mp3|flac|wav|ogg|m4a)$/i)) {
        event.respondWith(cacheAudio(request));
        return;
    }
    
    // Static assets - cache first
    if (STATIC_ASSETS.includes(url.pathname)) {
        event.respondWith(cacheFirst(request));
        return;
    }
    
    // Dynamic content - network first with cache fallback
    event.respondWith(networkFirst(request));
});

// Cache strategies

async function cacheFirst(request) {
    const cache = await caches.open(STATIC_CACHE);
    const cached = await cache.match(request);
    
    if (cached) {
        return cached;
    }
    
    try {
        const response = await fetch(request);
        cache.put(request, response.clone());
        return response;
    } catch (e) {
        return new Response('Offline', { status: 503 });
    }
}

async function networkFirst(request) {
    try {
        const networkResponse = await fetch(request);
        
        // Cache successful responses
        if (networkResponse.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (e) {
        const cache = await caches.open(DYNAMIC_CACHE);
        const cached = await cache.match(request);
        
        if (cached) {
            return cached;
        }
        
        // Return offline fallback
        return caches.match('/offline.html');
    }
}

async function cacheAudio(request) {
    const cache = await caches.open(AUDIO_CACHE);
    const cached = await cache.match(request);
    
    if (cached) {
        // Return cached but also update in background
        fetch(request).then(response => {
            if (response.ok) {
                cache.put(request, response);
            }
        }).catch(() => {});
        
        return cached;
    }
    
    // Not cached - fetch and cache
    try {
        const response = await fetch(request);
        if (response.ok) {
            cache.put(request, response.clone());
        }
        return response;
    } catch (e) {
        return new Response('Audio not available offline', { status: 503 });
    }
}

// Background sync
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-data') {
        event.waitUntil(syncData());
    }
});

async function syncData() {
    // Sync queued data when back online
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
        client.postMessage({ type: 'sync-required' });
    });
}

// Push notifications
self.addEventListener('push', (event) => {
    const data = event.data.json();
    
    event.waitUntil(
        self.registration.showNotification(data.title, {
            body: data.body,
            icon: 'assets/icons/icon-192x192.png',
            badge: 'assets/icons/badge-72x72.png',
            data: data.data,
            actions: data.actions || []
        })
    );
});

// Notification click
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    event.waitUntil(
        clients.openWindow(event.notification.data?.url || '/')
    );
});

// Message from main thread
self.addEventListener('message', (event) => {
    const { type, data } = event.data;
    
    switch (type) {
        case 'cache-song':
            cacheSong(data.id, data.url);
            break;
        case 'clear-audio-cache':
            clearAudioCache();
            break;
        case 'get-cache-size':
            getCacheSize().then(size => {
                event.source.postMessage({ type: 'cache-size', size });
            });
            break;
    }
});

async function cacheSong(id, url) {
    const cache = await caches.open(AUDIO_CACHE);
    const response = await fetch(url);
    
    if (response.ok) {
        const newUrl = `/cached-song/${id}`;
        cache.put(newUrl, response);
    }
}

async function clearAudioCache() {
    await caches.delete(AUDIO_CACHE);
}

async function getCacheSize() {
    let size = 0;
    
    for (const cacheName of [STATIC_CACHE, DYNAMIC_CACHE, AUDIO_CACHE]) {
        const cache = await caches.open(cacheName);
        const requests = await cache.keys();
        
        for (const request of requests) {
            const response = await cache.match(request);
            const blob = await response.blob();
            size += blob.size;
        }
    }
    
    return size;
}
