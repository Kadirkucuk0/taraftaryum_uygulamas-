import eventlet

eventlet.monkey_patch()  # Asenkron işlemlerin düzgün çalışması için en başta olmalı

from flask import Flask, request
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_sqlalchemy import SQLAlchemy
import requests
import time
import threading
from datetime import datetime

app = Flask(__name__)
app.config['SECRET_KEY'] = 'super_gizli_anahtar_123'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///soccer_social.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')

# --- GLOBAL DEĞİŞKEN (Önbellek) ---
# API'den çektiğimiz canlı maçları burada tutacağız.
latest_matches_cache = []


# --- VERİTABANI MODELLERİ ---
class Comment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    match_id = db.Column(db.Integer, nullable=False)  # API'deki maç ID'si
    username = db.Column(db.String(50), nullable=False)
    text = db.Column(db.String(500), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)


class Rating(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    match_id = db.Column(db.Integer, nullable=False)
    username = db.Column(db.String(50), nullable=False)
    score = db.Column(db.Integer, nullable=False)  # 1 ile 5 arası puan


# Veritabanını oluştur
with app.app_context():
    db.create_all()


# --- BAŞLANGIÇTA BİR KERE ÇALIŞAN FONKSİYON (API'den Veri Çekme) ---
def fetch_matches_once():
    global latest_matches_cache
    API_KEY = '98c867f021d24b0296b1cb0a25f2b9e9'
    LEAGUES = "CL,WC,PL"
    url = "https://api.football-data.org/v4/matches"

    headers = {'X-Auth-Token': API_KEY}
    querystring = {"competitions": LEAGUES}

    try:
        response = requests.get(url, headers=headers, params=querystring)
        if response.status_code == 200:
            data = response.json()
            matches = data.get('matches', [])

            cleaned_matches = []
            for m in matches:
                # Skoru güvenli bir şekilde alıyoruz
                score_data = m['score']['fullTime']
                h_score = score_data['home'] if score_data['home'] is not None else "-"
                a_score = score_data['away'] if score_data['away'] is not None else "-"

                cleaned_matches.append({
                    'id': m['id'],
                    'league': m['competition']['name'],
                    'home_team': m['homeTeam'].get('shortName', m['homeTeam'].get('name', 'Bilinmiyor')),
                    'away_team': m['awayTeam'].get('shortName', m['awayTeam'].get('name', 'Bilinmiyor')),
                    'status': m['status'],
                    'home_score': h_score,
                    'away_score': a_score
                })

            latest_matches_cache = cleaned_matches
            print(f"[{datetime.now().strftime('%H:%M:%S')}] {len(cleaned_matches)} maç başlangıçta çekildi ve önbelleğe alındı.")
        else:
            print(f"API Hatası: {response.status_code}")

    except Exception as e:
        print(f"API Çekme Hatası: {e}")

# --- WEBSOCKET EVENTLERİ ---

@socketio.on('connect')
def handle_connect():
    print(f"Cihaz bağlandı: {request.sid}")
    # Kullanıcı uygulamayı açar açmaz son güncel maç listesini gönder
    emit('matches_update', latest_matches_cache)


@socketio.on('join_match_room')
def handle_join_match(data):
    """Kullanıcı bir maça tıkladığında o maçın odasına (room) girer."""
    match_id = str(data.get('match_id'))
    join_room(match_id)
    print(f"{request.sid}, {match_id} numaralı maç odasına katıldı.")

    # Odaya girer girmez, SQLite'tan eski yorumları çekip kullanıcıya gönder
    with app.app_context():
        comments = Comment.query.filter_by(match_id=match_id).order_by(Comment.timestamp.asc()).all()
        history = [{"username": c.username, "text": c.text, "time": c.timestamp.strftime("%H:%M")} for c in comments]
        emit('load_comment_history', history, to=request.sid)


@socketio.on('leave_match_room')
def handle_leave_match(data):
    """Kullanıcı maç detayından geri çıktığında odadan ayrılır."""
    match_id = str(data.get('match_id'))
    leave_room(match_id)
    print(f"{request.sid}, {match_id} odasından ayrıldı.")


@socketio.on('send_comment')
def handle_send_comment(data):
    """Kullanıcıdan gelen yeni yorumu alır, kaydeder ve o odadaki herkese dağıtır."""
    match_id = str(data.get('match_id'))
    username = data.get('username')
    text = data.get('text')

    with app.app_context():
        # Veritabanına kaydet
        new_comment = Comment(match_id=match_id, username=username, text=text)
        db.session.add(new_comment)
        db.session.commit()

        # Yorum objesini oluştur
        comment_data = {
            "username": username,
            "text": text,
            "time": new_comment.timestamp.strftime("%H:%M")
        }

        # Yorumu SADECE o maçın detay sayfasında olan (odadaki) kişilere gönder
        emit('receive_comment', comment_data, room=match_id)


@socketio.on('rate_match')
def handle_rate_match(data):
    """Kullanıcının maça verdiği puanı veritabanına işler."""
    match_id = str(data.get('match_id'))
    username = data.get('username')
    score = data.get('score')

    with app.app_context():
        new_rating = Rating(match_id=match_id, username=username, score=score)
        db.session.add(new_rating)
        db.session.commit()

        emit('rating_success', {"message": "Puanınız kaydedildi!"}, to=request.sid)


# app.py içine eklenecek yeni model
class TeamComment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    team_name = db.Column(db.String(50), nullable=False)
    username = db.Column(db.String(50), nullable=False)
    text = db.Column(db.String(500), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)


# app.py içine eklenecek yeni WebSocket Eventleri
@socketio.on('join_team_room')
def handle_join_team(data):
    team_name = data.get('team_name')
    join_room(team_name)
    with app.app_context():
        comments = TeamComment.query.filter_by(team_name=team_name).order_by(TeamComment.timestamp.asc()).all()
        history = [{"username": c.username, "text": c.text, "time": c.timestamp.strftime("%H:%M")} for c in comments]
        emit('load_team_history', history, to=request.sid)


@socketio.on('leave_team_room')
def handle_leave_team(data):
    leave_room(data.get('team_name'))


@socketio.on('send_team_comment')
def handle_send_team_comment(data):
    team_name = data.get('team_name')
    username = data.get('username')
    text = data.get('text')

    with app.app_context():
        new_comment = TeamComment(team_name=team_name, username=username, text=text)
        db.session.add(new_comment)
        db.session.commit()

        comment_data = {"username": username, "text": text, "time": new_comment.timestamp.strftime("%H:%M")}
        emit('receive_team_comment', comment_data, room=team_name)

if __name__ == '__main__':
    # Sunucu ayağa kalkarken API'den veriyi sadece 1 kez çek
    print("API'den güncel maçlar alınıyor, lütfen bekleyin...")
    fetch_matches_once()

    print("Soket Sunucusu Başlatılıyor... Port: 5000")
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)