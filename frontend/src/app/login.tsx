import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import api from '../services/api';
import AnimatedLogoBackground from '../components/AnimatedLogoBackground';
import CloudflareTurnstile from '../components/CloudflareTurnstile';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isFocused, setIsFocused] = useState<'username' | 'password' | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem('saved_credentials');
        if (saved) {
          const creds = JSON.parse(saved);
          setUsername(creds.username || '');
          setPassword(creds.password || '');
          setRememberMe(true);
        }
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  const handleLogin = async () => {
    setError('');
    if (!turnstileToken) {
      setError('Lütfen robot olmadığınızı doğrulayın');
      return;
    }
    setLoading(true);
    try {
      const response = await api.post('/auth/login', { username, password, turnstile_token: turnstileToken });
      await AsyncStorage.setItem('token', response.data.access_token);
      await AsyncStorage.setItem('username', response.data.username);

      // Save admin status
      if (response.data.is_admin) {
        await AsyncStorage.setItem('isAdmin', 'true');
      } else {
        await AsyncStorage.removeItem('isAdmin');
      }

      // Save or clear credentials based on remember me
      if (rememberMe) {
        await AsyncStorage.setItem('saved_credentials', JSON.stringify({ username, password }));
      } else {
        await AsyncStorage.removeItem('saved_credentials');
      }

      // Use window.location on web for a hard refresh so index re-mounts and detects login
      if (Platform.OS === 'web') {
        window.location.href = '/';
      } else {
        router.replace('/');
      }
    } catch (err: any) {
      if (err.response?.status === 401 || err.response?.status === 400) {
        setError('Kullanıcı adı veya şifre hatalı');
      } else {
        setError(err.response?.data?.message || 'Bağlantı hatası');
      }
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
      <AnimatedLogoBackground />
      <View style={styles.content}>
        <Image source={require('../../assets/images/logo.png')} style={{ width: 140, height: 140, resizeMode: 'contain', marginBottom: 20 }} />
        <Text style={styles.title}>Hoş Geldiniz</Text>
        <Text style={styles.subtitle}>Devam etmek için giriş yapın</Text>

        {error ? <Text style={styles.errorMsg}>{error}</Text> : null}

        <View style={[styles.inputContainer, isFocused === 'username' && styles.inputFocused]}>
          <Ionicons name="person-outline" size={20} color="#888" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Kullanıcı Adı"
            placeholderTextColor="#888"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            onFocus={() => setIsFocused('username')}
            onBlur={() => setIsFocused(null)}
          />
        </View>

        <View style={[styles.inputContainer, isFocused === 'password' && styles.inputFocused]}>
          <Ionicons name="lock-closed-outline" size={20} color="#888" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Şifre"
            placeholderTextColor="#888"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
            onFocus={() => setIsFocused('password')}
            onBlur={() => setIsFocused(null)}
            onSubmitEditing={handleLogin}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color="#888" />
          </TouchableOpacity>
        </View>

        {/* Remember Me */}
        <TouchableOpacity
          style={styles.rememberRow}
          onPress={() => setRememberMe(!rememberMe)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={rememberMe ? 'checkbox' : 'square-outline'}
            size={22}
            color={rememberMe ? '#00D4FF' : '#888'}
          />
          <Text style={styles.rememberText}>Beni Hatırla</Text>
        </TouchableOpacity>

        {/* Cloudflare Turnstile */}
        <CloudflareTurnstile
          siteKey="1x00000000000000000000AA"
          onVerify={(token) => setTurnstileToken(token)}
          onExpire={() => setTurnstileToken(null)}
          onError={() => setTurnstileToken(null)}
        />

        <TouchableOpacity onPress={handleLogin} style={styles.submitBtn} activeOpacity={0.8} disabled={loading}>
          <LinearGradient colors={loading ? ['#555','#333'] : ['#00D4FF', '#007BFF']} style={styles.gradient} start={{x: 0, y: 0}} end={{x: 1, y: 1}}>
            <Text style={styles.submitText}>{loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/forgot-password')} style={styles.forgotBtn}>
          <Text style={styles.forgotText}>Şifremi Unuttum?</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/register')} style={styles.linkBtn}>
          <Text style={styles.linkText}>Hesabınız yok mu? <Text style={styles.linkHighlight}>Kayıt Ol</Text></Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 25, width: '100%', maxWidth: 400, alignSelf: 'center' },
  icon: { marginBottom: 10 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#fff', marginBottom: 5 },
  subtitle: { fontSize: 16, color: '#888', marginBottom: 40 },
  errorMsg: { color: '#FF3D00', fontSize: 14, marginBottom: 15, textAlign: 'center', backgroundColor: '#1A0000', padding: 10, borderRadius: 8, width: '100%' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A1A', borderRadius: 12, borderWidth: 1, borderColor: '#333', marginBottom: 20, width: '100%', paddingHorizontal: 15 },
  inputFocused: { borderColor: '#00D4FF', backgroundColor: '#111', shadowColor: '#00D4FF', shadowOpacity: 0.2, shadowRadius: 10, elevation: 5 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: 18, color: '#fff', fontSize: 16 },
  eyeBtn: { padding: 8 },
  rememberRow: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', marginBottom: 10 },
  rememberText: { color: '#aaa', fontSize: 14 },
  submitBtn: { width: '100%', borderRadius: 12, overflow: 'hidden', marginTop: 10, shadowColor: '#00D4FF', shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  gradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, gap: 10 },
  submitText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  linkBtn: { marginTop: 30 },
  linkText: { color: '#888', fontSize: 15 },
  linkHighlight: { color: '#00D4FF', fontWeight: 'bold' },

  forgotBtn: { marginTop: 15, alignSelf: 'center' } as any,
  forgotText: { color: '#FF9800', fontSize: 14 }
});
