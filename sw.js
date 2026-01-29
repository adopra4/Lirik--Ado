
 * LYRICFLOW v1.3 - SERVICE WORKER
 * Offline Support & Caching Strategy
 */

const CACHE_NAME = 'lyricflow-v1.3.0';
const STATIC_CACHE = `${CACHE_NAME}-static`;
const DYNAMIC_CACHE = `${CACHE_NAME}-dynamic`;
const AUDIO_CACHE = `${CACHE_NAME}-audio`;
const IMAGE_CACHE = `${CACHE_NAME}-images`;

// Assets to cache on install
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
    '/js/dev.js'
];

// External assets to cache
const EXTERNAL_ASSETS = [
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    console.log('[SW] Installing...');
    
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => {
                console.log('[SW] Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                return caches.open(DYNAMIC_CACHE);
            })
            .then(cache => {
                console.log('[SW] Caching external assets');
                // Use no-cors for external resources
                const externalRequests = EXTERNAL_ASSETS.map(url => 
                    fetch(url, { mode: 'no-cors' })
                        .then(response => cache.put(url, response))
                        .catch(err => console.warn('[SW] Failed to cache:', url))
                );
                return Promise.all(externalRequests);
            })
            .then(() => {
                console.log('[SW] Install complete');
                return self.skipWaiting();
            })
            .catch(err => {
                console.error('[SW] Install failed:', err);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating...');
    
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames
                        .filter(name => {
                            return name.startsWith('lyricflow-') && 
                                   !name.includes(CACHE_NAME);
                        })
                        .map(name => {
                            console.log('[SW] Deleting old cache:', name);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => {
                console.log('[SW] Activate complete');
                return self.clients.claim();
            })
    );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }
    
    // Skip chrome-extension and other non-http(s) requests
    if (!url.protocol.startsWith('http')) {
        return;
    }
    
    // Strategy for different resource types
    if (isAudioRequest(request)) {
        event.respondWith(audioStrategy(request));
    } else if (isImageRequest(request)) {
        event.respondWith(imageStrategy(request));
    } else if (isStaticAsset(request)) {
        event.respondWith(cacheFirstStrategy(request));
    } else {
        event.respondWith(networkFirstStrategy(request));
    }
});

// Check if request is for audio
function isAudioRequest(request) {
    return request.url.match(/\\.(mp3|wav|ogg|flac|aac|m4a)($|\\?)/i);
}

// Check if request is for image
function isImageRequest(request) {
    return request.destination === 'image' || 
           request.url.match(/\\.(jpg|jpeg|png|gif|webp|svg)($|\\?)/i);
}

// Check if request is for static asset
function isStaticAsset(request) {
    return STATIC_ASSETS.some(asset => request.url.includes(asset)) ||
           request.destination === 'style' ||
           request.destination === 'script' ||
           request.destination === 'font';
}

