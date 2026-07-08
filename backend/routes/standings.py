from flask import Blueprint, jsonify, current_app
import requests
import time

standings_bp = Blueprint('standings', __name__)

# Cache to avoid hitting API rate limits
_standings_cache = {}
_cache_timestamps = {}
CACHE_TIMEOUT = 300

# ══════════════════════════════════════════════════════════════
# ALL LOGO URLs USE media.api-sports.io (PUBLICLY ACCESSIBLE)
# Format: https://media.api-sports.io/football/teams/{ID}.png
# ══════════════════════════════════════════════════════════════

# ══════════════════════════════════════════════════════════════
# FIFA WORLD CUP 2026 - 48 TEAMS, 12 GROUPS
# Tournament: June 11 - July 19, 2026
# Hosts: USA, Mexico, Canada
# Flags from flagcdn.com (reliable, no auth needed)
# ══════════════════════════════════════════════════════════════

WORLD_CUP_STANDINGS = [
    # ── GROUP A ──
    {"group": "Group A", "pos": 1, "team": "Mexico", "crest": "https://flagcdn.com/w80/mx.png", "played": 0, "won": 0, "draw": 0, "lost": 0, "gf": 0, "ga": 0, "gd": 0, "pts": 0},
    {"group": "Group A", "pos": 2, "team": "South Africa", "crest": "https://flagcdn.com/w80/za.png", "played": 0, "won": 0, "draw": 0, "lost": 0, "gf": 0, "ga": 0, "gd": 0, "pts": 0},
    {"group": "Group A", "pos": 3, "team": "South Korea", "crest": "https://flagcdn.com/w80/kr.png", "played": 0, "won": 0, "draw": 0, "lost": 0, "gf": 0, "ga": 0, "gd": 0, "pts": 0},
    {"group": "Group A", "pos": 4, "team": "Czechia", "crest": "https://flagcdn.com/w80/cz.png", "played": 0, "won": 0, "draw": 0, "lost": 0, "gf": 0, "ga": 0, "gd": 0, "pts": 0},
    # ── GROUP B ──
    {"group": "Group B", "pos": 1, "team": "Canada", "crest": "https://flagcdn.com/w80/ca.png", "played": 0, "won": 0, "draw": 0, "lost": 0, "gf": 0, "ga": 0, "gd": 0, "pts": 0},
    {"group": "Group B", "pos": 2, "team": "Bosnia and Herzegovina", "crest": "https://flagcdn.com/w80/ba.png", "played": 0, "won": 0, "draw": 0, "lost": 0, "gf": 0, "ga": 0, "gd": 0, "pts": 0},
    {"group": "Group B", "pos": 3, "team": "Qatar", "crest": "https://flagcdn.com/w80/qa.png", "played": 0, "won": 0, "draw": 0, "lost": 0, "gf": 0, "ga": 0, "gd": 0, "pts": 0},
    {"group": "Group B", "pos": 4, "team": "Switzerland", "crest": "https://flagcdn.com/w80/ch.png", "played": 0, "won": 0, "draw": 0, "lost": 0, "gf": 0, "ga": 0, "gd": 0, "pts": 0},
    # ── GROUP C ──
    {"group": "Group C", "pos": 1, "team": "Brazil", "crest": "https://flagcdn.com/w80/br.png", "played": 0, "won": 0, "draw": 0, "lost": 0, "gf": 0, "ga": 0, "gd": 0, "pts": 0},
    {"group": "Group C", "pos": 2, "team": "Morocco", "crest": "https://flagcdn.com/w80/ma.png", "played": 0, "won": 0, "draw": 0, "lost": 0, "gf": 0, "ga": 0, "gd": 0, "pts": 0},
    {"group": "Group C", "pos": 3, "team": "Haiti", "crest": "https://flagcdn.com/w80/ht.png", "played": 0, "won": 0, "draw": 0, "lost": 0, "gf": 0, "ga": 0, "gd": 0, "pts": 0},
    {"group": "Group C", "pos": 4, "team": "Scotland", "crest": "https://flagcdn.com/w80/gb-sct.png", "played": 0, "won": 0, "draw": 0, "lost": 0, "gf": 0, "ga": 0, "gd": 0, "pts": 0},
    # ── GROUP D ──
    {"group": "Group D", "pos": 1, "team": "USA", "crest": "https://flagcdn.com/w80/us.png", "played": 0, "won": 0, "draw": 0, "lost": 0, "gf": 0, "ga": 0, "gd": 0, "pts": 0},
    {"group": "Group D", "pos": 2, "team": "Paraguay", "crest": "https://flagcdn.com/w80/py.png", "played": 0, "won": 0, "draw": 0, "lost": 0, "gf": 0, "ga": 0, "gd": 0, "pts": 0},
    {"group": "Group D", "pos": 3, "team": "Australia", "crest": "https://flagcdn.com/w80/au.png", "played": 0, "won": 0, "draw": 0, "lost": 0, "gf": 0, "ga": 0, "gd": 0, "pts": 0},
    {"group": "Group D", "pos": 4, "team": "Turkey", "crest": "https://flagcdn.com/w80/tr.png", "played": 0, "won": 0, "draw": 0, "lost": 0, "gf": 0, "ga": 0, "gd": 0, "pts": 0},
    # ── GROUP E ──
    {"group": "Group E", "pos": 1, "team": "Germany", "crest": "https://flagcdn.com/w80/de.png", "played": 0, "won": 0, "draw": 0, "lost": 0, "gf": 0, "ga": 0, "gd": 0, "pts": 0},
    {"group": "Group E", "pos": 2, "team": "Curaçao", "crest": "https://flagcdn.com/w80/cw.png", "played": 0, "won": 0, "draw": 0, "lost": 0, "gf": 0, "ga": 0, "gd": 0, "pts": 0},
    {"group": "Group E", "pos": 3, "team": "Côte d'Ivoire", "crest": "https://flagcdn.com/w80/ci.png", "played": 0, "won": 0, "draw": 0, "lost": 0, "gf": 0, "ga": 0, "gd": 0, "pts": 0},
    {"group": "Group E", "pos": 4, "team": "Ecuador", "crest": "https://flagcdn.com/w80/ec.png", "played": 0, "won": 0, "draw": 0, "lost": 0, "gf": 0, "ga": 0, "gd": 0, "pts": 0},
    # ── GROUP F ──
    {"group": "Group F", "pos": 1, "team": "Netherlands", "crest": "https://flagcdn.com/w80/nl.png", "played": 0, "won": 0, "draw": 0, "lost": 0, "gf": 0, "ga": 0, "gd": 0, "pts": 0},
    {"group": "Group F", "pos": 2, "team": "Japan", "crest": "https://flagcdn.com/w80/jp.png", "played": 0, "won": 0, "draw": 0, "lost": 0, "gf": 0, "ga": 0, "gd": 0, "pts": 0},
    {"group": "Group F", "pos": 3, "team": "Sweden", "crest": "https://flagcdn.com/w80/se.png", "played": 0, "won": 0, "draw": 0, "lost": 0, "gf": 0, "ga": 0, "gd": 0, "pts": 0},
    {"group": "Group F", "pos": 4, "team": "Tunisia", "crest": "https://flagcdn.com/w80/tn.png", "played": 0, "won": 0, "draw": 0, "lost": 0, "gf": 0, "ga": 0, "gd": 0, "pts": 0},
    # ── GROUP G ──
    {"group": "Group G", "pos": 1, "team": "Belgium", "crest": "https://flagcdn.com/w80/be.png", "played": 0, "won": 0, "draw": 0, "lost": 0, "gf": 0, "ga": 0, "gd": 0, "pts": 0},
    {"group": "Group G", "pos": 2, "team": "Egypt", "crest": "https://flagcdn.com/w80/eg.png", "played": 0, "won": 0, "draw": 0, "lost": 0, "gf": 0, "ga": 0, "gd": 0, "pts": 0},
    {"group": "Group G", "pos": 3, "team": "Iran", "crest": "https://flagcdn.com/w80/ir.png", "played": 0, "won": 0, "draw": 0, "lost": 0, "gf": 0, "ga": 0, "gd": 0, "pts": 0},
    {"group": "Group G", "pos": 4, "team": "New Zealand", "crest": "https://flagcdn.com/w80/nz.png", "played": 0, "won": 0, "draw": 0, "lost": 0, "gf": 0, "ga": 0, "gd": 0, "pts": 0},
    # ── GROUP H ──
    {"group": "Group H", "pos": 1, "team": "Spain", "crest": "https://flagcdn.com/w80/es.png", "played": 0, "won": 0, "draw": 0, "lost": 0, "gf": 0, "ga": 0, "gd": 0, "pts": 0},
    {"group": "Group H", "pos": 2, "team": "Cabo Verde", "crest": "https://flagcdn.com/w80/cv.png", "played": 0, "won": 0, "draw": 0, "lost": 0, "gf": 0, "ga": 0, "gd": 0, "pts": 0},
    {"group": "Group H", "pos": 3, "team": "Saudi Arabia", "crest": "https://flagcdn.com/w80/sa.png", "played": 0, "won": 0, "draw": 0, "lost": 0, "gf": 0, "ga": 0, "gd": 0, "pts": 0},
    {"group": "Group H", "pos": 4, "team": "Uruguay", "crest": "https://flagcdn.com/w80/uy.png", "played": 0, "won": 0, "draw": 0, "lost": 0, "gf": 0, "ga": 0, "gd": 0, "pts": 0},
    # ── GROUP I ──
    {"group": "Group I", "pos": 1, "team": "France", "crest": "https://flagcdn.com/w80/fr.png", "played": 0, "won": 0, "draw": 0, "lost": 0, "gf": 0, "ga": 0, "gd": 0, "pts": 0},
    {"group": "Group I", "pos": 2, "team": "Senegal", "crest": "https://flagcdn.com/w80/sn.png", "played": 0, "won": 0, "draw": 0, "lost": 0, "gf": 0, "ga": 0, "gd": 0, "pts": 0},
    {"group": "Group I", "pos": 3, "team": "DR Congo", "crest": "https://flagcdn.com/w80/cd.png", "played": 0, "won": 0, "draw": 0, "lost": 0, "gf": 0, "ga": 0, "gd": 0, "pts": 0},
    {"group": "Group I", "pos": 4, "team": "Norway", "crest": "https://flagcdn.com/w80/no.png", "played": 0, "won": 0, "draw": 0, "lost": 0, "gf": 0, "ga": 0, "gd": 0, "pts": 0},
    # ── GROUP J ──
    {"group": "Group J", "pos": 1, "team": "Argentina", "crest": "https://flagcdn.com/w80/ar.png", "played": 0, "won": 0, "draw": 0, "lost": 0, "gf": 0, "ga": 0, "gd": 0, "pts": 0},
    {"group": "Group J", "pos": 2, "team": "Algeria", "crest": "https://flagcdn.com/w80/dz.png", "played": 0, "won": 0, "draw": 0, "lost": 0, "gf": 0, "ga": 0, "gd": 0, "pts": 0},
    {"group": "Group J", "pos": 3, "team": "Austria", "crest": "https://flagcdn.com/w80/at.png", "played": 0, "won": 0, "draw": 0, "lost": 0, "gf": 0, "ga": 0, "gd": 0, "pts": 0},
    {"group": "Group J", "pos": 4, "team": "Jordan", "crest": "https://flagcdn.com/w80/jo.png", "played": 0, "won": 0, "draw": 0, "lost": 0, "gf": 0, "ga": 0, "gd": 0, "pts": 0},
    # ── GROUP K ──
    {"group": "Group K", "pos": 1, "team": "Portugal", "crest": "https://flagcdn.com/w80/pt.png", "played": 0, "won": 0, "draw": 0, "lost": 0, "gf": 0, "ga": 0, "gd": 0, "pts": 0},
    {"group": "Group K", "pos": 2, "team": "Uzbekistan", "crest": "https://flagcdn.com/w80/uz.png", "played": 0, "won": 0, "draw": 0, "lost": 0, "gf": 0, "ga": 0, "gd": 0, "pts": 0},
    {"group": "Group K", "pos": 3, "team": "Colombia", "crest": "https://flagcdn.com/w80/co.png", "played": 0, "won": 0, "draw": 0, "lost": 0, "gf": 0, "ga": 0, "gd": 0, "pts": 0},
    {"group": "Group K", "pos": 4, "team": "Iraq", "crest": "https://flagcdn.com/w80/iq.png", "played": 0, "won": 0, "draw": 0, "lost": 0, "gf": 0, "ga": 0, "gd": 0, "pts": 0},
    # ── GROUP L ──
    {"group": "Group L", "pos": 1, "team": "England", "crest": "https://flagcdn.com/w80/gb-eng.png", "played": 0, "won": 0, "draw": 0, "lost": 0, "gf": 0, "ga": 0, "gd": 0, "pts": 0},
    {"group": "Group L", "pos": 2, "team": "Croatia", "crest": "https://flagcdn.com/w80/hr.png", "played": 0, "won": 0, "draw": 0, "lost": 0, "gf": 0, "ga": 0, "gd": 0, "pts": 0},
    {"group": "Group L", "pos": 3, "team": "Ghana", "crest": "https://flagcdn.com/w80/gh.png", "played": 0, "won": 0, "draw": 0, "lost": 0, "gf": 0, "ga": 0, "gd": 0, "pts": 0},
    {"group": "Group L", "pos": 4, "team": "Panama", "crest": "https://flagcdn.com/w80/pa.png", "played": 0, "won": 0, "draw": 0, "lost": 0, "gf": 0, "ga": 0, "gd": 0, "pts": 0},
]

