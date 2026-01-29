
 * LYRICFLOW v1.3 - UI MANAGER
 * User Interface Interactions & Components
 */

class UIManager {
    constructor(app) {
        this.app = app;
        this.contextMenu = null;
        this.notifications = [];
        this.tooltips = new Map();
        
        this.init();
    }

    init() {
        this.setupContextMenu();
        this.setupNotifications();
        this.setupTooltips();
        this.setupKeyboardShortcuts();
        this.setupResponsive();
    }

    setupContextMenu() {
        this.contextMenu = document.getElementById('context-menu');
        
        // Close on outside click
        document.addEventListener('click', () => {
            this.hideContextMenu();
        });

        // Prevent closing when clicking inside menu
        if (this.contextMenu) {
            this.contextMenu.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }
    }

    showContextMenu(x, y, items) {
        if (!this.contextMenu) return;

        this.contextMenu.innerHTML = items.map(item => `
            <div class="context-menu-item" data-action="${item.action}">
                <i class="fas ${item.icon}"></i>
                <span>${item.label}</span>
            </div>
        `).join('');

        // Position menu
        const rect = this.contextMenu.getBoundingClientRect();
        let posX = x;
        let posY = y;

        // Keep within viewport
        if (posX + rect.width > window.innerWidth) {
            posX = window.innerWidth - rect.width - 10;
        }
        if (posY + rect.height > window.innerHeight) {
            posY = window.innerHeight - rect.height - 10;
        }

        this.contextMenu.style.left = posX + 'px';
        this.contextMenu.style.top = posY + 'px';
        this.contextMenu.classList.add('active');

        // Attach click handlers
        this.contextMenu.querySelectorAll('.context-menu-item').forEach(item => {
            item.addEventListener('click', () => {
                const action = item.dataset.action;
                this.handleContextAction(action);
                this.hideContextMenu();
            });
        });
    }

    hideContextMenu() {
        this.contextMenu?.classList.remove('active');
    }

    handleContextAction(action) {
        switch(action) {
            case 'play':
                this.app.player.play();
                break;
            case 'add-to-queue':
                // Add current track to queue
                break;
            case 'add-to-playlist':
                this.showPlaylistSelector();
                break;
            case 'share':
                this.shareCurrentTrack();
                break;
            case 'download':
                this.downloadCurrentTrack();
                break;
            case 'edit':
                if (this.app.isDeveloper()) {
                    this.app.dev.openLyricsEditor(this.app.currentTrack?.id);
                }
                break;
        }
    }

    setupNotifications() {
        // Request notification permission
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }

