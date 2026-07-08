from extensions import socketio, db
from flask import request
from models import Comment, Rating, TeamComment, User, ChatMessage, ChatVote
from datetime import datetime
from flask_socketio import emit, join_room, leave_room
from flask_jwt_extended import decode_token

latest_matches_cache = []
online_user_count = 0

def init_events(app, cache_ref):
    global latest_matches_cache
    latest_matches_cache = cache_ref

    @socketio.on('connect')
    def handle_connect():
        global online_user_count
        online_user_count += 1
        print(f"Cihaz bağlandı: {request.sid} (Çevrimiçi: {online_user_count})")
        emit('matches_update', latest_matches_cache)
        emit('online_count', {'count': online_user_count}, broadcast=True)

    @socketio.on('disconnect')
    def handle_disconnect():
        global online_user_count
        online_user_count = max(0, online_user_count - 1)
        print(f"Cihaz ayrıldı: {request.sid} (Çevrimiçi: {online_user_count})")
        emit('online_count', {'count': online_user_count}, broadcast=True)

    @socketio.on('join_match_room')
    def handle_join_match(data):
        match_id = str(data.get('match_id'))
        join_room(match_id)
        with app.app_context():
            comments = Comment.query.filter_by(match_id=match_id).order_by(Comment.timestamp.asc()).all()
            history = [{"username": c.username, "text": c.text, "time": c.timestamp.strftime("%H:%M")} for c in comments]
            emit('load_comment_history', history, to=request.sid)

    @socketio.on('leave_match_room')
    def handle_leave_match(data):
        match_id = str(data.get('match_id'))
        leave_room(match_id)

    @socketio.on('send_comment')
    def handle_send_comment(data):
        token = data.get('token')
        if not token:
            emit('error', {'message': 'Authentication required'})
            return
            
        try:
            decoded = decode_token(token)
            username = decoded['sub']  # JWT identity is now username
        except Exception as e:
            emit('error', {'message': 'Invalid token'})
            return

        match_id = str(data.get('match_id'))
        text = data.get('text')

        with app.app_context():
            user = User.query.filter_by(username=username).first()
            if not user or not user.is_verified:
                emit('error', {'message': 'Unverified or invalid user'})
                return
                
            new_comment = Comment(match_id=match_id, username=username, text=text)
            db.session.add(new_comment)
            db.session.commit()

            comment_data = {
                "username": username,
                "text": text,
                "time": new_comment.timestamp.strftime("%H:%M")
            }
            emit('receive_comment', comment_data, room=match_id)

    @socketio.on('rate_match')
    def handle_rate_match(data):
        token = data.get('token')
        if not token:
            emit('error', {'message': 'Authentication required'})
            return
            
        try:
            decoded = decode_token(token)
            username = decoded['sub']  # JWT identity is now username
        except Exception as e:
            emit('error', {'message': 'Invalid token'})
            return

        match_id = str(data.get('match_id'))
        score = data.get('score')

        with app.app_context():
            user = User.query.filter_by(username=username).first()
            if not user or not user.is_verified:
                emit('error', {'message': 'Unverified or invalid user'})
                return
                
            new_rating = Rating(match_id=match_id, username=username, score=score)
            db.session.add(new_rating)
            db.session.commit()
            emit('rating_success', {"message": "Puanınız kaydedildi!"}, to=request.sid)

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
        token = data.get('token')
        if not token:
            emit('error', {'message': 'Authentication required'})
            return
            
        try:
            decoded = decode_token(token)
            username = decoded['sub']  # JWT identity is now username
        except Exception as e:
            emit('error', {'message': 'Invalid token'})
            return
            
        team_name = data.get('team_name')
        text = data.get('text')

        with app.app_context():
            user = User.query.filter_by(username=username).first()
            if not user or not user.is_verified:
                emit('error', {'message': 'Unverified or invalid user'})
                return
                
            new_comment = TeamComment(team_name=team_name, username=username, text=text)
            db.session.add(new_comment)
            db.session.commit()
            comment_data = {"username": username, "text": text, "time": new_comment.timestamp.strftime("%H:%M")}
            emit('receive_team_comment', comment_data, room=team_name)

    @socketio.on('join_chat')
    def handle_join_chat(data):
        room = data.get('room')
        if not room: return
        join_room(room)
        with app.app_context():
            # Son 50 mesajı gönderelim
            msgs = ChatMessage.query.filter_by(room_name=room).order_by(ChatMessage.timestamp.asc()).limit(50).all()
            history = [{
                "id": m.id,
                "username": m.username,
                "text": m.text,
                "timestamp": m.timestamp.isoformat() + "Z",
                "upvotes": m.upvotes,
                "downvotes": m.downvotes
            } for m in msgs]
            emit('chat_history', {'messages': history}, to=request.sid)

    @socketio.on('leave_chat')
    def handle_leave_chat(data):
        room = data.get('room')
        if room: leave_room(room)

    @socketio.on('send_chat')
    def handle_send_chat(data):
        token = data.get('token')
        if not token:
            emit('chat_error', {'msg': 'Authentication required'})
            return
            
        try:
            decoded = decode_token(token)
            username = decoded['sub']
        except Exception as e:
            emit('chat_error', {'msg': 'Invalid token'})
            return
            
        room = data.get('room')
        text = data.get('text')
        if not room or not text: return

        with app.app_context():
            user = User.query.filter_by(username=username).first()
            if not user or not user.is_verified:
                emit('chat_error', {'msg': 'Unverified or invalid user'})
                return
                
            # Rate Limit (Global)
            last_msg = ChatMessage.query.filter_by(user_id=user.id).order_by(ChatMessage.timestamp.desc()).first()
            if last_msg:
                diff = (datetime.utcnow() - last_msg.timestamp).total_seconds()
                if diff < 10:
                    emit('chat_error', {'msg': '10 saniyede bir mesaj atabilirsiniz.', 'cooldown': int(10 - diff)}, to=request.sid)
                    return

            new_msg = ChatMessage(room_name=room, user_id=user.id, username=username, text=text)
            db.session.add(new_msg)
            db.session.commit()
            
            msg_dict = {
                "id": new_msg.id,
                "username": username,
                "text": text,
                "timestamp": new_msg.timestamp.isoformat() + "Z",
                "upvotes": 0,
                "downvotes": 0
            }
            emit('new_chat_message', msg_dict, room=room)

    @socketio.on('vote_chat')
    def handle_vote_chat(data):
        token = data.get('token')
        if not token:
            emit('chat_error', {'msg': 'Authentication required'})
            return
            
        try:
            decoded = decode_token(token)
            username = decoded['sub']
        except Exception as e:
            emit('chat_error', {'msg': 'Invalid token'})
            return

        message_id = data.get('message_id')
        vote = data.get('vote_type') # 'up' or 'down'

        with app.app_context():
            user = User.query.filter_by(username=username).first()
            if not user: return

            msg = ChatMessage.query.get(message_id)
            if not msg: return

            existing_vote = ChatVote.query.filter_by(message_id=message_id, user_id=user.id).first()
            if existing_vote:
                if existing_vote.vote_type == vote:
                    # Remove the vote (undo)
                    if vote == 'up':
                        msg.upvotes = max(0, msg.upvotes - 1)
                    else:
                        msg.downvotes = max(0, msg.downvotes - 1)
                    db.session.delete(existing_vote)
                else:
                    # Swap the vote
                    if existing_vote.vote_type == 'up':
                        msg.upvotes = max(0, msg.upvotes - 1)
                        msg.downvotes += 1
                    else:
                        msg.downvotes = max(0, msg.downvotes - 1)
                        msg.upvotes += 1
                    existing_vote.vote_type = vote
            else:
                # New vote
                if vote == 'up':
                    msg.upvotes += 1
                elif vote == 'down':
                    msg.downvotes += 1
                else:
                    return
                new_vote = ChatVote(message_id=message_id, user_id=user.id, vote_type=vote)
                db.session.add(new_vote)

            db.session.commit()

            emit('chat_vote_update', {
                'message_id': message_id,
                'upvotes': msg.upvotes,
                'downvotes': msg.downvotes
            }, room=msg.room_name)

    @socketio.on('delete_chat')
    def handle_delete_chat(data):
        token = data.get('token')
        if not token:
            emit('chat_error', {'msg': 'Authentication required'})
            return
            
        try:
            decoded = decode_token(token)
            username = decoded['sub']
        except Exception as e:
            emit('chat_error', {'msg': 'Invalid token'})
            return

        message_id = data.get('message_id')

        with app.app_context():
            user = User.query.filter_by(username=username).first()
            if not user: return

            msg = ChatMessage.query.get(message_id)
            if not msg: return
            
            if msg.user_id != user.id and not user.is_admin:
                emit('chat_error', {'msg': 'Bu mesajı silme yetkiniz yok.'})
                return
                
            room_name = msg.room_name
            
            # Delete associated votes first
            ChatVote.query.filter_by(message_id=msg.id).delete()
            # Delete message
            db.session.delete(msg)
            db.session.commit()

            emit('chat_message_deleted', {'message_id': message_id}, room=room_name)
