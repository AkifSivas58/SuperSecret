import sqlite3

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

