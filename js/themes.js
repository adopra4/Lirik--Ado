
 * LYRICFLOW v1.3 - THEME MANAGER
 * Dynamic Theme Switching & Customization
 */

class ThemeManager {
    constructor(app) {
        this.app = app;
        this.currentTheme = 'dark';
        this.themes = {
            dark: {
                name: 'Dark',
                icon: 'fa-moon',
                colors: {
                    bgPrimary: '#0a0a0f',
                    bgSecondary: '#12121a',
                    bgTertiary: '#1a1a25',
                    textPrimary: '#ffffff',
                    textSecondary: '#a1a1aa'
                }
            },
            light: {
                name: 'Light',
                icon: 'fa-sun',
                colors: {
                    bgPrimary: '#ffffff',
                    bgSecondary: '#f4f4f5',
                    bgTertiary: '#e4e4e7',
                    textPrimary: '#18181b',
                    textSecondary: '#71717a'
                }
            },
            neon: {
                name: 'Neon',
                icon: 'fa-bolt',
                colors: {
                    bgPrimary: '#0a0a0f',
                    bgSecondary: '#0f0f1a',
                    bgTertiary: '#1a0a2e',
                    textPrimary: '#00ff9d',
                    textSecondary: '#ff00ff'
                }
            },
            ocean: {
                name: 'Ocean',
                icon: 'fa-water',
                colors: {
                    bgPrimary: '#0c1e3e',
                    bgSecondary: '#0f2744',
                    bgTertiary: '#163055',
                    textPrimary: '#e0f2fe',
                    textSecondary: '#7dd3fc'
                }
            },
            minimal: {
                name: 'Minimal',
                icon: 'fa-circle',
                colors: {
                    bgPrimary: '#fafafa',
                    bgSecondary: '#ffffff',
                    bgTertiary: '#f3f4f6',
                    textPrimary: '#111827',
                    textSecondary: '#6b7280'
                }
            }
        };
        
        this.customThemes = this.loadCustomThemes();
        this.init();
    }

    init() {
        this.applyTheme(this.app.settings.theme || 'dark');
        this.setupThemeToggle();
    }

    setupThemeToggle() {
        const toggle = document.getElementById('theme-toggle');
        if (toggle) {
            toggle.addEventListener('click', () => {
                this.showThemeSelector();
            });
        }
    }

    applyTheme(themeName) {
        const theme = this.themes[themeName] || this.customThemes[themeName];
        if (!theme) return;

        this.currentTheme = themeName;
        
        // Update CSS variables
        const root = document.documentElement;
        if (theme.colors) {
            Object.entries(theme.colors).forEach(([key, value]) => {
                const cssVar = '--' + key.replace(/[A-Z]/g, m => '-' + m.toLowerCase());
                root.style.setProperty(cssVar, value);
            });
        }

        // Update body class
        document.body.className = themeName + '-theme';

        // Update meta theme-color
        const metaTheme = document.querySelector('meta[name="theme-color"]');
        if (metaTheme && theme.colors?.bgPrimary) {
            metaTheme.setAttribute('content', theme.colors.bgPrimary);
        }

        // Update icon
        const icon = document.querySelector('#theme-toggle i');
        if (icon && theme.icon) {
            icon.className = `fas ${theme.icon}`;
        }

        // Save preference
        this.app.settings.theme = themeName;
        this.app.saveSettings();

        // Dispatch event
        window.dispatchEvent(new CustomEvent('themechange', { detail: themeName }));
    }

