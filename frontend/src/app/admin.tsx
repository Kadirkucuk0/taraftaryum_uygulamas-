import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Platform, RefreshControl, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import api from '../services/api';

const { width: SW } = Dimensions.get('window');

type UserItem = {
  id: number;
  username: string;
  email: string;
  is_verified: boolean;
  is_admin: boolean;
  is_banned: boolean;
  login_count: number;
  favorite_team: string | null;
  champion_prediction: string | null;
  created_at: string;
  last_login: string | null;
};

type Stats = {
  total_users: number;
  verified_users: number;
  today_registrations: number;
  gmail_registrations: number;
  total_logins: number;
};

export default function AdminScreen() {
  const router = useRouter();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Message Modal States
  const [selectedUserForMessages, setSelectedUserForMessages] = useState<UserItem | null>(null);
  const [userMessages, setUserMessages] = useState<{ id: number; text: string; timestamp: string }[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const handleShowMessages = async (user: UserItem) => {
    setSelectedUserForMessages(user);
    setLoadingMessages(true);
    setModalVisible(true);
    setUserMessages([]);
    try {
      const res = await api.get(`/admin/users/${user.id}/messages`);
      setUserMessages(res.data.messages || []);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Mesajlar alınamadı.';
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Hata', msg);
      }
      setModalVisible(false);
    }
    setLoadingMessages(false);
  };

  const fetchData = async () => {
    setError('');
    try {
      const [statsRes, usersRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/users'),
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data.users || usersRes.data);
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError('Oturumunuz süresi dolmuş veya geçersiz. Lütfen tekrar giriş yapın.');
      } else if (err.response?.status === 403) {
        setError('Bu sayfaya erişim yetkiniz yok.');
      } else {
        setError(err.response?.data?.message || 'Veriler yüklenemedi.');
      }
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleToggleBan = async (user: UserItem) => {
    const actionText = user.is_banned ? 'engelini kaldırmak' : 'engellemek';
    const confirmMsg = `"${user.username}" kullanıcısının ${actionText} istediğinize emin misiniz?`;
    
    if (Platform.OS === 'web') {
      if (window.confirm(confirmMsg)) {
        await toggleBan(user.id);
      }
    } else {
      Alert.alert(
        'Kullanıcı Engelle',
        confirmMsg,
        [
          { text: 'İptal', style: 'cancel' },
          { text: 'Evet', style: 'destructive', onPress: () => toggleBan(user.id) },
        ]
      );
    }
  };

  const toggleBan = async (id: number) => {
    try {
      const res = await api.post(`/admin/users/${id}/toggle-ban`);
      setUsers(prev => prev.map(u => u.id === id ? { ...u, is_banned: res.data.is_banned } : u));
      
      const msg = res.data.message;
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Başarılı', msg);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'İşlem başarısız.';
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Hata', msg);
      }
    }
  };

  const handleDelete = (user: UserItem) => {
    if (Platform.OS === 'web') {
      if (window.confirm(`"${user.username}" kullanıcısını kalıcı olarak silmek istediğinize emin misiniz?`)) {
        deleteUser(user.id);
      }
    } else {
      Alert.alert(
        'Kullanıcı Sil',
        `"${user.username}" kullanıcısını kalıcı olarak silmek istediğinize emin misiniz?`,
        [
          { text: 'İptal', style: 'cancel' },
          { text: 'Sil', style: 'destructive', onPress: () => deleteUser(user.id) },
        ]
      );
    }
  };

  const deleteUser = async (id: number) => {
    try {
      await api.delete(`/admin/users/${id}`);
      setUsers(prev => prev.filter(u => u.id !== id));
      if (stats) {
        setStats({ ...stats, total_users: stats.total_users - 1 });
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Silme işlemi başarısız.';
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Hata', msg);
      }
    }
  };

  const formatDateTime = (d: string | null) => {
    if (!d) return '-';
    try {
      const parts = d.split(' ');
      if (parts.length >= 2) {
        return `${parts[0].substring(0, 5)} ${parts[1]}`;
      }
      return d;
    } catch { return d; }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#00D4FF" />
          <Text style={{ color: '#888', marginTop: 10 }}>Yükleniyor...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    const isAuthError = error.includes('giriş yapın') || error.includes('yetkiniz yok');
    return (
      <View style={styles.container}>
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={60} color="#FF5252" />
          <Text style={{ color: '#FF5252', fontSize: 16, marginTop: 10, textAlign: 'center', paddingHorizontal: 20 }}>{error}</Text>
          <TouchableOpacity 
            onPress={() => isAuthError ? router.replace('/login') : router.back()} 
            style={{ marginTop: 20, backgroundColor: '#1A1A1A', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: '#333' }}
          >
            <Text style={{ color: '#00D4FF', fontWeight: 'bold' }}>{isAuthError ? 'Giriş Yap' : 'Geri Dön'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{ padding: 14, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00D4FF" colors={['#00D4FF']} progressBackgroundColor="#1A1A1A" />}
      >
        {/* Header */}
        <LinearGradient colors={['#1A0A2E', '#0D1825']} style={styles.header} start={{x: 0, y: 0}} end={{x: 1, y: 1}}>
          <Ionicons name="shield-checkmark" size={36} color="#FF9800" />
          <Text style={styles.headerTitle}>Yönetim Paneli</Text>
          <Text style={styles.headerSub}>Kullanıcı yönetimi ve veri analizi</Text>
        </LinearGradient>

        {/* Stats Cards Row 1 */}
        {stats && (
          <>
            <View style={styles.statsRow}>
              <View style={[styles.statCard, { borderColor: '#00D4FF' }]}>
                <Ionicons name="people" size={20} color="#00D4FF" />
                <Text style={styles.statNum}>{stats.total_users}</Text>
                <Text style={styles.statLabel}>Toplam Üye</Text>
              </View>
              <View style={[styles.statCard, { borderColor: '#00E676' }]}>
                <Ionicons name="checkmark-circle" size={20} color="#00E676" />
                <Text style={styles.statNum}>{stats.verified_users}</Text>
                <Text style={styles.statLabel}>Doğrulanmış</Text>
              </View>
              <View style={[styles.statCard, { borderColor: '#FF9800' }]}>
                <Ionicons name="today" size={20} color="#FF9800" />
                <Text style={styles.statNum}>{stats.today_registrations}</Text>
                <Text style={styles.statLabel}>Yeni Kayıtlar</Text>
              </View>
            </View>

            {/* Stats Cards Row 2 */}
            <View style={styles.statsRow}>
              <View style={[styles.statCard, { borderColor: '#EA4335' }]}>
                <Ionicons name="logo-google" size={20} color="#EA4335" />
                <Text style={styles.statNum}>{stats.gmail_registrations}</Text>
                <Text style={styles.statLabel}>Gmail Kayıtlı</Text>
              </View>
              <View style={[styles.statCard, { borderColor: '#FFD700' }]}>
                <Ionicons name="enter-outline" size={20} color="#FFD700" />
                <Text style={styles.statNum}>{stats.total_logins}</Text>
                <Text style={styles.statLabel}>Toplam Giriş/Ziyaret</Text>
              </View>
            </View>
          </>
        )}

        {/* User Table */}
        <Text style={styles.sectionTitle}>👥 KULLANICI LİSTESİ</Text>

        {/* Table Header */}
        <View style={[styles.tableRow, styles.tableHeader]}>
          <Text style={[styles.th, { width: 28, textAlign: 'center' }]}>#</Text>
          <Text style={[styles.th, { flex: 1 }]}>Kullanıcı / E-posta / Detay</Text>
          <Text style={[styles.th, { width: 45, textAlign: 'center' }]}>Giriş</Text>
          <Text style={[styles.th, { width: 75 }]}>Kayıt / Son Giriş</Text>
          <Text style={[styles.th, { width: 35, textAlign: 'center' }]}>Doğ.</Text>
          <Text style={[styles.th, { width: 70, textAlign: 'center' }]}>İşlemler</Text>
        </View>

        {/* Table Rows */}
        {users.map((user, i) => (
          <View key={user.id} style={[styles.tableRow, { backgroundColor: i % 2 === 0 ? '#111' : '#0D0D0D' }]}>
            <Text style={[styles.td, { width: 28, textAlign: 'center', fontWeight: '900' }]}>{i + 1}</Text>
            <View style={{ flex: 1, gap: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                <Text style={[styles.td, { fontWeight: 'bold' }]} numberOfLines={1}>{user.username}</Text>
                {user.is_admin && (
                  <View style={styles.adminBadge}>
                    <Text style={styles.adminBadgeText}>ADMIN</Text>
                  </View>
                )}
                {user.is_banned && (
                  <View style={styles.banBadge}>
                    <Text style={styles.banBadgeText}>ENGEL</Text>
                  </View>
                )}
                {user.message_count > 0 && (
                  <TouchableOpacity 
                    onPress={() => handleShowMessages(user)} 
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: '#1A0F26', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4, borderWidth: 1, borderColor: '#BF55EC' }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="mail" size={9} color="#BF55EC" />
                    <Text style={{ color: '#BF55EC', fontSize: 8, fontWeight: '900' }}>{user.message_count}</Text>
                  </TouchableOpacity>
                )}
              </View>
              <Text style={{ color: '#555', fontSize: 9 }} numberOfLines={1}>{user.email}</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 1 }}>
                <Text style={{ color: '#888', fontSize: 9 }}>
                  Favori: <Text style={{ color: '#00D4FF', fontWeight: 'bold' }}>{user.favorite_team ? user.favorite_team.substring(0, 10).toUpperCase() : 'Yok'}</Text>
                </Text>
                <Text style={{ color: '#888', fontSize: 9 }}>
                  Tahmin: <Text style={{ color: '#FFD700', fontWeight: 'bold' }}>{user.champion_prediction || 'Yok'}</Text>
                </Text>
              </View>
            </View>
            <Text style={[styles.td, { width: 45, textAlign: 'center', fontSize: 11, fontWeight: 'bold' }]}>{user.login_count}</Text>
            <View style={{ width: 75, gap: 2 }}>
              <Text style={{ color: '#888', fontSize: 9 }} numberOfLines={1}>K: {formatDateTime(user.created_at)}</Text>
              <Text style={{ color: '#aaa', fontSize: 9 }} numberOfLines={1}>G: {formatDateTime(user.last_login)}</Text>
            </View>
            <View style={{ width: 35, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons
                name={user.is_verified ? 'checkmark-circle' : 'close-circle'}
                size={16}
                color={user.is_verified ? '#00E676' : '#FF5252'}
              />
            </View>
            <View style={{ width: 70, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              {!user.is_admin && (
                <>
                  <TouchableOpacity onPress={() => handleToggleBan(user)} style={[styles.actionBtn, user.is_banned ? styles.unbanBtn : styles.banBtn]}>
                    <Ionicons name={user.is_banned ? "checkmark-circle-outline" : "ban-outline"} size={13} color={user.is_banned ? "#00E676" : "#FF9800"} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(user)} style={styles.deleteBtn}>
                    <Ionicons name="trash-outline" size={13} color="#FF5252" />
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        ))}

        {users.length === 0 && (
          <Text style={{ color: '#555', textAlign: 'center', marginTop: 20 }}>Henüz kullanıcı bulunmuyor.</Text>
        )}
      </ScrollView>

      {/* Messages Modal */}
      {modalVisible && selectedUserForMessages && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="mail-open-outline" size={22} color="#BF55EC" />
              <Text style={styles.modalTitle} numberOfLines={1}>{selectedUserForMessages.username} - Mesajları</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={20} color="#888" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalScroll}>
              {loadingMessages ? (
                <ActivityIndicator size="small" color="#BF55EC" style={{ marginVertical: 20 }} />
              ) : userMessages.length === 0 ? (
                <Text style={styles.noMsgText}>Kullanıcının gönderdiği mesaj bulunmamaktadır.</Text>
              ) : (
                userMessages.map(msg => (
                  <View key={msg.id} style={styles.msgItem}>
                    <Text style={styles.msgText}>{msg.text}</Text>
                    <Text style={styles.msgTime}>{msg.timestamp}</Text>
                  </View>
                ))
              )}
            </ScrollView>
            
            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalOkBtn} activeOpacity={0.8}>
              <Text style={styles.modalOkBtnText}>Kapat</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  header: { borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#1A2A3A' },
  headerTitle: { fontSize: 24, fontWeight: '900', color: '#fff', marginTop: 8, letterSpacing: 1 },
  headerSub: { fontSize: 13, color: '#888', marginTop: 4 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  statCard: { flex: 1, backgroundColor: '#151515', borderRadius: 14, padding: 12, alignItems: 'center', borderWidth: 1, gap: 4 },
  statNum: { color: '#fff', fontSize: 20, fontWeight: '900' },
  statLabel: { color: '#888', fontSize: 10, fontWeight: 'bold', textAlign: 'center' },
  sectionTitle: { color: '#888', fontSize: 12, fontWeight: '900', letterSpacing: 2, marginTop: 15, marginBottom: 10 },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: '#1A1A1A' },
  tableHeader: { backgroundColor: '#0D0D0D' },
  th: { color: '#666', fontWeight: '900', fontSize: 10 },
  td: { color: '#ddd', fontSize: 11 },
  adminBadge: { backgroundColor: '#FF9800', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4 },
  adminBadgeText: { color: '#000', fontSize: 7, fontWeight: '900' },
  banBadge: { backgroundColor: '#FF5252', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4 },
  banBadgeText: { color: '#fff', fontSize: 7, fontWeight: '900' },
  deleteBtn: { padding: 5, borderRadius: 6, backgroundColor: '#1A0A0A', borderWidth: 1, borderColor: '#2A0A0A' },
  actionBtn: { padding: 5, borderRadius: 6, borderWidth: 1 },
  banBtn: { backgroundColor: '#1A110A', borderColor: '#3A1E0A' },
  unbanBtn: { backgroundColor: '#0A1A11', borderColor: '#0A3A1E' },
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 },
  modalContent: { width: '100%', maxWidth: 450, backgroundColor: '#151515', borderRadius: 16, borderWidth: 1, borderColor: '#333', padding: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: '#222', paddingBottom: 12, marginBottom: 12 },
  modalTitle: { flex: 1, color: '#fff', fontSize: 16, fontWeight: '900' },
  modalCloseBtn: { padding: 4 },
  modalScroll: { flex: 1, maxHeight: 300 },
  noMsgText: { color: '#666', textAlign: 'center', marginVertical: 20, fontSize: 13 },
  msgItem: { backgroundColor: '#1e1e1e', borderRadius: 10, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#2d2d2d' },
  msgText: { color: '#ddd', fontSize: 13, lineHeight: 18 },
  msgTime: { color: '#666', fontSize: 10, textAlign: 'right', marginTop: 6 },
  modalOkBtn: { backgroundColor: '#BF55EC', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 14 },
  modalOkBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
});
