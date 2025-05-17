from flask import Flask, request, jsonify
from flask_socketio import SocketIO, emit, join_room, leave_room
import sqlite3
from datetime import datetime, timedelta
from cryptography.fernet import Fernet
from DataBase import DB
from jose import jwt
from functools import wraps
from config import Config

app = Flask(__name__)
app.config.from_object(Config)

fernet = Fernet(app.config['FERNET_KEY'])

socketio = SocketIO(app, cors_allowed_origins="*")



db = DB()
db.CreateDb()

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            token = request.headers['Authorization'].split(" ")[1]
        
        if not token:
            return jsonify({'message': 'Token is missing'}), 401
        
        try:
            data = jwt.decode(token, app.config['JWT_SECRET_KEY'], algorithms=["HS256"])
            current_user = data['username']
        except:
            return jsonify({'message': 'Token is invalid'}), 401
        
        return f(current_user, *args, **kwargs)
    return decorated

@app.route("/register", methods=['POST'])
def register():
    data = request.get_json()
    if not data or 'username' not in data or 'password' not in data:
        return jsonify({"error": "Missing required fields"}), 400
    
    try:
        db.InsertUser(data['username'], data['password'])
        token = jwt.encode(
            {'username': data['username']},
            app.config['JWT_SECRET_KEY'],
            algorithm="HS256"
        )
        return jsonify({"token": token, "message": "Registration successful"})
    except sqlite3.IntegrityError:
        return jsonify({"error": "Username already exists"}), 409

@app.route("/login", methods=['POST'])
def login():
    data = request.get_json()
    if not data or 'username' not in data or 'password' not in data:
        return jsonify({"error": "Missing credentials"}), 400
    
    try:
        user = db.GetUser(data['username'])
        if not user:
            return jsonify({"error": "Invalid credentials"}), 401
        
        if not db.CheckPassword(data['password'], user['password']):
            return jsonify({"error": "Invalid credentials"}), 401
        
        token = jwt.encode(
            {
                'username': data['username'],
                'exp': datetime.utcnow() + timedelta(seconds=app.config['JWT_ACCESS_TOKEN_EXPIRES'])
            },
            app.config['JWT_SECRET_KEY'],
            algorithm="HS256"
        )
        
        return jsonify({
            "token": token,
            "username": data['username'],
            "message": "Login successful"
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@socketio.on('connect')
def handle_connect():
    token = request.args.get('token')
    try:
        jwt.decode(token, app.config['JWT_SECRET_KEY'], algorithms=["HS256"])
    except:
        return False

@socketio.on('join_chat')
def handle_join_chat(data):
    token = request.args.get('token')
    try:
        token_data = jwt.decode(token, app.config['JWT_SECRET_KEY'], algorithms=["HS256"])
        username = token_data['username']
        other_user = data['other_user']
        
        # Create new chat
        chat_id = db.GetChatID(username, other_user)
        if not chat_id:
            db.cursor.execute("INSERT INTO All_messages (MainUser, ConnectionUser) VALUES (?, ?)", 
                            (username, other_user))
            chat_id = db.cursor.lastrowid
            db.CreateChat(chat_id)
        
        join_room(str(chat_id))
        emit('chat_started', {'chat_id': chat_id, 'other_user': other_user})
    except Exception as e:
        emit('error', {'message': str(e)})

@socketio.on('send_message')
def handle_message(data):
    token = request.args.get('token')
    try:
        token_data = jwt.decode(token, app.config['JWT_SECRET_KEY'], algorithms=["HS256"])
        username = token_data['username']
        chat_id = data['chat_id']
        message = data['message']
        
        # Encrypt message
        encrypted_msg = fernet.encrypt(message.encode())
        
        # Store message
        db.AddMessage(chat_id, username, encrypted_msg)
        
        # Broadcast to room
        emit('new_message', {
            'chat_id': chat_id,
            'sender': username,
            'message': message,
            'time': datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }, room=str(chat_id))
        
    except Exception as e:
        emit('error', {'message': str(e)})

@socketio.on('leave_chat')
def handle_leave_chat(data):
    token = request.args.get('token')
    try:
        token_data = jwt.decode(token, app.config['JWT_SECRET_KEY'], algorithms=["HS256"])
        username = token_data['username']
        chat_id = data['chat_id']
        
        leave_room(str(chat_id))
        db.DeleteChat(int(chat_id))
        
        emit('chat_ended', {'chat_id': chat_id}, room=str(chat_id))
    except Exception as e:
        emit('error', {'message': str(e)})

if __name__ == "__main__":
    socketio.run(app, debug=True)