# ══════════════════════════════════════════════════════════════
# FIFA WORLD CUP 2026 - GROUP STAGE FIXTURES
# ══════════════════════════════════════════════════════════════

WORLD_CUP_FIXTURES = [
    {"group": "Group A", "home": "Mexico", "away": "South Africa", "home_flag": "https://flagcdn.com/w80/mx.png", "away_flag": "https://flagcdn.com/w80/za.png", "date": "11 Haziran 2026", "time": "22:00", "venue": "Estadio Azteca, Mexico City", "status": "TIMED"},
    {"group": "Group A", "home": "South Korea", "away": "Czechia", "home_flag": "https://flagcdn.com/w80/kr.png", "away_flag": "https://flagcdn.com/w80/cz.png", "date": "12 Haziran 2026", "time": "01:00", "venue": "SoFi Stadium, Los Angeles", "status": "TIMED"},
    {"group": "Group B", "home": "Canada", "away": "Bosnia and Herzegovina", "home_flag": "https://flagcdn.com/w80/ca.png", "away_flag": "https://flagcdn.com/w80/ba.png", "date": "12 Haziran 2026", "time": "19:00", "venue": "MetLife Stadium, New York", "status": "TIMED"},
    {"group": "Group B", "home": "Qatar", "away": "Switzerland", "home_flag": "https://flagcdn.com/w80/qa.png", "away_flag": "https://flagcdn.com/w80/ch.png", "date": "12 Haziran 2026", "time": "22:00", "venue": "Hard Rock Stadium, Miami", "status": "TIMED"},
    {"group": "Group C", "home": "Brazil", "away": "Morocco", "home_flag": "https://flagcdn.com/w80/br.png", "away_flag": "https://flagcdn.com/w80/ma.png", "date": "12 Haziran 2026", "time": "01:00", "venue": "AT&T Stadium, Dallas", "status": "TIMED"},
    {"group": "Group C", "home": "Haiti", "away": "Scotland", "home_flag": "https://flagcdn.com/w80/ht.png", "away_flag": "https://flagcdn.com/w80/gb-sct.png", "date": "13 Haziran 2026", "time": "19:00", "venue": "NRG Stadium, Houston", "status": "TIMED"},
    {"group": "Group D", "home": "USA", "away": "Paraguay", "home_flag": "https://flagcdn.com/w80/us.png", "away_flag": "https://flagcdn.com/w80/py.png", "date": "13 Haziran 2026", "time": "22:00", "venue": "Mercedes-Benz Stadium, Atlanta", "status": "TIMED"},
    {"group": "Group D", "home": "Australia", "away": "Turkey", "home_flag": "https://flagcdn.com/w80/au.png", "away_flag": "https://flagcdn.com/w80/tr.png", "date": "13 Haziran 2026", "time": "01:00", "venue": "Lumen Field, Seattle", "status": "TIMED"},
]

