// Game constants
const GAME_WIDTH = 300;
const VISIBLE_GAME_WIDTH = 400; // Increased to allow full movement to edge
const GAME_HEIGHT = 700;
const CAMERA_OFFSET = 350; // Keep player this far from the top when rising
const GRAVITY = 0.25;
const JUMP_FORCE = -10;
const PLATFORM_COUNT = 8; // Increased for more platforms
const PLATFORM_WIDTH = 60;
const PLATFORM_HEIGHT = 20;
const CHARACTER_WIDTH = 50;
const CHARACTER_HEIGHT = 50;
const MAX_JUMP_DISTANCE = 150; // Maximum horizontal distance player can jump
const GROUND_SPEED = 5; // Normal horizontal movement speed
const AIR_SPEED = 7.5; // Faster horizontal movement speed in the air

// Track camera position separately
let cameraY = 0;

// Platform colors for each face
const PLATFORM_COLORS = {
    front: '#8a5fff',
    right: '#ff5f8f',
    back: '#59dfff',
    left: '#ffde59'
};

// Platform generation configuration for different faces
const FACE_CONFIG = {
    front: {
        // Center-biased generation
        xRange: [VISIBLE_GAME_WIDTH * 0.3, VISIBLE_GAME_WIDTH * 0.7],
        gapFrequency: 0.2,  // Increased gap frequency for front face
        platformSpacing: {min: 100, max: 150}
    },
    right: {
        // Right-biased generation
        xRange: [VISIBLE_GAME_WIDTH * 0.5, VISIBLE_GAME_WIDTH * 0.9],
        gapFrequency: 0.35, // Increased gap frequency for right face
        platformSpacing: {min: 110, max: 160}
    },
    back: {
        // Alternating left-right pattern
        zigzag: true,
        leftX: VISIBLE_GAME_WIDTH * 0.2,
        rightX: VISIBLE_GAME_WIDTH * 0.8,
        gapFrequency: 0.3, // Increased gap frequency
        platformSpacing: {min: 105, max: 155}
    },
    left: {
        // Left-biased generation
        xRange: [VISIBLE_GAME_WIDTH * 0.1, VISIBLE_GAME_WIDTH * 0.5],
        gapFrequency: 0.35,  // Increased gap frequency
        platformSpacing: {min: 115, max: 165}
    }
};

// Game variables
let score = 0;
let highestPlatformY = Infinity; // Track the highest platform player has reached
let currentFace = 0; // 0: front, 1: right, 2: back, 3: left (internal tracking)
let rotationCount = 0; // Tracks total number of rotations
let rotationY = 0;
let isJumping = false;
let isPlatformGenerated = false;
let isResetting = false; // Flag to prevent game over checks during reset
let isInvulnerable = false; // Track invulnerability after respawn

// Player variables (shared across all faces)
let playerX = VISIBLE_GAME_WIDTH / 2 - CHARACTER_WIDTH / 2;
let playerY = GAME_HEIGHT - 150;
let playerSpeedY = 0;
let playerDirection = 0; // -1 for left, 0 for none, 1 for right
let jumpState = 'idle'; // Can be 'idle', 'jumping', or 'landing'

// Initialize platforms for each face
let platforms = {
    front: [],
    right: [],
    back: [],
    left: []
};

// Game elements
const cube = document.querySelector('.cube');
const scoreElement = document.getElementById('score');
const faces = ['front', 'right', 'back', 'left'];

// Add particles to the background
function createParticles() {
    const particlesContainer = document.getElementById('particles');
    const particleCount = 30;
    
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        
        // Random position
        const posX = Math.random() * window.innerWidth;
        const posY = Math.random() * window.innerHeight;
        particle.style.left = `${posX}px`;
        particle.style.top = `${posY}px`;
        
        // Random size
        const size = Math.random() * 5 + 3;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        
        // Random color
        const colors = ['#8a5fff', '#ff5f8f', '#59dfff', '#ffde59'];
        particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        
        // Random animation duration
        const duration = Math.random() * 10 + 10;
        particle.style.animation = `float-particle ${duration}s linear infinite`;
        particle.style.animationDelay = `${Math.random() * 10}s`;
        
        particlesContainer.appendChild(particle);
    }
}

