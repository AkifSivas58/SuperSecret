# 🛡️ SuperSecret - AI-Guarded Ephemeral Messaging

![Python](https://img.shields.io/badge/Backend-Python%20Flask-blue?style=for-the-badge&logo=python)
![AI](https://img.shields.io/badge/AI-Hugging%20Face%20Transformers-yellow?style=for-the-badge&logo=huggingface)
![Security](https://img.shields.io/badge/Security-Fernet%20Encryption-green?style=for-the-badge&logo=lock)
![Realtime](https://img.shields.io/badge/Communication-Socket.IO-lightgrey?style=for-the-badge&logo=socket.io)

> **SuperSecret** is a secure, real-time messaging platform developed during the **HUCKATHON**. It features ephemeral chats that self-destruct upon closure and an AI-powered content moderation system that filters toxic language, spam, and malicious URLs in real-time.

---

## 📸 Screenshots
---

## 🚀 Key Features

### 🔒 Privacy & Security by Design
* **Ephemeral Messaging:** Chats are stored in temporary, dynamic SQLite tables (`Chat_{id}`). Once the session ends, the table is `DROPPED`, ensuring **zero data retention**.
* **End-to-End Encryption:** All messages are encrypted using **Fernet (Symmetric Encryption)** before hitting the database[cite: 3, 6].
* **Secure Authentication:** User passwords are hashed using **Bcrypt**[cite: 3].

### 🤖 AI-Powered Content Guard (`MessageChecker.py`)
Unlike standard chat apps, SuperSecret analyzes every message **before** it is delivered using NLP models[cite: 5]:
1.  **Translation Layer:** Automatically translates TR messages to EN using `Helsinki-NLP` for accurate analysis.
2.  **Toxicity Detection:** Blocks offensive content using `RoBERTa` (cardiffnlp/twitter-roberta-base-offensive).
3.  **Phishing/Malicious URL Shield:** Detects harmful links using `BERT` (kmack/malicious-url-detection).
4.  **Spam Filter:** Identifies and blocks spam patterns using `roberta-spam`.

### ⚡ Modern Real-Time UI
* **Socket.IO:** Instant message delivery, status updates (Online/Busy/Offline), and "Mind Connection" requests[cite: 3].
* **Cyberpunk UI:** A responsive, dark-mode interface with particle network animations (`HTML5 Canvas`)[cite: 1, 2].
* **Interactive Status:** Users can request private chats which lock their status to "Busy"[cite: 3].

---

## 🛠️ Tech Stack

### Backend
* **Framework:** Python Flask [cite: 3]
* **Real-time Engine:** Flask-SocketIO [cite: 3]
* **Database:** SQLite (Dynamic Table Architecture) [cite: 3]
* **Security:** Cryptography (Fernet), Bcrypt, JWT (JSON Web Tokens) 

### Artificial Intelligence
* **Libraries:** `transformers`, `torch` [cite: 5]
* **Models:**
    * `kmack/malicious-url-detection`
    * `mshenoda/roberta-spam`
    * `cardiffnlp/twitter-roberta-base-offensive`
    * `Helsinki-NLP/opus-mt-tc-big-tr-en`

### Frontend
* **Core:** HTML5, CSS3 (Custom Variables), JavaScript (ES6+) [cite: 1, 2]
* **Styling:** Bootstrap 5, FontAwesome [cite: 4]
* **Visuals:** Custom Particle Network Animation (`script.js`) [cite: 2]

---

## ⚙️ Installation & Setup

1. **Clone the repository**
   ```bash
   git clone [https://github.com/yourusername/SuperSecret.git](https://github.com/yourusername/SuperSecret.git)
   cd SuperSecret
2. **Create a Virtual Environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
3. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
4. **Configure Environment Create a .env file in the root directory:**
   ```bash
   SECRET_KEY=your_secret_key
   JWT_SECRET_KEY=your_jwt_secret
   FERNET_KEY=your_fernet_key
5. **Run the Application**
   ```bash
   python app.py

The server will start at http://localhost:5000
