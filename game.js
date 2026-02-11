// ==================== CRYPTO CATCHER GAME ====================
// Simple falling coins game for JARVIS AI Trading Terminal

class CryptoCatcherGame {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.isRunning = false;
        this.isPaused = false;
        this.score = 0;
        this.highScore = this.loadHighScore();
        this.soundEnabled = true;
        
        // Game objects
        this.player = {
            x: 125,
            y: 350,
            width: 50,
            height: 50,
            speed: 5
        };
        
        this.coins = [];
        this.coinSpawnRate = 60; // frames
        this.frameCount = 0;
        this.difficulty = 1;
        
        // Input handling
        this.keys = {};
        this.touchX = null;
        
        // Audio elements
        this.collectSound = document.getElementById('game-sound-collect');
        this.gameOverSound = document.getElementById('game-sound-gameover');
        
        this.setupEventListeners();
        this.updateDisplay();
    }
    
    setupEventListeners() {
        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            if (this.isRunning && !this.isPaused) {
                this.keys[e.key] = true;
            }
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
        });
        
        // Touch controls for mobile
        this.canvas.addEventListener('touchstart', (e) => {
            if (!this.isRunning || this.isPaused) return;
            e.preventDefault();
            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            this.touchX = touch.clientX - rect.left;
        });
        
        this.canvas.addEventListener('touchmove', (e) => {
            if (!this.isRunning || this.isPaused) return;
            e.preventDefault();
            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            this.touchX = touch.clientX - rect.left;
        });
        
        this.canvas.addEventListener('touchend', () => {
            this.touchX = null;
        });
        
        // Mouse controls as alternative
        this.canvas.addEventListener('click', (e) => {
            if (!this.isRunning || this.isPaused) return;
            const rect = this.canvas.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            
            if (clickX < this.canvas.width / 2) {
                this.player.x = Math.max(0, this.player.x - 30);
            } else {
                this.player.x = Math.min(this.canvas.width - this.player.width, this.player.x + 30);
            }
        });
        
        // Game buttons
        document.getElementById('game-start').addEventListener('click', () => this.start());
        document.getElementById('game-restart').addEventListener('click', () => this.restart());
        document.getElementById('game-sound-toggle').addEventListener('click', () => this.toggleSound());
    }
    
    loadHighScore() {
        try {
            const saved = localStorage.getItem('crypto_catcher_high_score');
            return saved ? parseInt(saved) : 0;
        } catch (error) {
            return 0;
        }
    }
    
    saveHighScore() {
        try {
            localStorage.setItem('crypto_catcher_high_score', this.highScore.toString());
        } catch (error) {
            console.error('Error saving high score:', error);
        }
    }
    
    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        const btn = document.getElementById('game-sound-toggle');
        btn.textContent = this.soundEnabled ? '🔊' : '🔇';
    }
    
    playSound(sound) {
        if (this.soundEnabled && sound) {
            sound.currentTime = 0;
            sound.play().catch(() => {
                // Audio playback failed - browser may have autoplay restrictions
            });
        }
    }
    
    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.score = 0;
        this.coins = [];
        this.frameCount = 0;
        this.difficulty = 1;
        this.player.x = 125;
        
        document.getElementById('game-start').style.display = 'none';
        document.getElementById('game-restart').style.display = 'none';
        
        this.gameLoop();
    }
    
    restart() {
        this.isRunning = false;
        this.start();
    }
    
    gameLoop() {
        if (!this.isRunning) return;
        
        this.update();
        this.render();
        this.updateDisplay();
        
        requestAnimationFrame(() => this.gameLoop());
    }
    
    update() {
        this.frameCount++;
        
        // Increase difficulty over time
        if (this.frameCount % 600 === 0) {
            this.difficulty += 0.1;
            this.coinSpawnRate = Math.max(30, this.coinSpawnRate - 2);
        }
        
        // Move player
        if (this.keys['ArrowLeft'] || this.keys['a']) {
            this.player.x = Math.max(0, this.player.x - this.player.speed);
        }
        if (this.keys['ArrowRight'] || this.keys['d']) {
            this.player.x = Math.min(this.canvas.width - this.player.width, this.player.x + this.player.speed);
        }
        
        // Touch control
        if (this.touchX !== null) {
            const targetX = this.touchX - this.player.width / 2;
            this.player.x = Math.max(0, Math.min(this.canvas.width - this.player.width, targetX));
        }
        
        // Spawn coins
        if (this.frameCount % this.coinSpawnRate === 0) {
            this.spawnCoin();
        }
        
        // Update coins
        this.coins = this.coins.filter(coin => {
            coin.y += coin.speed * this.difficulty;
            
            // Check collision with player
            if (this.checkCollision(coin)) {
                this.score += 10;
                if (this.score > this.highScore) {
                    this.highScore = this.score;
                    this.saveHighScore();
                }
                this.playSound(this.collectSound);
                return false; // Remove coin
            }
            
            // Check if coin missed (fell off screen)
            if (coin.y > this.canvas.height) {
                // Game over if too many missed
                if (Math.random() < 0.3) {
                    this.gameOver();
                }
                return false;
            }
            
            return true;
        });
    }
    
    spawnCoin() {
        const coin = {
            x: Math.random() * (this.canvas.width - 30),
            y: -30,
            width: 30,
            height: 30,
            speed: 2 + Math.random() * 2
        };
        this.coins.push(coin);
    }
    
    checkCollision(coin) {
        return (
            this.player.x < coin.x + coin.width &&
            this.player.x + this.player.width > coin.x &&
            this.player.y < coin.y + coin.height &&
            this.player.y + this.player.height > coin.y
        );
    }
    
    gameOver() {
        this.isRunning = false;
        this.playSound(this.gameOverSound);
        
        // Show game over on canvas
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = '#ffed00';
        this.ctx.font = 'bold 24px Orbitron';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('GAME OVER', this.canvas.width / 2, this.canvas.height / 2 - 40);
        
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '18px Rajdhani';
        this.ctx.fillText(`Score: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2);
        this.ctx.fillText(`High Score: ${this.highScore}`, this.canvas.width / 2, this.canvas.height / 2 + 30);
        
        document.getElementById('game-restart').style.display = 'inline-block';
    }
    
    render() {
        // Clear canvas
        this.ctx.fillStyle = '#0a0e1a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw grid pattern
        this.ctx.strokeStyle = 'rgba(0, 247, 255, 0.1)';
        this.ctx.lineWidth = 1;
        for (let i = 0; i < this.canvas.width; i += 20) {
            this.ctx.beginPath();
            this.ctx.moveTo(i, 0);
            this.ctx.lineTo(i, this.canvas.height);
            this.ctx.stroke();
        }
        for (let i = 0; i < this.canvas.height; i += 20) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, i);
            this.ctx.lineTo(this.canvas.width, i);
            this.ctx.stroke();
        }
        
        // Draw player (basket/collector)
        this.ctx.fillStyle = '#00f7ff';
        this.ctx.fillRect(this.player.x, this.player.y, this.player.width, 5);
        this.ctx.fillRect(this.player.x, this.player.y, 5, this.player.height);
        this.ctx.fillRect(this.player.x + this.player.width - 5, this.player.y, 5, this.player.height);
        
        // Draw player icon (wallet)
        this.ctx.fillStyle = '#ffed00';
        this.ctx.font = '32px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('👛', this.player.x + this.player.width / 2, this.player.y + 35);
        
        // Draw coins
        this.coins.forEach(coin => {
            // Coin glow
            const gradient = this.ctx.createRadialGradient(
                coin.x + coin.width / 2, 
                coin.y + coin.height / 2, 
                0,
                coin.x + coin.width / 2, 
                coin.y + coin.height / 2, 
                coin.width
            );
            gradient.addColorStop(0, 'rgba(255, 237, 0, 0.8)');
            gradient.addColorStop(1, 'rgba(255, 237, 0, 0)');
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(
                coin.x - coin.width / 2, 
                coin.y - coin.height / 2, 
                coin.width * 2, 
                coin.height * 2
            );
            
            // Coin symbol
            this.ctx.fillStyle = '#ffed00';
            this.ctx.font = '24px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('₿', coin.x + coin.width / 2, coin.y + coin.height / 2 + 8);
        });
    }
    
    updateDisplay() {
        document.getElementById('game-score').textContent = this.score;
        document.getElementById('game-high-score').textContent = this.highScore;
    }
}

// Initialize game when DOM is ready
let game;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        game = new CryptoCatcherGame();
    });
} else {
    game = new CryptoCatcherGame();
}
