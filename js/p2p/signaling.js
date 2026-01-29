/**
 * LYRICFLOW v1.3 - SIGNALING
 * WebSocket-based signaling server client
 */

const LFSignaling = {
    ws: null,
    reconnectAttempts: 0,
    maxReconnectAttempts: 5,
    reconnectDelay: 1000,
    
    init() {
        this.connect();
    },
    
    connect() {
        const wsUrl = 'wss://signal.lyricflow.app'; // Replace with actual server
        
        try {
            this.ws = new WebSocket(wsUrl);
            
            this.ws.onopen = () => {
                console.log('Signaling connected');
                this.reconnectAttempts = 0;
                this.authenticate();
            };
            
            this.ws.onmessage = (e) => {
                const message = JSON.parse(e.data);
                this.handleMessage(message);
            };
            
            this.ws.onclose = () => {
                this.attemptReconnect();
            };
            
            this.ws.onerror = (e) => {
                console.error('Signaling error:', e);
            };
            
        } catch (e) {
            console.error('Failed to connect to signaling server:', e);
            this.fallbackToPolling();
        }
    },
    
    attemptReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.log('Max reconnection attempts reached, falling back to polling');
            this.fallbackToPolling();
            return;
        }
        
        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
        
        setTimeout(() => this.connect(), delay);
    },
    
    authenticate() {
        const token = LFUtils.storage.get('auth_token');
        this.send({
            type: 'auth',
            token
        });
    },
    
    send(message) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        }
    },
    
    handleMessage(message) {
        switch (message.type) {
            case 'signal':
                LFP2P.handleSignal(message.data);
                break;
            case 'peer-joined':
                LFP2P.handlePeerJoined(message.peerId);
                break;
            case 'peer-left':
                LFP2P.handlePeerLeft(message.peerId);
                break;
        }
    },
    
    fallbackToPolling() {
        // HTTP polling fallback
        console.log('Using polling fallback for signaling');
    }
};
