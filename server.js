const express = require('express');
const path = require('path');
const app = express();

// Statik dosyaları serve et
app.use(express.static(path.join(__dirname)));

// Ana rotayı index.html'e yönlendir
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'login', 'index.html'));
});

// Dashboard rotası
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'dashboard', 'dashboard.html'));
});

// 404 sayfası
app.use((req, res) => {
    res.status(404).send('Sayfa bulunamadı');
});

// Sunucuyu başlat
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
}); 