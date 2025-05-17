const canvas = document.getElementById('networkCanvas');
const ctx = canvas.getContext('2d');

// Kanvas boyutunu ayarla
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Pencere boyutu değiştiğinde kanvas boyutunu güncelle
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    init(); // Boyut değişince parçacıkları yeniden oluştur (isteğe bağlı)
});

// Fare pozisyonunu takip et
const mouse = {
    x: null,
    y: null,
    radius: 150 // Fare etrafındaki etkileşim alanı
};

window.addEventListener('mousemove', (event) => {
    mouse.x = event.clientX;
    mouse.y = event.clientY;
});

// Fare imleci ekrandan çıktığında pozisyonu sıfırla
window.addEventListener('mouseout', () => {
    mouse.x = null;
    mouse.y = null;
});


// Parçacık (düğüm) sınıfı
class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = 2; // Parçacık boyutu
        // Rastgele hareket yönü ve hızı
        this.baseX = this.x;
        this.baseY = this.y;
        this.density = (Math.random() * 30) + 1; // Fareye tepki verme yoğunluğu
        this.speedX = Math.random() * 0.5 - 0.25; // Rastgele yatay hız (-0.25 ile 0.25 arası)
        this.speedY = Math.random() * 0.5 - 0.25; // Rastgele dikey hız (-0.25 ile 0.25 arası)
    }

    // Parçacığı çizme
    draw() {
        ctx.fillStyle = 'rgba(150, 255, 250, 0.8)'; // Parçacık rengi (açık mavi/yeşil)
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fill();
    }

    // Parçacığın pozisyonunu güncelleme (hareket ve fare tepkisi)
    update() {
         // Rastgele hareket
         this.x += this.speedX;
         this.y += this.speedY;

         // Ekran sınırlarından dışarı çıkınca yön değiştirme
         if (this.x > canvas.width || this.x < 0) {
             this.speedX = -this.speedX;
         }
         if (this.y > canvas.height || this.y < 0) {
             this.speedY = -this.speedY;
         }


        // Fare ile etkileşim
        const dx = mouse.x - this.x;
        const dy = mouse.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy); // Fareye olan uzaklık

        const forceDirectionX = dx / distance;
        const forceDirectionY = dy / distance;
        const maxDistance = mouse.radius;
        const force = (maxDistance - distance) / maxDistance; // Uzaklaştıkça azalan kuvvet


        // Fare etki alanındaysa parçacığı çek
        if (distance < mouse.radius && mouse.x !== null && mouse.y !== null) {
             const pullStrength = force * this.density * 0.1; // Çekme kuvveti (değeri ayarlayabilirsiniz)
             this.x += forceDirectionX * pullStrength; // Fareye doğru çek
             this.y += forceDirectionY * pullStrength;
        } else {
            // Fare etki alanında değilse yavaşça başlangıç pozisyonuna dön
            if (this.x !== this.baseX || this.y !== this.baseY) {
                const dxBase = this.x - this.baseX;
                const dyBase = this.y - this.baseY;
                const returnSpeed = 0.05; // Geri dönme hızı (değeri ayarlayabilirsiniz)
                this.x -= dxBase * returnSpeed;
                this.y -= dyBase * returnSpeed;
            }
        }
    }
}

// Parçacık dizisi
let particlesArray = [];
const numberOfParticles = 250   ; // Parçacık sayısını artırdım (isteğe bağlı)

// Parçacıkları başlatma
function init() {
    particlesArray = []; // Diziyi temizle
    for (let i = 0; i < numberOfParticles; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        particlesArray.push(new Particle(x, y));
    }
}

// Başlat
init();

// Parçacıklar arasına ve fareye çizgiler çizme
function connect() {
    const connectionDistance = 100; // Parçacıkların birbirine bağlanacağı maksimum mesafe
    const mouseConnectionDistance = mouse.radius; // Parçacıkların fareye bağlanacağı mesafe

    for (let a = 0; a < particlesArray.length; a++) {
        for (let b = a; b < particlesArray.length; b++) {
            const particle1 = particlesArray[a];
            const particle2 = particlesArray[b];

            // Parçacıklar arasındaki mesafe
            const dx = particle1.x - particle2.x;
            const dy = particle1.y - particle2.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Belirli bir mesafe içindeyse çizgi çiz
            if (distance < connectionDistance) {
                ctx.strokeStyle = `rgba(150, 255, 250, ${1 - (distance / connectionDistance)})`; // Uzaklaştıkça saydamlaşsın
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(particle1.x, particle1.y);
                ctx.lineTo(particle2.x, particle2.y);
                ctx.stroke();
            }
        }

        // Parçacık ile fare arasındaki mesafe (fare ekrandaysa)
        if (mouse.x !== null && mouse.y !== null) {
            const dxMouse = particlesArray[a].x - mouse.x;
            const dyMouse = particlesArray[a].y - mouse.y;
            const distanceMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);

            // Belirli bir mesafe içindeyse fareye çizgi çiz
            if (distanceMouse < mouseConnectionDistance) {
                 // Fareye yaklaştıkça çizgi daha belirgin olsun
                 const opacity = 1 - (distanceMouse / mouseConnectionDistance);
                 ctx.strokeStyle = `rgba(255, 100, 150, ${opacity})`; // Fare çizgisi rengi ve saydamlığı (pembe/kırmızı tonu)
                 ctx.lineWidth = 1 + (1 - opacity) * 2; // Fareye yaklaştıkça çizgi kalınlığı artsın (1 ile 3 arası)
                 ctx.beginPath();
                 ctx.moveTo(particlesArray[a].x, particlesArray[a].y);
                 ctx.lineTo(mouse.x, mouse.y);
                 ctx.stroke();
            }
        }
    }
}


