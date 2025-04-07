const GAME_WIDTH = 300;
const VISIBLE_GAME_WIDTH = 400; const GAME_HEIGHT = 700;
const CAMERA_OFFSET = 350; const GRAVITY = 0.25;
const JUMP_FORCE = -10;
const PLATFORM_COUNT = 8; const PLATFORM_WIDTH = 60;
const PLATFORM_HEIGHT = 20;
const CHARACTER_WIDTH = 50;
const CHARACTER_HEIGHT = 50;
const MAX_JUMP_DISTANCE = 150; const GROUND_SPEED = 5; const AIR_SPEED = 7.5; 
let cameraY = 0;

const PLATFORM_COLORS = {
    front: '#8a5fff',
    right: '#ff5f8f',
    back: '#59dfff',
    left: '#ffde59'
};

const FACE_CONFIG = {
    front: {
                xRange: [VISIBLE_GAME_WIDTH * 0.3, VISIBLE_GAME_WIDTH * 0.7],
        gapFrequency: 0.2,          platformSpacing: {min: 100, max: 150}
    },
    right: {
                xRange: [VISIBLE_GAME_WIDTH * 0.5, VISIBLE_GAME_WIDTH * 0.9],
        gapFrequency: 0.35,         platformSpacing: {min: 110, max: 160}
    },
    back: {
                zigzag: true,
        leftX: VISIBLE_GAME_WIDTH * 0.2,
        rightX: VISIBLE_GAME_WIDTH * 0.8,
        gapFrequency: 0.3,         platformSpacing: {min: 105, max: 155}
    },
    left: {
                xRange: [VISIBLE_GAME_WIDTH * 0.1, VISIBLE_GAME_WIDTH * 0.5],
        gapFrequency: 0.35,          platformSpacing: {min: 115, max: 165}
    }
};

let score = 0;
let highestPlatformY = Infinity; let currentFace = 0; let rotationCount = 0; let rotationY = 0;
let isJumping = false;
let isPlatformGenerated = false;
let isResetting = false; let isInvulnerable = false; 
let playerX = VISIBLE_GAME_WIDTH / 2 - CHARACTER_WIDTH / 2;
let playerY = GAME_HEIGHT - 150;
let playerSpeedY = 0;
let playerDirection = 0; let jumpState = 'idle'; 
let platforms = {
    front: [],
    right: [],
    back: [],
    left: []
};

const cube = document.querySelector('.cube');
const scoreElement = document.getElementById('score');
const faces = ['front', 'right', 'back', 'left'];

function createParticles() {
    const particlesContainer = document.getElementById('particles');
    const particleCount = 30;
    
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        
                const posX = Math.random() * window.innerWidth;
        const posY = Math.random() * window.innerHeight;
        particle.style.left = `${posX}px`;
        particle.style.top = `${posY}px`;
        
                const size = Math.random() * 5 + 3;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        
                const colors = ['#8a5fff', '#ff5f8f', '#59dfff', '#ffde59'];
        particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        
                const duration = Math.random() * 10 + 10;
        particle.style.animation = `float-particle ${duration}s linear infinite`;
        particle.style.animationDelay = `${Math.random() * 10}s`;
        
        particlesContainer.appendChild(particle);
    }
}

function seededRandom(seed) {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
}


function addSideFrameOption() {
  const instructions = document.querySelector('.top-left-instructions');
  
    const toggleContainer = document.createElement('div');
  toggleContainer.className = 'side-frame-option';
  toggleContainer.innerHTML = `
    <label class="toggle-switch">
      <input type="checkbox" id="side-frame-toggle">
      <span class="toggle-slider"></span>
    </label>
    <span>Show side previews</span>
  `;
  
  instructions.appendChild(toggleContainer);
  
    document.getElementById('side-frame-toggle').addEventListener('change', function() {
    const showSidePreviews = this.checked;
    toggleSidePreviews(showSidePreviews);
  });
}

function createSidePreviews() {
  const gameContainer = document.querySelector('.game-container');
  
    const leftPreview = document.createElement('div');
  leftPreview.className = 'side-preview side-preview-left';
  leftPreview.id = 'side-preview-left';
  
    const rightPreview = document.createElement('div');
  rightPreview.className = 'side-preview side-preview-right';
  rightPreview.id = 'side-preview-right';
  
    gameContainer.appendChild(leftPreview);
  gameContainer.appendChild(rightPreview);
  
    toggleSidePreviews(false);
}