// Generate a pseudo-random number with seed
function seededRandom(seed) {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
}

// 1. Add side frame option toggle to instructions
function addSideFrameOption() {
    const instructions = document.querySelector('.top-left-instructions');
    
    // Create the toggle container
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
    
    // Add event listener for the toggle
    document.getElementById('side-frame-toggle').addEventListener('change', function() {
        const showSidePreviews = this.checked;
        toggleSidePreviews(showSidePreviews);
    });
}

// 2. Create side preview elements
function createSidePreviews() {
    const gameContainer = document.querySelector('.game-container');
    
    // Create left preview
    const leftPreview = document.createElement('div');
    leftPreview.className = 'side-preview side-preview-left';
    leftPreview.id = 'side-preview-left';
    
    // Create right preview
    const rightPreview = document.createElement('div');
    rightPreview.className = 'side-preview side-preview-right';
    rightPreview.id = 'side-preview-right';
    
    // Add to game container
    gameContainer.appendChild(leftPreview);
    gameContainer.appendChild(rightPreview);
    
    // Hide previews initially
    toggleSidePreviews(false);
}

// 3. Toggle side previews visibility
function toggleSidePreviews(show) {
    const leftPreview = document.getElementById('side-preview-left');
    const rightPreview = document.getElementById('side-preview-right');
    
    if (leftPreview && rightPreview) {
        leftPreview.style.display = show ? 'block' : 'none';
        rightPreview.style.display = show ? 'block' : 'none';
    }
    
    // Update the global setting
    window.showSidePreviews = show;
    
    // Update preview content if visible
    if (show) {
        updateSidePreviews();
    }
}

// 4. Update side previews content based on current face
function updateSidePreviews() {
    if (!window.showSidePreviews) return;
    
    const leftPreview = document.getElementById('side-preview-left');
    const rightPreview = document.getElementById('side-preview-right');
    
    // Determine which faces are to the left and right of current face
    const leftFaceIndex = (currentFace - 1 + 4) % 4;
    const rightFaceIndex = (currentFace + 1) % 4;
    
    const leftFace = faces[leftFaceIndex];
    const rightFace = faces[rightFaceIndex];
    
    // Create snapshots of left and right faces
    createPreviewSnapshot(leftPreview, leftFace);
    createPreviewSnapshot(rightPreview, rightFace);
}

// 5. Create a snapshot of a face for the preview
function createPreviewSnapshot(previewElement, face) {
    // Clear previous content
    previewElement.innerHTML = '';
    
    // Create a clone of platforms and character from the source face
    const snapshot = document.createElement('div');
    snapshot.className = 'preview-content';
    snapshot.style.position = 'absolute';
    snapshot.style.top = '0';
    snapshot.style.left = '0';
    
    // Handle the background gradient based on the face
    const gradients = {
        'front': 'linear-gradient(to bottom, #2e207f, #1e1637)',
        'right': 'linear-gradient(to bottom, #8f2f5f, #1e1637)',
        'back': 'linear-gradient(to bottom, #1f4f7f, #1e1637)',
        'left': 'linear-gradient(to bottom, #83772f, #1e1637)'
    };
    previewElement.style.background = gradients[face] || gradients['front'];
    
    // Add face label
    const label = document.createElement('div');
    label.className = 'preview-label';
    label.textContent = face.charAt(0).toUpperCase() + face.slice(1);
    snapshot.appendChild(label);
    
    // Only show platforms that are visible in the current view (within camera range)
    const visiblePlatforms = platforms[face].filter(platform => {
        return platform.y >= cameraY - 100 && platform.y <= cameraY + GAME_HEIGHT + 100;
    });
    
    // Clone platforms
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
    
    // Add character to the preview if it's the current face
    if (faces[currentFace] === face) {
        const characterClone = document.createElement('div');
        characterClone.className = 'character preview-character';
        characterClone.style.left = `${playerX}px`;
        characterClone.style.top = `${playerY - cameraY}px`;
        snapshot.appendChild(characterClone);
    } else {
        // Add a player position indicator for other faces
        const positionIndicator = document.createElement('div');
        positionIndicator.className = 'player-position-indicator';
        positionIndicator.style.left = `${playerX}px`;
        positionIndicator.style.top = `${playerY - cameraY}px`;
        snapshot.appendChild(positionIndicator);
    }
    
    previewElement.appendChild(snapshot);
}

