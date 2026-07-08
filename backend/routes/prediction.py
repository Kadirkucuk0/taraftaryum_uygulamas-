from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import User, Prediction
from extensions import db
from datetime import datetime
import json

prediction_bp = Blueprint('prediction', __name__)

# ══════════════════════════════════════════════════════════════
# FIFA DÜNYA KUPASI 2026 - 48 TAKIM, 12 GRUP
# Tüm takım isimleri Türkçe
# ══════════════════════════════════════════════════════════════

WORLD_CUP_GROUPS = [
    {
        "id": "A",
        "name": "A Grubu",
        "teams": [
            {"name": "Meksika", "code": "mx", "flag": "https://flagcdn.com/w80/mx.png"},
            {"name": "Güney Afrika", "code": "za", "flag": "https://flagcdn.com/w80/za.png"},
            {"name": "Güney Kore", "code": "kr", "flag": "https://flagcdn.com/w80/kr.png"},
            {"name": "Çekya", "code": "cz", "flag": "https://flagcdn.com/w80/cz.png"},
        ]
    },
    {
        "id": "B",
        "name": "B Grubu",
        "teams": [
            {"name": "Kanada", "code": "ca", "flag": "https://flagcdn.com/w80/ca.png"},
            {"name": "Bosna Hersek", "code": "ba", "flag": "https://flagcdn.com/w80/ba.png"},
            {"name": "Katar", "code": "qa", "flag": "https://flagcdn.com/w80/qa.png"},
            {"name": "İsviçre", "code": "ch", "flag": "https://flagcdn.com/w80/ch.png"},
        ]
    },
    {
        "id": "C",
        "name": "C Grubu",
        "teams": [
            {"name": "Brezilya", "code": "br", "flag": "https://flagcdn.com/w80/br.png"},
            {"name": "Fas", "code": "ma", "flag": "https://flagcdn.com/w80/ma.png"},
            {"name": "Haiti", "code": "ht", "flag": "https://flagcdn.com/w80/ht.png"},
            {"name": "İskoçya", "code": "gb-sct", "flag": "https://flagcdn.com/w80/gb-sct.png"},
        ]
    },
    {
        "id": "D",
        "name": "D Grubu",
        "teams": [
            {"name": "ABD", "code": "us", "flag": "https://flagcdn.com/w80/us.png"},
            {"name": "Paraguay", "code": "py", "flag": "https://flagcdn.com/w80/py.png"},
            {"name": "Avustralya", "code": "au", "flag": "https://flagcdn.com/w80/au.png"},
            {"name": "Türkiye", "code": "tr", "flag": "https://flagcdn.com/w80/tr.png"},
        ]
    },
    {
        "id": "E",
        "name": "E Grubu",
        "teams": [
            {"name": "Almanya", "code": "de", "flag": "https://flagcdn.com/w80/de.png"},
            {"name": "Curaçao", "code": "cw", "flag": "https://flagcdn.com/w80/cw.png"},
            {"name": "Fildişi Sahili", "code": "ci", "flag": "https://flagcdn.com/w80/ci.png"},
            {"name": "Ekvador", "code": "ec", "flag": "https://flagcdn.com/w80/ec.png"},
        ]
    },
    {
        "id": "F",
        "name": "F Grubu",
        "teams": [
            {"name": "Hollanda", "code": "nl", "flag": "https://flagcdn.com/w80/nl.png"},
            {"name": "Japonya", "code": "jp", "flag": "https://flagcdn.com/w80/jp.png"},
            {"name": "İsveç", "code": "se", "flag": "https://flagcdn.com/w80/se.png"},
            {"name": "Tunus", "code": "tn", "flag": "https://flagcdn.com/w80/tn.png"},
        ]
    },
    {
        "id": "G",
        "name": "G Grubu",
        "teams": [
            {"name": "Belçika", "code": "be", "flag": "https://flagcdn.com/w80/be.png"},
            {"name": "Mısır", "code": "eg", "flag": "https://flagcdn.com/w80/eg.png"},
            {"name": "İran", "code": "ir", "flag": "https://flagcdn.com/w80/ir.png"},
            {"name": "Yeni Zelanda", "code": "nz", "flag": "https://flagcdn.com/w80/nz.png"},
        ]
    },
    {
        "id": "H",
        "name": "H Grubu",
        "teams": [
            {"name": "İspanya", "code": "es", "flag": "https://flagcdn.com/w80/es.png"},
            {"name": "Cabo Verde", "code": "cv", "flag": "https://flagcdn.com/w80/cv.png"},
            {"name": "Suudi Arabistan", "code": "sa", "flag": "https://flagcdn.com/w80/sa.png"},
            {"name": "Uruguay", "code": "uy", "flag": "https://flagcdn.com/w80/uy.png"},
        ]
    },
    {
        "id": "I",
        "name": "I Grubu",
        "teams": [
            {"name": "Fransa", "code": "fr", "flag": "https://flagcdn.com/w80/fr.png"},
            {"name": "Senegal", "code": "sn", "flag": "https://flagcdn.com/w80/sn.png"},
            {"name": "DR Kongo", "code": "cd", "flag": "https://flagcdn.com/w80/cd.png"},
            {"name": "Norveç", "code": "no", "flag": "https://flagcdn.com/w80/no.png"},
        ]
    },
    {
        "id": "J",
        "name": "J Grubu",
        "teams": [
            {"name": "Arjantin", "code": "ar", "flag": "https://flagcdn.com/w80/ar.png"},
            {"name": "Cezayir", "code": "dz", "flag": "https://flagcdn.com/w80/dz.png"},
            {"name": "Avusturya", "code": "at", "flag": "https://flagcdn.com/w80/at.png"},
            {"name": "Ürdün", "code": "jo", "flag": "https://flagcdn.com/w80/jo.png"},
        ]
    },
    {
        "id": "K",
        "name": "K Grubu",
        "teams": [
            {"name": "Portekiz", "code": "pt", "flag": "https://flagcdn.com/w80/pt.png"},
            {"name": "Özbekistan", "code": "uz", "flag": "https://flagcdn.com/w80/uz.png"},
            {"name": "Kolombiya", "code": "co", "flag": "https://flagcdn.com/w80/co.png"},
            {"name": "Irak", "code": "iq", "flag": "https://flagcdn.com/w80/iq.png"},
        ]
    },
    {
        "id": "L",
        "name": "L Grubu",
        "teams": [
            {"name": "İngiltere", "code": "gb-eng", "flag": "https://flagcdn.com/w80/gb-eng.png"},
            {"name": "Hırvatistan", "code": "hr", "flag": "https://flagcdn.com/w80/hr.png"},
            {"name": "Gana", "code": "gh", "flag": "https://flagcdn.com/w80/gh.png"},
            {"name": "Panama", "code": "pa", "flag": "https://flagcdn.com/w80/pa.png"},
        ]
    },
]


