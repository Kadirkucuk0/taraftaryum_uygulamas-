from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import User
from extensions import db
from datetime import datetime, timedelta
from functools import wraps

admin_bp = Blueprint('admin', __name__)


def admin_required(fn):
    """Decorator: JWT + is_admin kontrolü."""
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        current_username = get_jwt_identity()
        user = User.query.filter_by(username=current_username).first()
        if not user or not user.is_admin:
            return jsonify({"message": "Bu işlem için yönetici yetkisi gereklidir."}), 403
        return fn(user, *args, **kwargs)
    return wrapper


@admin_bp.route('/users', methods=['GET'])
@admin_required
def list_users(admin_user):
    """Tüm kullanıcıları listele."""
    users = User.query.order_by(User.created_at.desc()).all()
    users_list = []
    from models import Prediction, UserMessage
    for u in users:
        pred = Prediction.query.filter_by(user_id=u.id).first()
        champion = pred.champion if pred else None
        
        # Mesaj sayısını sorgula
        message_count = UserMessage.query.filter_by(user_id=u.id).count()

        # Türkiye saati için UTC+3 ekle
        last_login_tr = (u.last_login + timedelta(hours=3)) if u.last_login else None
        created_at_tr = (u.created_at + timedelta(hours=3)) if u.created_at else None

        users_list.append({
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "is_verified": u.is_verified,
            "is_admin": u.is_admin,
            "is_banned": u.is_banned if hasattr(u, 'is_banned') else False,
            "login_count": u.login_count if hasattr(u, 'login_count') else 0,
            "message_count": message_count,
            "favorite_team": u.favorite_team,
            "champion_prediction": champion,
            "last_login": last_login_tr.strftime("%d.%m.%Y %H:%M") if last_login_tr else None,
            "created_at": created_at_tr.strftime("%d.%m.%Y %H:%M") if created_at_tr else None
        })
    return jsonify({"users": users_list, "total": len(users_list)}), 200


@admin_bp.route('/users/<int:user_id>/messages', methods=['GET'])
@admin_required
def get_user_messages(admin_user, user_id):
    """Kullanıcının gönderdiği mesajları listele."""
    from models import UserMessage
    messages = UserMessage.query.filter_by(user_id=user_id).order_by(UserMessage.timestamp.desc()).all()
    messages_list = []
    for msg in messages:
        # Türkiye saati için UTC+3 ekle
        msg_time_tr = msg.timestamp + timedelta(hours=3)
        messages_list.append({
            "id": msg.id,
            "text": msg.text,
            "timestamp": msg_time_tr.strftime("%d.%m.%Y %H:%M")
        })
    return jsonify({"messages": messages_list}), 200


@admin_bp.route('/stats', methods=['GET'])
@admin_required
def get_stats(admin_user):
    """Genel istatistikleri döndür."""
    total_users = User.query.count()
    verified_users = User.query.filter_by(is_verified=True).count()

    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_registrations = User.query.filter(User.created_at >= today_start).count()

    # Gmail registrations
    gmail_registrations = User.query.filter(User.email.like('%@gmail.com')).count()

    # Total logins (site visits)
    from sqlalchemy.sql import func
    total_logins_query = db.session.query(func.sum(User.login_count)).scalar()
    total_logins = int(total_logins_query) if total_logins_query is not None else 0

    return jsonify({
        "total_users": total_users,
        "verified_users": verified_users,
        "today_registrations": today_registrations,
        "gmail_registrations": gmail_registrations,
        "total_logins": total_logins
    }), 200


@admin_bp.route('/users/<int:user_id>/toggle-ban', methods=['POST'])
@admin_required
def toggle_ban(admin_user, user_id):
    """Kullanıcıyı engelle veya engelini kaldır (kendini engelleyemez)."""
    if admin_user.id == user_id:
        return jsonify({"message": "Kendi hesabınızı engelleyemezsiniz."}), 400

    user = User.query.get(user_id)
    if not user:
        return jsonify({"message": "Kullanıcı bulunamadı."}), 404

    user.is_banned = not user.is_banned
    db.session.commit()

    action = "engellendi" if user.is_banned else "engeli kaldırıldı"
    return jsonify({
        "message": f"'{user.username}' kullanıcısı başarıyla {action}.",
        "is_banned": user.is_banned
    }), 200


@admin_bp.route('/users/<int:user_id>', methods=['DELETE'])
@admin_required
def delete_user(admin_user, user_id):
    """Kullanıcıyı sil (kendini silemez)."""
    if admin_user.id == user_id:
        return jsonify({"message": "Kendi hesabınızı silemezsiniz."}), 400

    user = User.query.get(user_id)
    if not user:
        return jsonify({"message": "Kullanıcı bulunamadı."}), 404

    username = user.username
    db.session.delete(user)
    db.session.commit()

    return jsonify({"message": f"'{username}' kullanıcısı başarıyla silindi."}), 200