// Helper function to get background style for a face
function getBackgroundForFace(face) {
    const gradients = {
        'front': 'linear-gradient(to bottom, #2e207f, #1e1637)',
        'right': 'linear-gradient(to bottom, #8f2f5f, #1e1637)',
        'back': 'linear-gradient(to bottom, #1f4f7f, #1e1637)',
        'left': 'linear-gradient(to bottom, #83772f, #1e1637)'
    };
    
    return gradients[face] || gradients['front'];
}

// Initialize the side frame previews feature
function initSideFramePreview() {
    window.showSidePreviews = false;
    createSidePreviews();
    addSideFrameOption();
}

// Initialize the game
function init() {
    // Make sure we're not in a resetting state
    isResetting = false;
    
    // Remove any existing event listeners first
    document.removeEventListener('keydown', keyDownHandler);
    document.removeEventListener('keyup', keyUpHandler);
    
    // Generate completely different platforms for each face
    faces.forEach(face => {
        generatePlatforms(face);
    });

    // Create player character on each face
    faces.forEach(face => {
        createCharacter(face);
    });
    
    // Create particles
    createParticles();

    // Add event listeners
    document.addEventListener('keydown', keyDownHandler);
    document.addEventListener('keyup', keyUpHandler);

    // Initialize side frame previews
    initSideFramePreview();

    // Start the game loop
    requestAnimationFrame(gameLoop);
}

