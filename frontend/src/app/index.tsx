import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, ActivityIndicator, Linking, Dimensions, Image, Platform, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import api from '../services/api';
import AnimatedLogoBackground from '../components/AnimatedLogoBackground';
import NewsSlider from '../components/NewsSlider';
import LineupModal from '../components/LineupModal';
import MatchNotification from '../components/MatchNotification';

const { width: SW } = Dimensions.get('window');
const SMALL = SW < 420;
const MED = SW < 700;

const WC_GROUPS = [
  { id: 'Group A', name: 'A Grubu', color: '#1A2A3A' },
  { id: 'Group B', name: 'B Grubu', color: '#1A2A3A' },
  { id: 'Group C', name: 'C Grubu', color: '#1A2A3A' },
  { id: 'Group D', name: 'D Grubu', color: '#1A2A3A' },
  { id: 'Group E', name: 'E Grubu', color: '#1A2A3A' },
  { id: 'Group F', name: 'F Grubu', color: '#1A2A3A' },
  { id: 'Group G', name: 'G Grubu', color: '#1A2A3A' },
  { id: 'Group H', name: 'H Grubu', color: '#1A2A3A' },
  { id: 'Group I', name: 'I Grubu', color: '#1A2A3A' },
  { id: 'Group J', name: 'J Grubu', color: '#1A2A3A' },
  { id: 'Group K', name: 'K Grubu', color: '#1A2A3A' },
  { id: 'Group L', name: 'L Grubu', color: '#1A2A3A' },
];

type Tab = 'home' | 'standings' | 'prediction' | 'stores' | 'news';

// Fallback badge if image fails
const TeamBadge = ({ crest, short, color, size = 32 }: { crest?: string; short: string; color: string; size?: number }) => {
  const [imgError, setImgError] = useState(false);
  if (crest && !imgError) {
    return <Image source={{ uri: crest }} style={{ width: size, height: size, borderRadius: size / 2 }} onError={() => setImgError(true)} />;
  }
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#fff', fontWeight: '900', fontSize: size * 0.38 }}>{short}</Text>
    </View>
  );
};

