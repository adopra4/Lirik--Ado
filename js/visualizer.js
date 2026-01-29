/**
 * VISUALIZER MODULE v1.2
 * Canvas-based Audio Visualization
 */

App.visualizer = {
    canvas: null,
    ctx: null,
    animationId: null,
    isActive: false,

    init() {
        this.canvas = document.getElementById('visualizer');
        this.ctx = this.canvas.getContext('2d');
        this.resize();
        
        window.addEventListener('resize', () => this.resize());
    },

    resize() {
        if (!this.canvas) return;
        this.canvas.width = this.canvas.offsetWidth;
        this.canvas.height = this.canvas.offsetHeight;
    },

    start() {
        if (!App.player.analyser) return;
        
        this.isActive = true;
        this.animate();
    },

    stop() {
        this.isActive = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    },

    animate() {
        if (!this.isActive) return;
        
        const bufferLength = App.player.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        App.player.analyser.getByteFrequencyData(dataArray);
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw circular visualizer
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const radius = 50;
        
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        this.ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent-primary');
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        
        // Draw frequency bars in circle
        const bars = 60;
        const step = (2 * Math.PI) / bars;
        
        for (let i = 0; i < bars; i++) {
            const value = dataArray[i * 2] || 0;
            const barHeight = (value / 255) * 100;
            const angle = i * step;
            
            const x1 = centerX + Math.cos(angle) * radius;
            const y1 = centerY + Math.sin(angle) * radius;
            const x2 = centerX + Math.cos(angle) * (radius + barHeight);
            const y2 = centerY + Math.sin(angle) * (radius + barHeight);
            
            const gradient = this.ctx.createLinearGradient(x1, y1, x2, y2);
            gradient.addColorStop(0, getComputedStyle(document.documentElement).getPropertyValue('--accent-primary'));
            gradient.addColorStop(1, getComputedStyle(document.documentElement).getPropertyValue('--accent-secondary'));
            
            this.ctx.beginPath();
            this.ctx.moveTo(x1, y1);
            this.ctx.lineTo(x2, y2);
            this.ctx.strokeStyle = gradient;
            this.ctx.lineWidth = 3;
            this.ctx.lineCap = 'round';
            this.ctx.stroke();
        }
        
        // Draw center pulse
        const average = dataArray.reduce((a, b) => a + b) / bufferLength;
        const pulseRadius = radius + (average / 255) * 20;
        
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, pulseRadius * 0.3, 0, 2 * Math.PI);
        this.ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent-primary');
        this.ctx.globalAlpha = 0.3;
        this.ctx.fill();
        this.ctx.globalAlpha = 1;
        
        this.animationId = requestAnimationFrame(() => this.animate());
    }
};
