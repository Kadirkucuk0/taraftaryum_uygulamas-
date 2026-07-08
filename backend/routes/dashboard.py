from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import User
from extensions import db
from datetime import datetime
import random

dashboard_bp = Blueprint('dashboard', __name__)

# Team info with logos (using football-data.org crest CDN + Wikipedia)
TEAM_INFO = {
    'galatasaray': {
        'name': 'Galatasaray',
        'short': 'GS',
        'color': '#A90432',
        'crest': 'https://a.espncdn.com/i/teamlogos/soccer/500/432.png',
    },
    'fenerbahce': {
        'name': 'Fenerbahçe',
        'short': 'FB',
        'color': '#001E61',
        'crest': 'https://a.espncdn.com/i/teamlogos/soccer/500/436.png',
    },
    'besiktas': {
        'name': 'Beşiktaş',
        'short': 'BJK',
        'color': '#000000',
        'crest': 'https://a.espncdn.com/i/teamlogos/soccer/500/1895.png',
    },
    'trabzonspor': {
        'name': 'Trabzonspor',
        'short': 'TS',
        'color': '#650426',
        'crest': 'https://a.espncdn.com/i/teamlogos/soccer/500/997.png',
    },
    'basaksehir': {
        'name': 'Başakşehir',
        'short': 'IBFK',
        'color': '#FF6600',
        'crest': 'https://a.espncdn.com/i/teamlogos/soccer/500/7914.png',
    },
    'antalyaspor': {
        'name': 'Antalyaspor',
        'short': 'ANT',
        'color': '#D00000',
        'crest': 'https://a.espncdn.com/i/teamlogos/soccer/500/3794.png',
    },
    'sivasspor': {
        'name': 'Sivasspor',
        'short': 'SVS',
        'color': '#CC0000',
        'crest': 'https://a.espncdn.com/i/teamlogos/soccer/500/7649.png',
    },
    'konyaspor': {
        'name': 'Konyaspor',
        'short': 'KNY',
        'color': '#008000',
        'crest': 'https://a.espncdn.com/i/teamlogos/soccer/500/7648.png',
    },
}

