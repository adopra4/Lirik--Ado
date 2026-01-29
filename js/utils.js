/**
 * LYRICFLOW v1.3 - UTILITIES
 * Core utility functions and helpers
 */

// ==========================================
// DOM UTILITIES
// ==========================================

/**
 * Query selector shorthand
 */
const $ = (selector, context = document) => context.querySelector(selector);
const $$ = (selector, context = document) => Array.from(context.querySelectorAll(selector));

/**
 * Create element with attributes and children
 */
const createElement = (tag, attrs = {}, ...children) => {
    const el = document.createElement(tag);
    
    Object.entries(attrs).forEach(([key, value]) => {
        if (key === 'className') {
            el.className = value;
        } else if (key === 'dataset') {
            Object.assign(el.dataset, value);
        } else if (key.startsWith('on') && typeof value === 'function') {
            el.addEventListener(key.slice(2).toLowerCase(), value);
        } else {
            el.setAttribute(key, value);
        }
    });
    
    children.forEach(child => {
        if (typeof child === 'string') {
            el.appendChild(document.createTextNode(child));
        } else if (child instanceof Node) {
            el.appendChild(child);
        }
    });
    
    return el;
};

/**
 * Debounce function
 */
const debounce = (fn, delay) => {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn.apply(this, args), delay);
    };
};

/**
 * Throttle function
 */
const throttle = (fn, limit) => {
    let inThrottle;
    return (...args) => {
        if (!inThrottle) {
            fn.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
};

/**
 * Wait for DOM ready
 */
const ready = (fn) => {
    if (document.readyState !== 'loading') {
        fn();
    } else {
        document.addEventListener('DOMContentLoaded', fn);
    }
};

// ==========================================
// FORMATTING UTILITIES
// ==========================================

/**
 * Format time in seconds to MM:SS or HH:MM:SS
 */
const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
        return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Format file size
 */
const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Format number with commas
 */
const formatNumber = (num) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

/**
 * Truncate text with ellipsis
 */
const truncate = (str, length = 50, suffix = '...') => {
    if (str.length <= length) return str;
    return str.substring(0, length).trim() + suffix;
};

// ==========================================
// STORAGE UTILITIES
// ==========================================

/**
 * LocalStorage with error handling
 */
const storage = {
    get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (e) {
            console.error('Storage get error:', e);
            return defaultValue;
        }
    },
    
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.error('Storage set error:', e);
            return false;
        }
    },
    
    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            console.error('Storage remove error:', e);
            return false;
        }
    },
    
    clear() {
        try {
            localStorage.clear();
            return true;
        } catch (e) {
            console.error('Storage clear error:', e);
            return false;
        }
    }
};

/**
 * IndexedDB wrapper
 */
const db = {
    db: null,
    name: 'LyricFlowDB',
    version: 1,
    
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.name, this.version);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Stores
                if (!db.objectStoreNames.contains('songs')) {
                    const songStore = db.createObjectStore('songs', { keyPath: 'id' });
                    songStore.createIndex('artist', 'artist', { unique: false });
                    songStore.createIndex('album', 'album', { unique: false });
                }
                
                if (!db.objectStoreNames.contains('playlists')) {
                    db.createObjectStore('playlists', { keyPath: 'id' });
                }
                
                if (!db.objectStoreNames.contains('lyrics')) {
                    db.createObjectStore('lyrics', { keyPath: 'songId' });
                }
                
                if (!db.objectStoreNames.contains('offline')) {
                    db.createObjectStore('offline', { keyPath: 'id' });
                }
            };
        });
    },
    
    async get(storeName, key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(key);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },
    
    async getAll(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },
    
    async put(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },
    
    async delete(storeName, key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(key);
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
};

// ==========================================
// AUDIO UTILITIES
// ==========================================

/**
 * Audio context singleton
 */
let audioContext = null;

const getAudioContext = () => {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContext;
};

/**
 * Decode audio data
 */
const decodeAudioData = async (arrayBuffer) => {
    const ctx = getAudioContext();
    return await ctx.decodeAudioData(arrayBuffer);
};

/**
 * Generate waveform data
 */
const generateWaveform = async (audioBuffer, samples = 100) => {
    const channelData = audioBuffer.getChannelData(0);
    const step = Math.floor(channelData.length / samples);
    const waveform = [];
    
    for (let i = 0; i < samples; i++) {
        let sum = 0;
        for (let j = 0; j < step; j++) {
            sum += Math.abs(channelData[i * step + j]);
        }
        waveform.push(sum / step);
    }
    
    return waveform;
};

