/**
 * LYRICFLOW v1.3 - WEBRTC BROADCAST
 * Live audio streaming to peers
 */

const LFBroadcast = {
    // Audio streaming
    stream: null,
    broadcasters: new Map(),
    
    init() {
        console.log('WebRTC Broadcast initialized');
    },
    
    async startBroadcast() {
        try {
            // Get audio stream from player
            const audioContext = LFUtils.getAudioContext();
            const destination = audioContext.createMediaStreamDestination();
            
            // Connect player to destination
            if (LFPlayer.gainNode) {
                LFPlayer.gainNode.connect(destination);
            }
            
            this.stream = destination.stream;
            
            // Setup for each peer
            LFP2P.state.peers.forEach((peer, id) => {
                this.addPeerStream(id, peer.pc);
            });
            
            LyricFlow.showToast('Broadcast started', 'success');
            
        } catch (e) {
            console.error('Failed to start broadcast:', e);
            LyricFlow.showToast('Broadcast failed', 'error');
        }
    },
    
    addPeerStream(peerId, pc) {
        if (!this.stream) return;
        
        // Add stream to peer connection
        this.stream.getTracks().forEach(track => {
            pc.addTrack(track, this.stream);
        });
    },
    
    stopBroadcast() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        
        LyricFlow.showToast('Broadcast stopped', 'info');
    },
    
    // Receive broadcast
    async receiveBroadcast(peerId, stream) {
        const audio = new Audio();
        audio.srcObject = stream;
        audio.autoplay = true;
        
        this.broadcasters.set(peerId, { stream, audio });
        
        // Add to mix (if multiple broadcasters)
        this.mixBroadcasts();
    },
    
    mixBroadcasts() {
        // In real implementation, mix multiple incoming streams
        // For now, just play the first one
        const first = this.broadcasters.values().next().value;
        if (first && !first.audio.paused) {
            // Already playing
        }
    },
    
    stopReceiving(peerId) {
        const broadcaster = this.broadcasters.get(peerId);
        if (broadcaster) {
            broadcaster.audio.pause();
            broadcaster.stream.getTracks().forEach(t => t.stop());
            this.broadcasters.delete(peerId);
        }
    }
};
