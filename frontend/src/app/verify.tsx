import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import api from '../services/api';

type VerifyState = 'loading' | 'success' | 'error';

export default function VerifyScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const [state, setState] = useState<VerifyState>('loading');
  const router = useRouter();

  useEffect(() => {
    if (!token) {
      setState('error');
      return;
    }
    (async () => {
      try {
        await api.get(`/auth/verify/${token}`);
        setState('success');
      } catch (err) {
        setState('error');
      }
    })();
  }, [token]);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {state === 'loading' && (
          <>
            <ActivityIndicator size="large" color="#00D4FF" style={{ marginBottom: 20 }} />
            <Text style={styles.loadingText}>Doğrulanıyor...</Text>
          </>
        )}

        {state === 'success' && (
          <>
            <View style={[styles.iconCircle, { backgroundColor: '#0D2818', borderColor: '#00E676' }]}>
              <Ionicons name="checkmark-circle" size={64} color="#00E676" />
            </View>
            <Text style={styles.title}>E-posta Doğrulandı!</Text>
            <Text style={styles.subtitle}>
              Hesabınız başarıyla doğrulandı. Artık giriş yapabilirsiniz.
            </Text>
            <TouchableOpacity
              onPress={() => router.replace('/login')}
              style={styles.btn}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#00D4FF', '#007BFF']}
                style={styles.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="log-in" size={20} color="#fff" />
                <Text style={styles.btnText}>Giriş Yap</Text>
              </LinearGradient>
            </TouchableOpacity>
          </>
        )}

        {state === 'error' && (
          <>
            <View style={[styles.iconCircle, { backgroundColor: '#251010', borderColor: '#FF3D00' }]}>
              <Ionicons name="close-circle" size={64} color="#FF3D00" />
            </View>
            <Text style={styles.title}>Doğrulama Başarısız</Text>
            <Text style={styles.subtitle}>
              Geçersiz veya süresi dolmuş doğrulama linki.
            </Text>
            <TouchableOpacity
              onPress={() => router.replace('/')}
              style={styles.btn}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#FF8C00', '#FF3D00']}
                style={styles.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="home" size={20} color="#fff" />
                <Text style={styles.btnText}>Ana Sayfaya Dön</Text>
              </LinearGradient>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 25, width: '100%', maxWidth: 400, alignSelf: 'center' },
  iconCircle: { width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center', marginBottom: 24, borderWidth: 2 },
  title: { fontSize: 28, fontWeight: '900', color: '#fff', marginBottom: 10, textAlign: 'center' },
  subtitle: { fontSize: 15, color: '#888', marginBottom: 40, textAlign: 'center', lineHeight: 22 },
  loadingText: { fontSize: 16, color: '#888' },
  btn: { width: '100%', borderRadius: 12, overflow: 'hidden', shadowColor: '#00D4FF', shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  gradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, gap: 10 },
  btnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});
