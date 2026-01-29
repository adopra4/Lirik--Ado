/**
 * LYRICFLOW v1.3 - UI MODULE
 * User interface interactions and components
 */

const LFUI = {
    components: {},
    tooltips: [],
    modals: [],
    
    init() {
        this.setupGlobalEvents();
        this.setupTooltips();
        this.setupContextMenu();
        this.setupSearch();
        this.setupDragAndDrop();
        this.initComponents();
        
        console.log('UI module initialized');
    },
    
    setupGlobalEvents() {
        // Prevent default drag behaviors
        document.addEventListener('dragover', (e) => {
            if (e.dataTransfer.types.includes('Files')) {
                e.preventDefault();
            }
        });
        
        // Keyboard shortcuts help
        document.addEventListener('keydown', (e) => {
            if (e.key === '?' && !e.target.matches('input, textarea')) {
                e.preventDefault();
                this.showShortcutsHelp();
            }
        });
        
        // Resize handler
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.handleResize();
            }, 250);
        });
    },
    
    setupTooltips() {
        const tooltip = LFUtils.createElement('div', {
            className: 'tooltip',
            style: 'position: fixed; background: var(--bg-elevated); color: var(--text-primary); padding: 0.5rem 0.75rem; border-radius: 0.5rem; font-size: 0.875rem; pointer-events: none; opacity: 0; transition: opacity 0.2s; z-index: 1000; white-space: nowrap;'
        });
        document.body.appendChild(tooltip);
        
        document.addEventListener('mouseover', (e) => {
            const trigger = e.target.closest('[data-tooltip]');
            if (!trigger) {
                tooltip.style.opacity = '0';
                return;
            }
            
            const text = trigger.dataset.tooltip;
            tooltip.textContent = text;
            tooltip.style.opacity = '1';
            
            const rect = trigger.getBoundingClientRect();
            const tooltipRect = tooltip.getBoundingClientRect();
            
            let top = rect.top - tooltipRect.height - 8;
            let left = rect.left + (rect.width - tooltipRect.width) / 2;
            
            // Keep in viewport
            if (top < 0) top = rect.bottom + 8;
            if (left < 0) left = 8;
            if (left + tooltipRect.width > window.innerWidth) {
                left = window.innerWidth - tooltipRect.width - 8;
            }
            
            tooltip.style.top = `${top}px`;
            tooltip.style.left = `${left}px`;
        });
    },
    
    setupContextMenu() {
        const menu = $('#context-menu');
        if (!menu) return;
        
        let currentTarget = null;
        
        document.addEventListener('contextmenu', (e) => {
            const target = e.target.closest('[data-context-menu]');
            if (!target) {
                menu.classList.remove('active');
                return;
            }
            
            e.preventDefault();
            currentTarget = target;
            
            // Update menu items based on context
            this.updateContextMenu(target.dataset.contextMenu, target);
            
            // Position menu
            let x = e.clientX;
            let y = e.clientY;
            
            const menuRect = menu.getBoundingClientRect();
            
            if (x + menuRect.width > window.innerWidth) {
                x = window.innerWidth - menuRect.width - 8;
            }
            if (y + menuRect.height > window.innerHeight) {
                y = window.innerHeight - menuRect.height - 8;
            }
            
            menu.style.left = `${x}px`;
            menu.style.top = `${y}px`;
            menu.classList.add('active');
        });
        
        document.addEventListener('click', () => {
            menu.classList.remove('active');
        });
        
        // Handle menu actions
        menu.addEventListener('click', (e) => {
            const item = e.target.closest('.context-item');
            if (!item || !currentTarget) return;
            
            const action = item.dataset.action;
            this.handleContextAction(action, currentTarget);
        });
    },
    
    updateContextMenu(type, target) {
        const menu = $('#context-menu .context-list');
        const actions = {
            song: ['play', 'add-queue', 'add-playlist', 'edit-lyrics', 'share', 'delete'],
            playlist: ['play', 'edit', 'share', 'delete'],
            queue: ['remove', 'move-top', 'move-up', 'move-down']
        };
        
        const typeActions = actions[type] || [];
        
        menu.innerHTML = typeActions.map(action => {
            const labels = {
                play: 'Play',
                'add-queue': 'Add to Queue',
                'add-playlist': 'Add to Playlist',
                'edit-lyrics': 'Edit Lyrics',
                share: 'Share',
                delete: 'Delete',
                remove: 'Remove from Queue',
                'move-top': 'Move to Top',
                'move-up': 'Move Up',
                'move-down': 'Move Down',
                edit: 'Edit Playlist'
            };
            
            return `<li class="context-item ${action === 'delete' ? 'danger' : ''}" data-action="${action}">${labels[action] || action}</li>`;
        }).join('');
    },
    
    handleContextAction(action, target) {
        const id = target.dataset.id;
        const song = LFLibrary.getSong(id);
        
        switch (action) {
            case 'play':
                if (song) LyricFlow.playSong(song);
                break;
            case 'add-queue':
                if (song) LyricFlow.addToQueue(song);
                break;
            case 'add-playlist':
                this.showAddToPlaylistModal(song);
                break;
            case 'edit-lyrics':
                LyricFlow.navigateTo('ai-generator');
                break;
            case 'share':
                this.shareSong(song);
                break;
            case 'delete':
                if (song) LFLibrary.deleteSong(id);
                break;
        }
    },
    
    setupSearch() {
        const searchInput = $('#global-search');
        const suggestions = $('#search-suggestions');
        
        if (!searchInput || !suggestions) return;
        
        let debounceTimer;
        
        searchInput.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            const query = e.target.value.trim();
            
            if (query.length < 2) {
                suggestions.classList.remove('active');
                return;
            }
            
            debounceTimer = setTimeout(() => {
                this.performSearch(query);
            }, 300);
        });
        
        searchInput.addEventListener('focus', () => {
            if (searchInput.value.trim().length >= 2) {
                suggestions.classList.add('active');
            }
        });
        
        // Keyboard navigation
        let selectedIndex = -1;
        
        searchInput.addEventListener('keydown', (e) => {
            const items = suggestions.querySelectorAll('.search-item');
            
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
                this.updateSearchSelection(items, selectedIndex);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                selectedIndex = Math.max(selectedIndex - 1, -1);
                this.updateSearchSelection(items, selectedIndex);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (selectedIndex >= 0 && items[selectedIndex]) {
                    items[selectedIndex].click();
                } else {
                    this.performSearch(searchInput.value, true);
                }
            }
        });
    },
    
    updateSearchSelection(items, index) {
        items.forEach((item, i) => {
            item.classList.toggle('selected', i === index);
        });
    },
    
    performSearch(query, navigate = false) {
        const suggestions = $('#search-suggestions');
        
        // Search in library
        const songs = LFLibrary.search(query).slice(0, 5);
        
        if (navigate) {
            // Full search results page
            this.renderSearchResults(query, songs);
            suggestions.classList.remove('active');
            return;
        }
        
        // Show suggestions
        if (songs.length === 0) {
            suggestions.innerHTML = '<div class="search-empty">No results found</div>';
        } else {
            suggestions.innerHTML = songs.map(song => `
                <div class="search-item" onclick="LFUI.selectSearchResult('${song.id}')">
                    <img src="${song.cover || 'assets/images/default-cover.png'}" alt="">
                    <div class="search-item-info">
                        <div class="search-item-title">${LFUtils.sanitize(song.title)}</div>
                        <div class="search-item-artist">${LFUtils.sanitize(song.artist)}</div>
                    </div>
                </div>
            `).join('');
        }
        
        suggestions.classList.add('active');
    },
    
    selectSearchResult(songId) {
        const song = LFLibrary.getSong(songId);
        if (song) {
            LyricFlow.playSong(song);
            $('#global-search').value = '';
            $('#search-suggestions').classList.remove('active');
        }
    },
    
    renderSearchResults(query, songs) {
        LyricFlow.navigateTo('search');
        const container = $('#search-results');
        
        container.innerHTML = `
            <div class="page-header">
                <h1>Search Results</h1>
                <p>${songs.length} results for "${LFUtils.sanitize(query)}"</p>
            </div>
            <div class="song-grid">
                ${songs.map(song => LFLibrary.createSongCard(song)).join('')}
            </div>
        `;
    },
    
    setupDragAndDrop() {
        // Queue reordering
        const queueList = $('#queue-list');
        if (!queueList) return;
        
        let draggedItem = null;
        
        queueList.addEventListener('dragstart', (e) => {
            draggedItem = e.target.closest('.queue-item');
            if (draggedItem) {
                draggedItem.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
            }
        });
        
        queueList.addEventListener('dragend', () => {
            if (draggedItem) {
                draggedItem.classList.remove('dragging');
                draggedItem = null;
            }
        });
        
        queueList.addEventListener('dragover', (e) => {
            e.preventDefault();
            const afterElement = this.getDragAfterElement(queueList, e.clientY);
            if (draggedItem) {
                if (afterElement) {
                    queueList.insertBefore(draggedItem, afterElement);
                } else {
                    queueList.appendChild(draggedItem);
                }
            }
        });
    },
    
    getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.queue-item:not(.dragging)')];
        
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    },
    
    initComponents() {
        // Initialize range sliders
        $$('input[type="range"]').forEach(slider => {
            this.initRangeSlider(slider);
        });
        
        // Initialize tabs
        $$('.tabs').forEach(tabs => {
            this.initTabs(tabs);
        });
        
        // Initialize accordions
        $$('.accordion').forEach(acc => {
            this.initAccordion(acc);
        });
    },
    
    initRangeSlider(slider) {
        const updateValue = () => {
            const percent = (slider.value - slider.min) / (slider.max - slider.min) * 100;
            slider.style.setProperty('--value', `${percent}%`);
        };
        
        slider.addEventListener('input', updateValue);
        updateValue();
    },
    
    initTabs(container) {
        const tabs = container.querySelectorAll('.tab');
        const panels = container.querySelectorAll('.tab-panel');
        
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const target = tab.dataset.tab;
                
                tabs.forEach(t => t.classList.remove('active'));
                panels.forEach(p => p.classList.remove('active'));
                
                tab.classList.add('active');
                container.querySelector(`[data-panel="${target}"]`)?.classList.add('active');
            });
        });
    },
    
    initAccordion(container) {
        const items = container.querySelectorAll('.accordion-item');
        
        items.forEach(item => {
            const header = item.querySelector('.accordion-header');
            
            header.addEventListener('click', () => {
                const isOpen = item.classList.contains('open');
                
                // Close others
                items.forEach(i => i.classList.remove('open'));
                
                // Toggle current
                if (!isOpen) {
                    item.classList.add('open');
                }
            });
        });
    },
    
    // Modal management
    showModal(id) {
        const modal = $(`#modal-${id}`);
        const overlay = $('#modal-overlay');
        
        if (modal && overlay) {
            overlay.classList.add('active');
            modal.classList.add('active');
            this.modals.push(id);
        }
    },
    
    hideModal(id) {
        const modal = id ? $(`#modal-${id}`) : $(`.modal.active`);
        const overlay = $('#modal-overlay');
        
        if (modal) {
            modal.classList.remove('active');
        }
        
        if (this.modals.length <= 1) {
            overlay?.classList.remove('active');
        }
        
        if (id) {
            this.modals = this.modals.filter(m => m !== id);
        } else {
            this.modals.pop();
        }
    },
    
    // Toast notifications
    toast(message, type = 'info', duration = 3000) {
        LyricFlow.showToast(message, type, duration);
    },
    
    // Share functionality
    async shareSong(song) {
        const shareData = {
            title: song.title,
            text: `Listen to ${song.title} by ${song.artist} on LyricFlow`,
            url: `${window.location.origin}/song/${song.id}`
        };
        
        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch (e) {
                // User cancelled
            }
        } else {
            // Fallback: copy to clipboard
            await navigator.clipboard.writeText(shareData.url);
            this.toast('Link copied to clipboard!', 'success');
        }
    },
    
    // Shortcuts help
    showShortcutsHelp() {
        const shortcuts = [
            { key: 'Space', action: 'Play/Pause' },
            { key: '← / →', action: 'Previous/Next song (with Ctrl)' },
            { key: '↑ / ↓', action: 'Volume up/down (with Ctrl)' },
            { key: 'M', action: 'Mute (with Ctrl)' },
            { key: 'F', action: 'Fullscreen (with Ctrl)' },
            { key: 'K', action: 'Search (with Ctrl)' },
            { key: 'L', action: 'Toggle lyrics' },
            { key: '?', action: 'Show this help' }
        ];
        
        const content = `
            <div class="shortcuts-grid">
                ${shortcuts.map(s => `
                    <div class="shortcut-item">
                        <kbd>${s.key}</kbd>
                        <span>${s.action}</span>
                    </div>
                `).join('')}
            </div>
        `;
        
        // Show in modal
        $('#modal-body-content').innerHTML = content;
        this.showModal('shortcuts');
    },
    
    handleResize() {
        // Update layout on resize
        const sidebar = $('.sidebar');
        if (window.innerWidth > 1024) {
            sidebar?.classList.remove('active');
        }
    },
    
    // Loading states
    showLoading(element, message = 'Loading...') {
        element.classList.add('is-loading');
        element.dataset.originalContent = element.innerHTML;
        element.innerHTML = `<div class="spinner"></div><span>${message}</span>`;
    },
    
    hideLoading(element) {
        element.classList.remove('is-loading');
        if (element.dataset.originalContent) {
            element.innerHTML = element.dataset.originalContent;
            delete element.dataset.originalContent;
        }
    },
    
    // Skeleton loading
    showSkeleton(container, count = 3) {
        container.innerHTML = Array(count).fill(`
            <div class="skeleton" style="height: 60px; margin-bottom: 8px; border-radius: 8px;"></div>
        `).join('');
    }
};
