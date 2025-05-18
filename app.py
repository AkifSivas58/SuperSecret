from flask import Flask, request, jsonify
from flask_socketio import SocketIO, emit, join_room, leave_room, disconnect
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
import MessageChecker

app = Flask(__name__)
app.config.from_object(Config)
CORS(app, resources={r"/*": {"origins": ["http://localhost:3000", "http://127.0.0.1:3000"]}})

ml = MessageChecker.Models()
fernet = Fernet(app.config['FERNET_KEY'])

socketio = SocketIO(app, cors_allowed_origins=["http://localhost:3000", "http://127.0.0.1:3000"], 
                   ping_timeout=60,
                   ping_interval=25,
                   async_mode='threading')

db = DB()
db.CreateDb()

# Store active chat requests and user sessions
active_chat_requests = {}
user_sessions = {}
active_chats = {}

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
        
        # Check if user is already connected
        if username in user_sessions:
            old_sid = user_sessions[username]['sid']
            # Disconnect old session if it exists
            disconnect(sid=old_sid)
            print(f"Disconnecting old session for {username}")
        
        # Store user's session data
        user_sessions[username] = {
            'sid': request.sid,
            'status': 'idle',
            'connected': True
        }
        
        # Clean up any stale chat data for this user
        if username in active_chats:
            other_user = active_chats[username]['other_user']
            print(f"Cleaning up stale chat data for {username} with {other_user}")
            
            # Clean up both users' chat data
            if username in active_chats:
                del active_chats[username]
            if other_user in active_chats:
                del active_chats[other_user]
        
        # Update user status to idle when connecting
        db.SetUserStatus(username, 'idle')
        
        # Join user to their personal room using their socket ID
        join_room(request.sid)
        
        print(f"User {username} connected with sid {request.sid}")
        
        # Broadcast updated user list to all clients
        users = db.GetAllUsers()
        emit('userList', {'users': users}, broadcast=True)
        
        return True
    except Exception as e:
        print(f"Connection error: {str(e)}")
        return False

@socketio.on('disconnect')
def handle_disconnect():
    token = request.args.get('token')
    try:
        token_data = jwt.decode(token, app.config['JWT_SECRET_KEY'], algorithms=["HS256"])
        username = token_data['username']
        
        if username in user_sessions:
            # Only handle disconnect if this is the current session
            if user_sessions[username]['sid'] == request.sid:
                user_sessions[username]['connected'] = False
                print(f"User {username} disconnected (sid: {request.sid})")
                
                # Clean up any active chat
                if username in active_chats:
                    other_user = active_chats[username]['other_user']
                    chat_id = active_chats[username]['chat_id']
                    
                    # Clean up database
                    try:
                        db_chat_id = db.GetChatID(username, other_user)
                        if not db_chat_id:
                            db_chat_id = db.GetChatID(other_user, username)
                        
                        if db_chat_id:
                            print(f"Deleting chat {db_chat_id} from database")
                            db.DeleteChat(db_chat_id)
                    except Exception as e:
                        print(f"Error deleting chat from database: {str(e)}")
                    
                    # Clean up both users' chat data
                    if username in active_chats:
                        del active_chats[username]
                    if other_user in active_chats:
                        del active_chats[other_user]
                    
                    # Notify other user if they're connected
                    if other_user in user_sessions and user_sessions[other_user]['connected']:
                        emit('force_close_chat', {
                            'username': username
                        }, room=user_sessions[other_user]['sid'])
                
                # Update user status to offline
                db.SetUserStatus(username, 'offline')
                
                # Broadcast updated user list to all clients
                users = db.GetAllUsers()
                emit('userList', {'users': users}, broadcast=True)
            else:
                print(f"Ignoring disconnect for old session of {username}")
        
    except Exception as e:
        print(f"Disconnect error: {str(e)}")

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
        
        # First check if there's an active chat
        if username in active_chats and active_chats[username]['other_user'] == other_user:
            chat_id = active_chats[username]['chat_id']
        else:
            # If no active chat, check database
            chat_id = db.GetChatID(username, other_user)
            if not chat_id:
                chat_id = db.GetChatID(other_user, username)
            
            if not chat_id:
                # Create new chat if it doesn't exist
                db.cursor.execute("INSERT INTO All_messages (MainUser, ConnectionUser) VALUES (?, ?)", 
                                (username, other_user))
                chat_id = db.cursor.lastrowid
                db.CreateChat(chat_id)
            
            # Store in active_chats
            active_chats[username] = {
                'chat_id': str(chat_id),
                'other_user': other_user
            }
            if other_user in user_sessions:
                active_chats[other_user] = {
                    'chat_id': str(chat_id),
                    'other_user': username
                }
        
        # Join both users to the chat room
        join_room(str(chat_id))
        
        # Get chat history
        messages = db.GetMessages(chat_id)
        decrypted_messages = []
        for msg in messages:
            try:
                decrypted_text = fernet.decrypt(msg[2]).decode()
                decrypted_messages.append({
                    'time': msg[0],
                    'sender': msg[1],
                    'message': decrypted_text
                })
            except:
                continue
        
        # Send chat history and chat started event
        emit('chat_started', {
            'chat_id': str(chat_id),
            'other_user': other_user,
            'messages': decrypted_messages
        })
        
    except Exception as e:
        print(f"Error in join_chat: {str(e)}")
        emit('error', {'message': str(e)})

