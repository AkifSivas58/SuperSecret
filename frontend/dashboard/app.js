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

// DOM elements
const userGrid = document.querySelector('.user-grid');
const modal = document.getElementById('chatRequestModal');
const closeModal = document.querySelector('.close-modal');
const cancelButton = document.querySelector('.btn-request-cancel');
const acceptButton = document.querySelector('.btn-request-accept');
const requestUserName = document.getElementById('requestUserName');
const requestUserAvatar = document.getElementById('requestUserAvatar');
const logoutButton = document.getElementById('logout');

// Set current user from localStorage
const currentUsername = localStorage.getItem('username');
if (!currentUsername) {
    // If no username in localStorage, redirect to login
    window.location.href = '../login/index.html';
} else {
    document.querySelector('.username').textContent = currentUsername;
}

// Fetch users from backend
async function fetchUsers() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '../login/index.html';
            return;
        }

        const response = await fetch('http://localhost:5000/users', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            createUserElements(data.users);
        } else {
            console.error('Failed to fetch users');
        }
    } catch (error) {
        console.error('Error fetching users:', error);
    }
}

// Sort users by status (idle, busy, offline)
function sortUsersByStatus(users) {
    // Status priority: 1. idle, 2. busy, 3. offline
    const statusPriority = {
        'idle': 1,
        'busy': 2,
        'offline': 3
    };
    
    return [...users].sort((a, b) => {
        return statusPriority[a.status] - statusPriority[b.status];
    });
}