@prediction_bp.route('/teams', methods=['GET'])
def get_teams():
    """Dünya Kupası 2026 takımlarını gruplara göre döndür."""
    return jsonify({"groups": WORLD_CUP_GROUPS}), 200


@prediction_bp.route('/save', methods=['POST'])
@jwt_required()
def save_prediction():
    """Kullanıcının tahminini kaydet veya güncelle."""
    current_username = get_jwt_identity()
    user = User.query.filter_by(username=current_username).first()
    if not user:
        return jsonify({"message": "Kullanıcı bulunamadı."}), 404

    data = request.get_json()

    prediction = Prediction.query.filter_by(user_id=user.id).first()
    if not prediction:
        prediction = Prediction(
            user_id=user.id,
            username=user.username
        )
        db.session.add(prediction)

    # JSON alanlarını string olarak kaydet
    if 'round_of_32' in data:
        prediction.round_of_32 = json.dumps(data['round_of_32']) if isinstance(data['round_of_32'], (list, dict)) else data['round_of_32']
    if 'round_of_16' in data:
        prediction.round_of_16 = json.dumps(data['round_of_16']) if isinstance(data['round_of_16'], (list, dict)) else data['round_of_16']
    if 'quarter_finals' in data:
        prediction.quarter_finals = json.dumps(data['quarter_finals']) if isinstance(data['quarter_finals'], (list, dict)) else data['quarter_finals']
    if 'semi_finals' in data:
        prediction.semi_finals = json.dumps(data['semi_finals']) if isinstance(data['semi_finals'], (list, dict)) else data['semi_finals']
    if 'final_teams' in data:
        prediction.final_teams = json.dumps(data['final_teams']) if isinstance(data['final_teams'], (list, dict)) else data['final_teams']
    if 'champion' in data:
        prediction.champion = data['champion']

    prediction.updated_at = datetime.utcnow()
    db.session.commit()

    return jsonify({"message": "Tahminleriniz başarıyla kaydedildi."}), 200


@prediction_bp.route('/my', methods=['GET'])
@jwt_required()
def get_my_prediction():
    """Mevcut kullanıcının tahminini döndür."""
    current_username = get_jwt_identity()
    user = User.query.filter_by(username=current_username).first()
    if not user:
        return jsonify({"message": "Kullanıcı bulunamadı."}), 404

    prediction = Prediction.query.filter_by(user_id=user.id).first()
    if not prediction:
        return jsonify({"prediction": None}), 200

    def safe_json_load(val):
        if val is None:
            return None
        try:
            return json.loads(val)
        except (json.JSONDecodeError, TypeError):
            return val

    return jsonify({
        "prediction": {
            "round_of_32": safe_json_load(prediction.round_of_32),
            "round_of_16": safe_json_load(prediction.round_of_16),
            "quarter_finals": safe_json_load(prediction.quarter_finals),
            "semi_finals": safe_json_load(prediction.semi_finals),
            "final_teams": safe_json_load(prediction.final_teams),
            "champion": prediction.champion,
            "created_at": prediction.created_at.strftime("%d.%m.%Y %H:%M") if prediction.created_at else None,
            "updated_at": prediction.updated_at.strftime("%d.%m.%Y %H:%M") if prediction.updated_at else None
        }
    }), 200


@prediction_bp.route('/leaderboard', methods=['GET'])
def get_leaderboard():
    """Tüm tahminleri kullanıcı adı ve şampiyon tahminiyle döndür."""
    predictions = Prediction.query.all()
    leaderboard = []
    for p in predictions:
        leaderboard.append({
            "username": p.username,
            "champion": p.champion,
            "created_at": p.created_at.strftime("%d.%m.%Y %H:%M") if p.created_at else None,
            "updated_at": p.updated_at.strftime("%d.%m.%Y %H:%M") if p.updated_at else None
        })
    return jsonify({"leaderboard": leaderboard}), 200
