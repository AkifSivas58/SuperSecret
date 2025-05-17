// Network Background Effect
const canvas = document.getElementById('networkCanvas');
const ctx = canvas.getContext('2d');

// Set canvas dimensions
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Resize canvas when window is resized
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    init(); // Reinitialize particles
});

// Track mouse position
const mouse = {
    x: null,
    y: null,
    radius: 150 // Mouse interaction radius
};

window.addEventListener('mousemove', (event) => {
    mouse.x = event.clientX;
    mouse.y = event.clientY;
});

window.addEventListener('mouseout', () => {
    mouse.x = null;
    mouse.y = null;
});

// Particle class for network nodes
class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = 2;
        this.baseX = this.x;
        this.baseY = this.y;
        this.density = (Math.random() * 30) + 1;
        this.speedX = Math.random() * 0.5 - 0.25;
        this.speedY = Math.random() * 0.5 - 0.25;
    }

    draw() {
        ctx.fillStyle = 'rgba(150, 255, 250, 0.8)';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fill();
    }

    update() {
        // Random movement
        this.x += this.speedX;
        this.y += this.speedY;

        // Bounce off screen edges
        if (this.x > canvas.width || this.x < 0) {
            this.speedX = -this.speedX;
        }
        if (this.y > canvas.height || this.y < 0) {
            this.speedY = -this.speedY;
        }

        // Mouse interaction
        const dx = mouse.x - this.x;
        const dy = mouse.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        const forceDirectionX = dx / distance;
        const forceDirectionY = dy / distance;
        const maxDistance = mouse.radius;
        const force = (maxDistance - distance) / maxDistance;

        if (distance < mouse.radius && mouse.x !== null && mouse.y !== null) {
            const pullStrength = force * this.density * 0.1;
            this.x += forceDirectionX * pullStrength;
            this.y += forceDirectionY * pullStrength;
        } else {
            if (this.x !== this.baseX || this.y !== this.baseY) {
                const dxBase = this.x - this.baseX;
                const dyBase = this.y - this.baseY;
                const returnSpeed = 0.05;
                this.x -= dxBase * returnSpeed;
                this.y -= dyBase * returnSpeed;
            }
        }
    }
}

let particlesArray = [];
const numberOfParticles = 150;

// Initialize particles
function init() {
    particlesArray = [];
    for (let i = 0; i < numberOfParticles; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        particlesArray.push(new Particle(x, y));
    }
}