@socketio.on('send_message')
def handle_message(data):
    token = request.args.get('token')
    try:
        token_data = jwt.decode(token, app.config['JWT_SECRET_KEY'], algorithms=["HS256"])
        username = token_data['username']
        other_user = data['other_user']
        message = data['message']
        
        # Get chat ID from active_chats
        if username not in active_chats or active_chats[username]['other_user'] != other_user:
            raise Exception("Chat room not found")
        
        chat_id = active_chats[username]['chat_id']
        
        is_bad = ml.IsBadMessage(message)

        if (is_bad):
            message = "Bu düşünce spam veya kötü mesaj içeriyor!"

        # Encrypt message before storing
        encrypted_msg = fernet.encrypt(message.encode())
        
        # Store message in database
        db.AddMessage(int(chat_id), username, encrypted_msg)
        
        # Broadcast to chat room (including sender for confirmation)
        emit('new_message', {
            'sender': username,
            'message': message,
            'time': datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }, room=str(chat_id))
        
    except Exception as e:
        print(f"Error in send_message: {str(e)}")
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
        
        # Check if either user is in a chat
        sender_in_chat = sender_username in active_chats and active_chats[sender_username].get('chat_id') is not None
        target_in_chat = target_username in active_chats and active_chats[target_username].get('chat_id') is not None
        
        if sender_in_chat or target_in_chat:
            print(f"Cannot create chat request: User already in chat (sender: {sender_in_chat}, target: {target_in_chat})")
            emit('error', {'message': 'One of the users is already in a chat'})
            return
        
        # Check if target user is connected
        if target_username not in user_sessions or not user_sessions[target_username]['connected']:
            emit('error', {'message': 'User is not online'})
            return
            
        # Generate unique request ID
        request_id = str(uuid.uuid4())
        
        # Store request data with socket IDs
        active_chat_requests[request_id] = {
            'sender': sender_username,
            'target': target_username,
            'timestamp': datetime.now()
        }
        
        # Get sender user data with default avatar
        sender_user = db.GetUser(sender_username)
        sender_avatar = sender_user.get('avatar', '/assets/Uzaylı_1.png')
        
        print(f"Sending chat request: {sender_username} -> {target_username}")
        
        # Send request to target user's room using their socket ID
        emit('chat_request_received', {
            'requestId': request_id,
            'senderUsername': sender_username,
            'senderAvatar': sender_avatar
        }, room=user_sessions[target_username]['sid'])
        
    except Exception as e:
        print(f"Chat request error: {str(e)}")
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
            print(f"Warning: Request {request_id} not found in active_chat_requests")
            return
        
        # Verify responder is the target
        if request_data['target'] != responder_username:
            print(f"Warning: Responder {responder_username} is not the target {request_data['target']}")
            return
        
        # Get responder user data with default avatar
        responder_user = db.GetUser(responder_username)
        responder_avatar = responder_user.get('avatar', '/assets/Uzaylı_1.png')
        
        # Get sender user data with default avatar
        sender_user = db.GetUser(request_data['sender'])
        sender_avatar = sender_user.get('avatar', '/assets/Uzaylı_1.png')
        
        if accepted:
            print(f"Chat request accepted: {request_data['sender']} -> {responder_username}")
            
            # Create chat in database first
            db.cursor.execute("INSERT INTO All_messages (MainUser, ConnectionUser) VALUES (?, ?)", 
                            (request_data['sender'], responder_username))
            chat_id = db.cursor.lastrowid
            db.CreateChat(chat_id)
            
            # Update both users' status to busy
            db.SetUserStatus(request_data['sender'], 'busy')
            db.SetUserStatus(responder_username, 'busy')
            
            if request_data['sender'] in user_sessions:
                user_sessions[request_data['sender']]['status'] = 'busy'
            if responder_username in user_sessions:
                user_sessions[responder_username]['status'] = 'busy'
            
            # Store chat information using database chat_id
            active_chats[request_data['sender']] = {
                'chat_id': str(chat_id),
                'other_user': responder_username
            }
            active_chats[responder_username] = {
                'chat_id': str(chat_id),
                'other_user': request_data['sender']
            }
            
            # Join both users to the chat room
            if request_data['sender'] in user_sessions:
                join_room(str(chat_id), sid=user_sessions[request_data['sender']]['sid'])
            if responder_username in user_sessions:
                join_room(str(chat_id), sid=user_sessions[responder_username]['sid'])
            
            # Broadcast status updates
            users = db.GetAllUsers()
            emit('userList', {'users': users}, broadcast=True)
            
            # Send response to sender's room
            if request_data['sender'] in user_sessions:
                emit('chat_request_response', {
                    'accepted': True,
                    'targetUsername': responder_username,
                    'targetAvatar': responder_avatar,
                    'chatId': chat_id
                }, room=user_sessions[request_data['sender']]['sid'])
            
            # Send chat window open event to responder
            if responder_username in user_sessions:
                emit('open_chat_window', {
                    'username': request_data['sender'],
                    'avatar': sender_avatar,
                    'chatId': chat_id
                }, room=user_sessions[responder_username]['sid'])
            
            print(f"Chat room {chat_id} created for {request_data['sender']} and {responder_username}")
            
        else:
            print(f"Chat request rejected: {request_data['sender']} -> {responder_username}")
            # Send rejection response to sender's room
            if request_data['sender'] in user_sessions:
                emit('chat_request_response', {
                    'accepted': False,
                    'targetUsername': responder_username,
                    'targetAvatar': responder_avatar
                }, room=user_sessions[request_data['sender']]['sid'])
        
        # Remove request from active requests
        del active_chat_requests[request_id]
        
    except Exception as e:
        print(f"Error in chat_request_response: {str(e)}")
        emit('error', {'message': str(e)})