    showThemeSelector() {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        
        const allThemes = { ...this.themes, ...this.customThemes };
        
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h2>Choose Theme</h2>
                    <button class="modal-close"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body">
                    <div class="theme-grid">
                        ${Object.entries(allThemes).map(([key, theme]) => `
                            <div class="theme-card ${this.currentTheme === key ? 'active' : ''}" data-theme="${key}">
                                <div class="theme-preview" style="background: ${theme.colors?.bgPrimary || '#000'}">
                                    <div class="theme-preview-accent" style="background: linear-gradient(135deg, var(--primary), var(--accent-purple))"></div>
                                </div>
                                <span class="theme-name">${theme.name}</span>
                                ${this.currentTheme === key ? '<i class="fas fa-check theme-check"></i>' : ''}
                            </div>
                        `).join('')}
                    </div>
                    
                    ${this.app.isDeveloper() ? `
                        <div class="custom-theme-section">
                            <h3>Custom Theme</h3>
                            <button class="btn btn-secondary" id="create-custom-theme">
                                <i class="fas fa-plus"></i>
                                Create Custom Theme
                            </button>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Event listeners
        modal.querySelector('.modal-close').addEventListener('click', () => {
            modal.remove();
        });

        modal.querySelectorAll('.theme-card').forEach(card => {
            card.addEventListener('click', () => {
                const themeName = card.dataset.theme;
                this.applyTheme(themeName);
                modal.remove();
                this.app.showToast(`Theme changed to ${allThemes[themeName].name}`, 'info');
            });
        });

        modal.querySelector('#create-custom-theme')?.addEventListener('click', () => {
            modal.remove();
            this.showCustomThemeEditor();
        });
    }

    showCustomThemeEditor(themeToEdit = null) {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        
        const isEditing = themeToEdit !== null;
        const theme = isEditing ? this.customThemes[themeToEdit] : { name: '', colors: {} };
        
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h2>${isEditing ? 'Edit' : 'Create'} Custom Theme</h2>
                    <button class="modal-close"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>Theme Name</label>
                        <input type="text" id="custom-theme-name" value="${theme.name}" placeholder="My Theme">
                    </div>
                    
                    <div class="color-picker-grid">
                        ${Object.entries(this.themes.dark.colors).map(([key, defaultValue]) => `
                            <div class="form-group">
                                <label>${this.formatColorLabel(key)}</label>
                                <div class="color-input-wrapper">
                                    <input type="color" 
                                           class="color-picker" 
                                           data-color="${key}" 
                                           value="${theme.colors?.[key] || defaultValue}">
                                    <input type="text" 
                                           class="color-text" 
                                           value="${theme.colors?.[key] || defaultValue}">
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    
                    <div class="theme-preview-live">
                        <h4>Preview</h4>
                        <div class="preview-box" id="theme-preview-box">
                            <div class="preview-content">
                                <span class="preview-title">Sample Text</span>
                                <span class="preview-subtitle">Secondary text</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" id="cancel-custom-theme">Cancel</button>
                    <button class="btn btn-primary" id="save-custom-theme">
                        ${isEditing ? 'Update' : 'Create'} Theme
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Setup color pickers
        const updatePreview = () => {
            const box = modal.querySelector('#theme-preview-box');
            const colors = {};
            
            modal.querySelectorAll('.color-picker').forEach(picker => {
                const key = picker.dataset.color;
                colors[key] = picker.value;
                modal.querySelector(`[data-color="${key}"].color-text`).value = picker.value;
            });
            
            if (box) {
                box.style.background = colors.bgPrimary;
                box.querySelector('.preview-title').style.color = colors.textPrimary;
                box.querySelector('.preview-subtitle').style.color = colors.textSecondary;
            }
        };

        modal.querySelectorAll('.color-picker').forEach(picker => {
            picker.addEventListener('input', updatePreview);
        });

        modal.querySelectorAll('.color-text').forEach(text => {
            text.addEventListener('change', (e) => {
                const picker = modal.querySelector(`[data-color="${e.target.dataset.color}"].color-picker`);
                if (picker) {
                    picker.value = e.target.value;
                    updatePreview();
                }
            });
        });

        // Event listeners
        modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
        modal.querySelector('#cancel-custom-theme').addEventListener('click', () => modal.remove());
        
        modal.querySelector('#save-custom-theme').addEventListener('click', () => {
            const name = modal.querySelector('#custom-theme-name').value;
            if (!name) {
                this.app.showToast('Please enter a theme name', 'warning');
                return;
            }

            const colors = {};
            modal.querySelectorAll('.color-picker').forEach(picker => {
                colors[picker.dataset.color] = picker.value;
            });

            const themeId = isEditing ? themeToEdit : 'custom-' + Date.now();
            this.customThemes[themeId] = {
                name,
                icon: 'fa-palette',
                colors
            };

            this.saveCustomThemes();
            this.applyTheme(themeId);
            modal.remove();
            this.app.showToast('Custom theme saved!', 'success');
        });

        updatePreview();
    }

    formatColorLabel(key) {
        return key
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .replace('bg', 'Background')
            .replace('text', 'Text');
    }

    loadCustomThemes() {
        const stored = localStorage.getItem('lyricflow_custom_themes');
        return stored ? JSON.parse(stored) : {};
    }

    saveCustomThemes() {
        localStorage.setItem('lyricflow_custom_themes', JSON.stringify(this.customThemes));
    }

    deleteCustomTheme(themeId) {
        delete this.customThemes[themeId];
        this.saveCustomThemes();
        
        if (this.currentTheme === themeId) {
            this.applyTheme('dark');
        }
    }

    // Dynamic color adjustment
    adjustBrightness(color, amount) {
        const hex = color.replace('#', '');
        const r = Math.min(255, Math.max(0, parseInt(hex.substr(0, 2), 16) + amount));
        const g = Math.min(255, Math.max(0, parseInt(hex.substr(2, 2), 16) + amount));
        const b = Math.min(255, Math.max(0, parseInt(hex.substr(4, 2), 16) + amount));
        
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }

    // Auto theme based on time
    enableAutoTheme() {
        const hour = new Date().getHours();
        const isDark = hour < 6 || hour >= 18;
        this.applyTheme(isDark ? 'dark' : 'light');
    }

    // System preference sync
    syncWithSystem() {
        if (window.matchMedia) {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            
            const handleChange = (e) => {
                this.applyTheme(e.matches ? 'dark' : 'light');
            };
            
            mediaQuery.addEventListener('change', handleChange);
            handleChange(mediaQuery);
        }
    }
}