import sqlite3
from datetime import datetime

class DB:
    
    def __init__(self):
        self.conn = sqlite3.connect("NeuralNetworks")
        self.cursor = self.conn.cursor()

    def CreateDb(self):
        self.cursor.execute("""
            CREATE TABLE IF NOT EXIST Users (
            UserName TEXT PRIMARY KEY,
            Email TEXT UNIQUE,
            Password TEXT,
            Status TEXT                
        )
        """) 
        self.cursor.execute("""
        CREATE TABLE IF NOT EXIST Connections(
            MainUser TEXT,
            ConnectionUser TEXT,
            PRIMARY KEY (MainUser,ConnectionUser),
            FOREIGN KEY (MainUser) REFERENCES Users(UserName),
            FOREIGN KEY (ConnectionUser) REFERENCES Users(UserName)
        )
        """)
        self.cursor.execute("""
        CREATE TABLE IF NOT EXIST All_messages(
            MainUser TEXT,
            ConnectionUser TEXT,
            ChatID INTEGER AUTOINCREMENT,
            PRIMARY KEY (MainUser,ConnectionUser),
            FOREIGN KEY (MainUser) REFERENCES Users(UserName),
            FOREIGN KEY (ConnectionUser) REFERENCES Users(UserName)
                            
        )
        """)

    def CreateChat(self,ChatID):
        QUERY = """
        CREATE TABLE IF NOT EXIST """ + ChatID +"""(
        Time DATETIME PRIMARY KEY,
        Sender TEXT,
        EncodedMessage TEXT,
        FOREIGN KEY (Sender) REFERENCES Users(UserName)
        )

        """
        self.cursor.execute(QUERY)

    def InsertUser(self, username, email, password, status='offline'):
        self.cursor.execute("INSERT INTO Users VALUES (?, ?, ?, ?)", (username, email, password, status))
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