export default function HomeScreen() {
  const router = useRouter();
  const [username, setUsername] = useState<string | null>(null);
  const [group, setGroup] = useState('Group A');
  const [tab, setTab] = useState<Tab>('home');
  const [live, setLive] = useState<any[]>([]);
  const [standings, setStandings] = useState<any[]>([]);
  const [leagueName, setLeagueName] = useState('');
  const [leagueCode, setLeagueCode] = useState('superlig');
  const [wcFixtures, setWcFixtures] = useState<any[]>([]);
  const [wcStandings, setWcStandings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [init, setInit] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [lineupVisible, setLineupVisible] = useState(false);
  const [selectedMatchId, setSelectedMatchId] = useState<string | number>('');
  const [selectedMatchHome, setSelectedMatchHome] = useState('');
  const [selectedMatchAway, setSelectedMatchAway] = useState('');

  useFocusEffect(useCallback(() => {
    (async () => {
      const u = await AsyncStorage.getItem('username');
      setUsername(u);
      const adminVal = await AsyncStorage.getItem('isAdmin');
      setIsAdmin(adminVal === 'true');
      if (u) { fetchLive(); fetchStandings('superlig'); fetchWcStandings(); fetchWcFixtures(); }
      setInit(false);
    })();
  }, []));

  const updateTimestamp = () => {
    const now = new Date();
    const h = now.getHours().toString().padStart(2, '0');
    const m = now.getMinutes().toString().padStart(2, '0');
    setLastUpdate(`${h}:${m}`);
  };

  const fetchWcStandings = async () => {
    setLoading(true); setError(null);
    try {
      const r = await api.get('/api/standings/WC');
      setWcStandings(r.data.standings || []);
      updateTimestamp();
    } catch (e: any) {
      if (e?.response?.status === 401) return;
      setError('Dünya Kupası grupları yüklenemedi.');
    }
    setLoading(false);
  };

  const fetchLive = async () => { try { const r = await api.get('/api/matches'); setLive(r.data.matches || []); } catch (e) { console.error('Live fetch error:', e); } };

  const fetchStandings = async (c: string) => {
    setLeagueCode(c);
    try {
      const r = await api.get(`/api/standings/${c}`);
      setStandings(r.data.standings || []);
      setLeagueName(r.data.competition || c);
    } catch (e) {
      console.error('Standings fetch error:', e);
      setStandings([]);
      setLeagueName(c);
    }
  };

  const fetchWcFixtures = async () => {
    try {
      const r = await api.get('/api/standings/wc/fixtures');
      setWcFixtures(r.data.fixtures || []);
    } catch (e) {
      console.error('WC fixtures fetch error:', e);
      setWcFixtures([]);
    }
  };

  const logout = async () => { await AsyncStorage.removeItem('token'); await AsyncStorage.removeItem('username'); setUsername(null); };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchWcStandings(), fetchWcFixtures(), fetchLive(), fetchStandings(leagueCode)]);
    setRefreshing(false);
  };

  if (init) return <SafeAreaView style={g.safe}><View style={g.center}><ActivityIndicator size="large" color="#00D4FF" /></View></SafeAreaView>;

  // ════════ LOGGED OUT ════════
  if (!username) return (
    <SafeAreaView style={g.safe}>
      <AnimatedLogoBackground />
      <View style={g.center}>
        <Image source={require('../../assets/images/logo.png')} style={{ width: 160, height: 160, resizeMode: 'contain', marginBottom: 10 }} />
        <Text style={g.heroTitle}>Taraftaryum</Text>
        <Text style={g.heroSub}>Süper Lig • Dünya Kupası 2026 • Canlı Skor</Text>
        <View style={{ width: '100%', maxWidth: 380, gap: 12, marginTop: 40 }}>
          <TouchableOpacity style={g.hCard} onPress={() => router.push('/login')} activeOpacity={0.8}>
            <LinearGradient colors={['#00D4FF','#007BFF']} style={g.hGrad} start={{x:0,y:0}} end={{x:1,y:1}}>
              <Ionicons name="log-in" size={22} color="#fff" /><Text style={g.hText}>Giriş Yap</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity style={g.hCard} onPress={() => router.push('/register')} activeOpacity={0.8}>
            <LinearGradient colors={['#00E676','#00C853']} style={g.hGrad} start={{x:0,y:0}} end={{x:1,y:1}}>
              <Ionicons name="person-add" size={22} color="#fff" /><Text style={g.hText}>Kayıt Ol</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );

  // ════════ LOGGED IN ════════
  const activeGroup = WC_GROUPS.find(g => g.id === group) || WC_GROUPS[0];
  const groupStandings = wcStandings.filter(s => s.group === activeGroup.id);
  const groupFixtures = wcFixtures.filter(f => f.home && f.away && (!f.group || f.group === 'Dünya Kupası' || f.group === activeGroup.id));

  return (
    <SafeAreaView style={g.safe}>
      <MatchNotification matches={live} />
      {/* Top Bar */}
      <View style={g.topBar}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ fontSize: 26 }}>🏆</Text>
          <View>
            <Text style={{ color: '#666', fontSize: 11 }}>FIFA Dünya Kupası 2026</Text>
            <Text style={{ color: '#FFD700', fontSize: 16, fontWeight: '900', letterSpacing: 1 }}>{activeGroup.name.toUpperCase()}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {isAdmin && (
            <TouchableOpacity onPress={() => router.push('/admin')} style={g.topBarBtn}>
              <Ionicons name="shield-checkmark" size={22} color="#FF9800" />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => router.push('/chat')} style={g.topBarBtn}>
            <Ionicons name="chatbubbles" size={22} color="#00E676" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/profile')} style={g.topBarBtn}>
            <Ionicons name="person-circle-outline" size={22} color="#00D4FF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={logout} style={g.logoutBtn}><Ionicons name="log-out-outline" size={20} color="#FF3D00" /></TouchableOpacity>
        </View>
      </View>

      {/* Group Selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={g.teamRow} contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}>
        {WC_GROUPS.map(gItem => (
          <TouchableOpacity key={gItem.id} onPress={() => { setGroup(gItem.id); setTab('home'); }} activeOpacity={0.7}
            style={[g.chip, group === gItem.id && { backgroundColor: '#FFD700', borderColor: '#FFD700' }]}>
            <Text style={[g.chipText, group === gItem.id && { color: '#000' }]}>{gItem.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Bottom Fixed Tabs (Local to index.tsx) */}
      <View style={g.tabBar}>
        {([['home','Ana Sayfa','home'],['standings','Puan Tablosu','trophy'],['prediction','Tahmin','game-controller'],['stores','Mağazalar','cart'], ['news','Haberler','newspaper']] as const).map(([id,label,icon]) => (
          <TouchableOpacity key={id} onPress={() => setTab(id as any)} style={g.tabBtn}>
            <Ionicons name={icon as any} size={22} color={tab === id ? '#00D4FF' : '#555'} />
            <Text style={{ color: tab === id ? '#00D4FF' : '#555', fontSize: 10, marginTop: 4, fontWeight: tab === id ? 'bold' : 'normal' }}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 14, paddingBottom: 60 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#00D4FF"
            colors={['#00D4FF']}
            progressBackgroundColor="#1A1A1A"
          />
        }
      >
        {/* Last update */}
        {lastUpdate && (
          <Text style={g.lastUpdate}>Son güncelleme: {lastUpdate}</Text>
        )}

        {error ? (
          <View style={{ alignItems: 'center', marginTop: 60, gap: 12 }}>
            <Ionicons name="alert-circle-outline" size={48} color="#FF5252" />
            <Text style={{ color: '#FF5252', fontSize: 14, textAlign: 'center' }}>{error}</Text>
            <TouchableOpacity onPress={() => fetchWcStandings()} style={{ backgroundColor: '#1A1A1A', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#333' }}>
              <Text style={{ color: '#00D4FF', fontWeight: 'bold' }}>Tekrar Dene</Text>
            </TouchableOpacity>
          </View>
        ) : loading ? <ActivityIndicator size="large" color="#00D4FF" style={{ marginTop: 60 }} /> :

        // ═══ HOME TAB ═══
        tab === 'home' ? (<>
          {/* Live Global Scores */}
          {live.length > 0 && (<>
            <Text style={g.sec}>🔴 DÜNYA KUPASI CANLI SKORLARI</Text>
            {live.slice(0, 6).map((m: any, i: number) => (
              <View key={`l${i}`} style={g.lCard}>
                <Text style={{ color: '#FF8C00', fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginBottom: 6 }}>{m.league}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ flex: 1, alignItems: 'center' }}>
                    {m.home_logo ? <Image source={{ uri: m.home_logo }} style={{ width: 20, height: 20, marginBottom: 4 }} /> : null}
                    <Text style={{ color: '#ccc', fontSize: SMALL ? 11 : 13, fontWeight: 'bold', textAlign: 'center' }} numberOfLines={1}>{m.home_team}</Text>
                  </View>
                  <View style={[g.scoreBox, { backgroundColor: '#002244', marginHorizontal: 8 }]}><Text style={g.scoreText}>{m.home_score} - {m.away_score}</Text></View>
                  <View style={{ flex: 1, alignItems: 'center' }}>
                    {m.away_logo ? <Image source={{ uri: m.away_logo }} style={{ width: 20, height: 20, marginBottom: 4 }} /> : null}
                    <Text style={{ color: '#ccc', fontSize: SMALL ? 11 : 13, fontWeight: 'bold', textAlign: 'center' }} numberOfLines={1}>{m.away_team}</Text>
                  </View>
                </View>
                <Text style={{ color: '#555', textAlign: 'center', marginTop: 5, fontSize: 10, textTransform: 'uppercase' }}>
                  {m.status === 'IN_PLAY' ? `🔴 Oynanıyor${m.elapsed ? ` (${m.elapsed}')` : ''}` : m.status === 'FINISHED' ? '✅ Bitti' : '⏳ Yaklaşan'}
                </Text>
                {/* Kadrolar Button */}
                <TouchableOpacity 
                  style={{ marginTop: 8, backgroundColor: '#1A2A3A', paddingVertical: 6, borderRadius: 6, alignItems: 'center' }}
                  onPress={() => {
                    setSelectedMatchId(m.id);
                    setSelectedMatchHome(m.home_team);
                    setSelectedMatchAway(m.away_team);
                    setLineupVisible(true);
                  }}
                >
                  <Text style={{ color: '#00D4FF', fontSize: 11, fontWeight: 'bold' }}>Kadroları Gör</Text>
                </TouchableOpacity>
              </View>
            ))}
          </>)}

          {/* Group Standings */}
          {groupStandings.length > 0 && (<>
            <Text style={[g.sec, { color: '#FFD700', marginTop: 24 }]}>🏆 {activeGroup.name.toUpperCase()} PUAN DURUMU</Text>
            <View style={[g.tRow, { backgroundColor: '#0D0D0D' }]}>
              <Text style={[g.tH, { width: 26, textAlign: 'center' }]}>#</Text>
              <Text style={[g.tH, { flex: 1, paddingLeft: 4 }]}>Ülke</Text>
              <Text style={[g.tH, g.tS]}>O</Text>
              <Text style={[g.tH, g.tS]}>G</Text>
              <Text style={[g.tH, g.tS]}>B</Text>
              <Text style={[g.tH, g.tS]}>M</Text>
              <Text style={[g.tH, g.tS]}>Av</Text>
              <Text style={[g.tH, { width: 30, textAlign: 'center' }]}>P</Text>
            </View>

            {groupStandings.map((r: any, i: number) => {
              const isQualified = r.pos <= 2;
              const bg = isQualified ? '#0D1825' : i % 2 === 0 ? '#111' : '#0D0D0D';
              return (
                <View key={`wcfrag${i}`} style={[g.tRow, { backgroundColor: bg }]}>
                  <Text style={[g.tC, { width: 26, textAlign: 'center', fontWeight: '900' }, isQualified && { color: '#00E676' }]}>{r.pos}</Text>
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 4 }}>
                    {r.crest ? <Image source={{ uri: r.crest }} style={{ width: 20, height: 14, borderRadius: 2 }} /> : null}
                    <Text style={[g.tC, { fontWeight: 'bold' }]} numberOfLines={1}>{r.team}</Text>
                  </View>
                  <Text style={[g.tC, g.tS]}>{r.played}</Text>
                  <Text style={[g.tC, g.tS, { color: '#00E676' }]}>{r.won}</Text>
                  <Text style={[g.tC, g.tS]}>{r.draw}</Text>
                  <Text style={[g.tC, g.tS, { color: '#FF5252' }]}>{r.lost}</Text>
                  <Text style={[g.tC, g.tS, r.gd > 0 ? { color: '#00E676' } : r.gd < 0 ? { color: '#FF5252' } : {}]}>{r.gd > 0 ? `+${r.gd}` : r.gd}</Text>
                  <Text style={[g.tC, { width: 30, textAlign: 'center', color: '#FFD700', fontWeight: '900', fontSize: SMALL ? 12 : 14 }]}>{r.pts}</Text>
                </View>
              );
            })}
            <View style={{ flexDirection: 'row', gap: 14, marginTop: 14, flexWrap: 'wrap' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#00E676' }} /><Text style={{ color: '#666', fontSize: 10 }}>Son 32'ye Kalır</Text></View>
            </View>
          </>)}

          {/* Group Fixtures */}
          <Text style={[g.sec, { color: '#FFD700', marginTop: 24 }]}>📅 GÜNCEL FİKSTÜR</Text>
          {groupFixtures.length > 0 ? groupFixtures.map((f: any, i: number) => {
            return (
              <View key={`wf${i}`} style={{ backgroundColor: '#0D1117', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#1A2A3A' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <Text style={{ color: '#555', fontSize: 10, fontWeight: 'bold' }}>{f.date} • {f.time}</Text>
                  <Text style={{ color: f.status === 'IN_PLAY' ? '#00E676' : '#555', fontSize: 10, fontWeight: '900' }}>
                    {f.status === 'IN_PLAY' ? '🔴 CANLI' : f.status === 'FINISHED' ? '✅ BİTTİ' : '⏳ YAKLAŞAN'}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ flex: 1, alignItems: 'center' }}>
                    {f.home_flag ? <Image source={{ uri: f.home_flag }} style={{ width: 32, height: 32, borderRadius: 16, marginBottom: 6 }} /> : null}
                    <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13, textAlign: 'center' }} numberOfLines={1}>{f.home}</Text>
                  </View>
                  <View style={{ backgroundColor: '#1A1A1A', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#333' }}>
                    <Text style={{ color: '#00D4FF', fontWeight: '900', fontSize: 18 }}>{f.status === 'FINISHED' || f.status === 'IN_PLAY' ? `${f.home_score} - ${f.away_score}` : 'vs'}</Text>
                  </View>
                  <View style={{ flex: 1, alignItems: 'center' }}>
                    {f.away_flag ? <Image source={{ uri: f.away_flag }} style={{ width: 32, height: 32, borderRadius: 16, marginBottom: 6 }} /> : null}
                    <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13, textAlign: 'center' }} numberOfLines={1}>{f.away}</Text>
                  </View>
                </View>
                <Text style={{ color: '#444', fontSize: 10, textAlign: 'center', marginTop: 8 }}>📍 {f.venue || 'Bilinmiyor'}</Text>
              </View>
            );
          }) : <Text style={{ color: '#555', fontSize: 12, textAlign: 'center', marginTop: 10 }}>Yakın zamanda bu grupta maç bulunmuyor.</Text>}

        </>) :

        // ═══ STANDINGS TAB ═══
        tab === 'standings' ? (<>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }} contentContainerStyle={{ gap: 8 }}>
            {[['superlig','Süper Lig 🇹🇷'],['PL','Premier League 🏴󠁧󠁢󠁥󠁮󠁧󠁿'],['SA','Serie A 🇮🇹'],['PD','La Liga 🇪🇸'],['BL1','Bundesliga 🇩🇪']].map(([code,name]) => (
              <TouchableOpacity key={code} onPress={() => fetchStandings(code)} activeOpacity={0.7}
                style={[g.chip, leagueCode === code && { backgroundColor: '#00D4FF', borderColor: '#00D4FF' }]}>
                <Text style={[g.chipText, leagueCode === code && { color: '#000' }]}>{name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={g.sec}>{leagueName.toUpperCase()} PUAN TABLOSU</Text>

          {/* Header */}
          <View style={[g.tRow, { backgroundColor: '#0D0D0D' }]}>
            <Text style={[g.tH, { width: 26, textAlign: 'center' }]}>#</Text>
            <Text style={[g.tH, { flex: 1, paddingLeft: 4 }]}>Takım</Text>
            <Text style={[g.tH, g.tS]}>O</Text>
            <Text style={[g.tH, g.tS]}>G</Text>
            <Text style={[g.tH, g.tS]}>B</Text>
            <Text style={[g.tH, g.tS]}>M</Text>
            {!SMALL && <Text style={[g.tH, g.tS]}>A</Text>}
            {!SMALL && <Text style={[g.tH, g.tS]}>Y</Text>}
            <Text style={[g.tH, g.tS]}>Av</Text>
            <Text style={[g.tH, { width: 30, textAlign: 'center' }]}>P</Text>
          </View>

          {standings.map((r: any, i: number) => {
            const cl = i < 4; const rel = i >= standings.length - 3;
            const bg = i === 0 ? '#0D2818' : cl ? '#0D1825' : rel ? '#251010' : i % 2 === 0 ? '#111' : '#0D0D0D';
            const isNewGroup = i === 0 || (r.group && r.group !== standings[i-1]?.group);
            return (
              <React.Fragment key={`frag${i}`}>
                {isNewGroup && r.group && r.group !== 'Standings' && (
                  <View style={{ backgroundColor: '#111', paddingVertical: 12, marginTop: i > 0 ? 16 : 0, borderBottomWidth: 2, borderColor: '#FFD700' }}>
                    <Text style={{ color: '#FFD700', fontWeight: '900', fontSize: 15, textAlign: 'center', letterSpacing: 3, textTransform: 'uppercase' }}>{(r.group || '').replace(/_/g, ' ')}</Text>
                  </View>
                )}
                <View key={`r${i}`} style={[g.tRow, { backgroundColor: bg }]}>
                  <Text style={[g.tC, { width: 26, textAlign: 'center', fontWeight: '900' }, i === 0 && { color: '#FFD700' }, cl && i > 0 && { color: '#00D4FF' }, rel && { color: '#FF5252' }]}>{r.pos}</Text>
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 4 }}>
                    {r.crest ? <Image source={{ uri: r.crest }} style={{ width: 18, height: 18 }} /> : null}
                    <Text style={[g.tC, { fontWeight: 'bold' }]} numberOfLines={1}>{r.team}</Text>
                  </View>
                  <Text style={[g.tC, g.tS]}>{r.played}</Text>
                  <Text style={[g.tC, g.tS, { color: '#00E676' }]}>{r.won}</Text>
                  <Text style={[g.tC, g.tS]}>{r.draw}</Text>
                  <Text style={[g.tC, g.tS, { color: '#FF5252' }]}>{r.lost}</Text>
                  {!SMALL && <Text style={[g.tC, g.tS]}>{r.gf}</Text>}
                  {!SMALL && <Text style={[g.tC, g.tS]}>{r.ga}</Text>}
                  <Text style={[g.tC, g.tS, r.gd > 0 ? { color: '#00E676' } : r.gd < 0 ? { color: '#FF5252' } : {}]}>{r.gd > 0 ? `+${r.gd}` : r.gd}</Text>
                  <Text style={[g.tC, { width: 30, textAlign: 'center', color: '#FFD700', fontWeight: '900', fontSize: SMALL ? 12 : 14 }]}>{r.pts}</Text>
                </View>
              </React.Fragment>
            );
          })}
          <View style={{ flexDirection: 'row', gap: 14, marginTop: 14, flexWrap: 'wrap' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFD700' }} /><Text style={{ color: '#666', fontSize: 10 }}>Şampiyon</Text></View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#00D4FF' }} /><Text style={{ color: '#666', fontSize: 10 }}>Şampiyonlar Ligi</Text></View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF5252' }} /><Text style={{ color: '#666', fontSize: 10 }}>Küme Düşme</Text></View>
          </View>
        </>) :

        // ═══ PREDICTION TAB ═══
        tab === 'prediction' ? (
          <View style={{ alignItems: 'center', marginTop: 40, gap: 20 }}>
            <Ionicons name="trophy" size={80} color="#FFD700" />
            <Text style={{ color: '#fff', fontSize: 24, fontWeight: '900' }}>Dünya Kupası 2026</Text>
            <Text style={{ color: '#888', fontSize: 14, textAlign: 'center' }}>Tahmin Oyunu</Text>
            <Text style={{ color: '#666', fontSize: 13, textAlign: 'center', maxWidth: 300 }}>Gruptan finale kadar tahminlerini yap ve arkadaşlarınla yarış!</Text>
            <TouchableOpacity onPress={() => router.push('/prediction')} style={{ borderRadius: 14, overflow: 'hidden', marginTop: 10 }}>
              <LinearGradient colors={['#FFD700', '#FF8C00']} style={{ paddingHorizontal: 40, paddingVertical: 16, flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                <Ionicons name="game-controller" size={22} color="#000" />
                <Text style={{ color: '#000', fontWeight: '900', fontSize: 18 }}>Oyna</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) :

        // ═══ NEWS TAB ═══
        tab === 'news' ? (
          <View style={{ paddingBottom: 20 }}>
            <Text style={g.sec}>📰 SPOR HABERLERİ</Text>
            <NewsSlider vertical={true} />
          </View>
        ) :

        // ═══ STORES TAB ═══
        (<>
          <Text style={g.sec}>🛍️ SÜPER LİG RESMİ MAĞAZALARI</Text>
          <Text style={{ color: '#666', fontSize: 12, marginBottom: 16 }}>Takımının resmi mağazasına git ve forma al!</Text>
          {[
            { name: 'GSStore', desc: 'Galatasaray Resmi Mağazası', url: 'https://www.gsstore.org/', colors: ['#A90432','#FDB912'] as [string,string], crest: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Galatasaray_Sports_Club_Logo.png/500px-Galatasaray_Sports_Club_Logo.png' },
            { name: 'Fenerium', desc: 'Fenerbahçe Resmi Mağazası', url: 'https://fenerium.com/', colors: ['#001E62','#FFED00'] as [string,string], crest: 'https://upload.wikimedia.org/wikipedia/tr/8/86/Fenerbah%C3%A7e_SK.png' },
            { name: 'Kartal Yuvası', desc: 'Beşiktaş Resmi Mağazası', url: 'https://www.kartalyuvasi.com.tr/?srsltid=AfmBOooc22CzLnXdUCLy45v2v1fswxylekIYAouIHcSsQ_ZhOpJacSVI', colors: ['#111','#555'] as [string,string], crest: 'https://upload.wikimedia.org/wikipedia/commons/2/20/Logo_of_Be%C5%9Fikta%C5%9F_JK.svg', favicon: 'https://www.google.com/s2/favicons?domain=kartalyuvasi.com.tr&sz=64' },
            { name: 'TSClub', desc: 'Trabzonspor Resmi Mağazası', url: 'https://trabzonspor.com.tr/?srsltid=AfmBOopjmxmCW_iZMRyJDXrIvuJl9dVlnqE5xkmbr92_0hFRg4zFMij_', colors: ['#880026','#00AEEF'] as [string,string], crest: 'https://upload.wikimedia.org/wikipedia/tr/a/ab/TrabzonsporAmblemi.png' },
            { name: 'Antalyaspor Store', desc: 'Antalyaspor Resmi Mağazası', url: 'https://www.antalyaspor.com.tr/', colors: ['#D00000','#FFB300'] as [string,string], crest: 'https://upload.wikimedia.org/wikipedia/tr/b/b9/Antalyaspor_logo.png' },
            { name: 'GözGöz Store', desc: 'Göztepe Resmi Mağazası', url: 'https://gozgoz.com.tr/', colors: ['#FFA500','#FF4500'] as [string,string], crest: 'https://upload.wikimedia.org/wikipedia/tr/f/fe/G%C3%B6ztepe.png' },
          ].map((s, i) => (
            <TouchableOpacity key={i} style={{ borderRadius: 16, overflow: 'hidden', marginBottom: 12 }} activeOpacity={0.85} onPress={() => Linking.openURL(s.url)}>
              <LinearGradient colors={s.colors} style={{ flexDirection: 'row', alignItems: 'center', padding: 18, gap: 14 }} start={{x:0,y:0}} end={{x:1,y:1}}>
                {s.crest ? <Image source={{ uri: s.crest }} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)' }} /> : <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}><Ionicons name="shirt" size={22} color="#fff" /></View>}
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ color: '#fff', fontSize: 17, fontWeight: '900' }}>{s.name}</Text>
                    {s.favicon && <Image source={{ uri: s.favicon }} style={{ width: 18, height: 18, borderRadius: 4 }} />}
                  </View>
                  <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 2 }}>{s.desc}</Text>
                </View>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="open-outline" size={18} color="#fff" />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </>)}
      </ScrollView>

      <LineupModal
        visible={lineupVisible}
        matchId={selectedMatchId}
        homeTeam={selectedMatchHome}
        awayTeam={selectedMatchAway}
        onClose={() => setLineupVisible(false)}
      />
    </SafeAreaView>
  );
}

const g = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0A0A0A' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  heroTitle: { fontSize: 40, fontWeight: '900', color: '#fff', marginTop: 10, letterSpacing: 1 },
  heroSub: { fontSize: 14, color: '#888', marginTop: 6 },
  hCard: { borderRadius: 14, overflow: 'hidden' },
  hGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 10 },
  hText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },

  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#111', borderBottomWidth: 1, borderBottomColor: '#1E1E1E' },
  topBarBtn: { padding: 8, borderRadius: 10, backgroundColor: '#0D1825', borderWidth: 1, borderColor: '#1A2A3A' },
  logoutBtn: { padding: 8, borderRadius: 10, backgroundColor: '#1A0A0A', borderWidth: 1, borderColor: '#2A0A0A' },

  teamRow: { backgroundColor: '#111', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#1E1E1E' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#1A1A1A', borderWidth: 1.5, borderColor: '#333' },
  chipText: { color: '#aaa', fontWeight: 'bold', fontSize: 13 },

  tabs: { flexDirection: 'row', backgroundColor: '#111', borderBottomWidth: 1, borderBottomColor: '#1E1E1E' },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, gap: 2 },
  tabOn: { borderBottomWidth: 2, borderBottomColor: '#00D4FF' },
  tabText: { color: '#555', fontSize: 10, fontWeight: 'bold' },

  tabBar: { flexDirection: 'row', backgroundColor: '#111', borderTopWidth: 1, borderTopColor: '#1E1E1E', paddingBottom: Platform.OS === 'ios' ? 20 : 10, paddingTop: 10 },
  tabBtn: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  lastUpdate: { color: '#555', fontSize: 11, textAlign: 'right', marginBottom: 8 },
  sec: { color: '#888', fontSize: 12, fontWeight: '900', letterSpacing: 2, marginTop: 22, marginBottom: 10 },
  banner: { flexDirection: 'row', padding: 16, borderRadius: 14, alignItems: 'center' },
  qCard: { flex: 1, backgroundColor: '#151515', padding: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#252525' },
  qText: { color: '#ddd', marginTop: 5, fontWeight: 'bold', fontSize: 11 },

  mCard: { backgroundColor: '#151515', padding: 14, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#252525' },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 5, fontSize: 10, fontWeight: 'bold', overflow: 'hidden' },
  scoreBox: { backgroundColor: '#1A1A1A', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, marginHorizontal: 6, borderWidth: 1, borderColor: '#333' },
  scoreText: { color: '#00D4FF', fontWeight: '900', fontSize: 16, letterSpacing: 2 },

  lCard: { backgroundColor: '#0D1117', padding: 12, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: '#1A2A3A' },

  nCard: { backgroundColor: '#151515', padding: 14, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#252525' },
  newsTag: { backgroundColor: '#FF0000', color: '#fff', fontSize: 9, fontWeight: '900', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden', letterSpacing: 0.5 },

  tRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: '#1A1A1A' },
  tH: { color: '#666', fontWeight: '900', fontSize: 10 },
  tC: { color: '#ddd', fontSize: SMALL ? 11 : 13 },
  tS: { width: SMALL ? 22 : 28, textAlign: 'center' as const },
});
