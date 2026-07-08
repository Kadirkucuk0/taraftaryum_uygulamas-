import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image, Alert, Platform, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import api from '../services/api';

const { width: SW } = Dimensions.get('window');

type Team = {
  id: string;
  name: string;
  code: string;
  group: string;
};

type MatchPick = { team1: Team; team2: Team; winner: Team | null };

const STEPS = [
  'Gruptan Çıkanları Seç',
  'En İyi 3.leri Seç',
  'Son 32 Turu',
  'Son 16 Turu',
  'Çeyrek Finalleri Seç',
  'Yarı Finalleri Seç',
  'Final',
  'Şampiyon!',
];

const FALLBACK_GROUPS: Record<string, Team[]> = {
  'A': [
    { id: 'mx', name: 'Meksika', code: 'mx', group: 'A' },
    { id: 'za', name: 'Güney Afrika', code: 'za', group: 'A' },
    { id: 'kr', name: 'Güney Kore', code: 'kr', group: 'A' },
    { id: 'cz', name: 'Çekya', code: 'cz', group: 'A' },
  ],
  'B': [
    { id: 'ca', name: 'Kanada', code: 'ca', group: 'B' },
    { id: 'ba', name: 'Bosna Hersek', code: 'ba', group: 'B' },
    { id: 'qa', name: 'Katar', code: 'qa', group: 'B' },
    { id: 'ch', name: 'İsviçre', code: 'ch', group: 'B' },
  ],
  'C': [
    { id: 'br', name: 'Brezilya', code: 'br', group: 'C' },
    { id: 'ma', name: 'Fas', code: 'ma', group: 'C' },
    { id: 'ht', name: 'Haiti', code: 'ht', group: 'C' },
    { id: 'gb-sct', name: 'İskoçya', code: 'gb-sct', group: 'C' },
  ],
  'D': [
    { id: 'us', name: 'ABD', code: 'us', group: 'D' },
    { id: 'py', name: 'Paraguay', code: 'py', group: 'D' },
    { id: 'au', name: 'Avustralya', code: 'au', group: 'D' },
    { id: 'tr', name: 'Türkiye', code: 'tr', group: 'D' },
  ],
  'E': [
    { id: 'de', name: 'Almanya', code: 'de', group: 'E' },
    { id: 'cw', name: 'Curaçao', code: 'cw', group: 'E' },
    { id: 'ci', name: 'Fildişi Sahili', code: 'ci', group: 'E' },
    { id: 'ec', name: 'Ekvador', code: 'ec', group: 'E' },
  ],
  'F': [
    { id: 'nl', name: 'Hollanda', code: 'nl', group: 'F' },
    { id: 'jp', name: 'Japonya', code: 'jp', group: 'F' },
    { id: 'se', name: 'İsveç', code: 'se', group: 'F' },
    { id: 'tn', name: 'Tunus', code: 'tn', group: 'F' },
  ],
  'G': [
    { id: 'be', name: 'Belçika', code: 'be', group: 'G' },
    { id: 'eg', name: 'Mısır', code: 'eg', group: 'G' },
    { id: 'ir', name: 'İran', code: 'ir', group: 'G' },
    { id: 'nz', name: 'Yeni Zelanda', code: 'nz', group: 'G' },
  ],
  'H': [
    { id: 'es', name: 'İspanya', code: 'es', group: 'H' },
    { id: 'cv', name: 'Cabo Verde', code: 'cv', group: 'H' },
    { id: 'sa', name: 'Suudi Arabistan', code: 'sa', group: 'H' },
    { id: 'uy', name: 'Uruguay', code: 'uy', group: 'H' },
  ],
  'I': [
    { id: 'fr', name: 'Fransa', code: 'fr', group: 'I' },
    { id: 'sn', name: 'Senegal', code: 'sn', group: 'I' },
    { id: 'cd', name: 'DR Kongo', code: 'cd', group: 'I' },
    { id: 'no', name: 'Norveç', code: 'no', group: 'I' },
  ],
  'J': [
    { id: 'ar', name: 'Arjantin', code: 'ar', group: 'J' },
    { id: 'dz', name: 'Cezayir', code: 'dz', group: 'J' },
    { id: 'at', name: 'Avusturya', code: 'at', group: 'J' },
    { id: 'jo', name: 'Ürdün', code: 'jo', group: 'J' },
  ],
  'K': [
    { id: 'pt', name: 'Portekiz', code: 'pt', group: 'K' },
    { id: 'uz', name: 'Özbekistan', code: 'uz', group: 'K' },
    { id: 'co', name: 'Kolombiya', code: 'co', group: 'K' },
    { id: 'iq', name: 'Irak', code: 'iq', group: 'K' },
  ],
  'L': [
    { id: 'gb-eng', name: 'İngiltere', code: 'gb-eng', group: 'L' },
    { id: 'hr', name: 'Hırvatistan', code: 'hr', group: 'L' },
    { id: 'gh', name: 'Gana', code: 'gh', group: 'L' },
    { id: 'pa', name: 'Panama', code: 'pa', group: 'L' },
  ],
};

