/**
 * LYRICFLOW v1.3 - P2P SYNC MANAGER
 * WebRTC-based peer-to-peer synchronization
 */

const LFP2P = {
    // Connection state
    state: {
        isConnected: false,
        isHost: false,
        roomCode: null,
        peers: new Map(), // peerId -> connection
        localId: null
    },
    
    // WebRTC configuration
    config: {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
        ]
    },
    
    // Signaling (using simple WebSocket or polling fallback)
    signaling: null,
    
    // Events
    events: new LFUtils.EventEmitter(),
    
    init() {
        this.localId = this.generatePeerId();
        this.setupEventListeners();
        this.initSignaling();
        console.log('P2P Sync initialized, ID:', this.localId);
    },
    
    generatePeerId() {
        return Math.random().toString(36).substring(2, 10).toUpperCase();
    },
    
    setupEventListeners() {
        // Create room
        $('#btn-create-room')?.addEventListener('click', () => this.createRoom());
        
        // Join room
        $('#btn-join-room')?.addEventListener('click', () => {
            const code = $('#room-id-input')?.value.trim().toUpperCase();
            if (code) this.joinRoom(code);
        });
        
        // Copy room code
        $('#btn-copy-code')?.addEventListener('click', () => this.copyRoomCode());
        
        // Listen for player events to sync
        LyricFlow.events.on('play', () => this.broadcastState());
        LyricFlow.events.on('pause', () => this.broadcastState());
        LyricFlow.events.on('seek', () => this.broadcastState());
    },
    
    initSignaling() {
        // Simple polling-based signaling for demo
        // In production, use WebSocket server
        
        this.signaling = {
            polls: new Map(),
            
            async poll(roomCode) {
                // Check for messages
                const messages = await this.getMessages(roomCode);
                messages.forEach(msg => this.handleSignal(msg));
            },
            
            async send(roomCode, message) {
                // Send message via server
                await this.postMessage(roomCode, message);
            },
            
            // Placeholder implementations
            async getMessages(roomCode) {
                // Would fetch from server
                return [];
            },
            
            async postMessage(roomCode, message) {
                // Would post to server
                console.log('Signal:', roomCode, message);
            }
        };
        
        // Start polling if in a room
        setInterval(() => {
            if (this.state.roomCode) {
                this.signaling.poll(this.state.roomCode);
            }
        }, 1000);
    },
    
    // Create a new sync room
    async createRoom() {
        this.state.isHost = true;
        this.state.roomCode = this.generateRoomCode();
        
        this.updateUI();
        this.showRoomInfo();
        
        LyricFlow.showToast(`Room created: ${this.state.roomCode}`, 'success');
        this.events.emit('roomCreated', this.state.roomCode);
    },
    
    // Join existing room
    async joinRoom(code) {
        this.state.isHost = false;
        this.state.roomCode = code;
        
        // Connect to host
        await this.connectToHost(code);
        
        this.updateUI();
        this.showRoomInfo();
        
        LyricFlow.showToast(`Joined room: ${code}`, 'success');
        this.events.emit('roomJoined', code);
    },
    
    generateRoomCode() {
        // Generate 6-character code
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    },
    
    // WebRTC connection
    async createPeerConnection(peerId, isInitiator = false) {
        const pc = new RTCPeerConnection(this.config);
        
        // Data channel for sync messages
        let dataChannel = null;
        
        if (isInitiator) {
            dataChannel = pc.createDataChannel('sync', {
                ordered: true
            });
            this.setupDataChannel(dataChannel, peerId);
        } else {
            pc.ondatachannel = (e) => {
                this.setupDataChannel(e.channel, peerId);
            };
        }
        
        // ICE handling
        pc.onicecandidate = (e) => {
            if (e.candidate) {
                this.sendSignal(peerId, {
                    type: 'ice-candidate',
                    candidate: e.candidate
                });
            }
        };
        
        // Connection state
        pc.onconnectionstatechange = () => {
            console.log('Connection state:', pc.connectionState);
            if (pc.connectionState === 'connected') {
                this.state.peers.set(peerId, { pc, dataChannel });
                this.updatePeersList();
            } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
                this.state.peers.delete(peerId);
                this.updatePeersList();
            }
        };
        
        return pc;
    },
    
    setupDataChannel(channel, peerId) {
        channel.onopen = () => {
            console.log('Data channel open with', peerId);
            this.broadcastState();
        };
        
        channel.onmessage = (e) => {
            const message = JSON.parse(e.data);
            this.handleSyncMessage(message, peerId);
        };
        
        channel.onerror = (e) => {
            console.error('Data channel error:', e);
        };
    },
    
    async connectToHost(roomCode) {
        // In real implementation, get host info from signaling server
        // For demo, we'll simulate
        
        const pc = await this.createPeerConnection('host', true);
        
        // Create offer
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        
        // Send offer via signaling
        this.sendSignal('host', {
            type: 'offer',
            offer: offer
        });
    },
    
    async handleSignal(message) {
        const { from, type, data } = message;
        
        if (type === 'offer') {
            const pc = await this.createPeerConnection(from, false);
            await pc.setRemoteDescription(data.offer);
            
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            
            this.sendSignal(from, {
                type: 'answer',
                answer: answer
            });
            
        } else if (type === 'answer') {
            const peer = this.state.peers.get(from);
            if (peer) {
                await peer.pc.setRemoteDescription(data.answer);
            }
            
        } else if (type === 'ice-candidate') {
            const peer = this.state.peers.get(from);
            if (peer) {
                await peer.pc.addIceCandidate(data.candidate);
            }
        }
    },
    
    sendSignal(to, data) {
        if (this.signaling) {
            this.signaling.send(this.state.roomCode, {
                from: this.localId,
                to,
                ...data
            });
        }
    },
    
    // Sync message handling
    handleSyncMessage(message, from) {
        const { type, data } = message;
        
        switch (type) {
            case 'playback':
                this.syncPlayback(data);
                break;
            case 'queue':
                this.syncQueue(data);
                break;
            case 'chat':
                this.receiveChat(data, from);
                break;
        }
    },
    
    syncPlayback(data) {
        const { isPlaying, currentTime, songId } = data;
        const currentSong = LyricFlow.state.currentSong;
        
        // Check if same song
        if (!currentSong || currentSong.id !== songId) {
            // Load song
            const song = LFLibrary.getSong(songId);
            if (song) {
                LFPlayer.load(song, currentTime);
            }
        }
        
        // Sync play state
        const timeDiff = Math.abs(LFPlayer.getCurrentTime() - currentTime);
        
        if (timeDiff > 1) {
            LFPlayer.seekTo(currentTime);
        }
        
        if (isPlaying && !LFPlayer.state.isPlaying) {
            LFPlayer.play();
        } else if (!isPlaying && LFPlayer.state.isPlaying) {
            LFPlayer.pause();
        }
    },
    
    syncQueue(data) {
        // Update queue from host
        if (data.queue) {
            LyricFlow.setState('queue', data.queue);
        }
    },
    
    // Broadcast current state to all peers
    broadcastState() {
        if (this.state.peers.size === 0) return;
        
        const message = {
            type: 'playback',
            data: {
                isPlaying: LyricFlow.state.isPlaying,
                currentTime: LFPlayer.getCurrentTime(),
                songId: LyricFlow.state.currentSong?.id,
                timestamp: Date.now()
            }
        };
        
        this.broadcast(message);
    },
    
    broadcast(message) {
        const data = JSON.stringify(message);
        
        this.state.peers.forEach((peer, id) => {
            if (peer.dataChannel?.readyState === 'open') {
                peer.dataChannel.send(data);
            }
        });
    },
    
    // Chat functionality
    sendChat(text) {
        const message = {
            type: 'chat',
            data: {
                text,
                from: this.localId,
                timestamp: Date.now()
            }
        };
        
        this.broadcast(message);
        this.displayChat(message.data, true);
    },
    
    receiveChat(data, from) {
        this.displayChat(data, false);
    },
    
    displayChat(data, isSelf) {
        const container = $('#p2p-chat-messages');
        if (!container) return;
        
        const messageEl = LFUtils.createElement('div', {
            className: `chat-message ${isSelf ? 'self' : 'peer'}`
        }, 
            LFUtils.createElement('span', { className: 'chat-sender' }, isSelf ? 'You' : data.from),
            LFUtils.createElement('span', { className: 'chat-text' }, data.text),
            LFUtils.createElement('span', { className: 'chat-time' }, new Date(data.timestamp).toLocaleTimeString())
        );
        
        container.appendChild(messageEl);
        container.scrollTop = container.scrollHeight;
    },
    
    // UI updates
    updateUI() {
        const statusEl = $('#p2p-status');
        const indicator = $('#p2p-indicator');
        
        if (this.state.roomCode) {
            statusEl?.classList.add('connected');
            indicator?.classList.remove('offline');
            indicator?.classList.add('online');
        } else {
            statusEl?.classList.remove('connected');
            indicator?.classList.remove('online');
            indicator?.classList.add('offline');
        }
    },
    
    showRoomInfo() {
        $('#p2p-room-info').style.display = 'block';
        $('#current-room-code').textContent = this.state.roomCode;
        this.updatePeersList();
    },
    
    updatePeersList() {
        const list = $('#peers-list');
        if (!list) return;
        
        const peers = Array.from(this.state.peers.keys());
        
        if (peers.length === 0) {
            list.innerHTML = '<p class="text-secondary">No peers connected</p>';
        } else {
            list.innerHTML = peers.map(id => `
                <div class="peer-item">
                    <span class="peer-status"></span>
                    <span>${id}</span>
                </div>
            `).join('');
        }
    },
    
    copyRoomCode() {
        navigator.clipboard.writeText(this.state.roomCode);
        LyricFlow.showToast('Room code copied!', 'success');
    },
    
    // Leave room
    leaveRoom() {
        // Close all connections
        this.state.peers.forEach(peer => {
            peer.pc.close();
        });
        this.state.peers.clear();
        
        this.state.roomCode = null;
        this.state.isHost = false;
        
        $('#p2p-room-info').style.display = 'none';
        this.updateUI();
        
        LyricFlow.showToast('Left room', 'info');
    }
};
