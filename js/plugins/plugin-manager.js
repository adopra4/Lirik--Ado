/**
 * LYRICFLOW v1.3 - PLUGIN MANAGER
 * Plugin system for extensibility
 */

const LFPluginManager = {
    plugins: new Map(),
    hooks: new Map(),
    api: null,
    
    init() {
        this.api = this.createAPI();
        this.loadBuiltInPlugins();
        this.loadUserPlugins();
        
        console.log('Plugin manager initialized');
    },
    
    createAPI() {
        return {
            // Core access
            LyricFlow,
            Player: LFPlayer,
            Lyrics: LFLyrics,
            Library: LFLibrary,
            UI: LFUI,
            
            // Utilities
            Utils: LFUtils,
            storage: LFUtils.storage,
            
            // Registration
            registerHook: (name, callback) => this.registerHook(name, callback),
            unregisterHook: (name, callback) => this.unregisterHook(name, callback),
            
            // UI components
            addMenuItem: (menu, item) => this.addMenuItem(menu, item),
            addSettingsPanel: (panel) => this.addSettingsPanel(panel),
            addVisualizer: (renderer) => this.addVisualizer(renderer),
            
            // Events
            on: (event, callback) => LyricFlow.events.on(event, callback),
            emit: (event, data) => LyricFlow.events.emit(event, data),
            
            // Audio processing
            addAudioNode: (node) => this.addAudioNode(node),
            
            // Storage
            getData: (key) => this.getPluginData(key),
            setData: (key, value) => this.setPluginData(key, value)
        };
    },
    
    // Plugin registration
    
    register(id, plugin) {
        if (this.plugins.has(id)) {
            console.warn(`Plugin ${id} already registered`);
            return false;
        }
        
        // Validate plugin structure
        if (!plugin.name || !plugin.version) {
            console.error('Plugin must have name and version');
            return false;
        }
        
        const pluginInstance = {
            id,
            name: plugin.name,
            version: plugin.version,
            description: plugin.description || '',
            author: plugin.author || 'Unknown',
            enabled: false,
            instance: null,
            hooks: [],
            sandbox: null
        };
        
        this.plugins.set(id, pluginInstance);
        
        // Auto-enable if specified
        if (plugin.autoEnable) {
            this.enable(id);
        }
        
        return true;
    },
    
    unregister(id) {
        const plugin = this.plugins.get(id);
        if (!plugin) return false;
        
        if (plugin.enabled) {
            this.disable(id);
        }
        
        this.plugins.delete(id);
        return true;
    },
    
    enable(id) {
        const plugin = this.plugins.get(id);
        if (!plugin || plugin.enabled) return false;
        
        try {
            // Create sandbox
            plugin.sandbox = this.createSandbox(plugin);
            
            // Initialize plugin
            if (plugin.instance?.init) {
                plugin.instance.init(this.api);
            }
            
            plugin.enabled = true;
            this.executeHook('pluginEnabled', { plugin: id });
            
            console.log(`Plugin enabled: ${plugin.name}`);
            return true;
            
        } catch (e) {
            console.error(`Failed to enable plugin ${id}:`, e);
            return false;
        }
    },
    
    disable(id) {
        const plugin = this.plugins.get(id);
        if (!plugin || !plugin.enabled) return false;
        
        try {
            // Cleanup
            if (plugin.instance?.destroy) {
                plugin.instance.destroy();
            }
            
            // Unregister hooks
            plugin.hooks.forEach(hook => {
                this.unregisterHook(hook.name, hook.callback);
            });
            
            plugin.enabled = false;
            plugin.sandbox = null;
            
            this.executeHook('pluginDisabled', { plugin: id });
            
            console.log(`Plugin disabled: ${plugin.name}`);
            return true;
            
        } catch (e) {
            console.error(`Failed to disable plugin ${id}:`, e);
            return false;
        }
    },
    
    createSandbox(plugin) {
        // Create restricted execution environment
        const allowedGlobals = ['console', 'Math', 'Date', 'JSON', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'];
        
        const sandbox = {};
        allowedGlobals.forEach(g => {
            sandbox[g] = window[g];
        });
        
        // Add plugin API
        sandbox.LF = this.api;
        
        return sandbox;
    },
    
    // Hook system
    
    registerHook(name, callback, priority = 10) {
        if (!this.hooks.has(name)) {
            this.hooks.set(name, []);
        }
        
        const hooks = this.hooks.get(name);
        hooks.push({ callback, priority });
        hooks.sort((a, b) => a.priority - b.priority);
        
        return () => this.unregisterHook(name, callback);
    },
    
    unregisterHook(name, callback) {
        const hooks = this.hooks.get(name);
        if (!hooks) return;
        
        const index = hooks.findIndex(h => h.callback === callback);
        if (index >= 0) {
            hooks.splice(index, 1);
        }
    },
    
    executeHook(name, data = {}) {
        const hooks = this.hooks.get(name) || [];
        let result = data;
        
        for (const hook of hooks) {
            try {
                const hookResult = hook.callback(result);
                if (hookResult !== undefined) {
                    result = hookResult;
                }
            } catch (e) {
                console.error(`Hook error in ${name}:`, e);
            }
        }
        
        return result;
    },
    
    // Built-in plugins
    
    loadBuiltInPlugins() {
        // Lyrics translation plugin
        this.register('lyrics-translation', {
            name: 'Lyrics Translation',
            version: '1.0.0',
            description: 'Translate lyrics to other languages',
            autoEnable: true,
            init(api) {
                api.addMenuItem('lyrics', {
                    label: 'Translate',
                    action: () => LFLyrics.toggleTranslation()
                });
            }
        });
        
        // Discord RPC plugin
        this.register('discord-rpc', {
            name: 'Discord Rich Presence',
            version: '1.0.0',
            description: 'Show current song in Discord',
            init(api) {
                api.on('play', (song) => {
                    // Update Discord RPC
                    this.updatePresence(song);
                });
            },
            updatePresence(song) {
                // Implementation would use Discord SDK
                console.log('Discord RPC:', song.title);
            }
        });
        
        // Last.fm scrobbler
        this.register('lastfm', {
            name: 'Last.fm Scrobbler',
            version: '1.0.0',
            description: 'Scrobble plays to Last.fm',
            init(api) {
                api.on('play', (song) => {
                    this.scrobble(song);
                });
            },
            scrobble(song) {
                // Implementation would use Last.fm API
                console.log('Scrobble:', song.title);
            }
        });
    },
    
    loadUserPlugins() {
        // Load from storage
        const saved = LFUtils.storage.get('lf_plugins') || [];
        
        saved.forEach(pluginData => {
            try {
                // Validate and load plugin
                const plugin = this.validatePlugin(pluginData);
                if (plugin) {
                    this.register(pluginData.id, plugin);
                }
            } catch (e) {
                console.error('Failed to load user plugin:', e);
            }
        });
    },
    
    validatePlugin(data) {
        // Security validation
        if (!data.name || !data.version) return null;
        
        // Check for dangerous patterns
        const dangerous = ['eval', 'Function', 'document.write', 'innerHTML'];
        const code = data.code || '';
        
        for (const pattern of dangerous) {
            if (code.includes(pattern)) {
                console.warn(`Plugin ${data.name} contains dangerous pattern: ${pattern}`);
                return null;
            }
        }
        
        return data;
    },
    
    // UI integration
    
    addMenuItem(menu, item) {
        const container = $(`#menu-${menu}`);
        if (!container) return;
        
        const el = LFUtils.createElement('button', {
            className: 'menu-item',
            onclick: item.action
        }, item.label);
        
        container.appendChild(el);
    },
    
    addSettingsPanel(panel) {
        const container = $('#plugin-settings');
        if (!container) return;
        
        const el = LFUtils.createElement('div', {
            className: 'settings-panel'
        },
            LFUtils.createElement('h3', {}, panel.title),
            panel.content
        );
        
        container.appendChild(el);
    },
    
    addVisualizer(renderer) {
        LFVisualizer.addCustomRenderer(renderer);
    },
    
    addAudioNode(node) {
        // Add to audio processing chain
        if (LFPlayer.gainNode) {
            LFPlayer.gainNode.connect(node);
        }
    },
    
    // Data persistence
    
    getPluginData(key) {
        const data = LFUtils.storage.get('lf_plugin_data') || {};
        return data[key];
    },
    
    setPluginData(key, value) {
        const data = LFUtils.storage.get('lf_plugin_data') || {};
        data[key] = value;
        LFUtils.storage.set('lf_plugin_data', data);
    },
    
    // Getters
    
    getPlugin(id) {
        return this.plugins.get(id);
    },
    
    getAllPlugins() {
        return Array.from(this.plugins.values());
    },
    
    getEnabledPlugins() {
        return this.getAllPlugins().filter(p => p.enabled);
    }
};