// Create user elements
function createUserElements(users) {
    userGrid.innerHTML = '';
    
    // Sort users by status before creating elements
    const sortedUsers = sortUsersByStatus(users);
    
    sortedUsers.forEach(user => {
        const userElement = document.createElement('div');
        userElement.className = 'user-bubble';
        
        // Translate status to Turkish
        let statusText = '';
        switch(user.status) {
            case 'idle':
                statusText = 'Aktif';
                break;
            case 'busy':
                statusText = 'Meşgul';
                break;
            case 'offline':
                statusText = 'Çevrimdışı';
                break;
        }
        
        userElement.innerHTML = `
            <div class="user-avatar ${user.status}">
                <img src="${user.avatar}" alt="${user.username}">
            </div>
            <div class="user-name">${user.username}</div>
            <div class="user-status ${user.status}">${statusText}</div>
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
            openOfflineUserModal(user);
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
    // Hide loading container when modal is closed
    document.querySelector('.loading-container').style.display = 'none';
}

function openBusyUserModal(user) {
    busyUserName.textContent = user.username;
    busyUserAvatar.src = user.avatar;
    document.querySelector('#busyUserModal .request-user-info p').innerHTML = `
        <span id="busyUserName">${user.username}</span> kullanıcısı başka bir kullanıcı ile zihinsel bağlantıda. Lütfen sonra tekrar deneyiniz.
    `;
    busyModal.style.display = 'block';
}

function openOfflineUserModal(user) {
    busyUserName.textContent = user.username;
    busyUserAvatar.src = user.avatar;
    document.querySelector('#busyUserModal .request-user-info p').innerHTML = `
        <span id="busyUserName">${user.username}</span> kullanıcısı şuan offline
    `;
    document.querySelector('#busyUserModal .request-user-avatar').classList.remove('busy');
    document.querySelector('#busyUserModal .request-user-avatar').classList.add('offline');
    busyModal.style.display = 'block';
}

function closeBusyUserModal() {
    busyModal.style.display = 'none';
    // Reset the avatar classes
    document.querySelector('#busyUserModal .request-user-avatar').classList.remove('offline');
    document.querySelector('#busyUserModal .request-user-avatar').classList.add('busy');
    // Reset the error message back to default
    document.querySelector('#busyUserModal .request-user-info p').innerHTML = `
        <span id="busyUserName"></span> kullanıcısı başka bir kullanıcı ile zihinsel bağlantıda. Lütfen sonra tekrar deneyiniz.
    `;
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
    // Show loading animation
    const loadingContainer = document.querySelector('.loading-container');
    loadingContainer.style.display = 'flex';
    
    // Simulate request delay (3 seconds)
    setTimeout(() => {
        // Hide loading animation
        loadingContainer.style.display = 'none';
        
        // Close the modal and open chat window
        closeChatRequestModal();
        
        // Get user info from modal
        const userName = requestUserName.textContent;
        const userAvatar = requestUserAvatar.src;
        
        // Open chat window
        openChatWindow(userName, userAvatar);
    }, 3000);
});

// Logout functionality
logoutButton.addEventListener('click', async () => {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '../login/index.html';
            return;
        }

        const response = await fetch('http://localhost:5000/logout', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            // Clear local storage
            localStorage.removeItem('token');
            localStorage.removeItem('username');
            // Redirect to login page
            window.location.href = '../login/index.html';
        } else {
            console.error('Logout failed');
        }
    } catch (error) {
        console.error('Logout error:', error);
    }
});

// Chat Window Functionality
const chatWindow = document.getElementById('chatWindow');
const chatHeader = document.getElementById('chatHeader');
const chatUserName = document.getElementById('chatUserName');
const chatUserAvatar = document.getElementById('chatUserAvatar');
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const btnClose = document.querySelector('.btn-close');
const btnSend = document.querySelector('.btn-send');
const blurOverlay = document.getElementById('blurOverlay');

// Open chat window
function openChatWindow(userName, userAvatar) {
    chatUserName.textContent = userName;
    chatUserAvatar.src = userAvatar;
    chatWindow.style.width = '900px'; // Set initial width
    chatWindow.style.height = '550px'; // Set initial height
    chatWindow.style.display = 'block';
    blurOverlay.style.display = 'block'; // Show blur overlay
    
    // Add a welcome message
    addMessage(`Merhaba! ${userName} ile zihinsel bağlantı kuruldu.`, 'received');
    
    // Focus on the input
    chatInput.focus();
    
    // Center the window initially
    centerChatWindow();
}

// Center chat window in the screen
function centerChatWindow() {
    const rect = chatWindow.getBoundingClientRect();
    currentX = (window.innerWidth - 900) / 2; // Updated width
    currentY = (window.innerHeight - 550) / 2;
    chatWindow.style.transform = 'none';
    chatWindow.style.top = '0';
    chatWindow.style.left = '0';
    chatWindow.style.width = '900px'; // Set default width
    chatWindow.style.height = '550px'; // Set default height
    setTransform(currentX, currentY);
    xOffset = currentX;
    yOffset = currentY;
}

// Close chat window
function closeChatWindow() {
    chatWindow.style.display = 'none';
    blurOverlay.style.display = 'none'; // Hide blur overlay
    chatMessages.innerHTML = ''; // Clear chat history
    
    // Reset window position and size for next time
    centerChatWindow();
}

// Add message to chat
function addMessage(text, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message message-${type}`;
    messageDiv.textContent = text;
    
    chatMessages.appendChild(messageDiv);
    
    // Scroll to the bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Send message
function sendMessage() {
    const text = chatInput.value.trim();
    if (text === '') return;
    
    // Add user message
    addMessage(text, 'sent');
    
    // Clear input
    chatInput.value = '';
    
    // In a real app, this would send the message via WebSocket or similar
    // Simulate a response after a short delay
    setTimeout(() => {
        addMessage('Bu özellik şu anda geliştirme aşamasındadır.', 'received');
    }, 1000);
}

// Send message on button click
btnSend.addEventListener('click', sendMessage);

// Send message on Enter key press
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// Close chat window button
btnClose.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent event from bubbling to header
    closeChatWindow();
});

// Make the chat window draggable
let isDragging = false;
let currentX = 0;
let currentY = 0;
let initialX = 0;
let initialY = 0;
let xOffset = 0;
let yOffset = 0;
let rafId = null;

function handleDragStart(e) {
    // Don't start drag if clicking on control buttons
    if (e.target.closest('.chat-controls')) return;
    
    // Only allow dragging from the header area (excluding controls)
    if (!e.target.closest('.chat-header')) return;
    
    isDragging = true;
    chatWindow.classList.add('dragging');

    initialX = e.clientX - xOffset;
    initialY = e.clientY - yOffset;

    e.preventDefault();
}

function handleDrag(e) {
    if (!isDragging) return;

    e.preventDefault();

    // Calculate the new position
    currentX = e.clientX - initialX;
    currentY = e.clientY - initialY;

    // Keep window within viewport bounds
    const rect = chatWindow.getBoundingClientRect();
    const winWidth = window.innerWidth;
    const winHeight = window.innerHeight;

    // Allow dragging to screen edges
    currentX = Math.max(0, Math.min(currentX, winWidth - rect.width));
    currentY = Math.max(0, Math.min(currentY, winHeight - rect.height));

    // Use requestAnimationFrame for smooth animation
    if (rafId) {
        cancelAnimationFrame(rafId);
    }

    rafId = requestAnimationFrame(() => {
        setTransform(currentX, currentY);
    });
}

function handleDragEnd() {
    isDragging = false;
    chatWindow.classList.remove('dragging');

    if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
    }

    xOffset = currentX;
    yOffset = currentY;
}

function setTransform(x, y) {
    chatWindow.style.transform = `translate3d(${x}px, ${y}px, 0)`;
}

// Add event listeners for dragging
chatWindow.addEventListener('mousedown', handleDragStart);
document.addEventListener('mousemove', handleDrag, { passive: false });
document.addEventListener('mouseup', handleDragEnd);

// Prevent text selection during drag
chatHeader.addEventListener('selectstart', (e) => {
    if (isDragging) e.preventDefault();
});

// Handle window resize
let resizeTimeout;
window.addEventListener('resize', () => {
    if (resizeTimeout) {
        clearTimeout(resizeTimeout);
    }

    resizeTimeout = setTimeout(() => {
        const winWidth = window.innerWidth;
        const winHeight = window.innerHeight;
        const rect = chatWindow.getBoundingClientRect();

        if (rect.right > winWidth) {
            currentX = winWidth - rect.width;
            setTransform(currentX, currentY);
            xOffset = currentX;
        }
        if (rect.bottom > winHeight) {
            currentY = winHeight - rect.height;
            setTransform(currentX, currentY);
            yOffset = currentY;
        }
    }, 100);
});

// Close chat when clicking on blur overlay
blurOverlay.addEventListener('click', (e) => {
    if (e.target === blurOverlay) {
        closeChatWindow();
    }
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    fetchUsers();
    // Refresh user list every 30 seconds
    setInterval(fetchUsers, 30000);
});