TEAM_NAME_TR = {
    "Mexico": "Meksika",
    "South Africa": "Güney Afrika",
    "South Korea": "Güney Kore",
    "Czechia": "Çekya",
    "Canada": "Kanada",
    "Bosnia and Herzegovina": "Bosna Hersek",
    "Qatar": "Katar",
    "Switzerland": "İsviçre",
    "Brazil": "Brezilya",
    "Morocco": "Fas",
    "Haiti": "Haiti",
    "Scotland": "İskoçya",
    "USA": "ABD",
    "Paraguay": "Paraguay",
    "Australia": "Avustralya",
    "Turkey": "Türkiye",
    "Türkiye": "Türkiye",
    "Germany": "Almanya",
    "Curaçao": "Curaçao",
    "Curacao": "Curaçao",
    "Côte d'Ivoire": "Fildişi Sahili",
    "Ivory Coast": "Fildişi Sahili",
    "Ecuador": "Ekvador",
    "Netherlands": "Hollanda",
    "Japan": "Japonya",
    "Sweden": "İsveç",
    "Tunisia": "Tunus",
    "Belgium": "Belçika",
    "Egypt": "Mısır",
    "Iran": "İran",
    "New Zealand": "Yeni Zelanda",
    "Spain": "İspanya",
    "Cabo Verde": "Yeşil Burun Adaları",
    "Cape Verde": "Yeşil Burun Adaları",
    "Saudi Arabia": "Suudi Arabistan",
    "Uruguay": "Uruguay",
    "France": "Fransa",
    "Senegal": "Senegal",
    "DR Congo": "Demokratik Kongo",
    "Congo DR": "Demokratik Kongo",
    "DR Kongo": "Demokratik Kongo",
    "Norway": "Norveç",
    "Argentina": "Arjantin",
    "Algeria": "Cezayir",
    "Austria": "Avusturya",
    "Jordan": "Ürdün",
    "Portugal": "Portekiz",
    "Uzbekistan": "Özbekistan",
    "Colombia": "Kolombiya",
    "Iraq": "Irak",
    "England": "İngiltere",
    "Croatia": "Hırvatistan",
    "Ghana": "Gana",
    "Panama": "Panama"
}

