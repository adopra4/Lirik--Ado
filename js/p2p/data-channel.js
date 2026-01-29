/**
 * LYRICFLOW v1.3 - DATA CHANNEL
 * Reliable data transfer over WebRTC
 */

const LFDataChannel = {
    channels: new Map(),
    chunkSize: 16384, // 16KB chunks for file transfer
    
    createChannel(pc, label, options = {}) {
        const channel = pc.createDataChannel(label, {
            ordered: options.ordered !== false,
            maxRetransmits: options.reliable ? undefined : 3
        });
        
        this.setupChannel(channel, label);
        return channel;
    },
    
    setupChannel(channel, label) {
        channel.binaryType = 'arraybuffer';
        
        let receiveBuffer = [];
        let receivedSize = 0;
        let expectedSize = 0;
        
        channel.onopen = () => {
            console.log('Data channel open:', label);
            this.channels.set(label, channel);
        };
        
        channel.onclose = () => {
            console.log('Data channel closed:', label);
            this.channels.delete(label);
        };
        
        channel.onmessage = (e) => {
            if (typeof e.data === 'string') {
                // Control message
                const message = JSON.parse(e.data);
                if (message.type === 'file-start') {
                    expectedSize = message.size;
                    receiveBuffer = [];
                    receivedSize = 0;
                } else if (message.type === 'file-complete') {
                    const blob = new Blob(receiveBuffer);
                    this.handleReceivedFile(message.fileName, blob);
                }
            } else {
                // Binary data
                receiveBuffer.push(e.data);
                receivedSize += e.data.byteLength;
                
                // Progress
                if (expectedSize > 0) {
                    const progress = (receivedSize / expectedSize) * 100;
                    this.onTransferProgress(label, progress);
                }
            }
        };
    },
    
    async sendFile(channel, file) {
        // Send metadata
        channel.send(JSON.stringify({
            type: 'file-start',
            size: file.size,
            name: file.name
        }));
        
        // Send chunks
        const buffer = await file.arrayBuffer();
        let offset = 0;
        
        while (offset < buffer.byteLength) {
            const chunk = buffer.slice(offset, offset + this.chunkSize);
            channel.send(chunk);
            offset += chunk.byteLength;
            
            // Throttle to avoid congestion
            await new Promise(r => setTimeout(r, 0));
        }
        
        // Send completion
        channel.send(JSON.stringify({
            type: 'file-complete',
            fileName: file.name
        }));
    },
    
    handleReceivedFile(name, blob) {
        // Trigger download or processing
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        a.click();
        URL.revokeObjectURL(url);
    },
    
    onTransferProgress(label, percent) {
        // Update UI
        console.log(`Transfer ${label}: ${percent.toFixed(1)}%`);
    }
};
