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
const busyModal = document.getElementById('busyUserModal');
const busyUserName = document.getElementById('busyUserName');
const busyUserAvatar = document.getElementById('busyUserAvatar');
const closeBusyModal = document.querySelector('.close-busy-modal');
const closeBusyButton = document.querySelector('.close-busy-button');
const logoutButton = document.getElementById('logout');

// Initialize Socket.IO connection with reconnection options
const token = localStorage.getItem('token');
const socket = io('http://localhost:5000', {
    query: { token },
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000
});

// Socket.IO event listeners
socket.on('connect', () => {
    console.log('Socket.IO connection established');
});

socket.on('userStatusUpdate', (data) => {
    updateUserStatus(data.user);
});

socket.on('userList', (data) => {
    createUserElements(data.users);
});

socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
    if (reason === 'io server disconnect') {
        // Server initiated disconnect, try to reconnect
        socket.connect();
    }
});

socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
});

socket.on('connect_timeout', () => {
    console.error('Socket connection timeout');
});

socket.on('reconnect', (attemptNumber) => {
    console.log('Socket reconnected after', attemptNumber, 'attempts');
});

socket.on('reconnect_attempt', (attemptNumber) => {
    console.log('Socket reconnection attempt:', attemptNumber);
});

socket.on('reconnect_error', (error) => {
    console.error('Socket reconnection error:', error);
});

socket.on('reconnect_failed', () => {
    console.error('Socket reconnection failed');
    alert('Connection lost. Please refresh the page.');
});

// Handle user disconnection notification
socket.on('user_disconnected', (data) => {
    console.log('User disconnected:', data.username);
    if (chatUserName.textContent === data.username) {
        // Show temporary notification
        const notification = document.createElement('div');
        notification.className = 'user-disconnected-notification';
        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-text">
                    <strong>${data.username}</strong> bağlantısı kesildi. Yeniden bağlanması bekleniyor...
                </div>
            </div>
        `;
        document.body.appendChild(notification);
        
        // Remove notification after 5 seconds
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 5000);
    }
});

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
    
    // Filter out current user and sort remaining users by status
    const filteredUsers = users.filter(user => user.username !== currentUsername);
    const sortedUsers = sortUsersByStatus(filteredUsers);
    
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
    
    // Get user info from modal
    const targetUsername = requestUserName.textContent;
    
    // Emit chat request to server
    socket.emit('chat_request', {
        targetUsername: targetUsername
    });
});

// Add currentChatRoom variable to track active chat room
let currentChatRoom = null;

// Handle chat request response
socket.on('chat_request_response', (data) => {
    console.log('Received chat request response:', data);
    const loadingContainer = document.querySelector('.loading-container');
    loadingContainer.style.display = 'none';
    
    // Close the request modal
    closeChatRequestModal();
    
    if (data.accepted) {
        console.log('Opening chat window for:', data.targetUsername);
        currentChatRoom = data.chatId;
        // Open chat window with the user
        openChatWindow(data.targetUsername, data.targetAvatar);
    } else {
        // Create and show rejection notification
        const notification = document.createElement('div');
        notification.className = 'rejection-notification';
        notification.innerHTML = `
            <div class="notification-content">
                <img src="${data.targetAvatar}" alt="${data.targetUsername}" class="notification-avatar">
                <div class="notification-text">
                    <strong>${data.targetUsername}</strong> bağlantı isteğinizi reddetti.
                </div>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Remove notification after 3 seconds
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => {
                notification.remove();
            }, 300); // Wait for fade animation
        }, 3000);
    }
});

// Handle open chat window event
socket.on('open_chat_window', (data) => {
    console.log('Received open chat window event:', data);
    currentChatRoom = data.chatId;
    openChatWindow(data.username, data.avatar);
});

// Handle chat ended event
socket.on('chat_ended', (data) => {
    console.log('Chat ended by:', data.username);
    // Close the chat window if it's open with this user
    if (chatUserName.textContent === data.username) {
        currentChatRoom = null;
        chatWindow.style.display = 'none';
        blurOverlay.style.display = 'none';
        chatMessages.innerHTML = '';
        centerChatWindow();
        
        // Show notification
        const notification = document.createElement('div');
        notification.className = 'chat-ended-notification';
        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-text">
                    <strong>${data.username}</strong> bağlantıyı sonlandırdı.
                </div>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Remove notification after 3 seconds
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }
});

// Handle force close chat event
socket.on('force_close_chat', (data) => {
    console.log('Chat force closed by:', data.username);
    
    // Show notification
    const notification = document.createElement('div');
    notification.className = 'chat-ended-notification';
    notification.innerHTML = `
        <div class="notification-content">
            <div class="notification-text">
                <strong>${data.username}</strong> sohbeti sonlandırdı.
            </div>
        </div>
    `;
    document.body.appendChild(notification);
    
    // Remove notification after 3 seconds
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
    
    // Close chat window
    if (chatWindow.style.display === 'block') {
        chatWindow.style.display = 'none';
        blurOverlay.style.display = 'none';
        chatMessages.innerHTML = '';
        currentChatRoom = null;
        centerChatWindow();
    }
});

// Handle error events
socket.on('error', (data) => {
    console.error('Socket error:', data.message);
    
    // Show error notification
    const notification = document.createElement('div');
    notification.className = 'error-notification';
    notification.innerHTML = `
        <div class="notification-content">
            <div class="notification-text">
                <strong>Hata:</strong> ${data.message}
            </div>
        </div>
    `;
    document.body.appendChild(notification);
    
    // Remove notification after 5 seconds
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 5000);
});