@socketio.on('close_chat')
def handle_close_chat(data):
    token = request.args.get('token')
    try:
        token_data = jwt.decode(token, app.config['JWT_SECRET_KEY'], algorithms=["HS256"])
        current_username = token_data['username']
        other_username = data['otherUsername']
        
        print(f"Closing chat between {current_username} and {other_username}")
        
        # Get chat ID from active chats
        chat_data = active_chats.get(current_username)
        if chat_data and chat_data['other_user'] == other_username:
            chat_id = chat_data['chat_id']
            
            # Clean up database
            try:
                # Get chat ID from database
                db_chat_id = db.GetChatID(current_username, other_username)
                if not db_chat_id:
                    db_chat_id = db.GetChatID(other_username, current_username)
                
                if db_chat_id:
                    print(f"Deleting chat {db_chat_id} from database")
                    db.DeleteChat(db_chat_id)
            except Exception as e:
                print(f"Error deleting chat from database: {str(e)}")
            
            # Update both users' status to idle
            db.SetUserStatus(current_username, 'idle')
            db.SetUserStatus(other_username, 'idle')
            
            if current_username in user_sessions:
                user_sessions[current_username]['status'] = 'idle'
            if other_username in user_sessions:
                user_sessions[other_username]['status'] = 'idle'
            
            # Remove chat data
            if current_username in active_chats:
                del active_chats[current_username]
            if other_username in active_chats:
                del active_chats[other_username]
            
            # Leave chat room
            leave_room(str(chat_id))
            
            # Broadcast status updates
            users = db.GetAllUsers()
            emit('userList', {'users': users}, broadcast=True)
            
            # Notify other user about chat closure
            if other_username in user_sessions and user_sessions[other_username]['connected']:
                emit('force_close_chat', {
                    'username': current_username
                }, room=user_sessions[other_username]['sid'])
            
            print(f"Chat closed successfully between {current_username} and {other_username}")
        else:
            print(f"No active chat found between {current_username} and {other_username}")
        
    except Exception as e:
        print(f"Error in close_chat: {str(e)}")
        emit('error', {'message': str(e)})

@socketio.on('end_chat')
def handle_end_chat(data):
    token = request.args.get('token')
    try:
        token_data = jwt.decode(token, app.config['JWT_SECRET_KEY'], algorithms=["HS256"])
        current_username = token_data['username']
        other_username = data['other_user']
        
        # Get chat ID
        chat_id = db.GetChatID(current_username, other_username)
        if not chat_id:
            chat_id = db.GetChatID(other_username, current_username)
        
        if chat_id:
            # Delete chat messages and chat entry
            db.DeleteChat(chat_id)
            
            # Leave the chat room
            leave_room(str(chat_id))
            
            # Update both users' status to idle
            db.SetUserStatus(current_username, 'idle')
            db.SetUserStatus(other_username, 'idle')
            
            # Broadcast status updates
            users = db.GetAllUsers()
            emit('userList', {'users': users}, broadcast=True)
            
            # Notify other user about chat closure
            socketio.emit('chat_ended', {
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