const GROUP_NAMES = Object.keys(FALLBACK_GROUPS);

export default function PredictionScreen() {
  const [step, setStep] = useState(0);
  const [groups, setGroups] = useState<Record<string, Team[]>>(FALLBACK_GROUPS);
  const [groupPicks, setGroupPicks] = useState<Record<string, string[]>>({});
  const [thirdPicks, setThirdPicks] = useState<string[]>([]);
  const [r32Matches, setR32Matches] = useState<MatchPick[]>([]);
  const [r16Matches, setR16Matches] = useState<MatchPick[]>([]);
  const [qfMatches, setQfMatches] = useState<MatchPick[]>([]);
  const [sfMatches, setSfMatches] = useState<MatchPick[]>([]);
  const [finalMatch, setFinalMatch] = useState<MatchPick | null>(null);
  const [champion, setChampion] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const teamsRes = await api.get('/api/predictions/teams');
      if (Array.isArray(teamsRes.data.groups)) {
        const groupsDict: Record<string, Team[]> = {};
        teamsRes.data.groups.forEach((g: any) => {
          groupsDict[g.id] = g.teams.map((t: any) => ({
            id: t.code,
            name: t.name,
            code: t.code,
            group: g.id,
          }));
        });
        setGroups(groupsDict);
      }
    } catch { /* use fallback */ }

    try {
      const myRes = await api.get('/api/predictions/my');
      if (myRes.data && myRes.data.prediction) {
        const p = myRes.data.prediction;
        
        if (p.round_of_32) {
          setGroupPicks(p.round_of_32.group_picks || {});
          setThirdPicks(p.round_of_32.third_picks || []);
          setR32Matches(p.round_of_32.r32_matches || []);
        }
        
        setR16Matches(p.round_of_16 || []);
        setQfMatches(p.quarter_finals || []);
        setSfMatches(p.semi_finals || []);
        setFinalMatch(p.final_teams || null);
        
        if (p.champion) {
          let champObj: Team | null = null;
          for (const g of GROUP_NAMES) {
            const team = FALLBACK_GROUPS[g].find(t => t.name === p.champion);
            if (team) { champObj = team; break; }
          }
          setChampion(champObj);
          setStep(7);
        } else if (p.final_teams) {
          setStep(6);
        } else if (p.semi_finals && p.semi_finals.length > 0) {
          setStep(5);
        } else if (p.quarter_finals && p.quarter_finals.length > 0) {
          setStep(4);
        } else if (p.round_of_16 && p.round_of_16.length > 0) {
          setStep(3);
        } else if (p.round_of_32 && p.round_of_32.r32_matches && p.round_of_32.r32_matches.length > 0) {
          setStep(2);
        } else if (p.round_of_32 && p.round_of_32.third_picks && p.round_of_32.third_picks.length > 0) {
          setStep(1);
        } else {
          setStep(0);
        }
      }
    } catch (err) {
      console.error("Load prediction error:", err);
    }
    setLoading(false);
  };

  const toggleGroupPick = (groupKey: string, teamId: string) => {
    setGroupPicks(prev => {
      const current = prev[groupKey] || [];
      if (current.includes(teamId)) {
        setThirdPicks(tPrev => tPrev.filter(id => id !== teamId));
        return { ...prev, [groupKey]: current.filter(id => id !== teamId) };
      }
      if (current.length >= 2) return prev; // Max 2 per group
      return { ...prev, [groupKey]: [...current, teamId] };
    });
  };

  const toggleThirdPick = (groupKey: string, teamId: string) => {
    setThirdPicks(prev => {
      if (prev.includes(teamId)) {
        return prev.filter(id => id !== teamId);
      }
      
      const groupTeams = groups[groupKey] || [];
      const groupTeamIds = groupTeams.map(t => t.id);
      const otherInGroup = prev.find(id => groupTeamIds.includes(id));
      
      let filtered = prev;
      if (otherInGroup) {
        filtered = prev.filter(id => id !== otherInGroup);
      }
      
      if (filtered.length >= 8 && !prev.includes(teamId)) {
        const msg = 'En fazla 8 tane en iyi 3. takım seçebilirsiniz!';
        if (Platform.OS === 'web') {
          window.alert(msg);
        } else {
          Alert.alert('Limit', msg);
        }
        return prev;
      }
      
      return [...filtered, teamId];
    });
  };

  const allGroupsPicked = () => {
    return GROUP_NAMES.every(g => (groupPicks[g] || []).length === 2);
  };

  const shuffleArray = (array: any[]) => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  const buildR32 = () => {
    const advanced: Team[] = [];
    
    GROUP_NAMES.forEach(g => {
      const picks = groupPicks[g] || [];
      const teamList = groups[g] || [];
      picks.forEach(id => {
        const team = teamList.find(t => t.id === id);
        if (team) advanced.push(team);
      });
    });
    
    thirdPicks.forEach(id => {
      let foundTeam: Team | undefined;
      for (const g of GROUP_NAMES) {
        const team = (groups[g] || []).find(t => t.id === id);
        if (team) { foundTeam = team; break; }
      }
      if (foundTeam) advanced.push(foundTeam);
    });

    if (advanced.length !== 32) {
      const msg = `Son 32 turu için 32 takım olmalı (Şuan: ${advanced.length})`;
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Hata', msg);
      }
      return;
    }

    const shuffled = shuffleArray(advanced);
    const matches: MatchPick[] = [];
    for (let i = 0; i < shuffled.length - 1; i += 2) {
      matches.push({ team1: shuffled[i], team2: shuffled[i + 1], winner: null });
    }
    setR32Matches(matches);
    setStep(2);
  };

  const buildR16 = () => {
    const winners = r32Matches.filter(m => m.winner).map(m => m.winner!);
    const nextMatches: MatchPick[] = [];
    for (let i = 0; i < winners.length - 1; i += 2) {
      nextMatches.push({ team1: winners[i], team2: winners[i + 1], winner: null });
    }
    setR16Matches(nextMatches);
    setStep(3);
  };

  const buildQf = () => {
    const winners = r16Matches.filter(m => m.winner).map(m => m.winner!);
    const nextMatches: MatchPick[] = [];
    for (let i = 0; i < winners.length - 1; i += 2) {
      nextMatches.push({ team1: winners[i], team2: winners[i + 1], winner: null });
    }
    setQfMatches(nextMatches);
    setStep(4);
  };

  const buildSf = () => {
    const winners = qfMatches.filter(m => m.winner).map(m => m.winner!);
    const nextMatches: MatchPick[] = [];
    for (let i = 0; i < winners.length - 1; i += 2) {
      nextMatches.push({ team1: winners[i], team2: winners[i + 1], winner: null });
    }
    setSfMatches(nextMatches);
    setStep(5);
  };

  const buildFinal = () => {
    const winners = sfMatches.filter(m => m.winner).map(m => m.winner!);
    if (winners.length >= 2) {
      setFinalMatch({ team1: winners[0], team2: winners[1], winner: null });
      setStep(6);
    }
  };

  const confirmChampion = () => {
    if (finalMatch && finalMatch.winner) {
      setChampion(finalMatch.winner);
      setStep(7);
    }
  };

  const pickWinner = (matches: MatchPick[], setMatches: (m: MatchPick[]) => void, index: number, team: Team) => {
    const updated = [...matches];
    updated[index] = { ...updated[index], winner: team };
    setMatches(updated);
  };

  const allMatchesPicked = (matches: MatchPick[]) => matches.every(m => m.winner !== null);

  const handleSave = async () => {
    setSaving(true);
    try {
      const dataToSave = {
        round_of_32: {
          group_picks: groupPicks,
          third_picks: thirdPicks,
          r32_matches: r32Matches,
        },
        round_of_16: r16Matches,
        quarter_finals: qfMatches,
        semi_finals: sfMatches,
        final_teams: finalMatch,
        champion: champion?.name || champion?.id || null,
      };
      await api.post('/api/predictions/save', dataToSave);
      const msg = 'Tahminleriniz başarıyla kaydedildi!';
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Başarılı', msg);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Kaydetme başarısız oldu.';
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Hata', msg);
      }
    }
    setSaving(false);
  };

  const getFlagUrl = (code: string) => `https://flagcdn.com/w80/${code.toLowerCase()}.png`;

  const renderTeamCard = (team: Team, isSelected: boolean, onPress: () => void, size: 'small' | 'normal' | 'large' = 'normal') => {
    const sz = size === 'large' ? 56 : size === 'small' ? 32 : 40;
    const fs = size === 'large' ? 14 : size === 'small' ? 10 : 12;
    return (
      <TouchableOpacity
        key={team.id}
        style={[
          styles.teamCard,
          size === 'large' && { padding: 14 },
          isSelected && styles.teamCardSelected,
        ]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <Image source={{ uri: getFlagUrl(team.code) }} style={{ width: sz, height: sz * 0.7, borderRadius: 3 }} />
        <Text style={[styles.teamName, { fontSize: fs }, isSelected && { color: '#00E676' }]} numberOfLines={1}>{team.name}</Text>
      </TouchableOpacity>
    );
  };

  const renderMatch = (match: MatchPick, index: number, matches: MatchPick[], setMatches: (m: MatchPick[]) => void) => (
    <View key={index} style={styles.matchCard}>
      <TouchableOpacity
        style={[styles.matchTeam, match.winner?.id === match.team1.id && styles.matchTeamWinner]}
        onPress={() => pickWinner(matches, setMatches, index, match.team1)}
        activeOpacity={0.7}
      >
        <Image source={{ uri: getFlagUrl(match.team1.code) }} style={styles.matchFlag} />
        <Text style={[styles.matchTeamName, match.winner?.id === match.team1.id && { color: '#00E676' }]} numberOfLines={1}>{match.team1.name}</Text>
      </TouchableOpacity>
      <Text style={styles.matchVs}>VS</Text>
      <TouchableOpacity
        style={[styles.matchTeam, match.winner?.id === match.team2.id && styles.matchTeamWinner]}
        onPress={() => pickWinner(matches, setMatches, index, match.team2)}
        activeOpacity={0.7}
      >
        <Image source={{ uri: getFlagUrl(match.team2.code) }} style={styles.matchFlag} />
        <Text style={[styles.matchTeamName, match.winner?.id === match.team2.id && { color: '#00E676' }]} numberOfLines={1}>{match.team2.name}</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#FFD700" />
          <Text style={{ color: '#888', marginTop: 10 }}>Yükleniyor...</Text>
        </View>
      </View>
    );
  }

  const dotSize = SW < 400 ? 22 : 28;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 60 }}>
        {/* Header */}
        <LinearGradient colors={['#1A0A00', '#0D1825']} style={styles.header} start={{x: 0, y: 0}} end={{x: 1, y: 1}}>
          <Ionicons name="trophy" size={40} color="#FFD700" />
          <Text style={styles.headerTitle}>Dünya Kupası 2026 Tahmin Oyunu</Text>
          <Text style={styles.headerSub}>{STEPS[step]}</Text>
        </LinearGradient>

        {/* Step Progress */}
        <View style={styles.stepRow}>
          {STEPS.map((s, i) => (
            <View 
              key={i} 
              style={[
                styles.stepDot, 
                { width: dotSize, height: dotSize, borderRadius: dotSize / 2 },
                i <= step && { backgroundColor: '#FFD700', borderColor: '#FFD700' }
              ]}
            >
              <Text style={[styles.stepDotText, { fontSize: SW < 400 ? 9 : 11 }, i <= step && { color: '#000' }]}>{i + 1}</Text>
            </View>
          ))}
        </View>

        {/* ═══ STEP 0: GROUP SELECTION ═══ */}
        {step === 0 && (
          <>
            <Text style={styles.sectionTitle}>📋 Her gruptan 2 takım seçin</Text>
            {GROUP_NAMES.map(groupKey => {
              const teamList = groups[groupKey] || [];
              const picks = groupPicks[groupKey] || [];
              return (
                <View key={groupKey} style={styles.groupCard}>
                  <LinearGradient colors={['#0D1825', '#111']} style={styles.groupHeader} start={{x: 0, y: 0}} end={{x: 1, y: 0}}>
                    <Text style={styles.groupTitle}>{groupKey} Grubu</Text>
                    <Text style={styles.groupCount}>{picks.length}/2</Text>
                  </LinearGradient>
                  <View style={styles.groupTeams}>
                    {teamList.map(team => renderTeamCard(team, picks.includes(team.id), () => toggleGroupPick(groupKey, team.id)))}
                  </View>
                </View>
              );
            })}

            {allGroupsPicked() && (
              <TouchableOpacity onPress={() => setStep(1)} style={styles.nextBtn} activeOpacity={0.8}>
                <LinearGradient colors={['#FFD700', '#FF8C00']} style={styles.nextGrad} start={{x: 0, y: 0}} end={{x: 1, y: 1}}>
                  <Text style={styles.nextText}>En İyi 3.leri Seçmeye Geç</Text>
                  <Ionicons name="arrow-forward" size={20} color="#000" />
                </LinearGradient>
              </TouchableOpacity>
            )}
          </>
        )}

        {/* ═══ STEP 1: BEST 3RD-PLACED SELECTION ═══ */}
        {step === 1 && (
          <>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.sectionTitle}>📋 En iyi 8 üçüncüyü seçin (Her gruptan max 1)</Text>
              <Text style={{ color: '#FFD700', fontWeight: 'bold', fontSize: 13 }}>{thirdPicks.length}/8</Text>
            </View>
            {GROUP_NAMES.map(groupKey => {
              const teamList = groups[groupKey] || [];
              const picks = groupPicks[groupKey] || [];
              // Remaining teams in this group (not selected in top 2)
              const remainingTeams = teamList.filter(t => !picks.includes(t.id));
              
              return (
                <View key={groupKey} style={styles.groupCard}>
                  <LinearGradient colors={['#0D1825', '#111']} style={styles.groupHeader} start={{x: 0, y: 0}} end={{x: 1, y: 0}}>
                    <Text style={styles.groupTitle}>{groupKey} Grubu (Üçüncüler)</Text>
                  </LinearGradient>
                  <View style={styles.groupTeams}>
                    {remainingTeams.map(team => renderTeamCard(team, thirdPicks.includes(team.id), () => toggleThirdPick(groupKey, team.id)))}
                  </View>
                </View>
              );
            })}

            {thirdPicks.length === 8 && (
              <TouchableOpacity onPress={buildR32} style={styles.nextBtn} activeOpacity={0.8}>
                <LinearGradient colors={['#FFD700', '#FF8C00']} style={styles.nextGrad} start={{x: 0, y: 0}} end={{x: 1, y: 1}}>
                  <Text style={styles.nextText}>Son 32 Turuna Geç (Kura Çek)</Text>
                  <Ionicons name="shuffle" size={20} color="#000" />
                </LinearGradient>
              </TouchableOpacity>
            )}
          </>
        )}

        {/* ═══ STEP 2: ROUND OF 32 ═══ */}
        {step === 2 && (
          <>
            <Text style={styles.sectionTitle}>⚔️ Son 32 Turu - Kazananları seçin</Text>
            {r32Matches.map((m, i) => renderMatch(m, i, r32Matches, setR32Matches))}
            {allMatchesPicked(r32Matches) && (
              <TouchableOpacity onPress={buildR16} style={styles.nextBtn} activeOpacity={0.8}>
                <LinearGradient colors={['#FFD700', '#FF8C00']} style={styles.nextGrad} start={{x: 0, y: 0}} end={{x: 1, y: 1}}>
                  <Text style={styles.nextText}>Son 16 Turuna Geç</Text>
                  <Ionicons name="arrow-forward" size={20} color="#000" />
                </LinearGradient>
              </TouchableOpacity>
            )}
          </>
        )}

        {/* ═══ STEP 3: ROUND OF 16 ═══ */}
        {step === 3 && (
          <>
            <Text style={styles.sectionTitle}>⚔️ Son 16 Turu - Kazananları seçin</Text>
            {r16Matches.map((m, i) => renderMatch(m, i, r16Matches, setR16Matches))}
            {allMatchesPicked(r16Matches) && (
              <TouchableOpacity onPress={buildQf} style={styles.nextBtn} activeOpacity={0.8}>
                <LinearGradient colors={['#FFD700', '#FF8C00']} style={styles.nextGrad} start={{x: 0, y: 0}} end={{x: 1, y: 1}}>
                  <Text style={styles.nextText}>Çeyrek Finallere Geç</Text>
                  <Ionicons name="arrow-forward" size={20} color="#000" />
                </LinearGradient>
              </TouchableOpacity>
            )}
          </>
        )}

        {/* ═══ STEP 4: QUARTER FINALS ═══ */}
        {step === 4 && (
          <>
            <Text style={styles.sectionTitle}>⚔️ Çeyrek Final - Kazananları seçin</Text>
            {qfMatches.map((m, i) => renderMatch(m, i, qfMatches, setQfMatches))}
            {allMatchesPicked(qfMatches) && (
              <TouchableOpacity onPress={buildSf} style={styles.nextBtn} activeOpacity={0.8}>
                <LinearGradient colors={['#FFD700', '#FF8C00']} style={styles.nextGrad} start={{x: 0, y: 0}} end={{x: 1, y: 1}}>
                  <Text style={styles.nextText}>Yarı Finallere Geç</Text>
                  <Ionicons name="arrow-forward" size={20} color="#000" />
                </LinearGradient>
              </TouchableOpacity>
            )}
          </>
        )}

        {/* ═══ STEP 5: SEMI FINALS ═══ */}
        {step === 5 && (
          <>
            <Text style={styles.sectionTitle}>⚔️ Yarı Final - Kazananları seçin</Text>
            {sfMatches.map((m, i) => renderMatch(m, i, sfMatches, setSfMatches))}
            {allMatchesPicked(sfMatches) && (
              <TouchableOpacity onPress={buildFinal} style={styles.nextBtn} activeOpacity={0.8}>
                <LinearGradient colors={['#FFD700', '#FF8C00']} style={styles.nextGrad} start={{x: 0, y: 0}} end={{x: 1, y: 1}}>
                  <Text style={styles.nextText}>Finale Geç</Text>
                  <Ionicons name="arrow-forward" size={20} color="#000" />
                </LinearGradient>
              </TouchableOpacity>
            )}
          </>
        )}

        {/* ═══ STEP 6: FINAL ═══ */}
        {step === 6 && finalMatch && (
          <>
            <Text style={styles.sectionTitle}>🏆 FİNAL - Şampiyonu seçin!</Text>
            {renderMatch(finalMatch, 0, [finalMatch], (matches) => {
              setFinalMatch(matches[0]);
            })}
            {finalMatch.winner && (
              <TouchableOpacity onPress={confirmChampion} style={styles.nextBtn} activeOpacity={0.8}>
                <LinearGradient colors={['#FFD700', '#FF8C00']} style={styles.nextGrad} start={{x: 0, y: 0}} end={{x: 1, y: 1}}>
                  <Text style={styles.nextText}>Şampiyonu Onayla</Text>
                  <Ionicons name="trophy" size={20} color="#000" />
                </LinearGradient>
              </TouchableOpacity>
            )}
          </>
        )}

        {/* ═══ STEP 7: CHAMPION ═══ */}
        {step === 7 && champion && (
          <>
            <View style={styles.championCard}>
              <Text style={{ fontSize: 60 }}>🏆</Text>
              <Image source={{ uri: getFlagUrl(champion.code) }} style={{ width: 80, height: 56, borderRadius: 6, marginTop: 16 }} />
              <Text style={styles.championName}>{champion.name}</Text>
              <Text style={styles.championLabel}>Dünya Kupası 2026 Şampiyonu Tahmininiz</Text>
            </View>

            <TouchableOpacity onPress={handleSave} style={styles.nextBtn} activeOpacity={0.8} disabled={saving}>
              <LinearGradient colors={saving ? ['#555','#333'] : ['#00E676', '#00C853']} style={styles.nextGrad} start={{x: 0, y: 0}} end={{x: 1, y: 1}}>
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="save" size={20} color="#fff" />
                    <Text style={[styles.nextText, { color: '#fff' }]}>Tahminleri Kaydet</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => { setStep(0); setGroupPicks({}); setThirdPicks([]); setChampion(null); }} style={{ marginTop: 20, alignSelf: 'center' }}>
              <Text style={{ color: '#FF9800', fontSize: 14 }}>Baştan Başla</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Back button for knockout stages */}
        {step > 0 && step < 7 && (
          <TouchableOpacity onPress={() => setStep(prev => (prev - 1) as any)} style={{ marginTop: 20, alignSelf: 'center' }}>
            <Text style={{ color: '#888', fontSize: 14 }}>
              <Ionicons name="arrow-back" size={14} color="#888" /> Önceki Tura Dön
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  header: { borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#1A2A3A' },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#FFD700', marginTop: 8, textAlign: 'center', letterSpacing: 0.5 },
  headerSub: { fontSize: 14, color: '#888', marginTop: 4 },
  stepRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 20, flexWrap: 'wrap' },
  stepDot: { backgroundColor: '#1A1A1A', borderWidth: 1.5, borderColor: '#333', alignItems: 'center', justifyContent: 'center' },
  stepDotText: { color: '#555', fontWeight: '900' },
  sectionTitle: { color: '#888', fontSize: 12, fontWeight: '900', letterSpacing: 2, marginTop: 10, marginBottom: 14 },

  groupCard: { borderRadius: 14, overflow: 'hidden', marginBottom: 14, borderWidth: 1, borderColor: '#1A2A3A' },
  groupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
  groupTitle: { color: '#FFD700', fontSize: 14, fontWeight: '900', letterSpacing: 1 },
  groupCount: { color: '#888', fontSize: 12, fontWeight: 'bold' },
  groupTeams: { flexDirection: 'row', flexWrap: 'wrap', padding: 8, gap: 8 },

  teamCard: { flex: 1, minWidth: SW > 500 ? 100 : 70, backgroundColor: '#151515', borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1.5, borderColor: '#252525', gap: 6 },
  teamCardSelected: { borderColor: '#00E676', backgroundColor: '#0D2818', shadowColor: '#00E676', shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  teamName: { color: '#ddd', fontSize: 11, fontWeight: 'bold', textAlign: 'center' },

  matchCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0D1117', borderRadius: 14, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#1A2A3A' },
  matchTeam: { flex: 1, alignItems: 'center', padding: 10, borderRadius: 10, gap: 6 },
  matchTeamWinner: { backgroundColor: '#0D2818', borderWidth: 1, borderColor: '#00E676' },
  matchFlag: { width: 40, height: 28, borderRadius: 3 },
  matchTeamName: { color: '#ddd', fontSize: 12, fontWeight: 'bold', textAlign: 'center' },
  matchVs: { color: '#555', fontSize: 12, fontWeight: '900', marginHorizontal: 6 },

  nextBtn: { borderRadius: 14, overflow: 'hidden', marginTop: 20 },
  nextGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 10 },
  nextText: { color: '#000', fontSize: 18, fontWeight: '900' },

  championCard: { alignItems: 'center', backgroundColor: '#0D1825', borderRadius: 20, padding: 30, borderWidth: 2, borderColor: '#FFD700', marginBottom: 20 },
  championName: { color: '#FFD700', fontSize: 28, fontWeight: '900', marginTop: 12, letterSpacing: 1 },
  championLabel: { color: '#888', fontSize: 13, marginTop: 8, textAlign: 'center' },
});