function toggleSidePreviews(show) {
  const leftPreview = document.getElementById('side-preview-left');
  const rightPreview = document.getElementById('side-preview-right');
  
  if (leftPreview && rightPreview) {
    leftPreview.style.display = show ? 'block' : 'none';
    rightPreview.style.display = show ? 'block' : 'none';
  }
  
    window.showSidePreviews = show;
  
    if (show) {
    updateSidePreviews();
  }
}

function updateSidePreviews() {
  if (!window.showSidePreviews) return;
  
  const leftPreview = document.getElementById('side-preview-left');
  const rightPreview = document.getElementById('side-preview-right');
  
    const leftFaceIndex = (currentFace - 1 + 4) % 4;
  const rightFaceIndex = (currentFace + 1) % 4;
  
  const leftFace = faces[leftFaceIndex];
  const rightFace = faces[rightFaceIndex];
  
    createPreviewSnapshot(leftPreview, leftFace);
  createPreviewSnapshot(rightPreview, rightFace);
}

function createPreviewSnapshot(previewElement, face) {
    previewElement.innerHTML = '';
  
    const snapshot = document.createElement('div');
  snapshot.className = 'preview-content';
  snapshot.style.position = 'absolute';
  snapshot.style.top = '0';
  snapshot.style.left = '0';
  
    const gradients = {
    'front': 'linear-gradient(to bottom, #2e207f, #1e1637)',
    'right': 'linear-gradient(to bottom, #8f2f5f, #1e1637)',
    'back': 'linear-gradient(to bottom, #1f4f7f, #1e1637)',
    'left': 'linear-gradient(to bottom, #83772f, #1e1637)'
  };
  previewElement.style.background = gradients[face] || gradients['front'];
  
    const label = document.createElement('div');
  label.className = 'preview-label';
  label.textContent = face.charAt(0).toUpperCase() + face.slice(1);
  snapshot.appendChild(label);
  
    const visiblePlatforms = platforms[face].filter(platform => {
    return platform.y >= cameraY - 100 && platform.y <= cameraY + GAME_HEIGHT + 100;
  });
  
    visiblePlatforms.forEach(platform => {
    const platformClone = document.createElement('div');
    platformClone.className = 'platform preview-platform';
    platformClone.style.left = `${platform.x}px`;
    platformClone.style.top = `${platform.y - cameraY}px`;
    platformClone.style.width = `${platform.width}px`;
    platformClone.style.height = `${platform.height}px`;
    
    if (platform.isGap) {
      platformClone.style.backgroundColor = 'rgba(255, 60, 60, 0.7)';
      platformClone.style.border = '2px dashed rgba(255, 100, 100, 0.9)';
      platformClone.style.boxShadow = '0 0 12px rgba(255, 0, 0, 0.4)';
      platformClone.style.setProperty('--show-dots', 'none');
    } else {
      platformClone.style.backgroundColor = PLATFORM_COLORS[face];
      platformClone.style.setProperty('--show-dots', 'block');
    }
    
    snapshot.appendChild(platformClone);
  });
  
    if (faces[currentFace] === face) {
    const characterClone = document.createElement('div');
    characterClone.className = 'character preview-character';
    characterClone.style.left = `${playerX}px`;
    characterClone.style.top = `${playerY - cameraY}px`;
    snapshot.appendChild(characterClone);
  } else {
        const positionIndicator = document.createElement('div');
    positionIndicator.className = 'player-position-indicator';
    positionIndicator.style.left = `${playerX}px`;
    positionIndicator.style.top = `${playerY - cameraY}px`;
    snapshot.appendChild(positionIndicator);
  }
  
  previewElement.appendChild(snapshot);
}

function getBackgroundForFace(face) {
  const gradients = {
    'front': 'linear-gradient(to bottom, #2e207f, #1e1637)',
    'right': 'linear-gradient(to bottom, #8f2f5f, #1e1637)',
    'back': 'linear-gradient(to bottom, #1f4f7f, #1e1637)',
    'left': 'linear-gradient(to bottom, #83772f, #1e1637)'
  };
  
  return gradients[face] || gradients['front'];
}

function initSideFramePreview() {
  window.showSidePreviews = false;
  createSidePreviews();
  addSideFrameOption();
}

