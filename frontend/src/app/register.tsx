import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import api from '../services/api';
import AnimatedLogoBackground from '../components/AnimatedLogoBackground';

const getPasswordStrength = (pwd: string) => {
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[a-z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;

  if (score <= 1) return { label: 'Zayıf', color: '#FF3D00', width: '25%' as const };
  if (score === 2) return { label: 'Orta', color: '#FF9800', width: '50%' as const };
  if (score === 3) return { label: 'İyi', color: '#FFEB3B', width: '75%' as const };
  return { label: 'Güçlü', color: '#00E676', width: '100%' as const };
};

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export default function RegisterScreen() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState<'username' | 'email' | 'password' | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [registered, setRegistered] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState('');

  const router = useRouter();

  const strength = password ? getPasswordStrength(password) : null;

  const handleEmailChange = (val: string) => {
    const trimmed = val.trim();
    setEmail(trimmed);
    if (trimmed.length > 0 && !isValidEmail(trimmed)) {
      setEmailError('Geçersiz e-posta formatı');
    } else {
      setEmailError('');
    }
  };

  const handleRegister = async () => {
    setError('');
    const cleanEmail = email.trim();
    if (!isValidEmail(cleanEmail)) {
      setEmailError('Geçersiz e-posta formatı (Boşlukları kontrol edin)');
      return;
    }
    setLoading(true);
    try {
      const resp = await api.post('/auth/register', {
        username: username.trim(),
        email: cleanEmail,
        password
      });

      setRegistered(true);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Kayıt başarısız. Bağlantınızı kontrol edin.';
      setError(msg);
    }
    setLoading(false);
  };

  const handleResend = async () => {
    setResending(true);
    setResendMsg('');
    try {
      const resp = await api.post('/auth/resend-verification', { email: email.trim() });
      setResendMsg(resp.data.message || 'Doğrulama e-postası tekrar gönderildi!');

    } catch (err: any) {
      setResendMsg(err.response?.data?.message || 'Gönderim başarısız oldu.');
    }
    setResending(false);
  };

  // ═══ VERIFICATION SUCCESS SCREEN ═══
  if (registered) {
    return (
      <View style={styles.container}>
        <AnimatedLogoBackground />
        <View style={styles.verifyContent}>
          <View style={styles.mailIconCircle}>
            <Ionicons name="mail-outline" size={60} color="#00D4FF" />
          </View>
          <Text style={styles.verifyTitle}>E-postanızı kontrol edin!</Text>
          <Text style={styles.verifySubtitle}>Doğrulama linki gönderildi</Text>
          <Text style={styles.verifyEmail}>{email}</Text>

          {resendMsg ? (
            <Text style={[styles.resendMsg, resendMsg.includes('başarısız') ? { color: '#FF3D00' } : { color: '#00E676' }]}>{resendMsg}</Text>
          ) : null}

          <TouchableOpacity onPress={handleResend} style={styles.resendBtn} activeOpacity={0.8} disabled={resending}>
            <LinearGradient colors={resending ? ['#555','#333'] : ['#00D4FF', '#007BFF']} style={styles.gradient} start={{x: 0, y: 0}} end={{x: 1, y: 1}}>
              {resending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="refresh-outline" size={20} color="#fff" />
                  <Text style={styles.submitText}>Doğrulama e-postası tekrar gönder</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>



          <TouchableOpacity onPress={() => router.push('/login')} style={styles.linkBtn}>
            <Text style={styles.linkText}>
              <Ionicons name="arrow-back" size={14} color="#00E676" /> <Text style={styles.linkHighlight}>Giriş sayfasına dön</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ═══ REGISTER FORM ═══
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
      <AnimatedLogoBackground />
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          <Image source={require('../../assets/images/logo.png')} style={{ width: 120, height: 120, resizeMode: 'contain', marginBottom: 15 }} />
          <Text style={styles.title}>Hesap Oluştur</Text>
          <Text style={styles.subtitle}>Taraftaryum'a Katıl!</Text>

          {error ? <Text style={styles.errorMsg}>{error}</Text> : null}

          {/* Username */}
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

          {/* Email */}
          <View style={[styles.inputContainer, isFocused === 'email' && styles.inputFocused, emailError ? styles.inputError : null]}>
            <Ionicons name="mail-outline" size={20} color="#888" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="E-posta Adresi"
              placeholderTextColor="#888"
              value={email}
              onChangeText={handleEmailChange}
              autoCapitalize="none"
              keyboardType="email-address"
              onFocus={() => setIsFocused('email')}
              onBlur={() => setIsFocused(null)}
            />
          </View>
          {emailError ? <Text style={styles.emailErrorText}>{emailError}</Text> : null}

          {/* Password */}
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
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color="#888" />
            </TouchableOpacity>
          </View>

          {/* Password Strength */}
          {strength && (
            <View style={styles.strengthWrap}>
              <View style={styles.strengthBarBg}>
                <View style={[styles.strengthBarFill, { width: strength.width, backgroundColor: strength.color }]} />
              </View>
              <Text style={[styles.strengthLabel, { color: strength.color }]}>{strength.label}</Text>
            </View>
          )}

          <TouchableOpacity onPress={handleRegister} style={styles.submitBtn} activeOpacity={0.8} disabled={loading}>
            <LinearGradient colors={loading ? ['#555','#333'] : ['#00E676', '#00C853']} style={styles.gradient} start={{x: 0, y: 0}} end={{x: 1, y: 1}}>
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Text style={styles.submitText}>Hesap Oluştur</Text>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/login')} style={styles.linkBtn}>
            <Text style={styles.linkText}>Zaten hesabınız var mı? <Text style={styles.linkHighlight}>Giriş Yap</Text></Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  scrollContent: { flexGrow: 1, justifyContent: 'center' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 25, width: '100%', maxWidth: 400, alignSelf: 'center' },
  icon: { marginBottom: 10 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#fff', marginBottom: 5 },
  subtitle: { fontSize: 16, color: '#888', marginBottom: 30 },
  errorMsg: { color: '#FF3D00', fontSize: 14, marginBottom: 15, textAlign: 'center', backgroundColor: '#1A0000', padding: 10, borderRadius: 8, width: '100%' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A1A', borderRadius: 12, borderWidth: 1, borderColor: '#333', marginBottom: 15, width: '100%', paddingHorizontal: 15 },
  inputFocused: { borderColor: '#00E676', backgroundColor: '#111', shadowColor: '#00E676', shadowOpacity: 0.2, shadowRadius: 10, elevation: 5 },
  inputError: { borderColor: '#FF3D00' },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: 18, color: '#fff', fontSize: 16 },
  eyeBtn: { padding: 8 },
  emailErrorText: { color: '#FF3D00', fontSize: 12, alignSelf: 'flex-start', marginTop: -10, marginBottom: 10, marginLeft: 5 },
  strengthWrap: { flexDirection: 'row', alignItems: 'center', width: '100%', marginBottom: 15, gap: 10 },
  strengthBarBg: { flex: 1, height: 6, backgroundColor: '#333', borderRadius: 3, overflow: 'hidden' },
  strengthBarFill: { height: 6, borderRadius: 3 },
  strengthLabel: { fontSize: 12, fontWeight: 'bold', width: 50 },
  submitBtn: { width: '100%', borderRadius: 12, overflow: 'hidden', marginTop: 15, shadowColor: '#00E676', shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  gradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, gap: 10 },
  submitText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  linkBtn: { marginTop: 30 },
  linkText: { color: '#888', fontSize: 15 },
  linkHighlight: { color: '#00E676', fontWeight: 'bold' },

  // Verification screen
  verifyContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 25, width: '100%', maxWidth: 400, alignSelf: 'center' },
  mailIconCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#0D2233', alignItems: 'center', justifyContent: 'center', marginBottom: 24, borderWidth: 2, borderColor: '#00D4FF' },
  verifyTitle: { fontSize: 28, fontWeight: '900', color: '#fff', marginBottom: 8, textAlign: 'center' },
  verifySubtitle: { fontSize: 16, color: '#888', marginBottom: 6, textAlign: 'center' },
  verifyEmail: { fontSize: 14, color: '#00D4FF', marginBottom: 30, textAlign: 'center' },
  resendMsg: { fontSize: 13, marginBottom: 15, textAlign: 'center' },
  resendBtn: { width: '100%', borderRadius: 12, overflow: 'hidden', marginBottom: 20, shadowColor: '#00D4FF', shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
});