def generate_team_news(team_name):
    now = datetime.now()
    today = now.strftime("%d.%m.%Y")
    minutes_ago = lambda m: f"{m} dk önce"

    NEWS_DB = {
        'galatasaray': [
            {'title': "SON DAKİKA: Okan Buruk'tan derbi açıklaması!", 'summary': "Teknik direktör basın toplantısında kadro ve taktik planı hakkında detaylı bilgi verdi.", 'source': "GS Haber", 'icon': '🔴', 'tag': 'SON DAKİKA', 'time': minutes_ago(12)},
            {'title': "Icardi dönüyor! Kadroya alındı", 'summary': "Yıldız golcü 3 aylık sakatlığını atlattı ve yarınki maçın kadrosuna dahil edildi.", 'source': "SporX", 'icon': '⚽', 'tag': 'TRANSFER', 'time': minutes_ago(28)},
            {'title': "Galatasaray-Konyaspor maçının ilk 11'i belli oldu", 'summary': "Okan Buruk sürpriz bir ismi ilk 11'e yazdı. Taraftarlar heyecanlı.", 'source': "Webaslan", 'icon': '📋', 'tag': 'KADRO', 'time': minutes_ago(45)},
            {'title': "Dev transfer! Avrupa'dan yıldız isim geliyor", 'summary': "Erden Timur'un Avrupa'daki gizli görüşmeleri sonuç verdi. Anlaşma sağlandı.", 'source': "Fanatik", 'icon': '🔄', 'tag': 'TRANSFER', 'time': minutes_ago(55)},
            {'title': "Galatasaray bilet fiyatları güncellendi", 'summary': "Süper Lig son 2 hafta biletleri satışa çıktı. Fiyatlar 250 TL'den başlıyor.", 'source': "GS.org", 'icon': '🎟️', 'tag': '', 'time': '2 saat önce'},
            {'title': "Şampiyonlar Ligi puan durumu: GS kaçıncı?", 'summary': "Galatasaray Şampiyonlar Ligi'nde grubunda 2. sırada yer alıyor.", 'source': "UEFA", 'icon': '🏆', 'tag': '', 'time': '3 saat önce'},
            {'title': "Galatasaray altyapısından A takıma yükselen genç yıldız", 'summary': "17 yaşındaki genç oyuncu ilk kez A takım antrenmanına katıldı.", 'source': "Ajans GS", 'icon': '⭐', 'tag': 'GENÇLİK', 'time': '5 saat önce'},
            {'title': "Derbi öncesi taraftardan dev destek", 'summary': "Taraftar grupları Florya'da takımı ziyaret etti. Moral yemeği düzenlendi.", 'source': "SporX", 'icon': '❤️', 'tag': '', 'time': '6 saat önce'},
        ],
        'fenerbahce': [
            {'title': "SON DAKİKA: Mourinho sistemi değiştiriyor!", 'summary': "Portekizli teknik adam derbi için 3-5-2 sistemine geçiş yapacak. Çift forvet sürprizi.", 'source': "FB Haber", 'icon': '🔴', 'tag': 'SON DAKİKA', 'time': minutes_ago(8)},
            {'title': "Szymanski'ye 35 milyon Euro'luk teklif", 'summary': "Liverpool ve Tottenham genç Polonyalı yıldız için yarışıyor.", 'source': "Fanatik", 'icon': '💰', 'tag': 'TRANSFER', 'time': minutes_ago(22)},
            {'title': "Tadic'ten hat-trick! Antrenman performansı", 'summary': "Dusan Tadic çift kale maçında 3 gol atarak formda olduğunu kanıtladı.", 'source': "SuperFB", 'icon': '⚽', 'tag': '', 'time': minutes_ago(40)},
            {'title': "Kadıköy'de dev koreografi hazırlığı", 'summary': "Derbi için 50 bin kişilik koreografi planlanıyor. Tribünler alev alacak.", 'source': "Fenerium", 'icon': '🎨', 'tag': '', 'time': '1 saat önce'},
            {'title': "Fenerbahçe'den resmi transfer açıklaması", 'summary': "Başkan Ali Koç yaz transfer dönemi için bütçeyi ve hedefleri açıkladı.", 'source': "FB.org", 'icon': '📢', 'tag': 'RESMİ', 'time': '2 saat önce'},
            {'title': "Osayi-Samuel sakatlandı! Son durum", 'summary': "Nijeryalı bek idmanda sakatlandı. MR sonucu bekleniyor.", 'source': "SporX", 'icon': '🏥', 'tag': 'SAKATLIK', 'time': '3 saat önce'},
            {'title': "Fenerbahçe - Beşiktaş derbisinin hakemi açıklandı", 'summary': "MHK kararını verdi. Derbiyi yönetecek isim belli oldu.", 'source': "TFF", 'icon': '⚖️', 'tag': '', 'time': '4 saat önce'},
            {'title': "Fenerbahçe kombine satışları rekor kırdı", 'summary': "2025-26 sezonu kombine kartları tüm zamanların rekorunu kırdı.", 'source': "FB.org", 'icon': '📈', 'tag': '', 'time': '5 saat önce'},
        ],
        'besiktas': [
            {'title': "SON DAKİKA: Van Bronckhorst'tan kritik açıklama", 'summary': "Hollandalı hoca basın toplantısında 'Şampiyonluk yarışında iddiamız devam ediyor' dedi.", 'source': "BJK Haber", 'icon': '🔴', 'tag': 'SON DAKİKA', 'time': minutes_ago(15)},
            {'title': "Semih Kılıçsoy için 40 milyon Euro!", 'summary': "Manchester United ve Borussia Dortmund genç yıldız için scout gönderecek.", 'source': "Karakartal", 'icon': '💰', 'tag': 'TRANSFER', 'time': minutes_ago(35)},
            {'title': "Rafa Silva durdurulamıyor", 'summary': "Portekizli yıldız son 7 maçta 6 gol 4 asist yaptı. Sezonun futbolcusu adayı.", 'source': "SporX", 'icon': '🔥', 'tag': '', 'time': '1 saat önce'},
            {'title': "Beşiktaş'ta sakatlık şoku yaşanıyor", 'summary': "Defans hattında 3 oyuncu birden sakatlandı. Hoca alternatif arıyor.", 'source': "Fanatik", 'icon': '🏥', 'tag': 'SAKATLIK', 'time': '2 saat önce'},
            {'title': "Tüpraş Stadyumu'nda yenilenme çalışmaları", 'summary': "Stad kapasitesi 45 bine çıkarılıyor. Çalışmalar yaz döneminde tamamlanacak.", 'source': "BJK.com", 'icon': '🏟️', 'tag': '', 'time': '3 saat önce'},
            {'title': "Beşiktaş altyapıdan 2 genç yıldız daha", 'summary': "15 ve 16 yaşındaki iki genç futbolcu A takım antrenmanlarına dahil edildi.", 'source': "Karakartal", 'icon': '⭐', 'tag': 'GENÇLİK', 'time': '4 saat önce'},
            {'title': "Kartal Yuvası'nda büyük kampanya", 'summary': "Forma satışlarında %30 indirim başladı. Kampanya sınırlı süre geçerli.", 'source': "KartalYuvası", 'icon': '🛒', 'tag': 'KAMPANYA', 'time': '5 saat önce'},
            {'title': "Beşiktaş-Trabzonspor maç özeti ve golleri", 'summary': "Beşiktaş evinde 3-0 kazandı. Maçın özetini izleyin.", 'source': "beIN", 'icon': '📺', 'tag': '', 'time': '1 gün önce'},
        ],
        'trabzonspor': [
            {'title': "SON DAKİKA: Avcı'dan sürpriz kadro!", 'summary': "Abdullah Avcı Sivasspor maçı için tamamen farklı bir ilk 11 hazırladı.", 'source': "TS Haber", 'icon': '🔴', 'tag': 'SON DAKİKA', 'time': minutes_ago(10)},
            {'title': "Uğurcan Çakır yine devleşti!", 'summary': "Kaptan son 5 maçta kalesini gole kapadı. Avrupa kulüpleri izliyor.", 'source': "BordoMavi", 'icon': '🧤', 'tag': '', 'time': minutes_ago(30)},
            {'title': "Trabzonspor'dan çifte transfer bombası", 'summary': "Güney Amerika ve Afrika'dan iki yıldız isimle prensip anlaşmasına varıldı.", 'source': "Fanatik", 'icon': '💰', 'tag': 'TRANSFER', 'time': '1 saat önce'},
            {'title': "Papara Park'ta derbi coşkusu", 'summary': "Trabzon şehri derbiye hazır. Tüm biletler 1 saatte tükendi.", 'source': "TS.org", 'icon': '🏟️', 'tag': '', 'time': '2 saat önce'},
            {'title': "Trabzonspor'un Avrupa hedefi netleşti", 'summary': "Teknik ekip Konferans Ligi'nde tur atlama planını belirledi.", 'source': "UEFA", 'icon': '🏆', 'tag': '', 'time': '3 saat önce'},
            {'title': "Bakasetas'tan transfer itirafı", 'summary': "Yunan yıldız 'Trabzon'dan ayrılmayı düşünmüyorum' dedi.", 'source': "SporX", 'icon': '🎤', 'tag': 'ÖZEL RÖPORTAJ', 'time': '4 saat önce'},
            {'title': "TSClub yaz koleksiyonu tanıtıldı", 'summary': "Yeni sezon formaları ve günlük giyim koleksiyonu satışa sunuldu.", 'source': "TSClub", 'icon': '👕', 'tag': '', 'time': '6 saat önce'},
            {'title': "Trabzonspor U19 şampiyon!", 'summary': "Altyapı takımı U19 liginde şampiyonluğu garantiledi.", 'source': "TFF", 'icon': '🥇', 'tag': 'ALT YAPI', 'time': '1 gün önce'},
        ],
        'basaksehir': [
            {'title': "SON DAKİKA: Başakşehir'de teknik direktör değişikliği!", 'summary': "Yönetim yeni hoca için sürpriz bir isimle anlaştı. Açıklama bugün bekleniyor.", 'source': "Spor Ajansı", 'icon': '🔴', 'tag': 'SON DAKİKA', 'time': minutes_ago(14)},
            {'title': "Başakşehir transferde hız kesmiyor", 'summary': "Portekiz liginden genç stoper için 5 milyon Euro'luk teklif yapıldı.", 'source': "Fanatik", 'icon': '💰', 'tag': 'TRANSFER', 'time': minutes_ago(38)},
            {'title': "Başakşehir Fatih Terim Stadyumu'nda rekor seyirci", 'summary': "Galatasaray maçında stad tıklım tıklım doldu. Taraftar büyük coşku yaşadı.", 'source': "SporX", 'icon': '🏟️', 'tag': '', 'time': '1 saat önce'},
            {'title': "Başakşehir'de sakatlık endişesi", 'summary': "Orta saha oyuncusu idmanda dizinden sakatlandı. Tedavisi devam ediyor.", 'source': "IBB Haber", 'icon': '🏥', 'tag': 'SAKATLIK', 'time': '2 saat önce'},
            {'title': "Avrupa kupaları için Başakşehir iddialı", 'summary': "Başkan, hedefin UEFA Konferans Ligi olduğunu açıkladı.", 'source': "Haber61", 'icon': '🏆', 'tag': '', 'time': '3 saat önce'},
            {'title': "Başakşehir altyapısı parlıyor", 'summary': "U17 takımı turnuvada şampiyon oldu. 3 genç oyuncu A takıma çağrıldı.", 'source': "TFF", 'icon': '⭐', 'tag': 'GENÇLİK', 'time': '5 saat önce'},
            {'title': "Başakşehir Store'da sezon sonu indirimi", 'summary': "Resmi mağazada tüm ürünlerde %25 indirim kampanyası başladı.", 'source': "IBB Store", 'icon': '🛒', 'tag': 'KAMPANYA', 'time': '6 saat önce'},
            {'title': "Başakşehir-Antalyaspor maç özeti", 'summary': "Ev sahibi 2-0 kazandı. İşte maçın detayları ve goller.", 'source': "beIN", 'icon': '📺', 'tag': '', 'time': '1 gün önce'},
        ],
        'antalyaspor': [
            {'title': "SON DAKİKA: Antalyaspor'da hoca krizi!", 'summary': "Teknik direktör son 3 mağlubiyetin ardından görevinden ayrıldığını açıkladı.", 'source': "Antalya Haber", 'icon': '🔴', 'tag': 'SON DAKİKA', 'time': minutes_ago(11)},
            {'title': "Antalyaspor'a Brezilyalı golcü geliyor", 'summary': "Brezilya Serie A'dan genç forvet için anlaşma sağlandı. Transfer yakında açıklanacak.", 'source': "Fanatik", 'icon': '💰', 'tag': 'TRANSFER', 'time': minutes_ago(25)},
            {'title': "Antalya Stadyumu yenileniyor", 'summary': "Stad kapasitesi artırılacak ve yeni VIP bölümleri eklenecek.", 'source': "SporX", 'icon': '🏟️', 'tag': '', 'time': '1 saat önce'},
            {'title': "Antalyaspor taraftarından derbi coşkusu", 'summary': "Konyaspor maçı öncesi taraftarlar takıma büyük destek verdi.", 'source': "Antalya Spor", 'icon': '❤️', 'tag': '', 'time': '2 saat önce'},
            {'title': "Naldo sezon sonu ayrılıyor mu?", 'summary': "Deneyimli savunmacı için Suudi Arabistan'dan büyük teklif geldi.", 'source': "SporX", 'icon': '🔄', 'tag': 'TRANSFER', 'time': '3 saat önce'},
            {'title': "Antalyaspor'un genç yıldızı milli takıma davet edildi", 'summary': "19 yaşındaki kanat oyuncusu U21 milli takım kadrosuna alındı.", 'source': "TFF", 'icon': '⭐', 'tag': 'MİLLİ TAKIM', 'time': '4 saat önce'},
            {'title': "Antalyaspor mağazasında yaz kampanyası", 'summary': "Tüm formaları %20 indirimle alabilirsiniz. Kampanya sınırlı süreli.", 'source': "ANT Store", 'icon': '🛒', 'tag': 'KAMPANYA', 'time': '5 saat önce'},
            {'title': "Antalyaspor 2-1 Sivasspor maç özeti", 'summary': "Antalyaspor evinde gülen taraf oldu. Goller ve pozisyonlar.", 'source': "beIN", 'icon': '📺', 'tag': '', 'time': '1 gün önce'},
        ],
        'sivasspor': [
            {'title': "SON DAKİKA: Sivasspor'da kadro dışı kararı!", 'summary': "2 yıldız oyuncu disiplinsizlik gerekçesiyle kadro dışı bırakıldı.", 'source': "Sivas Haber", 'icon': '🔴', 'tag': 'SON DAKİKA', 'time': minutes_ago(16)},
            {'title': "Sivasspor transferde atağa kalktı", 'summary': "Alman 2. Lig'den tecrübeli orta saha oyuncusu için görüşmeler başladı.", 'source': "Fanatik", 'icon': '💰', 'tag': 'TRANSFER', 'time': minutes_ago(33)},
            {'title': "Yeni Sivas 4 Eylül Stadyumu gurur veriyor", 'summary': "Stadyum modern altyapısıyla Avrupa standartlarında hizmet veriyor.", 'source': "SporX", 'icon': '🏟️', 'tag': '', 'time': '1 saat önce'},
            {'title': "Sivasspor'da gençlere şans!", 'summary': "Teknik direktör altyapıdan 4 genç oyuncuyu ilk kez kadroya dahil etti.", 'source': "Sivas Spor", 'icon': '⭐', 'tag': 'GENÇLİK', 'time': '2 saat önce'},
            {'title': "Sivas'ta derbi ateşi yanıyor", 'summary': "Kayseri maçı öncesi şehirde büyük heyecan. Tüm biletler tükendi.", 'source': "Haber Sivas", 'icon': '🔥', 'tag': '', 'time': '3 saat önce'},
            {'title': "Sivasspor kalecisi milli takımda", 'summary': "Başarılı performansıyla göz dolduran kaleci A Milli Takım kadrosuna çağrıldı.", 'source': "TFF", 'icon': '🧤', 'tag': 'MİLLİ TAKIM', 'time': '4 saat önce'},
            {'title': "Sivasspor Store yeni sezon ürünleri", 'summary': "2025-26 sezonu formaları ve aksesuarları satışa sunuldu.", 'source': "SVS Store", 'icon': '👕', 'tag': '', 'time': '5 saat önce'},
            {'title': "Sivasspor 0-0 Trabzonspor maç özeti", 'summary': "İki takım da gol bulamadı. Maçın önemli anları.", 'source': "beIN", 'icon': '📺', 'tag': '', 'time': '1 gün önce'},
        ],
        'konyaspor': [
            {'title': "SON DAKİKA: Konyaspor'da teknik adam açıklandı!", 'summary': "Yeni teknik direktör 2 yıllık sözleşme imzaladı. İlk açıklamasını yaptı.", 'source': "Konya Haber", 'icon': '🔴', 'tag': 'SON DAKİKA', 'time': minutes_ago(9)},
            {'title': "Konyaspor'a Sırp forvet!", 'summary': "Sırbistan liginin gol kralı Konyaspor ile anlaştı. Transfer bitmek üzere.", 'source': "Fanatik", 'icon': '💰', 'tag': 'TRANSFER', 'time': minutes_ago(27)},
            {'title': "Konya Büyükşehir Stadyumu'nda yenilik", 'summary': "Stadyuma yeni skorboard ve ses sistemi kuruluyor. Taraftar deneyimi artacak.", 'source': "SporX", 'icon': '🏟️', 'tag': '', 'time': '1 saat önce'},
            {'title': "Konyaspor taraftarından büyük destek", 'summary': "Deplasmanda 5 bin taraftar takımla birlikte olacak.", 'source': "Konya Spor", 'icon': '❤️', 'tag': '', 'time': '2 saat önce'},
            {'title': "Konyaspor'un genç yeteneği Avrupa yolcusu", 'summary': "18 yaşındaki kanat oyuncusu için İtalya'dan resmi teklif geldi.", 'source': "SporX", 'icon': '🔄', 'tag': 'TRANSFER', 'time': '3 saat önce'},
            {'title': "Konyaspor altyapı akademisi büyüyor", 'summary': "Yeni altyapı tesisleri açıldı. Modern eğitim merkeziyle genç oyuncular yetiştirilecek.", 'source': "TFF", 'icon': '⭐', 'tag': 'GENÇLİK', 'time': '4 saat önce'},
            {'title': "Konyaspor mağazasında indirimler", 'summary': "Tüm ürünlerde %15 indirim başladı. Formalar 450 TL'den başlayan fiyatlarla.", 'source': "KNY Store", 'icon': '🛒', 'tag': 'KAMPANYA', 'time': '5 saat önce'},
            {'title': "Konyaspor 1-1 Başakşehir maç özeti", 'summary': "Zorlu mücadele beraberlikle sonuçlandı. İşte maçın detayları.", 'source': "beIN", 'icon': '📺', 'tag': '', 'time': '1 gün önce'},
        ],
    }
    return NEWS_DB.get(team_name, [
        {'title': f"{team_name.title()} haberleri yükleniyor...", 'summary': f"Takım bilgileri güncelleniyor. ({today})", 'source': "Spor Ajansı", 'icon': '📰', 'tag': '', 'time': 'Az önce'}
    ])