function init() {
        isResetting = false;
    
        document.removeEventListener('keydown', keyDownHandler);
    document.removeEventListener('keyup', keyUpHandler);
    
        faces.forEach(face => {
        generatePlatforms(face);
    });

        faces.forEach(face => {
        createCharacter(face);
    });
    
        createParticles();

        document.addEventListener('keydown', keyDownHandler);
    document.addEventListener('keyup', keyUpHandler);
    
        initSideFramePreview();

        requestAnimationFrame(gameLoop);
}

function wouldOverlap(newPlatform, existingPlatforms) {
    for (let platform of existingPlatforms) {
                const verticalDistance = Math.abs(platform.y - newPlatform.y);
        if (verticalDistance < PLATFORM_HEIGHT * 2) {
                        const horizontalOverlap = 
                newPlatform.x < platform.x + platform.width && 
                newPlatform.x + newPlatform.width > platform.x;
            
            if (horizontalOverlap) {
                return true;
            }
        }
    }
    return false;
}

function generatePlatforms(face) {
    const gameElement = document.getElementById(`game-${face}`);
    
        platforms[face] = [];
    gameElement.innerHTML = '';
    
        const config = FACE_CONFIG[face];
    
        let currentY = GAME_HEIGHT - 100;
    
        let initialPlatform;
    
        if (face === 'front') {
                const platformWidth = PLATFORM_WIDTH * 1.5;
        
                initialPlatform = {
            x: playerX + (CHARACTER_WIDTH / 2) - (platformWidth / 2),             y: currentY,
            width: platformWidth,
            height: PLATFORM_HEIGHT,
            isGap: false
        };
    } else {
        initialPlatform = {
            x: VISIBLE_GAME_WIDTH / 2 - PLATFORM_WIDTH / 2,
            y: currentY,
            width: PLATFORM_WIDTH,
            height: PLATFORM_HEIGHT,
            isGap: false
        };
    }
    
    platforms[face].push(initialPlatform);
    createPlatformElement(initialPlatform, face, gameElement);
    
        const platformCount = 15;     let gapCreated = false;
    
    for (let i = 0; i < platformCount; i++) {
                currentY -= config.platformSpacing.min + 
                    Math.random() * (config.platformSpacing.max - config.platformSpacing.min);
        
                let x;
        if (config.zigzag) {
                        x = (i % 2 === 0) ? config.leftX : config.rightX;
        } else {
                        x = config.xRange[0] + Math.random() * (config.xRange[1] - config.xRange[0]);
        }
        
                x = Math.max(0, Math.min(VISIBLE_GAME_WIDTH - PLATFORM_WIDTH, x));
        
                        const makeGap = i > 2 && Math.random() < config.gapFrequency;
        
        const newPlatform = {
            x: x,
            y: currentY,
            width: PLATFORM_WIDTH,
            height: PLATFORM_HEIGHT,
            isGap: makeGap
        };
        
                if (!wouldOverlap(newPlatform, platforms[face])) {
            platforms[face].push(newPlatform);
            createPlatformElement(newPlatform, face, gameElement);
            
            if (makeGap) {
                gapCreated = true;
            }
        } else {
                        i--;             continue;
        }
    }
    
    isPlatformGenerated = true;
}

function createPlatformElement(platform, face, gameElement) {
    const platformElement = document.createElement('div');
    platformElement.className = 'platform';
    platformElement.style.left = `${platform.x}px`;
    platformElement.style.top = `${platform.y - cameraY}px`;
    platformElement.style.width = `${platform.width}px`;
    platformElement.style.height = `${platform.height}px`;
    
    if (platform.isGap) {
                platformElement.style.backgroundColor = 'rgba(255, 60, 60, 0.7)';
        platformElement.style.border = '2px dashed rgba(255, 100, 100, 0.9)';
        platformElement.style.boxShadow = '0 0 12px rgba(255, 0, 0, 0.4)';
        
                const glowEffect = document.createElement('div');
        glowEffect.style.position = 'absolute';
        glowEffect.style.width = '100%';
        glowEffect.style.height = '100%';
        glowEffect.style.top = '0';
        glowEffect.style.left = '0';
        glowEffect.style.borderRadius = '10px';
        glowEffect.style.background = 'radial-gradient(circle, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0) 70%)';
        glowEffect.style.animation = 'pulse-danger 2s infinite alternate';
        platformElement.appendChild(glowEffect);
        
                platformElement.style.setProperty('--show-dots', 'none');
    } else {
                platformElement.style.backgroundColor = PLATFORM_COLORS[face];
        platformElement.style.setProperty('--show-dots', 'block');
    }
    
    gameElement.appendChild(platformElement);
}

