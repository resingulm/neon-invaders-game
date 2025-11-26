/**
 * Neon Invaders - Game Logic
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI Elements
const scoreEl = document.getElementById('score');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const finalScoreEl = document.getElementById('final-score');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');

// Mobile Controls
const btnLeft = document.getElementById('btn-left');
const btnRight = document.getElementById('btn-right');
const btnFire = document.getElementById('btn-fire');

// Game State
let gameLoopId;
let lastTime = 0;
let score = 0;
let isGameOver = false;
let isPaused = false;

// Dimensions
let width, height;
let playerWidth = 40;
let playerHeight = 30;
let invaderSize = 30;
let invaderPadding = 20;

function setDimensions() {
    width = canvas.width = canvas.parentElement.clientWidth;
    height = canvas.height = canvas.parentElement.clientHeight;

    // Mobile Sizing
    if (width < 600) {
        playerWidth = 30;
        playerHeight = 22;
        invaderSize = 20;
        invaderPadding = 10;
    } else {
        playerWidth = 40;
        playerHeight = 30;
        invaderSize = 30;
        invaderPadding = 20;
    }
}

function resize() {
    setDimensions();

    // Update player position if it exists
    if (player) {
        player.y = height - player.height - 20;
        player.x = Math.min(player.x, width - player.width);
    }
}
window.addEventListener('resize', resize);

// Input Handling
const keys = {
    ArrowLeft: false,
    ArrowRight: false,
    Space: false
};

window.addEventListener('keydown', (e) => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.ArrowLeft = true;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.ArrowRight = true;
    if (e.code === 'Space') {
        keys.Space = true;
        if (!isGameOver && !startScreen.classList.contains('active')) {
            player.shoot();
            audio.playShoot();
        }
    }
});

window.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.ArrowLeft = false;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.ArrowRight = false;
    if (e.code === 'Space') keys.Space = false;
});

// Touch Controls
const handleTouchStart = (key) => (e) => {
    e.preventDefault(); // Prevent default touch behavior
    if (key === 'Space') {
        keys.Space = true;
        if (!isGameOver && !startScreen.classList.contains('active')) {
            player.shoot();
            audio.playShoot();
        }
    } else {
        keys[key] = true;
    }
};

const handleTouchEnd = (key) => (e) => {
    e.preventDefault();
    keys[key] = false;
};

// Add listeners to buttons
if (btnLeft) {
    btnLeft.addEventListener('touchstart', handleTouchStart('ArrowLeft'));
    btnLeft.addEventListener('touchend', handleTouchEnd('ArrowLeft'));
    btnLeft.addEventListener('mousedown', handleTouchStart('ArrowLeft')); // For testing on desktop
    btnLeft.addEventListener('mouseup', handleTouchEnd('ArrowLeft'));
}

if (btnRight) {
    btnRight.addEventListener('touchstart', handleTouchStart('ArrowRight'));
    btnRight.addEventListener('touchend', handleTouchEnd('ArrowRight'));
    btnRight.addEventListener('mousedown', handleTouchStart('ArrowRight'));
    btnRight.addEventListener('mouseup', handleTouchEnd('ArrowRight'));
}

if (btnFire) {
    btnFire.addEventListener('touchstart', handleTouchStart('Space'));
    btnFire.addEventListener('touchend', handleTouchEnd('Space'));
    btnFire.addEventListener('mousedown', handleTouchStart('Space'));
    btnFire.addEventListener('mouseup', handleTouchEnd('Space'));
}

// Game Objects
class Player {
    constructor() {
        this.width = playerWidth;
        this.height = playerHeight;
        this.x = width / 2 - this.width / 2;
        this.y = height - this.height - 20;
        this.speed = 500; // pixels per second
        this.color = '#00f3ff';
        this.cooldown = 0;
    }

    update(dt) {
        if (keys.ArrowLeft) this.x -= this.speed * dt;
        if (keys.ArrowRight) this.x += this.speed * dt;

        // Clamp to screen
        this.x = Math.max(0, Math.min(width - this.width, this.x));

        // Cooldown
        if (this.cooldown > 0) this.cooldown -= dt;
    }

    shoot() {
        if (this.cooldown <= 0) {
            bullets.push(new Bullet(this.x + this.width / 2, this.y, -1)); // -1 for up
            this.cooldown = 0.4; // seconds
        }
    }

    draw(ctx) {
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;

        ctx.beginPath();
        ctx.moveTo(this.x + this.width / 2, this.y);
        ctx.lineTo(this.x + this.width, this.y + this.height);
        ctx.lineTo(this.x + this.width / 2, this.y + this.height - 10);
        ctx.lineTo(this.x, this.y + this.height);
        ctx.closePath();
        ctx.stroke();

        ctx.shadowBlur = 0;
    }
}

class Bullet {
    constructor(x, y, direction) {
        this.x = x;
        this.y = y;
        this.width = 4;
        this.height = 15;
        this.speed = 600;
        this.direction = direction; // -1 up, 1 down
        this.active = true;
        this.color = direction === -1 ? '#00f3ff' : '#ff00ff';
    }

    update(dt) {
        this.y += this.speed * this.direction * dt;
        if (this.y < 0 || this.y > height) this.active = false;
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.fillRect(this.x - this.width / 2, this.y, this.width, this.height);
        ctx.shadowBlur = 0;
    }
}

class Invader {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.width = invaderSize;
        this.height = invaderSize;
        this.type = type;
        this.active = true;
        this.color = '#ff00ff';
    }

    draw(ctx) {
        if (!this.active) return;
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        ctx.shadowBlur = 5;
        ctx.shadowColor = this.color;

        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;
        const r = this.width / 2;

        ctx.beginPath();
        if (this.type === 0) {
            // Squid shape
            ctx.moveTo(cx - r, cy - r / 2);
            ctx.lineTo(cx + r, cy - r / 2);
            ctx.lineTo(cx + r, cy + r);
            ctx.lineTo(cx - r, cy + r);
        } else if (this.type === 1) {
            // Crab shape
            ctx.moveTo(cx, cy - r);
            ctx.lineTo(cx + r, cy);
            ctx.lineTo(cx, cy + r);
            ctx.lineTo(cx - r, cy);
        } else {
            // Octopus shape
            ctx.arc(cx, cy, r * 0.8, 0, Math.PI * 2);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.shadowBlur = 0;
    }
}

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 200;
        this.vy = (Math.random() - 0.5) * 200;
        this.life = 1.0;
        this.color = color;
    }

    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.life -= dt * 2;
    }

    draw(ctx) {
        ctx.globalAlpha = Math.max(0, this.life);
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, 3, 3);
        ctx.globalAlpha = 1;
    }
}

// Global Entities
let player;
let bullets = [];
let invaders = [];
let particles = [];
let invaderDirection = 1;
let invaderSpeed = 50;
let invaderDropDistance = 20;

function initGame() {
    // Ensure dimensions are set
    resize();

    player = new Player();
    bullets = [];
    invaders = [];
    particles = [];
    score = 0;
    scoreEl.innerText = score;
    isGameOver = false;

    // Create Invaders Grid
    const rows = 5;
    // Calculate columns based on width to fit screen
    const maxCols = Math.floor((width - 40) / (invaderSize + invaderPadding));
    const cols = Math.min(8, maxCols); // Max 8, but fewer if screen is small

    // Center the grid
    const gridWidth = cols * (invaderSize + invaderPadding) - invaderPadding;
    const startX = (width - gridWidth) / 2;
    const startY = 50;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            invaders.push(new Invader(
                startX + c * (invaderSize + invaderPadding),
                startY + r * (invaderSize + invaderPadding),
                r % 3
            ));
        }
    }

    invaderSpeed = 50;
    invaderDirection = 1;
}

function update(dt) {
    if (isGameOver) return;

    player.update(dt);

    // Update Bullets
    bullets.forEach(b => b.update(dt));
    bullets = bullets.filter(b => b.active);

    // Update Particles
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => p.life > 0);

    // Update Invaders
    let hitWall = false;
    let lowestInvaderY = 0;
    let activeInvaders = 0;

    // Check bounds first
    invaders.forEach(inv => {
        if (!inv.active) return;
        activeInvaders++;
        if (inv.x + inv.width > width && invaderDirection === 1) hitWall = true;
        if (inv.x < 0 && invaderDirection === -1) hitWall = true;
        lowestInvaderY = Math.max(lowestInvaderY, inv.y + inv.height);
    });

    if (hitWall) {
        invaderDirection *= -1;
        invaders.forEach(inv => inv.y += invaderDropDistance);
        invaderSpeed += 5; // Increase speed slightly
    }

    // Move invaders
    invaders.forEach(inv => {
        if (!inv.active) return;
        inv.x += invaderSpeed * invaderDirection * dt;

        // Random shooting
        if (Math.random() < 0.0005) {
            bullets.push(new Bullet(inv.x + inv.width / 2, inv.y + inv.height, 1));
            // Optional: Enemy shoot sound, maybe lower pitch or quieter?
            // For now, let's keep it silent or reuse shoot with a flag if needed.
        }
    });

    // Check Game Over (Invaders reached bottom)
    // Only if we have active invaders
    if (activeInvaders > 0 && lowestInvaderY > player.y) {
        endGame();
    }

    // Collision Detection
    bullets.forEach(b => {
        if (!b.active) return;

        // Player Bullet hits Invader
        if (b.direction === -1) {
            invaders.forEach(inv => {
                if (!inv.active) return;
                if (rectIntersect(b, inv)) {
                    inv.active = false;
                    b.active = false;
                    createExplosion(inv.x + inv.width / 2, inv.y + inv.height / 2, inv.color);
                    audio.playExplosion();
                    score += 100;
                    scoreEl.innerText = score;

                    // Check Win
                    if (invaders.every(i => !i.active)) {
                        // Respawn or Win logic - for now just respawn faster
                        setTimeout(() => {
                            initGame();
                            invaderSpeed += 50;
                        }, 1000);
                    }
                }
            });
        }
        // Invader Bullet hits Player
        else if (b.direction === 1) {
            if (rectIntersect(b, player)) {
                createExplosion(player.x + player.width / 2, player.y + player.height / 2, player.color);
                audio.playExplosion();
                endGame();
            }
        }
    });
}

function rectIntersect(r1, r2) {
    return !(r2.x > r1.x + r1.width ||
        r2.x + r2.width < r1.x ||
        r2.y > r1.y + r1.height ||
        r2.y + r2.height < r1.y);
}

function createExplosion(x, y, color) {
    for (let i = 0; i < 10; i++) {
        particles.push(new Particle(x, y, color));
    }
}

function draw() {
    // Clear with trail effect
    ctx.fillStyle = 'rgba(5, 5, 16, 0.3)';
    ctx.fillRect(0, 0, width, height);

    if (player) player.draw(ctx);
    bullets.forEach(b => b.draw(ctx));
    invaders.forEach(i => i.draw(ctx));
    particles.forEach(p => p.draw(ctx));
}

function loop(timestamp) {
    const dt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    if (!isPaused) {
        // Cap dt to prevent huge jumps
        const safeDt = Math.min(dt, 0.1);
        update(safeDt);
        draw();
    }

    gameLoopId = requestAnimationFrame(loop);
}

function startGame() {
    // Resume audio context for Safari/iOS
    audio.resume();

    startScreen.classList.remove('active');
    gameOverScreen.classList.remove('active');
    initGame();
    isPaused = false;
    lastTime = performance.now();
    cancelAnimationFrame(gameLoopId);
    loop(lastTime);
}

function endGame() {
    isGameOver = true;
    isPaused = true;
    finalScoreEl.innerText = score;
    gameOverScreen.classList.add('active');
    audio.playGameOver();
}

// Event Listeners
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);

// Initial Render
resize();
player = new Player(); // Just to show something on start screen if we wanted

