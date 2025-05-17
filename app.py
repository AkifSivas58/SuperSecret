from flask import Flask, request, jsonify
import sqlite3
from datetime import datetime
from cryptography.fernet import Fernet
from DataBase import DB
app = Flask(__name__)

# load_dotenv()
# Bunu .env dosyasından al!!!
key = Fernet.generate_key() 
fernet = Fernet(key)
db = DB()
db.CreateDb()

@app.route("/register", methods=['POST'])
def register():
    data = request.get_json()
    db.InsertUser(data['username'], data["password"])
    return jsonify({"message": "Successful register."})

@app.route("/status", methods=["POST"])
def update_status():
    data = request.get_json()
    db.SetUserStatus(data["username"], data["status"])
    return jsonify({"message": f"Status updated to {data["status"]}."})

@app.route("/start_chat", methods=["POST"])
def start_chat():
    data = request.get_json()
    db.cursor.execute("INSERT INTO All_messages (MainUser, ConnectionUser) VALUES (?, ?)", (data['user1'], data['user2']))
    chat_id = db.cursor.lastrowid
    db.CreateChat(chat_id)
    return jsonify({"chat_id": chat_id})

@app.route("/send_message", methods=["POST"])
def send_message():
    data = request.get_json()
    sender_id = data["sender_id"]
    receiver_id = data["receiver_id"]
    content = data["content"]

    # Bağlantı kontrolü
    conn_check = db.execute("""
        SELECT * FROM connections
        WHERE (
            (requester_id = ? AND receiver_id = ?)
            OR
            (requester_id = ? AND receiver_id = ?)
        )
        AND status = 'accepted'
    """, (sender_id, receiver_id, receiver_id, sender_id)).fetchone()

    if not conn_check:
        return jsonify({"error": "Bağlantı kabul edilmediği için mesaj gönderilemez."}), 403

    db.execute("INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)", (sender_id, receiver_id, content))
    db.commit()
    return jsonify({"message": "Mesaj gönderildi."}), 200

@app.route("/get_messages/<int:chat_id>", methods=["GET"])
def get_messages(chat_id):
    messages = db.GetMessages(chat_id)
    result = []
    for time, sender, message in messages:
        result.append({
            "time": time,
            "sender": sender,
            "message": fernet.decrypt(message.encode()).decode()
        })
    
    return jsonify(result)

@app.route('/delete_chat/<int:chat_id>', methods=['DELETE'])
def delete_chat(chat_id):
    db.DeleteChat(chat_id)
    return jsonify({"message": f"Chat {chat_id} deleted."})

app.route("/connect", methods=["POST"])
def connect():
    data = request.get_json()
    requester_id = data["requester_id"]
    receiver_id = data["receiver_id"]

    # Aynı istek var mı kontrol et
    exists = db.execute("SELECT * FROM connections WHERE requester_id=? AND receiver_id=?", (requester_id, receiver_id)).fetchone()
    if exists:
        return jsonify({"message": "İstek zaten gönderildi."}), 400

    db.execute("INSERT INTO connections (requester_id, receiver_id, status) VALUES (?, ?, ?)", (requester_id, receiver_id, "pending"))
    db.commit()
    return jsonify({"message": "İstek gönderildi."}), 200

@app.route("/accept", methods=["POST"])
def accept():
    data = request.get_json()
    requester_id = data["requester_id"]
    receiver_id = data["receiver_id"]

    db.execute("UPDATE connections SET status='accepted' WHERE requester_id=? AND receiver_id=?", (requester_id, receiver_id))
    db.commit()
    return jsonify({"message": "Bağlantı kabul edildi."}), 200

if __name__ == "__main__":
    app.run(debug=True)