// Connect particles with lines
function connect() {
    const connectionDistance = 100;
    const mouseConnectionDistance = mouse.radius;

    for (let a = 0; a < particlesArray.length; a++) {
        for (let b = a; b < particlesArray.length; b++) {
            const particle1 = particlesArray[a];
            const particle2 = particlesArray[b];

            const dx = particle1.x - particle2.x;
            const dy = particle1.y - particle2.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < connectionDistance) {
                ctx.strokeStyle = `rgba(150, 255, 250, ${1 - (distance / connectionDistance)})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(particle1.x, particle1.y);
                ctx.lineTo(particle2.x, particle2.y);
                ctx.stroke();
            }
        }

        if (mouse.x !== null && mouse.y !== null) {
            const dxMouse = particlesArray[a].x - mouse.x;
            const dyMouse = particlesArray[a].y - mouse.y;
            const distanceMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);

            if (distanceMouse < mouseConnectionDistance) {
                const opacity = 1 - (distanceMouse / mouseConnectionDistance);
                ctx.strokeStyle = `rgba(255, 100, 150, ${opacity})`;
                ctx.lineWidth = 1 + (1 - opacity) * 2;
                ctx.beginPath();
                ctx.moveTo(particlesArray[a].x, particlesArray[a].y);
                ctx.lineTo(mouse.x, mouse.y);
                ctx.stroke();
            }
        }
    }
}

// Animation loop
function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < particlesArray.length; i++) {
        particlesArray[i].update();
        particlesArray[i].draw();
    }
    connect();
    requestAnimationFrame(animate);
}

init();
animate();

// Mock user data (in a real app, this would come from an API)
const users = [
    { id: 1, username: 'Neuro_Mind78', avatar: '../../assets/Gemini_Generated_Image_v00jscv00jscv00j.png', status: 'idle' },
    { id: 2, username: 'CyberThought', avatar: '../../assets/ChatGPT Image May 17, 2025, 03_10_49 PM.png', status: 'busy' },
    { id: 3, username: 'QuantumBrain', avatar: '../../assets/Gemini_Generated_Image_v00jscv00jscv00j.png', status: 'offline' },
    { id: 4, username: 'SynapticLink', avatar: '../../assets/ChatGPT Image May 17, 2025, 03_10_49 PM.png', status: 'busy' },
    { id: 5, username: 'NeuralNexus', avatar: '../../assets/Gemini_Generated_Image_v00jscv00jscv00j.png', status: 'idle' },
    { id: 6, username: 'MindWaver', avatar: '../../assets/ChatGPT Image May 17, 2025, 03_10_49 PM.png', status: 'offline' },
    { id: 7, username: 'ThoughtStream', avatar: '../../assets/Gemini_Generated_Image_v00jscv00jscv00j.png', status: 'idle' },
    { id: 8, username: 'CerebralSynth', avatar: '../../assets/ChatGPT Image May 17, 2025, 03_10_49 PM.png', status: 'busy' },
];

// DOM elements
const userGrid = document.querySelector('.user-grid');
const modal = document.getElementById('chatRequestModal');
const closeModal = document.querySelector('.close-modal');
const cancelButton = document.querySelector('.btn-request-cancel');
const acceptButton = document.querySelector('.btn-request-accept');
const requestUserName = document.getElementById('requestUserName');
const requestUserAvatar = document.getElementById('requestUserAvatar');
const logoutButton = document.getElementById('logout');

// Set current user
document.querySelector('.username').textContent = "Neuro_Mind78";

// Create user elements
function createUserElements() {
    userGrid.innerHTML = '';
    
    users.forEach(user => {
        // Skip current user
        if (user.username === "Neuro_Mind78") return;
        
        const userElement = document.createElement('div');
        userElement.className = 'user-bubble';
        userElement.dataset.userId = user.id;
        
        userElement.innerHTML = `
            <div class="user-avatar ${user.status}">
                <img src="${user.avatar}" alt="${user.username}">
            </div>
            <div class="user-name">${user.username}</div>
        `;
        
        userElement.addEventListener('click', () => handleUserClick(user));
        userGrid.appendChild(userElement);
    });
}

// Modal functionality
const busyModal = document.getElementById('busyUserModal');
const busyUserName = document.getElementById('busyUserName');
const busyUserAvatar = document.getElementById('busyUserAvatar');
const closeBusyModal = document.querySelector('.close-busy-modal');
const closeBusyButton = document.querySelector('.close-busy-button');

// Handle user click based on status
function handleUserClick(user) {
    switch(user.status) {
        case 'idle':
            openChatRequestModal(user);
            break;
        case 'busy':
            openBusyUserModal(user);
            break;
        case 'offline':
            // Do nothing for offline users
            break;
    }
}

function openChatRequestModal(user) {
    requestUserName.textContent = user.username;
    requestUserAvatar.src = user.avatar;
    modal.style.display = 'block';
}

function closeChatRequestModal() {
    modal.style.display = 'none';
}

function openBusyUserModal(user) {
    busyUserName.textContent = user.username;
    busyUserAvatar.src = user.avatar;
    busyModal.style.display = 'block';
}

function closeBusyUserModal() {
    busyModal.style.display = 'none';
}

closeModal.addEventListener('click', closeChatRequestModal);
cancelButton.addEventListener('click', closeChatRequestModal);

// Close modals when clicking outside
window.addEventListener('click', (event) => {
    if (event.target === modal) {
        closeChatRequestModal();
    }
    if (event.target === busyModal) {
        closeBusyUserModal();
    }
});

// Add event listeners for busy modal
closeBusyModal.addEventListener('click', closeBusyUserModal);
closeBusyButton.addEventListener('click', closeBusyUserModal);

// Accept chat request
acceptButton.addEventListener('click', () => {
    // In a real app, this would initiate a WebSocket connection or similar
    alert('Zihinsel bağlantı kuruldu! Bu özellik şu anda geliştirme aşamasındadır.');
    closeChatRequestModal();
});

// Logout functionality
logoutButton.addEventListener('click', () => {
    // In a real app, this would handle proper logout logic
    window.location.href = '../login/index.html';
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    createUserElements();
});