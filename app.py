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
    db.InsertUser(data['username'], data["email"], data["password"])
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

@app.route("/send_message", methods=['POST'])
def send_message():
    data = request.get_json()
    encoded = fernet.encrypt(data["message"].encode()).decode()
    db.AddMessage(data["chat_id"], data["sender"], encoded)
    return jsonify({"message": "Message send."})

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

if __name__ == "__main__":
    app.run(debug=True)
