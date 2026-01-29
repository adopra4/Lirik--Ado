/**
 * LYRICFLOW v1.3 - VISUALIZER MODULE
 * Audio visualization and effects
 */

const LFVisualizer = {
    canvas: null,
    ctx: null,
    animationId: null,
    isActive: false,
    
    // Visualization modes
    modes: ['bars', 'wave', 'circle', 'particles', 'spectrum'],
    currentMode: 'bars',
    
    // Configuration
    config: {
        barCount: 64,
        barWidth: 4,
        barGap: 2,
        smoothing: 0.8,
        colorStart: '#ff006e',
        colorEnd: '#3a86ff'
    },
    
    // Particle system
    particles: [],
    
    init() {
        this.canvas = $('#visualizer-canvas');
        if (!this.canvas) {
            // Create canvas if not exists
            this.canvas = LFUtils.createElement('canvas', {
                id: 'visualizer-canvas',
                style: 'position: absolute; bottom: 0; left: 0; width: 100%; height: 200px; pointer-events: none; opacity: 0.5;'
            });
            $('#page-player')?.appendChild(this.canvas);
        }
        
        this.ctx = this.canvas.getContext('2d');
        this.resize();
        
        window.addEventListener('resize', () => this.resize());
        
        // Mode selector
        $('#viz-mode')?.addEventListener('change', (e) => {
            this.setMode(e.target.value);
        });
        
        console.log('Visualizer initialized');
    },
    
    resize() {
        if (!this.canvas) return;
        
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();
        
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        
        this.ctx.scale(dpr, dpr);
        this.width = rect.width;
        this.height = rect.height;
    },
    
    setMode(mode) {
        if (!this.modes.includes(mode)) return;
        
        this.currentMode = mode;
        this.particles = []; // Reset particles
        
        // Clear canvas
        this.ctx.clearRect(0, 0, this.width, this.height);
    },
    
    start() {
        if (this.isActive) return;
        
        this.isActive = true;
        this.animate();
    },
    
    stop() {
        this.isActive = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
    },
    
    animate() {
        if (!this.isActive) return;
        
        const data = LFPlayer.getFrequencyData();
        
        if (data.length > 0) {
            this.clear();
            
            switch (this.currentMode) {
                case 'bars':
                    this.drawBars(data);
                    break;
                case 'wave':
                    this.drawWave(data);
                    break;
                case 'circle':
                    this.drawCircle(data);
                    break;
                case 'particles':
                    this.drawParticles(data);
                    break;
                case 'spectrum':
                    this.drawSpectrum(data);
                    break;
            }
        }
        
        this.animationId = requestAnimationFrame(() => this.animate());
    },
    
    clear() {
        this.ctx.clearRect(0, 0, this.width, this.height);
    },
    
    drawBars(data) {
        const bars = this.config.barCount;
        const step = Math.floor(data.length / bars);
        const barWidth = (this.width - (bars - 1) * this.config.barGap) / bars;
        
        for (let i = 0; i < bars; i++) {
            const value = data[i * step] / 255;
            const barHeight = value * this.height;
            
            const x = i * (barWidth + this.config.barGap);
            const y = this.height - barHeight;
            
            // Gradient
            const gradient = this.ctx.createLinearGradient(0, this.height, 0, y);
            gradient.addColorStop(0, this.config.colorStart);
            gradient.addColorStop(1, this.config.colorEnd);
            
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(x, y, barWidth, barHeight);
            
            // Reflection
            this.ctx.fillStyle = gradient;
            this.ctx.globalAlpha = 0.3;
            this.ctx.fillRect(x, this.height, barWidth, barHeight * 0.3);
            this.ctx.globalAlpha = 1;
        }
    },
    
    drawWave(data) {
        this.ctx.beginPath();
        this.ctx.lineWidth = 2;
        this.ctx.strokeStyle = this.config.colorStart;
        
        const sliceWidth = this.width / data.length;
        let x = 0;
        
        for (let i = 0; i < data.length; i++) {
            const v = data[i] / 128.0;
            const y = v * this.height / 2;
            
            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
            
            x += sliceWidth;
        }
        
        this.ctx.stroke();
        
        // Mirror
        this.ctx.save();
        this.ctx.scale(1, -1);
        this.ctx.translate(0, -this.height);
        this.ctx.stroke();
        this.ctx.restore();
    },
    
    drawCircle(data) {
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        const radius = Math.min(centerX, centerY) - 50;
        
        const bars = 60;
        const step = Math.floor(data.length / bars);
        const angleStep = (Math.PI * 2) / bars;
        
        for (let i = 0; i < bars; i++) {
            const value = data[i * step] / 255;
            const barHeight = value * 100;
            
            const angle = i * angleStep - Math.PI / 2;
            const x1 = centerX + Math.cos(angle) * radius;
            const y1 = centerY + Math.sin(angle) * radius;
            const x2 = centerX + Math.cos(angle) * (radius + barHeight);
            const y2 = centerY + Math.sin(angle) * (radius + barHeight);
            
            const gradient = this.ctx.createLinearGradient(x1, y1, x2, y2);
            gradient.addColorStop(0, this.config.colorStart);
            gradient.addColorStop(1, this.config.colorEnd);
            
            this.ctx.strokeStyle = gradient;
            this.ctx.lineWidth = 4;
            this.ctx.lineCap = 'round';
            
            this.ctx.beginPath();
            this.ctx.moveTo(x1, y1);
            this.ctx.lineTo(x2, y2);
            this.ctx.stroke();
        }
        
        // Inner circle
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius - 5, 0, Math.PI * 2);
        this.ctx.strokeStyle = this.config.colorStart;
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
    },
    
    drawParticles(data) {
        // Add new particles based on bass
        const bass = data.slice(0, 10).reduce((a, b) => a + b, 0) / 10;
        
        if (bass > 200 && this.particles.length < 100) {
            for (let i = 0; i < 3; i++) {
                this.particles.push({
                    x: this.width / 2,
                    y: this.height / 2,
                    vx: (Math.random() - 0.5) * 10,
                    vy: (Math.random() - 0.5) * 10,
                    life: 1,
                    size: Math.random() * 4 + 2,
                    color: Math.random() > 0.5 ? this.config.colorStart : this.config.colorEnd
                });
            }
        }
        
        // Update and draw particles
        this.particles = this.particles.filter(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.02;
            p.vy += 0.1; // Gravity
            
            if (p.life <= 0) return false;
            
            this.ctx.globalAlpha = p.life;
            this.ctx.fillStyle = p.color;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fill();
            
            return true;
        });
        
        this.ctx.globalAlpha = 1;
    },
    
    drawSpectrum(data) {
        // 3D spectrum effect
        const bars = 32;
        const step = Math.floor(data.length / bars);
        const barWidth = this.width / bars;
        
        for (let row = 0; row < 5; row++) {
            const offset = row * 20;
            const alpha = 1 - row * 0.15;
            
            this.ctx.globalAlpha = alpha;
            
            for (let i = 0; i < bars; i++) {
                const value = data[i * step] / 255;
                const barHeight = value * (this.height / 2);
                
                const x = i * barWidth;
                const y = this.height / 2 - barHeight / 2 - offset;
                
                const hue = (i / bars) * 360;
                this.ctx.fillStyle = `hsl(${hue}, 70%, 50%)`;
                
                this.ctx.fillRect(x, y, barWidth - 2, barHeight);
            }
        }
        
        this.ctx.globalAlpha = 1;
    },
    
    // Set colors from album art
    setColorsFromImage(imageUrl) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = 1;
            canvas.height = 1;
            ctx.drawImage(img, 0, 0, 1, 1);
            const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
            
            this.config.colorStart = `rgb(${r}, ${g}, ${b})`;
            this.config.colorEnd = `rgb(${Math.min(255, r + 50)}, ${Math.min(255, g + 50)}, ${Math.min(255, b + 50)})`;
        };
        img.src = imageUrl;
    }
};