// Check if platforms would overlap
function wouldOverlap(newPlatform, existingPlatforms) {
    for (let platform of existingPlatforms) {
        // Check vertical distance - only check platforms that are close vertically
        const verticalDistance = Math.abs(platform.y - newPlatform.y);
        if (verticalDistance < PLATFORM_HEIGHT * 2) {
            // Check horizontal overlap
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

// Generate platforms for a face
function generatePlatforms(face) {
    const gameElement = document.getElementById(`game-${face}`);
    
    // Clear existing platforms
    platforms[face] = [];
    gameElement.innerHTML = '';
    
    // Get configuration for this face
    const config = FACE_CONFIG[face];
    
    // Start with initial platform at the bottom
    let currentY = GAME_HEIGHT - 100;
    
    // Create initial platform for the player to start on
    let initialPlatform;
    
    // For the front face (first face), ensure there's always a platform beneath the player's start position
    if (face === 'front') {
        // Calculate platform width (a bit wider for easier landing)
        const platformWidth = PLATFORM_WIDTH * 1.5;
        
        // Center the platform under the player
        initialPlatform = {
            x: playerX + (CHARACTER_WIDTH / 2) - (platformWidth / 2), // Center platform under player
            y: currentY,
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
    
    // Create platforms going upward
    const platformCount = 15; // Generate more platforms than visible
    let gapCreated = false;
    
    for (let i = 0; i < platformCount; i++) {
        // Move up by a random amount based on face config
        currentY -= config.platformSpacing.min + 
                    Math.random() * (config.platformSpacing.max - config.platformSpacing.min);
        
        // Determine X position based on face configuration
        let x;
        if (config.zigzag) {
            // Zigzag pattern alternates between left and right
            x = (i % 2 === 0) ? config.leftX : config.rightX;
        } else {
            // Random position within range
            x = config.xRange[0] + Math.random() * (config.xRange[1] - config.xRange[0]);
        }
        
        // Make sure platform is within bounds
        x = Math.max(0, Math.min(VISIBLE_GAME_WIDTH - PLATFORM_WIDTH, x));
        
        // Check if this should be a gap platform (non-crossable)
        // Only add gaps after a few platforms and with face-specific frequency
        const makeGap = i > 2 && Math.random() < config.gapFrequency;
        
        const newPlatform = {
            x: x,
            y: currentY,
            width: PLATFORM_WIDTH,
            height: PLATFORM_HEIGHT,
            isGap: makeGap
        };
        
        // Check if this platform would overlap with existing ones
        if (!wouldOverlap(newPlatform, platforms[face])) {
            platforms[face].push(newPlatform);
            createPlatformElement(newPlatform, face, gameElement);
            
            if (makeGap) {
                gapCreated = true;
            }
        } else {
            // If overlap detected, try to adjust position and try again
            i--; // Try again with a different position
            continue;
        }
    }
    
    isPlatformGenerated = true;
}

// Helper function to create a platform element
function createPlatformElement(platform, face, gameElement) {
    const platformElement = document.createElement('div');
    platformElement.className = 'platform';
    platformElement.style.left = `${platform.x}px`;
    platformElement.style.top = `${platform.y - cameraY}px`;
    platformElement.style.width = `${platform.width}px`;
    platformElement.style.height = `${platform.height}px`;
    
    if (platform.isGap) {
        // Style for non-crossable gap - making it more visually distinct but ethereal
        platformElement.style.backgroundColor = 'rgba(255, 60, 60, 0.7)';
        platformElement.style.border = '2px dashed rgba(255, 100, 100, 0.9)';
        platformElement.style.boxShadow = '0 0 12px rgba(255, 0, 0, 0.4)';
        
        // Add a subtle, ethereal glow effect instead of a triangle
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
        
        // Remove the yellow dots that regular platforms have
        platformElement.style.setProperty('--show-dots', 'none');
    } else {
        // Normal platform
        platformElement.style.backgroundColor = PLATFORM_COLORS[face];
        platformElement.style.setProperty('--show-dots', 'block');
    }
    
    gameElement.appendChild(platformElement);
}

// Create character on a face
function createCharacter(face) {
    const gameElement = document.getElementById(`game-${face}`);
    
    const characterElement = document.createElement('div');
    characterElement.className = 'character';
    characterElement.id = `character-${face}`;
    characterElement.style.left = `${playerX}px`;
    characterElement.style.top = `${playerY - cameraY}px`; // Apply camera offset
    gameElement.appendChild(characterElement);
}

// Update character position and animation state on all faces
function updateCharacterPosition() {
    faces.forEach(face => {
        const characterElement = document.getElementById(`character-${face}`);
        if (characterElement) {
            // Apply the camera offset to the visual position
            const visualY = playerY - cameraY;
            characterElement.style.left = `${playerX}px`;
            characterElement.style.top = `${visualY}px`;
            
            // Update animation classes based on jump state
            characterElement.classList.remove('jumping', 'landing', 'falling');
            if (jumpState === 'jumping') {
                characterElement.classList.add('jumping');
            } else if (jumpState === 'landing') {
                characterElement.classList.add('landing');
            } else if (jumpState === 'falling') {
                characterElement.classList.add('falling');
            }
            
            // Apply invulnerability visual effect
            if (isInvulnerable) {
                characterElement.classList.add('invulnerable');
            } else {
                characterElement.classList.remove('invulnerable');
            }
        }
    });
}

// Handle keyboard input
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

// Rotate the cube
function rotateCube(direction) {
    if (direction === 'left') {
        rotationCount--;
        currentFace = (currentFace - 1 + 4) % 4;
    } else {
        rotationCount++;
        currentFace = (currentFace + 1) % 4;
    }
    
    rotationY = rotationCount * -90;
    cube.style.transform = `rotateY(${rotationY}deg)`;
    
    // Update side previews after rotation
    updateSidePreviews();
}

// Check for collision with platforms
function checkPlatformCollision(face) {
    const currentPlatforms = platforms[face];
    let isOnPlatform = false;
    
    // Only check for collision when player is falling
    if (playerSpeedY > 0) {
        for (let i = 0; i < currentPlatforms.length; i++) {
            const platform = currentPlatforms[i];
            
            // Skip gap platforms (non-crossable)
            if (platform.isGap) continue;
            
            // Check if player's feet are at platform level and player is within platform's x range
            if (playerY + CHARACTER_HEIGHT >= platform.y &&
                playerY + CHARACTER_HEIGHT <= platform.y + platform.height &&
                playerX + CHARACTER_WIDTH > platform.x &&
                playerX < platform.x + platform.width) {
                
                playerY = platform.y - CHARACTER_HEIGHT;
                playerSpeedY = JUMP_FORCE;
                isOnPlatform = true;
                
                // Add landing animation if was falling
                if (jumpState === 'falling') {
                    jumpState = 'landing';
                    setTimeout(() => {
                        jumpState = 'jumping';
                        setTimeout(() => {
                            jumpState = 'idle';
                        }, 400); // Match jumping animation duration
                    }, 200); // Match landing animation duration
                } else {
                    // Trigger jumping animation directly
                    jumpState = 'jumping';
                    setTimeout(() => {
                        jumpState = 'idle';
                    }, 400); // Match animation duration
                }
                
                // Only increment score when player reaches a higher platform (progresses upward)
                // Don't increment if we're resetting
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

// Move platforms down as player goes up and generate new ones as needed
function movePlatforms(face) {
    const gameElement = document.getElementById(`game-${face}`);
    const platformElements = gameElement.querySelectorAll('.platform');
    
    // Move existing platforms based on camera position
    for (let i = 0; i < platforms[face].length; i++) {
        const platform = platforms[face][i];
        if (i < platformElements.length) {
            const visualY = platform.y - cameraY;
            platformElements[i].style.top = `${visualY}px`;
        }
    }
    
    // Check for platforms that moved too far down (out of view)
    const platformsToRemove = [];
    platforms[face].forEach((platform, index) => {
        if (platform.y - cameraY > GAME_HEIGHT + 200) {
            platformsToRemove.push(index);
        }
    });
    
    // If we have platforms to remove, generate new ones at the top
    if (platformsToRemove.length > 0) {
        // Remove from the end to avoid index issues
        for (let i = platformsToRemove.length - 1; i >= 0; i--) {
            const index = platformsToRemove[i];
            // Remove from DOM if element exists
            if (index < platformElements.length) {
                platformElements[index].remove();
            }
            // Remove from data array
            platforms[face].splice(index, 1);
        }
        
        // Find the highest platform (lowest Y value)
        let highestY = Number.MAX_VALUE;
        platforms[face].forEach(platform => {
            if (platform.y < highestY) {
                highestY = platform.y;
            }
        });
        
        // Generate new platforms
        const config = FACE_CONFIG[face];
        let currentY = highestY;
        const newPlatformsCount = platformsToRemove.length;
        
        for (let i = 0; i < newPlatformsCount; i++) {
            // Move up by a random amount
            currentY -= config.platformSpacing.min + 
                      Math.random() * (config.platformSpacing.max - config.platformSpacing.min);
            
            // Determine X position based on configuration
            let x;
            if (config.zigzag) {
                // Zigzag pattern alternates between left and right
                const platformIndex = platforms[face].length;
                x = (platformIndex % 2 === 0) ? config.leftX : config.rightX;
            } else {
                // Random position within range
                x = config.xRange[0] + Math.random() * (config.xRange[1] - config.xRange[0]);
            }
            
            // Make sure platform is within bounds
            x = Math.max(0, Math.min(VISIBLE_GAME_WIDTH - PLATFORM_WIDTH, x));
            
            // Occasionally create a gap platform
            const makeGap = Math.random() < config.gapFrequency;
            
            const newPlatform = {
                x: x,
                y: currentY,
                width: PLATFORM_WIDTH,
                height: PLATFORM_HEIGHT,
                isGap: makeGap
            };
            
            // Check for overlap with existing platforms
            if (!wouldOverlap(newPlatform, platforms[face])) {
                platforms[face].push(newPlatform);
                createPlatformElement(newPlatform, face, gameElement);
            } else {
                // If overlap detected, try again with a different position
                i--;
                continue;
            }
        }
    }
}

// Game over check
function checkGameOver() {
    // Skip check if player is invulnerable or resetting
    if (isInvulnerable || isResetting) return;
    
    // Check if player falls below the visible game area (immediate death)
    // Add some margin to avoid edge cases
    if (playerY > cameraY + GAME_HEIGHT - 10) {
        alert(`Game Over! Your score: ${score}`);
        resetGame();
        return;
    }
    
    // Secondary check for falling too far
    if (playerY > cameraY + GAME_HEIGHT * 1.5) {
        alert(`Game Over! Your score: ${score}`);
        resetGame();
    }
}

// Reset the game
function resetGame() {
    isResetting = true; // Set resetting flag
    
    // First remove the game over alert
    document.querySelector('.cube').classList.add('game-over-animation');
    
    // Reset score
    score = 0;
    scoreElement.textContent = score;
    highestPlatformY = Infinity; // Reset highest platform tracker
    
    // Reset to front face
    currentFace = 0;
    rotationCount = 0;
    rotationY = 0;
    cube.style.transform = `rotateY(${rotationY}deg)`;
    
    // We'll regenerate platforms and reposition the player only after the animation completes
    setTimeout(() => {
        // Regenerate platforms
        faces.forEach(face => {
            generatePlatforms(face);
        });
        
        // Center player horizontally
        playerX = VISIBLE_GAME_WIDTH / 2 - CHARACTER_WIDTH / 2;
        playerY = GAME_HEIGHT - 150;
        playerSpeedY = 0;
        playerDirection = 0; // Reset player direction
        cameraY = 0; // Reset camera position
        
        // Update character position on all faces
        faces.forEach(face => {
            createCharacter(face);
        });
        
        document.querySelector('.cube').classList.remove('game-over-animation');
        
        // Set invulnerability for a short period to prevent immediate death
        isInvulnerable = true;
        setTimeout(() => {
            isInvulnerable = false;
        }, 1000); // 1 second invulnerability after reset
        
        // Reset the resetting flag after animation completes
        isResetting = false;
        isPlatformGenerated = true;
        
        // Set initial jump to start the game with score 1
        setTimeout(() => {
            playerSpeedY = JUMP_FORCE;
            jumpState = 'jumping';
        }, 100);
    }, 1000);
}

// Main game loop
function gameLoop() {
    // Apply gravity
    playerSpeedY += GRAVITY;
    playerY += playerSpeedY;
    
    // Update the camera position if the player goes above a certain point
    if (playerY < cameraY + CAMERA_OFFSET) {
        cameraY = playerY - CAMERA_OFFSET;
    }
    
    // Check for falling to update animation
    if (playerSpeedY > 0 && jumpState === 'idle') {
        jumpState = 'falling';
    }
    
    // Set horizontal speed based on movement direction and whether in air
    let playerSpeedX = 0;
    if (playerDirection !== 0) {
        // Apply faster speed when in the air (not on platform)
        const isInAir = playerSpeedY !== 0 || jumpState !== 'idle';
        playerSpeedX = playerDirection * (isInAir ? AIR_SPEED : GROUND_SPEED);
    }
    
    // Update player horizontal position
    playerX += playerSpeedX;
    
    // Constrain player to game bounds
    if (playerX < 0) {
        playerX = 0;
    } else if (playerX > VISIBLE_GAME_WIDTH - CHARACTER_WIDTH) {
        playerX = VISIBLE_GAME_WIDTH - CHARACTER_WIDTH;
    }
    
    // Update character position on all faces
    updateCharacterPosition();
    
    // Get current face
    const currentFaceName = faces[currentFace];
    
    // Check for collision with platforms - only on current face
    const isOnPlatform = checkPlatformCollision(currentFaceName);
    
    // Check for game over first, before moving platforms
    // Only check for game over if not in reset animation
    if (!isResetting) {
        checkGameOver();
    }
    
    // Move platforms on ALL faces as the camera moves
    faces.forEach(face => {
        movePlatforms(face);
    });
    
    // Update the side previews if enabled
    if (window.showSidePreviews) {
        updateSidePreviews();
    }
    
    // Continue the game loop
    requestAnimationFrame(gameLoop);
}

// Initialize the game when the page loads
window.addEventListener('load', init);