function createCharacter(face) {
    const gameElement = document.getElementById(`game-${face}`);
    
    const characterElement = document.createElement('div');
    characterElement.className = 'character';
    characterElement.id = `character-${face}`;
    characterElement.style.left = `${playerX}px`;
    characterElement.style.top = `${playerY - cameraY}px`;     gameElement.appendChild(characterElement);
}

function updateCharacterPosition() {
    faces.forEach(face => {
        const characterElement = document.getElementById(`character-${face}`);
        if (characterElement) {
                        const visualY = playerY - cameraY;
            characterElement.style.left = `${playerX}px`;
            characterElement.style.top = `${visualY}px`;
            
                        characterElement.classList.remove('jumping', 'landing', 'falling');
            if (jumpState === 'jumping') {
                characterElement.classList.add('jumping');
            } else if (jumpState === 'landing') {
                characterElement.classList.add('landing');
            } else if (jumpState === 'falling') {
                characterElement.classList.add('falling');
            }
            
                        if (isInvulnerable) {
                characterElement.classList.add('invulnerable');
            } else {
                characterElement.classList.remove('invulnerable');
            }
        }
    });
}

function keyDownHandler(e) {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        playerDirection = -1;
    } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        playerDirection = 1;
    } else if (e.key === 'q' || e.key === 'Q') {
        rotateCube('left');
    } else if (e.key === 'e' || e.key === 'E') {
        rotateCube('right');
    }
}

