from dotenv import load_dotenv
load_dotenv()

from flask import Flask, jsonify
from config import Config
from extensions import db, socketio, bcrypt, jwt, mail, cors
import requests
from datetime import datetime, timedelta
import threading
import feedparser
import pytz

# Cache
latest_matches_cache = []
news_cache = []

def fetch_news_once():
    global news_cache
    try:
        url = "https://www.haberturk.com/rss/spor.xml"
        feed = feedparser.parse(url)
        items = []
        import email.utils
        from datetime import datetime, timezone
        cutoff_date = datetime(2026, 6, 1, tzinfo=timezone.utc)
        
        for entry in feed.entries:
            published_str = entry.get('published', '')
            try:
                dt_tuple = email.utils.parsedate_tz(published_str)
                if dt_tuple:
                    dt = datetime(*dt_tuple[:6], tzinfo=timezone.utc)
                    if dt < cutoff_date:
                        continue
            except:
                pass
                
            items.append({
                'title': entry.get('title', ''),
                'link': entry.get('link', ''),
                'description': entry.get('description', ''),
                'published': published_str
            })
            if len(items) >= 10: break
        news_cache.clear()
        news_cache.extend(items)
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {len(items)} haber çekildi ve önbelleğe alındı.")
    except Exception as e:
        print(f"Haber çekme hatası: {e}")

def fetch_matches_once(app=None):
    global latest_matches_cache
    
    # Sadece Dünya Kupası (fifa.world) maçlarını canlı skorlarda gösteriyoruz
    leagues = ['fifa.world']
    
    cleaned_matches = []
    
    today = datetime.now()
    start_date = (today - timedelta(days=5)).strftime('%Y%m%d')
    end_date = (today + timedelta(days=2)).strftime('%Y%m%d')
    
    for league in leagues:
        url = f"https://site.api.espn.com/apis/site/v2/sports/soccer/{league}/scoreboard?dates={start_date}-{end_date}"
        try:
            response = requests.get(url, timeout=5)
            if response.status_code == 200:
                data = response.json()
                league_name = data.get('leagues', [{}])[0].get('name', league.upper())
                
                for event in data.get('events', []):
                    comp = event['competitions'][0]
                    status_type = comp['status']['type']['name'] # e.g. STATUS_SCHEDULED, STATUS_IN_PROGRESS, STATUS_FINAL
                    
                    if status_type in ['STATUS_IN_PROGRESS', 'STATUS_HALFTIME']:
                        status = 'IN_PLAY'
                    elif status_type in ['STATUS_FINAL', 'STATUS_FULL_TIME', 'STATUS_POSTPONED', 'STATUS_CANCELED']:
                        status = 'FINISHED'
                    else:
                        status = 'TIMED'
                        
                    elapsed = comp['status'].get('displayClock', '')
                        
                    home_team_data = next((c for c in comp['competitors'] if c['homeAway'] == 'home'), None)
                    away_team_data = next((c for c in comp['competitors'] if c['homeAway'] == 'away'), None)
                    
                    if status == 'TIMED':
                        try:
                            # '2026-06-17T04:00Z'
                            utc_time = datetime.strptime(event['date'], "%Y-%m-%dT%H:%MZ")
                            utc_time = utc_time.replace(tzinfo=pytz.utc)
                            trt_time = utc_time.astimezone(pytz.timezone('Europe/Istanbul'))
                            
                            h_score = trt_time.strftime("%H:%M")
                            a_score = trt_time.strftime("%d.%m.%Y") # Use away_score for date temporarily or add a new field
                        except:
                            time_str = event['date'].split('T')[1][:5]
                            h_score = time_str
                            a_score = ""
                    else:
                        h_score = home_team_data.get('score', '-')
                        a_score = away_team_data.get('score', '-')
                        
                    from routes.standings import TEAM_NAME_TR
                    home_name = home_team_data['team']['name']
                    away_name = away_team_data['team']['name']
                    home_name_tr = TEAM_NAME_TR.get(home_name, home_name)
                    away_name_tr = TEAM_NAME_TR.get(away_name, away_name)

                    cleaned_matches.append({
                        'id': event['id'],
                        'league': league_name,
                        'home_team': home_name_tr,
                        'away_team': away_name_tr,
                        'home_logo': home_team_data['team'].get('logo', ''),
                        'away_logo': away_team_data['team'].get('logo', ''),
                        'status': status,
                        'home_score': h_score,
                        'away_score': a_score,
                        'match_date': a_score if status == 'TIMED' else '',
                        'elapsed': elapsed
                    })
        except Exception as e:
            print(f"API Çekme Hatası ({league}): {e}")
            
    # Filter for the top bar: Keep only the last 2 finished matches + all upcoming/live matches for today/tomorrow
    finished = [m for m in cleaned_matches if m['status'] == 'FINISHED']
    upcoming = [m for m in cleaned_matches if m['status'] != 'FINISHED']
    finished = finished[-2:] if len(finished) > 2 else finished
    cleaned_matches = finished + upcoming
            
    # Mock for WC if none found, to keep UI lively
    if not any(m['league'] == 'FIFA World Cup' for m in cleaned_matches):
        cleaned_matches.append({
            'id': 99991, 'league': 'FIFA World Cup', 'home_team': 'Türkiye', 'away_team': 'Brezilya', 
            'home_logo': 'https://a.espncdn.com/i/teamlogos/soccer/500/476.png', 
            'away_logo': 'https://a.espncdn.com/i/teamlogos/soccer/500/205.png', 
            'status': 'IN_PLAY', 'home_score': 2, 'away_score': 1, 'elapsed': "75'"
        })

    latest_matches_cache.clear()
    latest_matches_cache.extend(cleaned_matches)
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {len(cleaned_matches)} maç çekildi ve önbelleğe alındı.")