// Close chat window
function closeChatWindow() {
    const otherUsername = chatUserName.textContent;
    
    console.log('Closing chat with:', otherUsername);
    
    // Emit close chat event to server
    socket.emit('close_chat', {
        otherUsername: otherUsername
    });
    
    // Close the window locally
    chatWindow.style.display = 'none';
    blurOverlay.style.display = 'none';
    chatMessages.innerHTML = ''; // Clear chat history
    currentChatRoom = null;
    
    // Reset window position and size for next time
    centerChatWindow();
}

// Send message
function sendMessage() {
    const text = chatInput.value.trim();
    if (text === '' || !currentChatRoom) return;
    
    // Get chat partner's username
    const otherUser = chatUserName.textContent;
    
    // Clear input immediately for better UX
    chatInput.value = '';
    
    // Send message through WebSocket
    socket.emit('send_message', {
        other_user: otherUser,
        message: text,
        chat_id: currentChatRoom
    });
}

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
    console.log('Opening chat window for:', userName, 'with avatar:', userAvatar);
    
    if (!chatWindow || !chatUserName || !chatUserAvatar) {
        console.error('Chat window elements not found:', {
            chatWindow: !!chatWindow,
            chatUserName: !!chatUserName,
            chatUserAvatar: !!chatUserAvatar
        });
        return;
    }
    
    chatUserName.textContent = userName;
    // Fix avatar path if it's relative
    if (userAvatar && !userAvatar.startsWith('http')) {
        userAvatar = userAvatar.startsWith('/') ? userAvatar : '/' + userAvatar;
    }
    chatUserAvatar.src = userAvatar;
    chatWindow.style.width = '900px'; // Set initial width
    chatWindow.style.height = '550px'; // Set initial height
    chatWindow.style.display = 'block';
    blurOverlay.style.display = 'block'; // Show blur overlay
    
    // Add a welcome message
    addMessage(`Merhaba! ${userName} ile zihinsel bağlantı kuruldu.`, 'received');
    
    // Join the chat room immediately
    socket.emit('join_chat', { 
        other_user: userName
    });
    
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

// Add message to chat
function addMessage(text, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message message-${type}`;
    messageDiv.textContent = text;
    
    chatMessages.appendChild(messageDiv);
    
    // Scroll to the bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Send message on Enter key press
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// Send message on button click
btnSend.addEventListener('click', () => {
    sendMessage();
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
});

// Update specific user's status
function updateUserStatus(updatedUser) {
    const userElements = document.querySelectorAll('.user-bubble');
    userElements.forEach(element => {
        const username = element.querySelector('.user-name').textContent;
        if (username === updatedUser.username) {
            // Update status class
            const avatar = element.querySelector('.user-avatar');
            avatar.className = `user-avatar ${updatedUser.status}`;
            
            // Update status text
            const statusElement = element.querySelector('.user-status');
            statusElement.className = `user-status ${updatedUser.status}`;
            
            // Translate status to Turkish
            let statusText = '';
            switch(updatedUser.status) {
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
            statusElement.textContent = statusText;
        }
    });
}

// Handle tab/window close
window.addEventListener('beforeunload', () => {
    // If there's an active chat, send chat end event
    if (chatWindow.style.display === 'block') {
        const otherUser = chatUserName.textContent;
        socket.emit('end_chat', {
            other_user: otherUser
        });
    }
});

// Handle incoming chat requests
socket.on('chat_request_received', (data) => {
    console.log('Received chat request from:', data.senderUsername);
    // Show notification to target user
    const notification = document.createElement('div');
    notification.className = 'chat-request-notification';
    notification.innerHTML = `
        <div class="notification-content">
            <img src="${data.senderAvatar}" alt="${data.senderUsername}" class="notification-avatar">
            <div class="notification-text">
                <strong>${data.senderUsername}</strong> sizinle sohbet etmek istiyor
            </div>
            <div class="notification-buttons">
                <button class="btn-accept">Kabul Et</button>
                <button class="btn-reject">Reddet</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Add event listeners to buttons
    const acceptBtn = notification.querySelector('.btn-accept');
    const rejectBtn = notification.querySelector('.btn-reject');
    
    acceptBtn.addEventListener('click', () => {
        socket.emit('chat_request_response', {
            requestId: data.requestId,
            accepted: true
        });
        notification.remove();
    });
    
    rejectBtn.addEventListener('click', () => {
        socket.emit('chat_request_response', {
            requestId: data.requestId,
            accepted: false
        });
        notification.remove();
    });
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

// Handle chat started event
socket.on('chat_started', (data) => {
    console.log('Chat started:', data);
    // Clear existing messages first
    chatMessages.innerHTML = '';
    
    // Display chat history
    if (data.messages && data.messages.length > 0) {
        data.messages.forEach(msg => {
            const messageType = msg.sender === chatUserName.textContent ? 'received' : 'sent';
            addMessage(msg.message, messageType);
        });
    }
});

// Handle new messages
socket.on('new_message', (data) => {
    console.log('New message received:', data);
    // Add message only if it's from the other user or if it's a confirmation of our message
    const messageType = data.sender === chatUserName.textContent ? 'received' : 'sent';
    addMessage(data.message, messageType);
});