// Animasyon döngüsü
function animate() {
    // Kanvası temizle (veya hafifçe saydam bir katman çizerek iz bırakma efekti oluşturabilirsiniz)
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // ctx.fillStyle = 'rgba(10, 10, 35, 0.1)'; // Hafif iz bırakma efekti için
    // ctx.fillRect(0, 0, canvas.width, canvas.height);


    for (let i = 0; i < particlesArray.length; i++) {
        particlesArray[i].update(); // Parçacık pozisyonunu güncelle
    }
    connect(); // Çizgileri çiz
    requestAnimationFrame(animate); // Bir sonraki frame için animasyonu tekrar çağır
}

// Animasyonu başlat
animate();

// Password validation function
function validatePassword(username, password) {
    // Password strength regex:
    // At least 8 characters long
    // Contains at least one uppercase letter
    // Contains at least one lowercase letter
    // Contains at least one number
    // Contains at least one special character
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+}{"':;?/>.<,])(?=.{8,})/;

    if (!passwordRegex.test(password)) {
        alert("Şifre yeterince güçlü değil. En az 8 karakter uzunluğunda olmalı ve büyük harf, küçük harf, rakam ve özel karakter içermelidir.");
        return false;
    }

    // Check if username is in password (case-insensitive)
    if (password.toLowerCase().includes(username.toLowerCase())) {
        alert("Şifre kullanıcı adınızı içeremez.");
        return false;
    }

    return true; // Password is valid
}

// Form event listeners
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');

if (loginForm) {
    loginForm.addEventListener('submit', (event) => {
        const usernameInput = document.getElementById('login-username');
        const passwordInput = document.getElementById('login-password');
        const username = usernameInput.value;
        const password = passwordInput.value;

        if (!validatePassword(username, password)) {
            event.preventDefault(); // Prevent form submission
        }
    });
}

// Function to calculate password strength
function calculatePasswordStrength(password) {
    let strength = 0;
    const minLength = 8;

    if (password.length >= minLength) {
        strength += 20; // Points for length
    }

    if (password.match(/[a-z]/)) {
        strength += 20; // Points for lowercase letters
    }

    if (password.match(/[A-Z]/)) {
        strength += 20; // Points for uppercase letters
    }

    if (password.match(/\d/)) {
        strength += 20; // Points for numbers
    }

    if (password.match(/[!@#$%^&*()_+}{"':;?/>.<,]/)) {
        strength += 20; // Points for special characters
    }

    // Cap strength at 100
    return Math.min(strength, 100);
}

// Event listener for registration password input
const registerPasswordInput = document.getElementById('register-password');
const passwordStrengthBar = document.getElementById('password-strength-bar');

if (registerPasswordInput && passwordStrengthBar) {
    registerPasswordInput.addEventListener('input', (event) => {
        const password = event.target.value;
        const strength = calculatePasswordStrength(password);

        // Update bar width
        passwordStrengthBar.style.width = strength + '%';

        // Update bar color based on strength
        if (strength < 40) {
            passwordStrengthBar.style.backgroundColor = 'red';
        } else if (strength < 80) {
            passwordStrengthBar.style.backgroundColor = 'orange';
        } else {
            passwordStrengthBar.style.backgroundColor = 'green';
        }
    });
}

if (registerForm) {
    registerForm.addEventListener('submit', (event) => {
        const usernameInput = document.getElementById('register-username');
        const passwordInput = document.getElementById('register-password');
        const password2Input = document.getElementById('register-password2');
        const username = usernameInput.value;
        const password = passwordInput.value;
        const password2 = password2Input.value;

        if (password !== password2) {
            alert("Şifreler eşleşmiyor.");
            event.preventDefault();
            return;
        }

        if (!validatePassword(username, password)) {
            event.preventDefault(); // Prevent form submission
        }
    });
}
