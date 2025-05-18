import sqlite3
from datetime import datetime
import bcrypt  # Add this import for password hashing
import threading

class DB:
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super(DB, cls).__new__(cls)
        return cls._instance

    def __init__(self):
        if not hasattr(self, 'initialized'):
            self.conn = sqlite3.connect("NeuralNetworks.db", check_same_thread=False)
            self.conn.row_factory = sqlite3.Row
            self.cursor = self.conn.cursor()
            self.CreateDb()
            self.initialized = True

    def get_connection(self):
        """Get a new connection for each operation"""
        return sqlite3.connect("NeuralNetworks.db", check_same_thread=False)

    def CreateDb(self):
        """Create database tables if they don't exist"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            # Create users table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    password TEXT NOT NULL,
                    status TEXT DEFAULT 'offline',
                    avatar TEXT DEFAULT '/assets/Uzaylı_1.png',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Create temporary messages table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS temporary_messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    room_id TEXT NOT NULL,
                    sender TEXT NOT NULL,
                    message TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (sender) REFERENCES users(username)
                )
            """)
            
            conn.commit()
            conn.close()
        except Exception as e:
            print(f"Error creating database tables: {e}")
            if 'conn' in locals():
                conn.close()

    def CreateChat(self, chat_id):
        query = f"""
        CREATE TABLE IF NOT EXISTS Chat_{chat_id} (
            Time DATETIME PRIMARY KEY,
            Sender TEXT,
            EncodedMessage TEXT,
            FOREIGN KEY (Sender) REFERENCES Users(UserName)
        )
        """
        self.cursor.execute(query)

    def InsertUser(self, username, password, status='offline'):
        # Hash the password before storing
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
        self.cursor.execute("""
            INSERT INTO users (username, password, status, avatar, created_at)
            VALUES (?, ?, ?, ?, datetime('now'))
        """, (username, hashed_password.decode('utf-8'), status, f'/assets/Uzaylı_{(hash(username) % 4) + 1}.png'))
        self.conn.commit()

    def SetUserStatus(self, username, status):
        self.cursor.execute("UPDATE Users SET Status=? WHERE UserName=?", (status, username))
        self.conn.commit()

    def AddMessage(self, chat_id, sender, encoded_msg):
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        self.cursor.execute(f"INSERT INTO Chat_{chat_id} VALUES (?, ?, ?)", (now, sender, encoded_msg))
        self.conn.commit()

    def GetMessages(self, chat_id):
        self.cursor.execute(f"SELECT * FROM Chat_{chat_id} ORDER BY Time")
        return self.cursor.fetchall()

    def DeleteChat(self, chat_id):
        self.cursor.execute(f"DROP TABLE IF EXISTS Chat_{chat_id}")
        self.cursor.execute("DELETE FROM All_messages WHERE ChatID=?", (chat_id,))
        self.conn.commit()

    def GetChatID(self, user1, user2):
        self.cursor.execute("SELECT ChatID FROM All_messages WHERE MainUser=? AND ConnectionUser=?", (user1, user2))
        res = self.cursor.fetchone()
        return res[0] if res else None

    def GetUser(self, username):
        self.cursor.execute("SELECT * FROM users WHERE username=?", (username,))
        user = self.cursor.fetchone()
        if user:
            return {
                'username': user['username'],
                'password': user['password'],
                'status': user['status'],
                'avatar': user['avatar']
            }
        return None

    def GetAllUsers(self):
        self.cursor.execute("SELECT UserName, Status FROM Users")
        users = self.cursor.fetchall()
        return [{
            'username': user[0],
            'status': user[1],
            'avatar': f'../../assets/Uzaylı_{(hash(user[0]) % 4) + 1}.png'  # Generate avatar based on username
        } for user in users]

    def CheckPassword(self, provided_password, stored_password):
        return bcrypt.checkpw(provided_password.encode('utf-8'), stored_password.encode('utf-8'))

    def StoreTemporaryMessage(self, room_id, sender, encrypted_message):
        """Store a temporary message in the database"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO temporary_messages (room_id, sender, message, created_at)
                VALUES (?, ?, ?, datetime('now'))
            """, (room_id, sender, encrypted_message))
            message_id = cursor.lastrowid
            conn.commit()
            conn.close()
            return message_id
        except Exception as e:
            print(f"Error storing temporary message: {e}")
            if 'conn' in locals():
                conn.close()
            return None

    def DeleteTemporaryMessage(self, message_id):
        """Delete a temporary message from the database"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            cursor.execute("DELETE FROM temporary_messages WHERE id = ?", (message_id,))
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            print(f"Error deleting temporary message: {e}")
            if 'conn' in locals():
                conn.close()
            return False

    def __del__(self):
        """Cleanup when the object is destroyed"""
        try:
            if hasattr(self, 'conn'):
                self.conn.close()
        except:
            pass