MOCK_MATCHES = {
    'galatasaray': [
        {'home': 'Galatasaray', 'away': 'Fenerbahçe', 'score': '2 - 1', 'status': 'FINISHED', 'date': 'Geçen Hafta', 'league': 'Süper Lig', 'home_crest': TEAM_INFO['galatasaray']['crest'], 'away_crest': TEAM_INFO['fenerbahce']['crest']},
        {'home': 'Konyaspor', 'away': 'Galatasaray', 'score': '- : -', 'status': 'UPCOMING', 'date': 'Yarın, 19:00', 'league': 'Süper Lig', 'home_crest': TEAM_INFO['konyaspor']['crest'], 'away_crest': TEAM_INFO['galatasaray']['crest']},
        {'home': 'Galatasaray', 'away': 'Young Boys', 'score': '3 - 0', 'status': 'FINISHED', 'date': '2 Hafta Önce', 'league': 'UEFA Şampiyonlar Ligi', 'home_crest': TEAM_INFO['galatasaray']['crest'], 'away_crest': ''},
    ],
    'fenerbahce': [
        {'home': 'Galatasaray', 'away': 'Fenerbahçe', 'score': '2 - 1', 'status': 'FINISHED', 'date': 'Geçen Hafta', 'league': 'Süper Lig', 'home_crest': TEAM_INFO['galatasaray']['crest'], 'away_crest': TEAM_INFO['fenerbahce']['crest']},
        {'home': 'Fenerbahçe', 'away': 'Beşiktaş', 'score': '- : -', 'status': 'UPCOMING', 'date': 'Pazar, 20:00', 'league': 'Süper Lig', 'home_crest': TEAM_INFO['fenerbahce']['crest'], 'away_crest': TEAM_INFO['besiktas']['crest']},
        {'home': 'Fenerbahçe', 'away': 'Lille', 'score': '1 - 1', 'status': 'FINISHED', 'date': '2 Hafta Önce', 'league': 'UEFA Avrupa Ligi', 'home_crest': TEAM_INFO['fenerbahce']['crest'], 'away_crest': ''},
    ],
    'besiktas': [
        {'home': 'Beşiktaş', 'away': 'Trabzonspor', 'score': '3 - 0', 'status': 'FINISHED', 'date': 'Geçen Hafta', 'league': 'Süper Lig', 'home_crest': TEAM_INFO['besiktas']['crest'], 'away_crest': TEAM_INFO['trabzonspor']['crest']},
        {'home': 'Fenerbahçe', 'away': 'Beşiktaş', 'score': '- : -', 'status': 'UPCOMING', 'date': 'Pazar, 20:00', 'league': 'Süper Lig', 'home_crest': TEAM_INFO['fenerbahce']['crest'], 'away_crest': TEAM_INFO['besiktas']['crest']},
        {'home': 'Beşiktaş', 'away': 'Ajax', 'score': '2 - 1', 'status': 'FINISHED', 'date': '3 Hafta Önce', 'league': 'UEFA Konferans Ligi', 'home_crest': TEAM_INFO['besiktas']['crest'], 'away_crest': ''},
    ],
    'trabzonspor': [
        {'home': 'Beşiktaş', 'away': 'Trabzonspor', 'score': '3 - 0', 'status': 'FINISHED', 'date': 'Geçen Hafta', 'league': 'Süper Lig', 'home_crest': TEAM_INFO['besiktas']['crest'], 'away_crest': TEAM_INFO['trabzonspor']['crest']},
        {'home': 'Trabzonspor', 'away': 'Sivasspor', 'score': '- : -', 'status': 'UPCOMING', 'date': 'Cumartesi, 16:00', 'league': 'Süper Lig', 'home_crest': TEAM_INFO['trabzonspor']['crest'], 'away_crest': TEAM_INFO['sivasspor']['crest']},
    ],
    'basaksehir': [
        {'home': 'Başakşehir', 'away': 'Antalyaspor', 'score': '2 - 0', 'status': 'FINISHED', 'date': 'Geçen Hafta', 'league': 'Süper Lig', 'home_crest': TEAM_INFO['basaksehir']['crest'], 'away_crest': TEAM_INFO['antalyaspor']['crest']},
        {'home': 'Galatasaray', 'away': 'Başakşehir', 'score': '- : -', 'status': 'UPCOMING', 'date': 'Cumartesi, 19:00', 'league': 'Süper Lig', 'home_crest': TEAM_INFO['galatasaray']['crest'], 'away_crest': TEAM_INFO['basaksehir']['crest']},
        {'home': 'Başakşehir', 'away': 'Konyaspor', 'score': '1 - 1', 'status': 'FINISHED', 'date': '2 Hafta Önce', 'league': 'Süper Lig', 'home_crest': TEAM_INFO['basaksehir']['crest'], 'away_crest': TEAM_INFO['konyaspor']['crest']},
    ],
    'antalyaspor': [
        {'home': 'Antalyaspor', 'away': 'Sivasspor', 'score': '2 - 1', 'status': 'FINISHED', 'date': 'Geçen Hafta', 'league': 'Süper Lig', 'home_crest': TEAM_INFO['antalyaspor']['crest'], 'away_crest': TEAM_INFO['sivasspor']['crest']},
        {'home': 'Trabzonspor', 'away': 'Antalyaspor', 'score': '- : -', 'status': 'UPCOMING', 'date': 'Pazar, 16:00', 'league': 'Süper Lig', 'home_crest': TEAM_INFO['trabzonspor']['crest'], 'away_crest': TEAM_INFO['antalyaspor']['crest']},
        {'home': 'Başakşehir', 'away': 'Antalyaspor', 'score': '2 - 0', 'status': 'FINISHED', 'date': '2 Hafta Önce', 'league': 'Süper Lig', 'home_crest': TEAM_INFO['basaksehir']['crest'], 'away_crest': TEAM_INFO['antalyaspor']['crest']},
    ],
    'sivasspor': [
        {'home': 'Sivasspor', 'away': 'Trabzonspor', 'score': '0 - 0', 'status': 'FINISHED', 'date': 'Geçen Hafta', 'league': 'Süper Lig', 'home_crest': TEAM_INFO['sivasspor']['crest'], 'away_crest': TEAM_INFO['trabzonspor']['crest']},
        {'home': 'Sivasspor', 'away': 'Konyaspor', 'score': '- : -', 'status': 'UPCOMING', 'date': 'Cumartesi, 13:30', 'league': 'Süper Lig', 'home_crest': TEAM_INFO['sivasspor']['crest'], 'away_crest': TEAM_INFO['konyaspor']['crest']},
        {'home': 'Antalyaspor', 'away': 'Sivasspor', 'score': '2 - 1', 'status': 'FINISHED', 'date': '2 Hafta Önce', 'league': 'Süper Lig', 'home_crest': TEAM_INFO['antalyaspor']['crest'], 'away_crest': TEAM_INFO['sivasspor']['crest']},
    ],
    'konyaspor': [
        {'home': 'Konyaspor', 'away': 'Başakşehir', 'score': '1 - 1', 'status': 'FINISHED', 'date': 'Geçen Hafta', 'league': 'Süper Lig', 'home_crest': TEAM_INFO['konyaspor']['crest'], 'away_crest': TEAM_INFO['basaksehir']['crest']},
        {'home': 'Konyaspor', 'away': 'Galatasaray', 'score': '- : -', 'status': 'UPCOMING', 'date': 'Yarın, 19:00', 'league': 'Süper Lig', 'home_crest': TEAM_INFO['konyaspor']['crest'], 'away_crest': TEAM_INFO['galatasaray']['crest']},
        {'home': 'Fenerbahçe', 'away': 'Konyaspor', 'score': '3 - 1', 'status': 'FINISHED', 'date': '2 Hafta Önce', 'league': 'Süper Lig', 'home_crest': TEAM_INFO['fenerbahce']['crest'], 'away_crest': TEAM_INFO['konyaspor']['crest']},
    ],
}

