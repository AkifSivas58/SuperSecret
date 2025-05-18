from flask import Flask, request, jsonify
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_cors import CORS
import sqlite3
from datetime import datetime, timedelta
from cryptography.fernet import Fernet
from DataBase import DB
from jose import jwt
from functools import wraps
from config import Config
import uuid
import time
import threading

app = Flask(__name__)
app.config.from_object(Config)
CORS(app, resources={r"/*": {"origins": ["http://localhost:3000", "http://127.0.0.1:3000"]}})

fernet = Fernet(app.config['FERNET_KEY'])

socketio = SocketIO(app, cors_allowed_origins=["http://localhost:3000", "http://127.0.0.1:3000"])

db = DB()
db.CreateDb()

# Store active chat requests
active_chat_requests = {}

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            token = request.headers['Authorization'].split(" ")[1]
        
        if not token:
            return jsonify({'message': 'Token is missing'}), 401
        
        try:
            # Decode and verify token, including expiration
            data = jwt.decode(
                token, 
                app.config['JWT_SECRET_KEY'], 
                algorithms=["HS256"],
                options={"verify_exp": True}  # Ensure expiration is verified
            )
            current_user = data['username']
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token has expired. Please log in again.'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Invalid token. Please log in again.'}), 401
        
        return f(current_user, *args, **kwargs)
    return decorated

@app.route("/register", methods=['POST'])
def register():
    data = request.get_json()
    if not data or 'username' not in data or 'password' not in data:
        return jsonify({"error": "Missing required fields"}), 400
    
    try:
        # Register user with 'Idle' status
        db.InsertUser(data['username'], data['password'], status='idle')
        
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
            "message": "Registration successful"
        })
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
        
        # Update user status to Idle
        db.SetUserStatus(data['username'], 'idle')
        
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