function keyUpHandler(e) {
    if ((e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') && playerDirection === -1 || 
        (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') && playerDirection === 1) {
        playerDirection = 0;
    }
}

const originalRotateCube = function(direction) {
    if (direction === 'left') {
        rotationCount--;
        currentFace = (currentFace - 1 + 4) % 4;
    } else {
        rotationCount++;
        currentFace = (currentFace + 1) % 4;
    }
    
    rotationY = rotationCount * -90;
    cube.style.transform = `rotateY(${rotationY}deg)`;
};

function rotateCube(direction) {
        originalRotateCube(direction);
    
        updateSidePreviews();
}

function checkPlatformCollision(face) {
    const currentPlatforms = platforms[face];
    let isOnPlatform = false;
    
        if (playerSpeedY > 0) {
        for (let i = 0; i < currentPlatforms.length; i++) {
            const platform = currentPlatforms[i];
            
                        if (platform.isGap) continue;
            
                        if (playerY + CHARACTER_HEIGHT >= platform.y &&
                playerY + CHARACTER_HEIGHT <= platform.y + platform.height &&
                playerX + CHARACTER_WIDTH > platform.x &&
                playerX < platform.x + platform.width) {
                
                playerY = platform.y - CHARACTER_HEIGHT;
                playerSpeedY = JUMP_FORCE;
                isOnPlatform = true;
                
                                if (jumpState === 'falling') {
                    jumpState = 'landing';
                    setTimeout(() => {
                        jumpState = 'jumping';
                        setTimeout(() => {
                            jumpState = 'idle';
                        }, 400);                     }, 200);                 } else {
                                        jumpState = 'jumping';
                    setTimeout(() => {
                        jumpState = 'idle';
                    }, 400);                 }
                
                                                if (platform.y < highestPlatformY && !isResetting) {
                    highestPlatformY = platform.y;
                    score++;
                    scoreElement.textContent = score;
                }
                break;
            }
        }
    }
    
    return isOnPlatform;
}

function movePlatforms(face) {
    const gameElement = document.getElementById(`game-${face}`);
    const platformElements = gameElement.querySelectorAll('.platform');
    
        for (let i = 0; i < platforms[face].length; i++) {
        const platform = platforms[face][i];
        if (i < platformElements.length) {
            const visualY = platform.y - cameraY;
            platformElements[i].style.top = `${visualY}px`;
        }
    }
    
        const platformsToRemove = [];
    platforms[face].forEach((platform, index) => {
        if (platform.y - cameraY > GAME_HEIGHT + 200) {
            platformsToRemove.push(index);
        }
    });
    
        if (platformsToRemove.length > 0) {
                for (let i = platformsToRemove.length - 1; i >= 0; i--) {
            const index = platformsToRemove[i];
                        if (index < platformElements.length) {
                platformElements[index].remove();
            }
                        platforms[face].splice(index, 1);
        }
        
                let highestY = Number.MAX_VALUE;
        platforms[face].forEach(platform => {
            if (platform.y < highestY) {
                highestY = platform.y;
            }
        });
        
                const config = FACE_CONFIG[face];
        let currentY = highestY;
        const newPlatformsCount = platformsToRemove.length;
        
        for (let i = 0; i < newPlatformsCount; i++) {
                        currentY -= config.platformSpacing.min + 
                      Math.random() * (config.platformSpacing.max - config.platformSpacing.min);
            
                        let x;
            if (config.zigzag) {
                                const platformIndex = platforms[face].length;
                x = (platformIndex % 2 === 0) ? config.leftX : config.rightX;
            } else {
                                x = config.xRange[0] + Math.random() * (config.xRange[1] - config.xRange[0]);
            }
            
                        x = Math.max(0, Math.min(VISIBLE_GAME_WIDTH - PLATFORM_WIDTH, x));
            
                        const makeGap = Math.random() < config.gapFrequency;
            
            const newPlatform = {
                x: x,
                y: currentY,
                width: PLATFORM_WIDTH,
                height: PLATFORM_HEIGHT,
                isGap: makeGap
            };
            
                        if (!wouldOverlap(newPlatform, platforms[face])) {
                platforms[face].push(newPlatform);
                createPlatformElement(newPlatform, face, gameElement);
            } else {
                                i--;
                continue;
            }
        }
    }
}

function checkGameOver() {
        if (isInvulnerable || isResetting) return;
    
            if (playerY > cameraY + GAME_HEIGHT - 10) {
        alert(`Game Over! Your score: ${score}`);
        resetGame();
        return;
    }
    
        if (playerY > cameraY + GAME_HEIGHT * 1.5) {
        alert(`Game Over! Your score: ${score}`);
        resetGame();
    }
}

function resetGame() {
    isResetting = true;     
        document.querySelector('.cube').classList.add('game-over-animation');
    
        score = 0;
    scoreElement.textContent = score;
    highestPlatformY = Infinity;     
        currentFace = 0;
    rotationCount = 0;
    rotationY = 0;
    cube.style.transform = `rotateY(${rotationY}deg)`;
    
        setTimeout(() => {
                faces.forEach(face => {
            generatePlatforms(face);
        });
        
                playerX = VISIBLE_GAME_WIDTH / 2 - CHARACTER_WIDTH / 2;
        playerY = GAME_HEIGHT - 150;
        playerSpeedY = 0;
        playerDirection = 0;         cameraY = 0;         
                faces.forEach(face => {
            createCharacter(face);
        });
        
        document.querySelector('.cube').classList.remove('game-over-animation');
        
                isInvulnerable = true;
        setTimeout(() => {
            isInvulnerable = false;
        }, 1000);         
                isResetting = false;
        isPlatformGenerated = true;
        
                setTimeout(() => {
            playerSpeedY = JUMP_FORCE;
            jumpState = 'jumping';
        }, 100);
    }, 1000);
}

const originalGameLoop = function() {
        playerSpeedY += GRAVITY;
    playerY += playerSpeedY;
    
        if (playerY < cameraY + CAMERA_OFFSET) {
        cameraY = playerY - CAMERA_OFFSET;
    }
    
        if (playerSpeedY > 0 && jumpState === 'idle') {
        jumpState = 'falling';
    }
    
        let playerSpeedX = 0;
    if (playerDirection !== 0) {
                const isInAir = playerSpeedY !== 0 || jumpState !== 'idle';
        playerSpeedX = playerDirection * (isInAir ? AIR_SPEED : GROUND_SPEED);
    }
    
        playerX += playerSpeedX;
    
        if (playerX < 0) {
        playerX = 0;
    } else if (playerX > VISIBLE_GAME_WIDTH - CHARACTER_WIDTH) {
        playerX = VISIBLE_GAME_WIDTH - CHARACTER_WIDTH;
    }
    
        updateCharacterPosition();
    
        const currentFaceName = faces[currentFace];
    
        const isOnPlatform = checkPlatformCollision(currentFaceName);
    
            if (!isResetting) {
        checkGameOver();
    }
    
        faces.forEach(face => {
        movePlatforms(face);
    });
};

function gameLoop() {
        originalGameLoop();
    
        if (window.showSidePreviews) {
        updateSidePreviews();
    }
    
        requestAnimationFrame(gameLoop);
}

window.addEventListener('load', init);