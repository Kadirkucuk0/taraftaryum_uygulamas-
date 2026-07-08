import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import api from '../services/api';

const TEAMS = [
  { id: 'galatasaray', name: 'Galatasaray', short: 'GS', color: '#A90432' },
  { id: 'fenerbahce', name: 'Fenerbahçe', short: 'FB', color: '#001E62' },
  { id: 'besiktas', name: 'Beşiktaş', short: 'BJK', color: '#222' },
  { id: 'trabzonspor', name: 'Trabzonspor', short: 'TS', color: '#880026' },
  { id: 'basaksehir', name: 'Başakşehir', short: 'IBFK', color: '#FF6600' },
  { id: 'antalyaspor', name: 'Antalyaspor', short: 'ANT', color: '#D00000' },
  { id: 'sivasspor', name: 'Sivasspor', short: 'SVS', color: '#CC0000' },
  { id: 'konyaspor', name: 'Konyaspor', short: 'KNY', color: '#008000' },
];

const stringToColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 70%, 55%)`;
};

export default function ProfileScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [memberSince, setMemberSince] = useState('');
  const [bio, setBio] = useState('');
  const [favoriteTeam, setFavoriteTeam] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Password change
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwMessage, setPwMessage] = useState('');
  const [pwError, setPwError] = useState('');

  const [championPrediction, setChampionPrediction] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const [profileRes, predictionRes] = await Promise.all([
        api.get('/auth/profile'),
        api.get('/api/predictions/my').catch(() => ({ data: { prediction: null } }))
      ]);
      const d = profileRes.data;
      setUsername(d.username || '');
      setEmail(d.email || '');
      setMemberSince(d.member_since || d.created_at || '');
      setBio(d.bio || '');
      setFavoriteTeam(d.favorite_team || '');
      
      if (predictionRes.data && predictionRes.data.prediction) {
        setChampionPrediction(predictionRes.data.prediction.champion || null);
      }
    } catch (e: any) {
      setError('Profil yüklenemedi.');
    }
    setLoading(false);
  };

  const handleUpdateProfile = async () => {
    setSaving(true);
    setMessage('');
    setError('');
    try {
      await api.put('/auth/profile', { bio, favorite_team: favoriteTeam });
      setMessage('Profil güncellendi!');
      setTimeout(() => setMessage(''), 3000);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Güncelleme başarısız.');
      setTimeout(() => setError(''), 3000);
    }
    setSaving(false);
  };

  const handleChangePassword = async () => {
    setPwMessage('');
    setPwError('');
    if (newPassword !== confirmPassword) {
      setPwError('Yeni şifreler eşleşmiyor.');
      return;
    }
    if (newPassword.length < 6) {
      setPwError('Yeni şifre en az 6 karakter olmalıdır.');
      return;
    }
    setPwSaving(true);
    try {
      await api.post('/auth/change-password', {
        old_password: oldPassword,
        new_password: newPassword,
      });
      setPwMessage('Şifre başarıyla güncellendi!');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPwMessage(''), 3000);
    } catch (e: any) {
      setPwError(e.response?.data?.message || 'Şifre değiştirme başarısız.');
      setTimeout(() => setPwError(''), 3000);
    }
    setPwSaving(false);
  };

  const [adminMessageText, setAdminMessageText] = useState('');
  const [msgSending, setMsgSending] = useState(false);
  const [msgMessage, setMsgMessage] = useState('');
  const [msgError, setMsgError] = useState('');

  const handleSendAdminMessage = async () => {
    setMsgMessage('');
    setMsgError('');
    if (!adminMessageText.trim()) {
      setMsgError('Lütfen bir mesaj yazın.');
      return;
    }
    setMsgSending(true);
    try {
      const res = await api.post('/auth/send-admin-message', { text: adminMessageText });
      setMsgMessage(res.data.message || 'Mesajınız başarıyla iletildi.');
      setAdminMessageText('');
      setTimeout(() => setMsgMessage(''), 4000);
    } catch (e: any) {
      setMsgError(e.response?.data?.message || 'Mesaj gönderilemedi.');
      setTimeout(() => setMsgError(''), 4000);
    }
    setMsgSending(false);
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('username');
    await AsyncStorage.removeItem('saved_credentials');
    if (Platform.OS === 'web') {
      window.location.href = '/';
    } else {
      router.replace('/');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#00D4FF" />
        </View>
      </SafeAreaView>
    );
  }

  const avatarColor = stringToColor(username || 'U');
  const avatarLetter = (username || 'U')[0].toUpperCase();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Avatar & Info */}
        <View style={styles.profileHeader}>
          <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
            <Text style={styles.avatarLetter}>{avatarLetter}</Text>
          </View>
          <Text style={styles.username}>{username}</Text>
          <Text style={styles.emailText}>{email}</Text>
          {championPrediction ? (
            <View style={styles.predictionRow}>
              <Ionicons name="trophy" size={14} color="#FFD700" />
              <Text style={styles.predictionText}>
                Dünya Kupası Şampiyonu Tahmininiz: <Text style={{ color: '#FFD700', fontWeight: 'bold' }}>{championPrediction}</Text>
              </Text>
            </View>
          ) : null}
          {memberSince ? (
            <View style={styles.sinceRow}>
              <Ionicons name="calendar-outline" size={14} color="#666" />
              <Text style={styles.sinceText}>Üyelik: {memberSince}</Text>
            </View>
          ) : null}
        </View>

        {/* Messages */}
        {message ? <Text style={styles.successMsg}>{message}</Text> : null}
        {error ? <Text style={styles.errorMsg}>{error}</Text> : null}

        {/* Favorite Team */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Favori Takım</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.teamChips}>
            {TEAMS.map(t => (
              <TouchableOpacity
                key={t.id}
                onPress={() => setFavoriteTeam(t.id)}
                activeOpacity={0.7}
                style={[styles.chip, favoriteTeam === t.id && { backgroundColor: t.color, borderColor: t.color }]}
              >
                <Text style={[styles.chipText, favoriteTeam === t.id && { color: '#fff' }]}>{t.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Bio */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hakkımda</Text>
          <TextInput
            style={styles.bioInput}
            placeholder="Kendinizden bahsedin..."
            placeholderTextColor="#555"
            value={bio}
            onChangeText={setBio}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Update Profile */}
        <TouchableOpacity onPress={handleUpdateProfile} style={styles.btnWrap} activeOpacity={0.8} disabled={saving}>
          <LinearGradient colors={saving ? ['#555','#333'] : ['#00D4FF', '#007BFF']} style={styles.gradient} start={{x:0,y:0}} end={{x:1,y:1}}>
            {saving ? <ActivityIndicator size="small" color="#fff" /> : (
              <>
                <Ionicons name="save-outline" size={20} color="#fff" />
                <Text style={styles.btnText}>Profili Güncelle</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* Admin Message Section */}
        <View style={[styles.section, { marginTop: 30 }]}>
          <Text style={styles.sectionTitle}>Yöneticiye Mesaj Gönder</Text>
          <Text style={{ color: '#888', fontSize: 11, marginBottom: 8, lineHeight: 15 }}>
            Günde sadece 1 mesaj gönderme hakkınız vardır. Mesajınız doğrudan yönetim paneline iletilecektir.
          </Text>
          {msgMessage ? <Text style={styles.successMsg}>{msgMessage}</Text> : null}
          {msgError ? <Text style={styles.errorMsg}>{msgError}</Text> : null}
          
          <TextInput
            style={styles.bioInput}
            placeholder="Yöneticiye iletmek istediğiniz mesajı yazın..."
            placeholderTextColor="#555"
            value={adminMessageText}
            onChangeText={setAdminMessageText}
            multiline
            numberOfLines={3}
            maxLength={500}
            textAlignVertical="top"
          />
          
          <TouchableOpacity onPress={handleSendAdminMessage} style={styles.btnWrap} activeOpacity={0.8} disabled={msgSending}>
            <LinearGradient colors={msgSending ? ['#555','#333'] : ['#00E676', '#00C853']} style={styles.gradient} start={{x:0,y:0}} end={{x:1,y:1}}>
              {msgSending ? <ActivityIndicator size="small" color="#fff" /> : (
                <>
                  <Ionicons name="paper-plane-outline" size={18} color="#fff" />
                  <Text style={styles.btnText}>Mesajı Gönder</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Password Change */}
        <View style={[styles.section, { marginTop: 30 }]}>
          <Text style={styles.sectionTitle}>Şifre Değiştir</Text>

          {pwMessage ? <Text style={styles.successMsg}>{pwMessage}</Text> : null}
          {pwError ? <Text style={styles.errorMsg}>{pwError}</Text> : null}

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={18} color="#888" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Mevcut Şifre"
              placeholderTextColor="#888"
              secureTextEntry
              value={oldPassword}
              onChangeText={setOldPassword}
            />
          </View>
          <View style={styles.inputContainer}>
            <Ionicons name="key-outline" size={18} color="#888" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Yeni Şifre"
              placeholderTextColor="#888"
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
            />
          </View>
          <View style={styles.inputContainer}>
            <Ionicons name="key-outline" size={18} color="#888" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Yeni Şifre (Tekrar)"
              placeholderTextColor="#888"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
          </View>

          <TouchableOpacity onPress={handleChangePassword} style={styles.btnWrap} activeOpacity={0.8} disabled={pwSaving}>
            <LinearGradient colors={pwSaving ? ['#555','#333'] : ['#FF8C00', '#FF3D00']} style={styles.gradient} start={{x:0,y:0}} end={{x:1,y:1}}>
              {pwSaving ? <ActivityIndicator size="small" color="#fff" /> : (
                <>
                  <Ionicons name="shield-checkmark-outline" size={20} color="#fff" />
                  <Text style={styles.btnText}>Şifreyi Güncelle</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <TouchableOpacity onPress={handleLogout} style={[styles.btnWrap, { marginTop: 30, marginBottom: 40 }]} activeOpacity={0.8}>
          <LinearGradient colors={['#FF3D00', '#B71C1C']} style={styles.gradient} start={{x:0,y:0}} end={{x:1,y:1}}>
            <Ionicons name="log-out-outline" size={20} color="#fff" />
            <Text style={styles.btnText}>Çıkış Yap</Text>
          </LinearGradient>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 20 },

  profileHeader: { alignItems: 'center', paddingVertical: 24, borderBottomWidth: 1, borderBottomColor: '#1E1E1E', marginBottom: 20 },
  avatar: { width: 90, height: 90, borderRadius: 45, alignItems: 'center', justifyContent: 'center', marginBottom: 12, borderWidth: 3, borderColor: '#333' },
  avatarLetter: { color: '#fff', fontSize: 40, fontWeight: '900' },
  username: { color: '#fff', fontSize: 24, fontWeight: '900', marginBottom: 4 },
  emailText: { color: '#888', fontSize: 14, marginBottom: 6 },
  predictionRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#151C24', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#FFD700', marginTop: 4, marginBottom: 8 },
  predictionText: { color: '#ccc', fontSize: 11, fontWeight: '600' },
  sinceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  sinceText: { color: '#666', fontSize: 12 },

  section: { borderTopWidth: 1, borderTopColor: '#1E1E1E', paddingTop: 18, marginTop: 10 },
  sectionTitle: { color: '#888', fontSize: 12, fontWeight: '900', letterSpacing: 2, marginBottom: 12, textTransform: 'uppercase' },

  teamChips: { gap: 8, paddingBottom: 4 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#1A1A1A', borderWidth: 1.5, borderColor: '#333' },
  chipText: { color: '#aaa', fontWeight: 'bold', fontSize: 13 },

  bioInput: { backgroundColor: '#1A1A1A', borderRadius: 12, borderWidth: 1, borderColor: '#333', padding: 15, color: '#fff', fontSize: 15, minHeight: 100 },

  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A1A', borderRadius: 12, borderWidth: 1, borderColor: '#333', marginBottom: 12, paddingHorizontal: 15 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: 16, color: '#fff', fontSize: 15 },

  btnWrap: { width: '100%', borderRadius: 12, overflow: 'hidden', marginTop: 12 },
  gradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 10 },
  btnText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },

  successMsg: { color: '#00E676', fontSize: 14, marginBottom: 12, textAlign: 'center', backgroundColor: '#0D2818', padding: 10, borderRadius: 8 },
  errorMsg: { color: '#FF3D00', fontSize: 14, marginBottom: 12, textAlign: 'center', backgroundColor: '#1A0000', padding: 10, borderRadius: 8 },
});