@app.route("/logout", methods=['POST'])
@token_required
def logout(current_user):
    try:
        # Update user status to Offline
        db.SetUserStatus(current_user, 'offline')
        return jsonify({"message": "Logout successful"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/users", methods=['GET'])
@token_required
def get_users(current_user):
    try:
        users = db.GetAllUsers()
        # Filter out current user from the list
        users = [user for user in users if user['username'] != current_user]
        return jsonify({"users": users})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@socketio.on('connect')
def handle_connect():
    token = request.args.get('token')
    try:
        token_data = jwt.decode(token, app.config['JWT_SECRET_KEY'], algorithms=["HS256"])
        username = token_data['username']
        
        # Update user status to idle when connecting
        db.SetUserStatus(username, 'idle')
        
        # Join user to their personal room
        join_room(username)
        
        # Broadcast updated user list to all clients
        users = db.GetAllUsers()
        emit('userList', {'users': users}, broadcast=True)
        
        return True
    except:
        return False

@socketio.on('disconnect')
def handle_disconnect():
    token = request.args.get('token')
    try:
        token_data = jwt.decode(token, app.config['JWT_SECRET_KEY'], algorithms=["HS256"])
        username = token_data['username']
        
        # Update user status to offline when disconnecting
        db.SetUserStatus(username, 'offline')
        
        # Broadcast updated user list to all clients
        users = db.GetAllUsers()
        emit('userList', {'users': users}, broadcast=True)
    except:
        pass

@socketio.on('update_status')
def handle_status_update(data):
    token = request.args.get('token')
    try:
        token_data = jwt.decode(token, app.config['JWT_SECRET_KEY'], algorithms=["HS256"])
        username = token_data['username']
        new_status = data['status']
        
        # Update user status
        db.SetUserStatus(username, new_status)
        
        # Get updated user data
        user = db.GetUser(username)
        
        # Broadcast status update to all clients
        emit('userStatusUpdate', {'user': user}, broadcast=True)
    except Exception as e:
        emit('error', {'message': str(e)})

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

@socketio.on('chat_request')
def handle_chat_request(data):
    token = request.args.get('token')
    try:
        token_data = jwt.decode(token, app.config['JWT_SECRET_KEY'], algorithms=["HS256"])
        sender_username = token_data['username']
        target_username = data['targetUsername']
        
        # Generate unique request ID
        request_id = str(uuid.uuid4())
        
        # Store request data
        active_chat_requests[request_id] = {
            'sender': sender_username,
            'target': target_username,
            'timestamp': datetime.now()
        }
        
        # Get sender user data with default avatar
        sender_user = db.GetUser(sender_username)
        sender_avatar = sender_user.get('avatar', '/assets/Uzaylı_1.png')
        
        # Send request to target user's room
        socketio.emit('chat_request_received', {
            'requestId': request_id,
            'senderUsername': sender_username,
            'senderAvatar': sender_avatar
        }, room=target_username)
        
    except Exception as e:
        emit('error', {'message': str(e)})

@socketio.on('chat_request_response')
def handle_chat_request_response(data):
    token = request.args.get('token')
    try:
        token_data = jwt.decode(token, app.config['JWT_SECRET_KEY'], algorithms=["HS256"])
        responder_username = token_data['username']
        request_id = data['requestId']
        accepted = data['accepted']
        
        # Get request data
        request_data = active_chat_requests.get(request_id)
        if not request_data:
            return
        
        # Verify responder is the target
        if request_data['target'] != responder_username:
            return
        
        # Get responder user data with default avatar
        responder_user = db.GetUser(responder_username)
        responder_avatar = responder_user.get('avatar', '/assets/Uzaylı_1.png')
        
        # Get sender user data with default avatar
        sender_user = db.GetUser(request_data['sender'])
        sender_avatar = sender_user.get('avatar', '/assets/Uzaylı_1.png')
        
        if accepted:
            # Update both users' status to busy
            db.SetUserStatus(request_data['sender'], 'busy')
            db.SetUserStatus(responder_username, 'busy')
            
            # Broadcast status updates
            users = db.GetAllUsers()
            emit('userList', {'users': users}, broadcast=True)
            
            # Send response to sender's room
            socketio.emit('chat_request_response', {
                'accepted': True,
                'targetUsername': responder_username,
                'targetAvatar': responder_avatar
            }, room=request_data['sender'])
            
            # Send chat window open event to responder
            socketio.emit('open_chat_window', {
                'username': request_data['sender'],
                'avatar': sender_avatar
            }, room=responder_username)
        
        # Remove request from active requests
        del active_chat_requests[request_id]
        
    except Exception as e:
        emit('error', {'message': str(e)})

@socketio.on('close_chat')
def handle_close_chat(data):
    token = request.args.get('token')
    try:
        token_data = jwt.decode(token, app.config['JWT_SECRET_KEY'], algorithms=["HS256"])
        current_username = token_data['username']
        other_username = data['otherUsername']
        
        # Update both users' status to idle
        db.SetUserStatus(current_username, 'idle')
        db.SetUserStatus(other_username, 'idle')
        
        # Broadcast status updates
        users = db.GetAllUsers()
        emit('userList', {'users': users}, broadcast=True)
        
        # Notify other user about chat closure
        socketio.emit('chat_closed', {
            'username': current_username
        }, room=other_username)
        
    except Exception as e:
        emit('error', {'message': str(e)})

# Clean up expired requests periodically
def cleanup_expired_requests():
    now = datetime.now()
    expired = []
    for request_id, request_data in active_chat_requests.items():
        if (now - request_data['timestamp']).total_seconds() > 300:  # 5 minutes
            expired.append(request_id)
    
    for request_id in expired:
        del active_chat_requests[request_id]

# Start cleanup task
def start_cleanup_task():
    while True:
        cleanup_expired_requests()
        time.sleep(60)  # Check every minute

cleanup_thread = threading.Thread(target=start_cleanup_task)
cleanup_thread.daemon = True
cleanup_thread.start()

if __name__ == "__main__":
    socketio.run(app, debug=True)
