from extensions import db, bcrypt
from models import User

def seed_kadir_user(app):
    """Seed both kadir and admin users as administrators."""
    with app.app_context():
        # 1. Seed 'kadir'
        user_kadir = User.query.filter_by(username='kadir').first()
        if not user_kadir:
            pw_hash = bcrypt.generate_password_hash('kadir123').decode('utf-8')
            new_user = User(
                username='kadir',
                email='kadir@taraftaryum.local',
                password_hash=pw_hash,
                is_verified=True,
                is_admin=True,
                favorite_team='galatasaray'
            )
            db.session.add(new_user)
            print(">>> VERITABANI: 'kadir' kullanicisi (Sifre: kadir123, Admin) basariyla eklendi!")
        else:
            if not user_kadir.is_admin:
                user_kadir.is_admin = True
                print(">>> VERITABANI: 'kadir' kullanicisi admin olarak guncellendi.")
            else:
                print(">>> VERITABANI: 'kadir' kullanicisi zaten mevcut (Admin).")

        # 2. Seed 'admin'
        user_admin = User.query.filter_by(username='admin').first()
        if not user_admin:
            pw_hash = bcrypt.generate_password_hash('admin123').decode('utf-8')
            new_user = User(
                username='admin',
                email='admin@taraftaryum.local',
                password_hash=pw_hash,
                is_verified=True,
                is_admin=True,
                favorite_team='galatasaray'
            )
            db.session.add(new_user)
            print(">>> VERITABANI: 'admin' kullanicisi (Sifre: admin123, Admin) basariyla eklendi!")
        else:
            if not user_admin.is_admin:
                user_admin.is_admin = True
                print(">>> VERITABANI: 'admin' kullanicisi admin olarak guncellendi.")
            else:
                print(">>> VERITABANI: 'admin' kullanicisi zaten mevcut (Admin).")

        db.session.commit()