# ══════════════════════════════════════════════════════════════
# TURKISH SUPER LIG 2025-26
# ALL logos from media.api-sports.io (VERIFIED WORKING)
# ══════════════════════════════════════════════════════════════


@standings_bp.route('/wc/fixtures', methods=['GET'])
def get_wc_fixtures():
    """Return World Cup 2026 group stage fixtures from ESPN"""
    from datetime import datetime, timedelta
    
    today = datetime.now()
    start_date = (today - timedelta(days=5)).strftime('%Y%m%d')
    end_date = (today + timedelta(days=3)).strftime('%Y%m%d')
    
    url = f"https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates={start_date}-{end_date}"
    try:
        response = requests.get(url, timeout=5)
        if response.status_code == 200:
            data = response.json()
            fixtures = []
            for event in data.get('events', []):
                comp = event['competitions'][0]
                status_type = comp['status']['type']['name']
                if status_type in ['STATUS_IN_PROGRESS', 'STATUS_HALFTIME']:
                    status = 'IN_PLAY'
                elif status_type in ['STATUS_FINAL', 'STATUS_FULL_TIME', 'STATUS_POSTPONED', 'STATUS_CANCELED']:
                    status = 'FINISHED'
                else:
                    status = 'TIMED'
                
                home = next((c for c in comp['competitors'] if c['homeAway'] == 'home'), None)
                away = next((c for c in comp['competitors'] if c['homeAway'] == 'away'), None)
                
                if not home or not away:
                    continue
                
                dt = datetime.strptime(event['date'], "%Y-%m-%dT%H:%MZ") + timedelta(hours=3)
                date_str = dt.strftime("%d.%m.%Y")
                time_str = dt.strftime("%H:%M")
                
                group_name = "Dünya Kupası" # ESPN doesn't always provide group in scoreboard
                
                fixtures.append({
                    "group": group_name,
                    "home": TEAM_NAME_TR.get(home['team']['name'], home['team']['name']),
                    "away": TEAM_NAME_TR.get(away['team']['name'], away['team']['name']),
                    "home_flag": home['team'].get('logo', ''),
                    "away_flag": away['team'].get('logo', ''),
                    "home_score": home.get('score', ''),
                    "away_score": away.get('score', ''),
                    "date": date_str,
                    "time": time_str,
                    "venue": event['competitions'][0].get('venue', {}).get('fullName', ''),
                    "status": status
                })
            
            # Keep only the last 2 finished matches + all upcoming/live matches
            finished = [f for f in fixtures if f['status'] == 'FINISHED']
            upcoming = [f for f in fixtures if f['status'] != 'FINISHED']
            finished = finished[-2:] if len(finished) > 2 else finished
            fixtures = finished + upcoming
            
            return jsonify({"competition": "FIFA Dünya Kupası 2026", "fixtures": fixtures}), 200
    except Exception as e:
        print(f"WC Fixtures error: {e}")
        
    return jsonify({"competition": "FIFA Dünya Kupası 2026", "fixtures": []}), 200


