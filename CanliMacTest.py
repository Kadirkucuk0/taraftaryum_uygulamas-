import requests

# API Anahtarın
API_KEY = '98c867f021d24b0296b1cb0a25f2b9e9'

# İlgilendiğimiz liglerin kodları (CL: Şampiyonlar Ligi, WC: Dünya Kupası, PL: Premier Lig)
# Eğer istersen araya virgül koyarak görseldeki diğer ligleri de ekleyebilirsin (örn: ,BL1,PD)
LEAGUES = "CL,WC,PL"

url = "https://api.football-data.org/v4/matches"

headers = {
    'X-Auth-Token': API_KEY
}

# 'competitions' parametresi ile sadece istediğimiz ligleri filtreliyoruz
querystring = {
    "competitions": LEAGUES
}


def fetch_selected_leagues():
    print(f"Seçilen ligler ({LEAGUES}) için bugünün maçları aranıyor...\n")

    try:
        response = requests.get(url, headers=headers, params=querystring)

        if response.status_code == 200:
            data = response.json()
            matches = data.get('matches', [])

            if not matches:
                print("Bu liglerde bugün (veya yakın zamanda) oynanan bir maç bulunamadı.")
                return

            print(f"Toplam {len(matches)} maç bulundu.\n" + "-" * 40)

            for match in matches:
                # Lig adını da alalım ki hangi maçın hangi lige ait olduğunu bilelim
                comp_name = match['competition']['name']

                # Takım isimleri (kısa isimleri tercih ediyoruz, daha temiz görünür)
                home_team = match['homeTeam'].get('shortName', match['homeTeam'].get('name', 'Bilinmiyor'))
                away_team = match['awayTeam'].get('shortName', match['awayTeam'].get('name', 'Bilinmiyor'))

                status = match['status']

                # Skorlar
                score = match['score']['fullTime']
                home_score = score['home'] if score['home'] is not None else "-"
                away_score = score['away'] if score['away'] is not None else "-"

                print(f"Lig: {comp_name}")
                print(f"Durum: {status}")
                print(f"Maç: {home_team} {home_score} - {away_score} {away_team}")
                print("-" * 40)

            print("\nTest başarılı! API bu ligler için sorunsuz çalışıyor.")

        else:
            print(f"Hata Kodu: {response.status_code}")
            print(response.text)

    except requests.exceptions.RequestException as e:
        print(f"Bağlantı sırasında bir hata oluştu: {e}")


if __name__ == "__main__":
    fetch_selected_leagues()