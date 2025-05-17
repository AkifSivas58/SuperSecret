import sqlite3
from datetime import datetime
import bcrypt  # Add this import for password hashing

class DB:
    def __init__(self):
        self.conn = sqlite3.connect("NeuralNetworks.db", check_same_thread=False)
        self.cursor = self.conn.cursor()
        self.CreateDb()

    def CreateDb(self):
        self.cursor.execute("""
            CREATE TABLE IF NOT EXISTS Users (
                UserName TEXT PRIMARY KEY,
                Password TEXT,
                Status TEXT
            )
        """)

        self.cursor.execute("""
            CREATE TABLE IF NOT EXISTS Connections (
                MainUser TEXT,
                ConnectionUser TEXT,
                PRIMARY KEY (MainUser, ConnectionUser),
                FOREIGN KEY (MainUser) REFERENCES Users(UserName),
                FOREIGN KEY (ConnectionUser) REFERENCES Users(UserName)
            )
        """)

        self.cursor.execute("""
            CREATE TABLE IF NOT EXISTS All_messages (
                MainUser TEXT,
                ConnectionUser TEXT,
                ChatID INTEGER PRIMARY KEY AUTOINCREMENT,
                FOREIGN KEY (MainUser) REFERENCES Users(UserName),
                FOREIGN KEY (ConnectionUser) REFERENCES Users(UserName)
            )
        """)

        self.conn.commit()

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
        self.cursor.execute("INSERT INTO Users VALUES (?, ?, ?)", (username, hashed_password, status))
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
        self.cursor.execute("SELECT * FROM Users WHERE UserName=?", (username,))
        user = self.cursor.fetchone()
        if user:
            return {
                'username': user[0],
                'password': user[1],
                'status': user[2]
            }
        return None

    def CheckPassword(self, provided_password, stored_password):
        return bcrypt.checkpw(provided_password.encode('utf-8'), stored_password)
