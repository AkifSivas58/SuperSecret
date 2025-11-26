# 🛡️ SuperSecret - AI-Guarded Ephemeral Messaging

![Python](https://img.shields.io/badge/Backend-Python%20Flask-blue?style=for-the-badge&logo=python)
![AI](https://img.shields.io/badge/AI-Hugging%20Face%20Transformers-yellow?style=for-the-badge&logo=huggingface)
![Security](https://img.shields.io/badge/Security-Fernet%20Encryption-green?style=for-the-badge&logo=lock)
![Realtime](https://img.shields.io/badge/Communication-Socket.IO-lightgrey?style=for-the-badge&logo=socket.io)

> **SuperSecret** is a secure, real-time messaging platform developed during the **BTK Akademi Hackathon**. It features ephemeral chats that self-destruct upon closure and an AI-powered content moderation system that filters toxic language, spam, and malicious URLs in real-time.

---

## 📸 Screenshots
---

## 🚀 Key Features

### 🔒 Privacy & Security by Design
* **Ephemeral Messaging:** Chats are stored in temporary, dynamic SQLite tables (`Chat_{id}`). [cite_start]Once the session ends, the table is `DROPPED`, ensuring **zero data retention**[cite: 3].
* [cite_start]**End-to-End Encryption:** All messages are encrypted using **Fernet (Symmetric Encryption)** before hitting the database[cite: 3, 6].
* [cite_start]**Secure Authentication:** User passwords are hashed using **Bcrypt**[cite: 3].

### 🤖 AI-Powered Content Guard (`MessageChecker.py`)
[cite_start]Unlike standard chat apps, SuperSecret analyzes every message **before** it is delivered using NLP models[cite: 5]:
1.  **Translation Layer:** Automatically translates TR messages to EN using `Helsinki-NLP` for accurate analysis.
2.  **Toxicity Detection:** Blocks offensive content using `RoBERTa` (cardiffnlp/twitter-roberta-base-offensive).
3.  **Phishing/Malicious URL Shield:** Detects harmful links using `BERT` (kmack/malicious-url-detection).
4.  **Spam Filter:** Identifies and blocks spam patterns using `roberta-spam`.

### ⚡ Modern Real-Time UI
* [cite_start]**Socket.IO:** Instant message delivery, status updates (Online/Busy/Offline), and "Mind Connection" requests[cite: 3].
* [cite_start]**Cyberpunk UI:** A responsive, dark-mode interface with particle network animations (`HTML5 Canvas`)[cite: 1, 2].
* [cite_start]**Interactive Status:** Users can request private chats which lock their status to "Busy"[cite: 3].

---

## 🛠️ Tech Stack

### Backend
* [cite_start]**Framework:** Python Flask [cite: 3]
* [cite_start]**Real-time Engine:** Flask-SocketIO [cite: 3]
* [cite_start]**Database:** SQLite (Dynamic Table Architecture) [cite: 3]
* [cite_start]**Security:** Cryptography (Fernet), Bcrypt, JWT (JSON Web Tokens) 

### Artificial Intelligence
* [cite_start]**Libraries:** `transformers`, `torch` [cite: 5]
* **Models:**
    * `kmack/malicious-url-detection`
    * `mshenoda/roberta-spam`
    * `cardiffnlp/twitter-roberta-base-offensive`
    * `Helsinki-NLP/opus-mt-tc-big-tr-en`

### Frontend
* [cite_start]**Core:** HTML5, CSS3 (Custom Variables), JavaScript (ES6+) [cite: 1, 2]
* [cite_start]**Styling:** Bootstrap 5, FontAwesome [cite: 4]
* [cite_start]**Visuals:** Custom Particle Network Animation (`script.js`) [cite: 2]

---

## ⚙️ Installation & Setup

1. **Clone the repository**
   ```bash
   git clone [https://github.com/yourusername/SuperSecret.git](https://github.com/yourusername/SuperSecret.git)
   cd SuperSecret