// ==========================================
// VALIDATION UTILITIES
// ==========================================

/**
 * Validate email
 */
const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

/**
 * Validate password strength
 */
const getPasswordStrength = (password) => {
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;
    
    if (score < 3) return 'weak';
    if (score < 5) return 'medium';
    return 'strong';
};

/**
 * Sanitize string
 */
const sanitize = (str) => {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
};

// ==========================================
// MATH UTILITIES
// ==========================================

/**
 * Clamp value between min and max
 */
const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

/**
 * Linear interpolation
 */
const lerp = (start, end, t) => start + (end - start) * t;

/**
 * Map range
 */
const mapRange = (value, inMin, inMax, outMin, outMax) => {
    return (value - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
};

/**
 * Random integer
 */
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

/**
 * Random array element
 */
const randomChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];

// ==========================================
// COLOR UTILITIES
// ==========================================

/**
 * Convert hex to rgb
 */
const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
};

/**
 * Convert rgb to hex
 */
const rgbToHex = (r, g, b) => {
    return '#' + [r, g, b].map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    }).join('');
};

/**
 * Get dominant color from image
 */
const getDominantColor = (imageUrl) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = 1;
            canvas.height = 1;
            ctx.drawImage(img, 0, 0, 1, 1);
            const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
            resolve(rgbToHex(r, g, b));
        };
        img.onerror = reject;
        img.src = imageUrl;
    });
};

// ==========================================
// EVENT UTILITIES
// ==========================================

/**
 * Event emitter
 */
class EventEmitter {
    constructor() {
        this.events = {};
    }
    
    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
        return () => this.off(event, callback);
    }
    
    off(event, callback) {
        if (!this.events[event]) return;
        this.events[event] = this.events[event].filter(cb => cb !== callback);
    }
    
    emit(event, ...args) {
        if (!this.events[event]) return;
        this.events[event].forEach(callback => {
            try {
                callback(...args);
            } catch (e) {
                console.error('Event handler error:', e);
            }
        });
    }
    
    once(event, callback) {
        const onceCallback = (...args) => {
            this.off(event, onceCallback);
            callback(...args);
        };
        this.on(event, onceCallback);
    }
}

// ==========================================
// NETWORK UTILITIES
// ==========================================

/**
 * Check online status
 */
const isOnline = () => navigator.onLine;

/**
 * Fetch with timeout
 */
const fetchWithTimeout = async (url, options = {}, timeout = 5000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        throw error;
    }
};

// ==========================================
// FILE UTILITIES
// ==========================================

/**
 * Read file as data URL
 */
const readFileAsDataURL = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

/**
 * Read file as text
 */
const readFileAsText = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsText(file);
    });
};

/**
 * Read file as array buffer
 */
const readFileAsArrayBuffer = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
};

/**
 * Download file
 */
const downloadFile = (content, filename, type = 'text/plain') => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

// ==========================================
// URL UTILITIES
// ==========================================

/**
 * Parse query parameters
 */
const parseQueryParams = (url = window.location.search) => {
    const params = new URLSearchParams(url);
    const result = {};
    for (const [key, value] of params) {
        result[key] = value;
    }
    return result;
};

/**
 * Build query string
 */
const buildQueryString = (params) => {
    return Object.entries(params)
        .filter(([_, v]) => v != null)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join('&');
};

// ==========================================
// UUID GENERATOR
// ==========================================

/**
 * Generate UUID v4
 */
const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

/**
 * Generate short ID
 */
const generateShortId = (length = 8) => {
    return Math.random().toString(36).substring(2, 2 + length).toUpperCase();
};

// ==========================================
// EXPORT
// ==========================================

window.LFUtils = {
    $, $$, createElement,
    debounce, throttle, ready,
    formatTime, formatFileSize, formatNumber, truncate,
    storage, db,
    getAudioContext, decodeAudioData, generateWaveform,
    isValidEmail, getPasswordStrength, sanitize,
    clamp, lerp, mapRange, randomInt, randomChoice,
    hexToRgb, rgbToHex, getDominantColor,
    EventEmitter,
    isOnline, fetchWithTimeout,
    readFileAsDataURL, readFileAsText, readFileAsArrayBuffer, downloadFile,
    parseQueryParams, buildQueryString,
    generateUUID, generateShortId
};
