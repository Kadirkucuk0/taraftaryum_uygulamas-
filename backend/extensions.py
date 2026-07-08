from flask_sqlalchemy import SQLAlchemy
from flask_socketio import SocketIO
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager
from flask_mail import Mail
from flask_cors import CORS

db = SQLAlchemy()
socketio = SocketIO(cors_allowed_origins="*", async_mode='threading')
bcrypt = Bcrypt()
jwt = JWTManager()
mail = Mail()
cors = CORS()
