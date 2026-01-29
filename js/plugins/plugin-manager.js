/**
 * PLUGIN MANAGER v1.2
 * Extensible Plugin Architecture
 */

App.plugins = {
    registry: new Map(),
    hooks: {},

    init() {
        // Load built-in plugins
        this.loadBuiltins();
        
        // Load external plugins from localStorage
        this.loadStored();
    },

    loadBuiltins() {
        // Example built-in plugin: Sleep Timer Quick Access
        this.register('sleepTimer', {
            name: 'Sleep Timer',
            version: '1.0',
            init() {
                // Add quick access button
                const btn = document.createElement('button');
                btn.textContent = '⏱️';
                btn.title = 'Sleep Timer (Ctrl+T)';
                btn.onclick = () => {
                    const mins = prompt('Set sleep timer (minutes):', '30');
                    if (mins) App.player.setSleepTimer(parseInt(mins));
                };
                document.querySelector('.top-actions').appendChild(btn);
            }
        });
    },

    register(id, plugin) {
        if (this.registry.has(id)) {
            console.warn(`Plugin ${id} already registered`);
            return;
        }
        
        plugin.id = id;
        this.registry.set(id, plugin);
        
        if (plugin.init) {
            try {
                plugin.init();
                console.log(`✅ Plugin loaded: ${plugin.name}`);
            } catch (err) {
                console.error(`❌ Plugin failed: ${plugin.name}`, err);
            }
        }
        
        this.updateUI();
    },

    unregister(id) {
        const plugin = this.registry.get(id);
        if (plugin && plugin.destroy) {
            plugin.destroy();
        }
        this.registry.delete(id);
        this.updateUI();
    },

    load() {
        // Load from file input
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.js';
        input.onchange = (e) => {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    // Sandbox evaluation
                    const pluginCode = event.target.result;
                    const pluginFunc = new Function('app', 'return ' + pluginCode);
                    const plugin = pluginFunc(App);
                    
                    this.register(plugin.id || `plugin_${Date.now()}`, plugin);
                    
                    // Store in localStorage
                    const stored = JSON.parse(localStorage.getItem('lf_plugins') || '[]');
                    stored.push({ id: plugin.id, code: pluginCode });
                    localStorage.setItem('lf_plugins', JSON.stringify(stored));
                    
                    App.toast.show(`Plugin "${plugin.name}" loaded!`, 'success');
                } catch (err) {
                    App.toast.show('Invalid plugin file', 'error');
                }
            };
            reader.readAsText(file);
        };
        input.click();
    },

    loadStored() {
        const stored = JSON.parse(localStorage.getItem('lf_plugins') || '[]');
        stored.forEach(({ code }) => {
            try {
                const pluginFunc = new Function('app', 'return ' + code);
                const plugin = pluginFunc(App);
                this.register(plugin.id, plugin);
            } catch (err) {
                console.error('Failed to load stored plugin:', err);
            }
        });
    },

    emit(event, data) {
        this.registry.forEach(plugin => {
            if (plugin.onEvent) {
                plugin.onEvent(event, data);
            }
        });
    },

    updateUI() {
        const container = document.getElementById('pluginsList');
        if (!container) return;
        
        if (this.registry.size === 0) {
            container.innerHTML = '<p>No plugins installed</p>';
            return;
        }
        
        container.innerHTML = Array.from(this.registry.values()).map(plugin => `
            <div class="plugin-item">
                <div>
                    <strong>${plugin.name}</strong>
                    <span>v${plugin.version || '1.0'}</span>
                </div>
                <button onclick="app.plugins.unregister('${plugin.id}')">Remove</button>
            </div>
        `).join('');
    }
};