// Cache First Strategy - for static assets
async function cacheFirstStrategy(request) {
    const cache = await caches.open(STATIC_CACHE);
    const cached = await cache.match(request);
    
    if (cached) {
        // Return cached and update in background
        fetch(request)
            .then(response => {
                if (response.ok) {
                    cache.put(request, response.clone());
                }
            })
            .catch(() => {});
        
        return cached;
    }
    
    // Not in cache, fetch from network
    try {
        const response = await fetch(request);
        if (response.ok) {
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        // Return offline fallback for navigation requests
        if (request.mode === 'navigate') {
            return cache.match('/index.html');
        }
        throw error;
    }
}

// Network First Strategy - for API calls and dynamic content
async function networkFirstStrategy(request) {
    const cache = await caches.open(DYNAMIC_CACHE);
    
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            // Cache successful responses
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        // Network failed, try cache
        const cached = await cache.match(request);
        
        if (cached) {
            return cached;
        }
        
        // Return offline response for API
        if (request.url.includes('/api/')) {
            return new Response(
                JSON.stringify({ error: 'Offline', offline: true }),
                { 
                    status: 503,
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        }
        
        throw error;
    }
}

// Audio Strategy - cache with range request support
async function audioStrategy(request) {
    const cache = await caches.open(AUDIO_CACHE);
    
    // Check if we have the full file cached
    const cached = await cache.match(request, { ignoreSearch: true });
    
    if (cached) {
        // Handle range requests
        const rangeHeader = request.headers.get('range');
        if (rangeHeader) {
            return handleRangeRequest(cached, rangeHeader);
        }
        return cached;
    }
    
    // Not cached, fetch and cache
    try {
        const response = await fetch(request);
        
        if (response.ok) {
            // Clone and cache
            cache.put(request, response.clone());
        }
        
        return response;
    } catch (error) {
        console.error('[SW] Audio fetch failed:', error);
        throw error;
    }
}

// Handle HTTP Range requests for audio
function handleRangeRequest(response, rangeHeader) {
    const bytes = rangeHeader.match(/bytes=(\\d+)-(\\d*)/);
    if (!bytes) return response;
    
    const start = parseInt(bytes[1], 10);
    const end = bytes[2] ? parseInt(bytes[2], 10) : undefined;
    
    return response.blob().then(blob => {
        const sliced = blob.slice(start, end);
        const slicedResponse = new Response(sliced, {
            status: 206,
            statusText: 'Partial Content',
            headers: [
                ['Content-Type', response.headers.get('Content-Type')],
                ['Content-Range', `bytes ${start}-${end || blob.size - 1}/${blob.size}`],
                ['Content-Length', sliced.size]
            ]
        });
        return slicedResponse;
    });
}

// Image Strategy - stale while revalidate
async function imageStrategy(request) {
    const cache = await caches.open(IMAGE_CACHE);
    const cached = await cache.match(request);
    
    const fetchPromise = fetch(request)
        .then(response => {
            if (response.ok) {
                cache.put(request, response.clone());
            }
            return response;
        })
        .catch(() => cached);
    
    return cached || fetchPromise;
}

// Background Sync
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-playlists') {
        event.waitUntil(syncPlaylists());
    } else if (event.tag === 'sync-analytics') {
        event.waitUntil(syncAnalytics());
    }
});

async function syncPlaylists() {
    // Sync playlist changes
    console.log('[SW] Syncing playlists...');
}

async function syncAnalytics() {
    // Sync analytics data
    console.log('[SW] Syncing analytics...');
}

// Push Notifications
self.addEventListener('push', (event) => {
    if (!event.data) return;
    
    const data = event.data.json();
    const options = {
        body: data.body,
        icon: '/assets/icons/icon-192x192.png',
        badge: '/assets/icons/icon-72x72.png',
        image: data.image,
        tag: data.tag,
        requireInteraction: data.requireInteraction,
        actions: data.actions || [],
        data: data.data
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Notification click
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    const { notification } = event;
    const action = event.action;
    
    if (action === 'play') {
        event.waitUntil(
            clients.openWindow('/#player')
        );
    } else if (action === 'skip') {
        // Send message to client
        event.waitUntil(
            clients.matchAll({ type: 'window' })
                .then(clientList => {
                    if (clientList.length > 0) {
                        clientList[0].postMessage({ action: 'skip' });
                    }
                })
        );
    } else {
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

// Message handling from clients
self.addEventListener('message', (event) => {
    if (event.data === 'skipWaiting') {
        self.skipWaiting();
    } else if (event.data.type === 'CACHE_AUDIO') {
        // Pre-cache audio file
        caches.open(AUDIO_CACHE)
            .then(cache => cache.add(event.data.url))
            .catch(err => console.error('[SW] Failed to cache audio:', err));
    } else if (event.data.type === 'CLEAR_CACHE') {
        // Clear specific cache
        caches.delete(event.data.cacheName)
            .then(() => console.log('[SW] Cache cleared:', event.data.cacheName));
    }
});

// Periodic background sync (if supported)
if ('periodicSync' in self.registration) {
    self.addEventListener('periodicsync', (event) => {
        if (event.tag === 'update-content') {
            event.waitUntil(updateContent());
        }
    });
}

async function updateContent() {
    // Update cached content in background
    console.log('[SW] Periodic sync: updating content');
}

// Listen for controller change
let refreshing = false;
self.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
});