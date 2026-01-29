
js_utils = '''/**
 * LYRICFLOW v1.3 - UTILITIES
 * Helper Functions & Utilities
 */

// Format utilities
const FormatUtils = {
    // Format time in seconds to MM:SS
    formatTime(seconds) {
        if (!seconds || isNaN(seconds)) return '0:00';
        
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    },

    // Format time with hours
    formatDuration(seconds) {
        if (!seconds || isNaN(seconds)) return '0:00';
        
        const hours = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hours > 0) {
            return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    },

    // Format number with commas
    formatNumber(num) {
        return num?.toString().replace(/\\B(?=(\\d{3})+(?!\\d))/g, ',');
    },

    // Format file size
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    // Format date
    formatDate(timestamp, format = 'relative') {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        if (format === 'relative') {
            const seconds = Math.floor(diff / 1000);
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);
            const days = Math.floor(hours / 24);
            const weeks = Math.floor(days / 7);
            const months = Math.floor(days / 30);
            const years = Math.floor(days / 365);

            if (seconds < 60) return 'Just now';
            if (minutes < 60) return `${minutes}m ago`;
            if (hours < 24) return `${hours}h ago`;
            if (days < 7) return `${days}d ago`;
            if (weeks < 4) return `${weeks}w ago`;
            if (months < 12) return `${months}mo ago`;
            return `${years}y ago`;
        }
        
        return date.toLocaleDateString();
    }
};

// Validation utilities
const ValidationUtils = {
    // Validate email
    isValidEmail(email) {
        return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email);
    },

    // Validate URL
    isValidURL(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    },

    // Validate audio file
    isValidAudioFile(file) {
        const validTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/flac', 'audio/aac'];
        return validTypes.includes(file.type);
    },

    // Validate image file
    isValidImageFile(file) {
        const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        return validTypes.includes(file.type);
    },

    // Sanitize string
    sanitizeString(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
};

// Storage utilities
const StorageUtils = {
    // Set with expiry
    setWithExpiry(key, value, ttl) {
        const item = {
            value,
            expiry: Date.now() + ttl
        };
        localStorage.setItem(key, JSON.stringify(item));
    },

    // Get with expiry check
    getWithExpiry(key) {
        const itemStr = localStorage.getItem(key);
        if (!itemStr) return null;
        
        const item = JSON.parse(itemStr);
        if (Date.now() > item.expiry) {
            localStorage.removeItem(key);
            return null;
        }
        return item.value;
    },

    // Get storage usage
    getStorageUsage() {
        let total = 0;
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                total += localStorage[key].length * 2; // UTF-16
            }
        }
        return total;
    },

    // Clear old items
    clearExpired() {
        for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            try {
                const item = JSON.parse(localStorage.getItem(key));
                if (item.expiry && Date.now() > item.expiry) {
                    localStorage.removeItem(key);
                }
            } catch (e) {
                // Not JSON, skip
            }
        }
    }
};

// Audio utilities
const AudioUtils = {
    // Get audio duration from file
    async getAudioDuration(file) {
        return new Promise((resolve) => {
            const audio = new Audio();
            audio.preload = 'metadata';
            
            audio.onloadedmetadata = () => {
                URL.revokeObjectURL(audio.src);
                resolve(audio.duration);
            };
            
            audio.onerror = () => {
                resolve(0);
            };
            
            audio.src = URL.createObjectURL(file);
        });
    },

    // Extract audio metadata
    async extractMetadata(file) {
        return new Promise((resolve) => {
            // Use jsmediatags if available
            if (typeof jsmediatags !== 'undefined') {
                jsmediatags.read(file, {
                    onSuccess: (tag) => {
                        resolve({
                            title: tag.tags.title,
                            artist: tag.tags.artist,
                            album: tag.tags.album,
                            year: tag.tags.year,
                            genre: tag.tags.genre,
                            picture: tag.tags.picture
                        });
                    },
                    onError: () => {
                        resolve({});
                    }
                });
            } else {
                resolve({});
            }
        });
    },

    // Create waveform data (simplified)
    async generateWaveform(audioBuffer, samples = 100) {
        const rawData = audioBuffer.getChannelData(0);
        const blockSize = Math.floor(rawData.length / samples);
        const filteredData = [];
        
        for (let i = 0; i < samples; i++) {
            let blockStart = blockSize * i;
            let sum = 0;
            
            for (let j = 0; j < blockSize; j++) {
                sum += Math.abs(rawData[blockStart + j]);
            }
            
            filteredData.push(sum / blockSize);
        }
        
        // Normalize
        const multiplier = Math.pow(Math.max(...filteredData), -1);
        return filteredData.map(n => n * multiplier);
    }
};

// DOM utilities
const DOMUtils = {
    // Create element with attributes
    createElement(tag, attrs = {}, children = []) {
        const el = document.createElement(tag);
        
        Object.entries(attrs).forEach(([key, value]) => {
            if (key === 'className') {
                el.className = value;
            } else if (key === 'dataset') {
                Object.entries(value).forEach(([k, v]) => {
                    el.dataset[k] = v;
                });
            } else if (key.startsWith('on') && typeof value === 'function') {
                el.addEventListener(key.slice(2).toLowerCase(), value);
            } else {
                el.setAttribute(key, value);
            }
        });
        
        children.forEach(child => {
            if (typeof child === 'string') {
                el.appendChild(document.createTextNode(child));
            } else {
                el.appendChild(child);
            }
        });
        
        return el;
    },

    // Debounce function
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Throttle function
    throttle(func, limit) {
        let inThrottle;
        return function executedFunction(...args) {
            if (!inThrottle) {
                func(...args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    // Intersection Observer helper
    observeIntersection(element, callback, options = {}) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                callback(entry.isIntersecting, entry);
            });
        }, options);
        
        observer.observe(element);
        return observer;
    },

    // Smooth scroll to element
    scrollTo(element, offset = 0) {
        const top = element.getBoundingClientRect().top + window.pageYOffset - offset;
        window.scrollTo({ top, behavior: 'smooth' });
    }
};

// Color utilities
const ColorUtils = {
    // Convert hex to rgb
    hexToRgb(hex) {
        const result = /^#?([a-f\\d]{2})([a-f\\d]{2})([a-f\\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    },

    // Convert rgb to hex
    rgbToHex(r, g, b) {
        return '#' + [r, g, b].map(x => {
            const hex = x.toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('');
    },

    // Adjust brightness
    adjustBrightness(hex, percent) {
        const rgb = this.hexToRgb(hex);
        if (!rgb) return hex;
        
        const r = Math.min(255, Math.max(0, rgb.r + (rgb.r * percent / 100)));
        const g = Math.min(255, Math.max(0, rgb.g + (rgb.g * percent / 100)));
        const b = Math.min(255, Math.max(0, rgb.b + (rgb.b * percent / 100)));
        
        return this.rgbToHex(Math.round(r), Math.round(g), Math.round(b));
    },

    // Get contrast color (black or white)
    getContrastColor(hex) {
        const rgb = this.hexToRgb(hex);
        if (!rgb) return '#000000';
        
        const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
        return brightness > 128 ? '#000000' : '#ffffff';
    },

    // Generate gradient
    generateGradient(color1, color2, angle = 135) {
        return `linear-gradient(${angle}deg, ${color1}, ${color2})`;
    }
};

// Performance utilities
const PerformanceUtils = {
    // Measure function execution time
    measure(fn, ...args) {
        const start = performance.now();
        const result = fn(...args);
        const end = performance.now();
        console.log(`${fn.name} took ${end - start}ms`);
        return result;
    },

    // RAF throttle
    rafThrottle(callback) {
        let ticking = false;
        return function(...args) {
            if (!ticking) {
                requestAnimationFrame(() => {
                    callback.apply(this, args);
                    ticking = false;
                });
                ticking = true;
            }
        };
    },

    // Lazy load images
    lazyLoadImages(selector = 'img[data-src]') {
        const images = document.querySelectorAll(selector);
        
        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                    imageObserver.unobserve(img);
                }
            });
        });
        
        images.forEach(img => imageObserver.observe(img));
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        FormatUtils,
        ValidationUtils,
        StorageUtils,
        AudioUtils,
        DOMUtils,
        ColorUtils,
        PerformanceUtils
    };
}