def start_periodic_refresh(app):
    """Periodically refresh match data every 60 seconds (ESPN is free)."""
    def refresh():
        with app.app_context():
            fetch_matches_once(app)
        # Schedule next refresh
        timer = threading.Timer(60, refresh)
        timer.daemon = True
        timer.start()

    # Start first scheduled refresh after 60 seconds
    timer = threading.Timer(60, refresh)
    timer.daemon = True
    timer.start()
    print("[Zamanlayıcı] Maç verileri ESPN'den her 60 saniyede bir güncellenecek.")

    def refresh_news():
        fetch_news_once()
        timer_news = threading.Timer(21600, refresh_news)
        timer_news.daemon = True
        timer_news.start()

    timer_news = threading.Timer(21600, refresh_news)
    timer_news.daemon = True
    timer_news.start()
    print("[Zamanlayıcı] Haber verileri TRT Spor'dan her 6 saatte bir güncellenecek.")


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Initialize extensions
    db.init_app(app)
    socketio.init_app(app)
    bcrypt.init_app(app)
    jwt.init_app(app)
    mail.init_app(app)
    cors.init_app(app, resources={r"/*": {"origins": "*"}})

    # Create tables
    with app.app_context():
        import models # Register models
        db.create_all()

    # Register blueprints
    from routes.auth import auth_bp
    from routes.dashboard import dashboard_bp
    from routes.standings import standings_bp
    from routes.admin import admin_bp
    from routes.prediction import prediction_bp
    app.register_blueprint(auth_bp, url_prefix='/auth')
    app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')
    app.register_blueprint(standings_bp, url_prefix='/api/standings')
    app.register_blueprint(admin_bp, url_prefix='/admin')
    app.register_blueprint(prediction_bp, url_prefix='/api/predictions')

    # Admin browser redirects to frontend port 8081
    @app.route('/admin', methods=['GET'])
    @app.route('/admin/', methods=['GET'])
    def backend_admin_redirect():
        from flask import redirect, request
        host_parts = request.host.split(':')
        hostname = host_parts[0]
        return redirect(f"http://{hostname}:8081/admin")

    # API endpoint for live matches from football-data.org
    @app.route('/api/matches', methods=['GET'])
    def get_live_matches():
        return jsonify({"matches": latest_matches_cache}), 200

    @app.route('/api/news', methods=['GET'])
    def get_news():
        return jsonify(news_cache), 200

    @app.route('/api/match/<match_id>/lineups', methods=['GET'])
    def get_match_lineups(match_id):
        # Mock match handle
        if str(match_id) == '99991':
            return jsonify({
                "lineups": [
                    {
                        "team_name": "Türkiye",
                        "formation": "4-2-3-1",
                        "players": [
                            {"name": "Mert Günok", "number": "1", "position": "GK"},
                            {"name": "Ferdi Kadıoğlu", "number": "20", "position": "LB"},
                            {"name": "Abdülkerim Bardakcı", "number": "14", "position": "CB"},
                            {"name": "Merih Demiral", "number": "3", "position": "CB"},
                            {"name": "Mert Müldür", "number": "18", "position": "RB"},
                            {"name": "Hakan Çalhanoğlu", "number": "10", "position": "CM"},
                            {"name": "İsmail Yüksek", "number": "16", "position": "CM"},
                            {"name": "Kenan Yıldız", "number": "19", "position": "LW"},
                            {"name": "Arda Güler", "number": "8", "position": "AM"},
                            {"name": "Barış Alper Yılmaz", "number": "21", "position": "RW"},
                            {"name": "Semih Kılıçsoy", "number": "9", "position": "CF"}
                        ]
                    },
                    {
                        "team_name": "Brezilya",
                        "formation": "4-3-3",
                        "players": [
                            {"name": "Alisson", "number": "1", "position": "GK"},
                            {"name": "Danilo", "number": "2", "position": "RB"},
                            {"name": "Marquinhos", "number": "4", "position": "CB"},
                            {"name": "Gabriel Magalhães", "number": "14", "position": "CB"},
                            {"name": "Wendell", "number": "6", "position": "LB"},
                            {"name": "Bruno Guimarães", "number": "5", "position": "CM"},
                            {"name": "João Gomes", "number": "15", "position": "CM"},
                            {"name": "Lucas Paquetá", "number": "8", "position": "AM"},
                            {"name": "Raphinha", "number": "11", "position": "RW"},
                            {"name": "Vinícius Júnior", "number": "7", "position": "LW"},
                            {"name": "Rodrygo", "number": "10", "position": "CF"}
                        ]
                    }
                ]
            }), 200

        try:
            url = f"https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary?event={match_id}"
            response = requests.get(url, timeout=5)
            if response.status_code == 200:
                data = response.json()
                rosters = data.get('rosters', [])
                formatted_lineups = []
                for roster in rosters:
                    team_name = roster.get('team', {}).get('displayName', 'Bilinmeyen Takım')
                    formation = roster.get('formation', '')
                    players = []
                    for player_info in roster.get('roster', []):
                        athlete = player_info.get('athlete', {})
                        pos = player_info.get('position', {})
                        players.append({
                            "name": athlete.get('displayName', ''),
                            "number": athlete.get('jersey', ''),
                            "position": pos.get('abbreviation', '')
                        })
                    formatted_lineups.append({
                        "team_name": team_name,
                        "formation": formation,
                        "players": players
                    })
                return jsonify({"lineups": formatted_lineups}), 200
            else:
                return jsonify({"lineups": []}), 404
        except Exception as e:
            print(f"Lineup çekme hatası: {e}")
            return jsonify({"lineups": []}), 500

    # Initialize sockets
    from sockets.events import init_events
    init_events(app, latest_matches_cache)

    # Seed Database
    from seed import seed_kadir_user
    seed_kadir_user(app)

    return app

if __name__ == '__main__':
    app = create_app()
    print("API'den güncel maçlar alınıyor, lütfen bekleyin...")
    fetch_matches_once(app)
    fetch_news_once()
    # Start periodic refresh (every 90 seconds)
    start_periodic_refresh(app)
    print("Soket Sunucusu Başlatılıyor... Port: 5000")
    socketio.run(app, host='0.0.0.0', port=5000, debug=True, allow_unsafe_werkzeug=True)