MOCK_DISCOUNTS = {
    'galatasaray': {'code': 'CIMBOM20', 'desc': "GSStore'da %20 İndirim!", 'url': 'https://www.gsstore.org/'},
    'fenerbahce': {'code': 'FENER20', 'desc': "Fenerium'da %20 İndirim!", 'url': 'https://fenerium.com/'},
    'besiktas': {'code': 'KARTAL20', 'desc': "Kartal Yuvası %20 İndirim!", 'url': 'https://www.kartalyuvasi.com.tr/'},
    'trabzonspor': {'code': 'FIRTINA20', 'desc': "TSClub %20 İndirim!", 'url': 'https://www.tsclub.com.tr/'},
    'basaksehir': {'code': 'BASAK15', 'desc': "Başakşehir Store %15 İndirim!", 'url': 'https://shop.ibfk.com.tr/'},
    'antalyaspor': {'code': 'AKREP15', 'desc': "Antalyaspor Mağaza %15 İndirim!", 'url': 'https://www.antalyaspor.com.tr/'},
    'sivasspor': {'code': 'YILDIZ15', 'desc': "Sivasspor Store %15 İndirim!", 'url': 'https://www.sivasspor.org.tr/'},
    'konyaspor': {'code': 'ANADOLU15', 'desc': "Konyaspor Mağaza %15 İndirim!", 'url': 'https://www.konyaspor.org.tr/'},
}

@dashboard_bp.route('/<team_name>', methods=['GET'])
@jwt_required()
def get_dashboard_data(team_name):
    current_user = get_jwt_identity()
    user = User.query.filter_by(username=current_user).first()
    if user:
        user.favorite_team = team_name
        db.session.commit()

    team_info = TEAM_INFO.get(team_name, {'name': team_name, 'short': team_name[:3].upper(), 'color': '#333', 'crest': ''})
    matches = MOCK_MATCHES.get(team_name, [])
    news = generate_team_news(team_name)
    discount = MOCK_DISCOUNTS.get(team_name, {'code': 'SUPERLIG10', 'desc': 'Resmi Mağazada %10 İndirim!', 'url': '#'})

    return jsonify({
        'status': 'success',
        'team_info': team_info,
        'matches': matches,
        'news': news,
        'discount': discount
    }), 200
