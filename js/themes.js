/**
 * THEME MANAGER v1.2
 * Dynamic Theme Switching
 */

App.themes = {
    current: 'dark',
    available: ['dark', 'light', 'neon', 'minimal'],

    init() {
        this.current = App.config.theme || 'dark';
        this.apply(this.current);
    },

    set(themeName) {
        if (!this.available.includes(themeName)) {
            console.warn(`Theme ${themeName} not available`);
            return;
        }
        
        this.current = themeName;
        App.config.theme = themeName;
        App.saveConfig();
        
        this.apply(themeName);
        
        // Update select
        const select = document.getElementById('themeSelect');
        if (select) select.value = themeName;
        
        App.toast.show(`Theme changed to ${themeName}`, 'success');
    },

    apply(themeName) {
        document.documentElement.setAttribute('data-theme', themeName);
        
        // Update theme stylesheet
        const link = document.getElementById('themeStylesheet');
        if (link) {
            link.href = `css/themes/${themeName}.css`;
        }
        
        // Emit event for plugins
        App.plugins.emit('themeChange', themeName);
    },

    toggle() {
        const currentIndex = this.available.indexOf(this.current);
        const nextIndex = (currentIndex + 1) % this.available.length;
        this.set(this.available[nextIndex]);
    },

    // Custom theme creation
    create(name, colors) {
        const css = `
[data-theme="${name}"] {
    --bg-primary: ${colors.bgPrimary};
    --bg-secondary: ${colors.bgSecondary};
    --bg-elevated: ${colors.bgElevated};
    --text-primary: ${colors.textPrimary};
    --text-secondary: ${colors.textSecondary};
    --accent-primary: ${colors.accent};
}
        `;
        
        // Inject or save
        const style = document.createElement('style');
        style.textContent = css;
        document.head.appendChild(style);
        
        this.available.push(name);
        this.set(name);
    }
};
