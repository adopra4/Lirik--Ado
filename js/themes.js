/**
 * LYRICFLOW v1.3 - THEMES MODULE
 * Theme management and customization
 */

const LFThemes = {
    currentTheme: 'dark',
    customThemes: [],
    
    // Available themes
    themes: {
        dark: {
            name: 'Dark',
            description: 'Default dark theme',
            colors: {
                primary: '#ff006e',
                secondary: '#8338ec',
                accent: '#3a86ff'
            }
        },
        light: {
            name: 'Light',
            description: 'Clean light theme',
            colors: {
                primary: '#e6005c',
                secondary: '#7020e0',
                accent: '#2563eb'
            }
        },
        neon: {
            name: 'Neon',
            description: 'Cyberpunk neon glow',
            colors: {
                primary: '#ff00ff',
                secondary: '#00ffff',
                accent: '#39ff14'
            }
        },
        minimal: {
            name: 'Minimal',
            description: 'Clean and simple',
            colors: {
                primary: '#2563eb',
                secondary: '#64748b',
                accent: '#60a5fa'
            }
        },
        ocean: {
            name: 'Ocean',
            description: 'Deep sea vibes',
            colors: {
                primary: '#0ea5e9',
                secondary: '#6366f1',
                accent: '#f43f5e'
            }
        }
    },
    
    init() {
        this.loadCustomThemes();
        this.setupEventListeners();
        
        // Apply saved theme
        const saved = LFUtils.storage.get('lf_theme') || 'dark';
        this.applyTheme(saved);
        
        console.log('Themes module initialized');
    },
    
    setupEventListeners() {
        // System theme change
        if (window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                if (!LFUtils.storage.get('lf_theme_manual')) {
                    this.applyTheme(e.matches ? 'dark' : 'light');
                }
            });
        }
    },
    
    applyTheme(themeName) {
        if (!this.themes[themeName] && !this.getCustomTheme(themeName)) {
            console.warn('Unknown theme:', themeName);
            return;
        }
        
        this.currentTheme = themeName;
        document.documentElement.setAttribute('data-theme', themeName);
        
        // Update CSS variables
        const theme = this.themes[themeName] || this.getCustomTheme(themeName);
        if (theme.colors) {
            this.applyColors(theme.colors);
        }
        
        // Save preference
        LFUtils.storage.set('lf_theme', themeName);
        LFUtils.storage.set('lf_theme_manual', true);
        
        // Emit event
        LyricFlow.events.emit('themeChanged', themeName);
        
        // Update meta theme-color
        const metaTheme = document.querySelector('meta[name="theme-color"]');
        if (metaTheme && theme.colors) {
            metaTheme.content = theme.colors.primary;
        }
    },
    
    applyColors(colors) {
        const root = document.documentElement;
        
        if (colors.primary) {
            root.style.setProperty('--primary', colors.primary);
            const rgb = this.hexToRgb(colors.primary);
            root.style.setProperty('--primary-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
        }
        
        if (colors.secondary) {
            root.style.setProperty('--secondary', colors.secondary);
            const rgb = this.hexToRgb(colors.secondary);
            root.style.setProperty('--secondary-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
        }
        
        if (colors.accent) {
            root.style.setProperty('--accent', colors.accent);
            const rgb = this.hexToRgb(colors.accent);
            root.style.setProperty('--accent-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
        }
    },
    
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
    },
    
    rgbToHex(r, g, b) {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    },
    
    // Custom themes
    createCustomTheme(name, colors) {
        const theme = {
            id: 'custom_' + Date.now(),
            name,
            colors,
            isCustom: true
        };
        
        this.customThemes.push(theme);
        this.saveCustomThemes();
        
        return theme;
    },
    
    getCustomTheme(id) {
        return this.customThemes.find(t => t.id === id);
    },
    
    deleteCustomTheme(id) {
        this.customThemes = this.customThemes.filter(t => t.id !== id);
        this.saveCustomThemes();
    },
    
    loadCustomThemes() {
        const saved = LFUtils.storage.get('lf_custom_themes') || [];
        this.customThemes = saved;
    },
    
    saveCustomThemes() {
        LFUtils.storage.set('lf_custom_themes', this.customThemes);
    },
    
    // Dynamic background based on album art
    async extractThemeFromImage(imageUrl) {
        try {
            const color = await LFUtils.getDominantColor(imageUrl);
            
            // Generate palette
            const rgb = this.hexToRgb(color);
            const hsl = this.rgbToHsl(rgb.r, rgb.g, rgb.b);
            
            return {
                primary: color,
                secondary: this.hslToHex((hsl.h + 30) % 360, hsl.s, hsl.l),
                accent: this.hslToHex((hsl.h + 60) % 360, hsl.s, hsl.l)
            };
        } catch (e) {
            console.error('Failed to extract theme:', e);
            return null;
        }
    },
    
    rgbToHsl(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;

        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }

        return { h: h * 360, s: s * 100, l: l * 100 };
    },
    
    hslToHex(h, s, l) {
        l /= 100;
        const a = s * Math.min(l, 1 - l) / 100;
        const f = n => {
            const k = (n + h / 30) % 12;
            const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
            return Math.round(255 * color).toString(16).padStart(2, '0');
        };
        return `#${f(0)}${f(8)}${f(4)}`;
    },
    
    // Auto theme based on time
    enableAutoTheme() {
        const hour = new Date().getHours();
        const isDay = hour >= 6 && hour < 18;
        this.applyTheme(isDay ? 'light' : 'dark');
        
        // Set up next check
        const nextHour = new Date();
        nextHour.setHours(hour + 1, 0, 0, 0);
        const msUntilNext = nextHour - new Date();
        
        setTimeout(() => this.enableAutoTheme(), msUntilNext);
    }
};