    showNotification(title, options = {}) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, {
                icon: '/assets/icon-192x192.png',
                badge: '/assets/icon-72x72.png',
                ...options
            });
        }
    }

    setupTooltips() {
        // Create tooltip container
        const tooltipContainer = document.createElement('div');
        tooltipContainer.id = 'global-tooltip';
        tooltipContainer.className = 'global-tooltip';
        document.body.appendChild(tooltipContainer);

        // Add tooltip styles
        const style = document.createElement('style');
        style.textContent = `
            .global-tooltip {
                position: fixed;
                padding: 8px 12px;
                background: var(--bg-elevated);
                color: var(--text-primary);
                font-size: 12px;
                border-radius: 6px;
                pointer-events: none;
                opacity: 0;
                transition: opacity 0.2s;
                z-index: 10000;
                white-space: nowrap;
                border: 1px solid var(--border-light);
            }
            .global-tooltip.visible {
                opacity: 1;
            }
            [data-tooltip] {
                position: relative;
            }
        `;
        document.head.appendChild(style);

        // Event delegation for tooltips
        document.addEventListener('mouseover', (e) => {
            const target = e.target.closest('[data-tooltip]');
            if (target) {
                this.showTooltip(target, target.dataset.tooltip);
            }
        });

        document.addEventListener('mouseout', (e) => {
            const target = e.target.closest('[data-tooltip]');
            if (target) {
                this.hideTooltip();
            }
        });
    }

    showTooltip(element, text) {
        const tooltip = document.getElementById('global-tooltip');
        if (!tooltip) return;

        tooltip.textContent = text;
        
        const rect = element.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        
        let top = rect.top - tooltipRect.height - 8;
        let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
        
        // Adjust if off-screen
        if (top < 0) top = rect.bottom + 8;
        if (left < 0) left = 8;
        if (left + tooltipRect.width > window.innerWidth) {
            left = window.innerWidth - tooltipRect.width - 8;
        }
        
        tooltip.style.top = top + 'px';
        tooltip.style.left = left + 'px';
        tooltip.classList.add('visible');
    }

    hideTooltip() {
        const tooltip = document.getElementById('global-tooltip');
        tooltip?.classList.remove('visible');
    }

    setupKeyboardShortcuts() {
        // Global shortcuts are handled in core.js
        // Additional UI-specific shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch(e.key.toLowerCase()) {
                    case 'f':
                        e.preventDefault();
                        document.getElementById('global-search')?.focus();
                        break;
                    case ',':
                        e.preventDefault();
                        this.app.navigateTo('settings');
                        break;
                }
            }
        });
    }

    setupResponsive() {
        // Handle mobile menu
        const sidebarToggle = document.getElementById('sidebar-toggle');
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', () => {
                document.getElementById('sidebar')?.classList.toggle('mobile-open');
            });
        }

        // Close sidebar on mobile when clicking outside
        document.addEventListener('click', (e) => {
            const sidebar = document.getElementById('sidebar');
            const toggle = document.getElementById('sidebar-toggle');
            
            if (window.innerWidth <= 768 && 
                sidebar?.classList.contains('mobile-open') &&
                !sidebar.contains(e.target) &&
                !toggle?.contains(e.target)) {
                sidebar.classList.remove('mobile-open');
            }
        });

        // Handle resize
        window.addEventListener('resize', this.app.debounce(() => {
            this.handleResize();
        }, 250));
    }

    handleResize() {
        const width = window.innerWidth;
        
        if (width <= 768) {
            // Mobile layout
            document.body.classList.add('mobile');
        } else {
            document.body.classList.remove('mobile');
            document.getElementById('sidebar')?.classList.remove('mobile-open');
        }
    }

    // Modal management
    showModal(id) {
        const modal = document.getElementById(id);
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    hideModal(id) {
        const modal = document.getElementById(id);
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    // Playlist selector
    showPlaylistSelector() {
        const playlists = this.app.library.playlists;
        
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Add to Playlist</h2>
                    <button class="modal-close"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body">
                    <div class="playlist-selector">
                        ${playlists.length === 0 ? `
                            <div class="empty-state">
                                <p>No playlists yet</p>
                                <button class="btn btn-primary" id="create-new-playlist">
                                    Create Playlist
                                </button>
                            </div>
                        ` : `
                            <div class="playlist-list">
                                ${playlists.map(p => `
                                    <div class="playlist-selector-item" data-id="${p.id}">
                                        <div class="playlist-thumb">
                                            <i class="fas fa-list"></i>
                                        </div>
                                        <div class="playlist-info">
                                            <span class="playlist-name">${p.name}</span>
                                            <span class="playlist-count">${p.songs?.length || 0} songs</span>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        `}
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        modal.querySelector('.modal-close').addEventListener('click', () => {
            modal.remove();
        });

        modal.querySelectorAll('.playlist-selector-item').forEach(item => {
            item.addEventListener('click', () => {
                const playlistId = item.dataset.id;
                this.addToPlaylist(playlistId);
                modal.remove();
            });
        });
    }

    addToPlaylist(playlistId) {
        // Implementation
        this.app.showToast('Added to playlist', 'success');
    }

    // Share functionality
    async shareCurrentTrack() {
        const track = this.app.currentTrack;
        if (!track) return;

        const shareData = {
            title: track.title,
            text: `Listen to ${track.title} by ${track.artist} on LyricFlow`,
            url: window.location.href
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch (err) {
                console.log('Share cancelled');
            }
        } else {
            // Fallback: copy to clipboard
            await navigator.clipboard.writeText(`${shareData.text} - ${shareData.url}`);
            this.app.showToast('Link copied to clipboard', 'success');
        }
    }

    // Download functionality
    downloadCurrentTrack() {
        const track = this.app.currentTrack;
        if (!track) return;

        const a = document.createElement('a');
        a.href = track.url;
        a.download = `${track.title} - ${track.artist}.mp3`;
        a.click();
    }

    // Loading states
    showLoading(element, message = 'Loading...') {
        element.classList.add('loading');
        element.dataset.originalContent = element.innerHTML;
        element.innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-spinner fa-spin"></i>
                <span>${message}</span>
            </div>
        `;
    }

    hideLoading(element) {
        element.classList.remove('loading');
        if (element.dataset.originalContent) {
            element.innerHTML = element.dataset.originalContent;
            delete element.dataset.originalContent;
        }
    }

    // Skeleton loading
    showSkeleton(container, count = 5) {
        container.innerHTML = Array(count).fill(0).map(() => `
            <div class="skeleton-item">
                <div class="skeleton skeleton-circle" style="width: 40px; height: 40px;"></div>
                <div style="flex: 1;">
                    <div class="skeleton skeleton-text" style="width: 60%;"></div>
                    <div class="skeleton skeleton-text" style="width: 40%;"></div>
                </div>
            </div>
        `).join('');
    }

    // Scroll utilities
    scrollTo(element, behavior = 'smooth') {
        element?.scrollIntoView({ behavior, block: 'start' });
    }

    scrollToTop() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Focus management
    trapFocus(modal) {
        const focusableElements = modal.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        const firstFocusable = focusableElements[0];
        const lastFocusable = focusableElements[focusableElements.length - 1];

        modal.addEventListener('keydown', (e) => {
            if (e.key !== 'Tab') return;

            if (e.shiftKey) {
                if (document.activeElement === firstFocusable) {
                    lastFocusable.focus();
                    e.preventDefault();
                }
            } else {
                if (document.activeElement === lastFocusable) {
                    firstFocusable.focus();
                    e.preventDefault();
                }
            }
        });
    }
}