@standings_bp.route('/<competition_code>', methods=['GET'])
def get_standings(competition_code):
    """Fetch real standings from ESPN API or Transfermarkt. Supported: PL, BL1, SA, PD, FL1, WC, SUPERLIG"""
    valid_codes = {
        'PL': 'eng.1',
        'BL1': 'ger.1',
        'SA': 'ita.1',
        'PD': 'esp.1',
        'FL1': 'fra.1',
        'SUPERLIG': 'tur.1',
        'WC': 'fifa.world'
    }
    
    code = competition_code.upper()
    if code not in valid_codes:
        return jsonify({"error": f"Competition not supported. Use: {', '.join(valid_codes.keys())}"}), 400

    # Return cached data if available and not expired
    now = time.time()
    if code in _standings_cache and code in _cache_timestamps:
        if now - _cache_timestamps[code] < CACHE_TIMEOUT:
            return jsonify(_standings_cache[code]), 200

    standings = []
    competition_name = ""

    if code == 'SUPERLIG':
        # TFF (Transfermarkt) Scraper for Super Lig
        competition_name = "Trendyol Süper Lig (TFF)"
        url = "https://www.transfermarkt.com.tr/super-lig/tabelle/wettbewerb/TR1"
        try:
            response = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'}, timeout=10)
            if response.status_code == 200:
                from bs4 import BeautifulSoup
                soup = BeautifulSoup(response.text, 'html.parser')
                rows = soup.select('table.items tbody tr')
                for r in rows:
                    tds = r.find_all('td')
                    if len(tds) < 10: continue
                    pos = tds[0].text.strip()
                    crest_img = r.find('img')
                    crest = crest_img['src'] if crest_img else ""
                    crest = crest.replace('tiny', 'normal') if crest else crest
                    team = tds[2].text.strip()
                    played = tds[3].text.strip()
                    won = tds[4].text.strip()
                    draw = tds[5].text.strip()
                    lost = tds[6].text.strip()
                    gf_ga = tds[7].text.strip().split(':')
                    gf = gf_ga[0] if len(gf_ga) > 1 else '0'
                    ga = gf_ga[1] if len(gf_ga) > 1 else '0'
                    gd = tds[8].text.strip()
                    pts = tds[9].text.strip()
                    
                    standings.append({
                        "pos": int(pos) if pos.isdigit() else 0,
                        "team": team,
                        "crest": crest,
                        "played": int(played) if played.isdigit() else 0,
                        "won": int(won) if won.isdigit() else 0,
                        "draw": int(draw) if draw.isdigit() else 0,
                        "lost": int(lost) if lost.isdigit() else 0,
                        "gf": int(gf) if gf.isdigit() else 0,
                        "ga": int(ga) if ga.isdigit() else 0,
                        "gd": int(gd) if gd.lstrip('-+').isdigit() else 0,
                        "pts": int(pts) if pts.isdigit() else 0
                    })
        except Exception as e:
            print(f"Transfermarkt scraper error: {e}")
            return jsonify({"error": "Failed to fetch Super Lig standings"}), 502

    else:
        # ESPN API for European Leagues and World Cup
        league_id = valid_codes[code]
        season = "2026" if code == 'WC' else "2025"
        url = f"https://site.web.api.espn.com/apis/v2/sports/soccer/{league_id}/standings?season={season}"
        
        try:
            response = requests.get(url, timeout=10)
            if response.status_code == 200:
                data = response.json()
                if 'children' not in data:
                    return jsonify({"error": "No standings data returned from ESPN"}), 502
                    
                competition_name = data.get('name', code)
                if season == '2025' and '2025' not in competition_name:
                    competition_name += " 2025-2026"
                
                def parse_stats(stats_list):
                    st = {}
                    for s in stats_list:
                        st[s['abbreviation']] = s.get('value', 0)
                    return st
                
                # ESPN might return children directly (groups in WC) or a single child (league)
                groups = data.get('children', [])
                for group in groups:
                    group_name = group.get('name', '')
                    entries = group.get('standings', {}).get('entries', [])
                    for row in entries:
                        team = row['team']
                        stats = parse_stats(row.get('stats', []))
                        
                        # Standardize group name to 'Group X'
                        g_name = group.get('name', '')
                        if g_name.upper().startswith("GROUP "):
                            g_letter = g_name.split()[-1]
                            group_name = f"Group {g_letter}"
                        else:
                            group_name = g_name

                        standings.append({
                            "group": group_name,
                            "pos": stats.get('R', 0) or row.get('stats', [{'value':0}])[0].get('value', 0),
                            "team": TEAM_NAME_TR.get(team['name'], team['name']),
                            "crest": team.get('logos', [{'href': ''}])[0]['href'],
                            "played": stats.get('GP', 0),
                            "won": stats.get('W', 0),
                            "draw": stats.get('D', 0),
                            "lost": stats.get('L', 0),
                            "gf": stats.get('F', 0),
                            "ga": stats.get('A', 0),
                            "gd": stats.get('GD', 0),
                            "pts": stats.get('P', 0)
                        })
            else:
                return jsonify({"error": f"API returned {response.status_code}"}), 502
        except Exception as e:
            print(f"ESPN API error: {e}")
            return jsonify({"error": "Failed to fetch standings from ESPN"}), 502

    if not standings:
        return jsonify({"error": "No standings generated"}), 502

    # Tüm liglerde takımları doğru sıraya (pos) göre diz
    standings.sort(key=lambda x: (x.get('group', ''), x.get('pos', 99)))

    print(f"[Standings] {competition_name}: {len(standings)} takım çekildi.")
    
    result = {
        "competition": competition_name,
        "standings": standings
    }
    
    _standings_cache[code] = result
    _cache_timestamps[code] = time.time()
    
    return jsonify(result), 200
