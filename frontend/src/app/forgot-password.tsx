import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
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

export default function ForgotPasswordScreen() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isFocused, setIsFocused] = useState<string | null>(null);
  const router = useRouter();

  const strength = password ? getPasswordStrength(password) : null;

  // ═══ STEP 1: Send reset email ═══
  const handleSendCode = async () => {
    setError('');
    const cleanEmail = email.trim();
    if (!cleanEmail) { setError('Lütfen e-posta adresinizi girin'); return; }
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: cleanEmail });
      setStep(2);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Bir hata oluştu. Lütfen tekrar deneyin.');
    }
    setLoading(false);
  };

  // ═══ STEP 2: Verify code ═══
  const handleVerifyCode = async () => {
    setError('');
    if (code.length !== 6) { setError('Lütfen 6 haneli kodu girin'); return; }
    setLoading(true);
    try {
      await api.post('/auth/verify-reset-code', { email: email.trim(), code });
      setStep(3);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Kod geçersiz veya süresi dolmuş.');
    }
    setLoading(false);
  };

  // ═══ STEP 3: Reset password ═══
  const handleResetPassword = async () => {
    setError('');
    if (password.length < 6) { setError('Şifre en az 6 karakter olmalıdır'); return; }
    if (password !== confirmPassword) { setError('Şifreler eşleşmiyor'); return; }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { email: email.trim(), code, new_password: password });
      setSuccess('Şifreniz başarıyla değiştirildi! Giriş sayfasına yönlendiriliyorsunuz...');
      setTimeout(() => { router.replace('/login'); }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Şifre sıfırlama başarısız oldu.');
    }
    setLoading(false);
  };

  const handleResend = async () => {
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: email.trim() });
      setError('');
      setSuccess('Doğrulama kodu tekrar gönderildi!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gönderim başarısız oldu.');
    }
    setLoading(false);
  };

  // ═══ SUCCESS MESSAGE ═══
  if (success && step === 3) {
    return (
      <View style={styles.container}>
        <AnimatedLogoBackground />
        <View style={styles.content}>
          <View style={styles.iconCircle}>
            <Ionicons name="checkmark-circle" size={60} color="#00E676" />
          </View>
          <Text style={styles.title}>Başarılı!</Text>
          <Text style={styles.subtitle}>{success}</Text>
          <ActivityIndicator size="small" color="#00E676" style={{ marginTop: 20 }} />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
      <AnimatedLogoBackground />
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>

          {/* ═══ STEP 1: EMAIL ENTRY ═══ */}
          {step === 1 && (<>
            <View style={styles.iconCircle}>
              <Ionicons name="mail-outline" size={60} color="#FF9800" />
            </View>
            <Text style={styles.title}>Şifremi Unuttum</Text>
            <Text style={styles.subtitle}>Gmail adresinizi girin</Text>

            {error ? <Text style={styles.errorMsg}>{error}</Text> : null}

            <View style={[styles.inputContainer, isFocused === 'email' && styles.inputFocused]}>
              <Ionicons name="mail-outline" size={20} color="#888" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="E-posta Adresi"
                placeholderTextColor="#888"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                onFocus={() => setIsFocused('email')}
                onBlur={() => setIsFocused(null)}
              />
            </View>

            <TouchableOpacity onPress={handleSendCode} style={styles.submitBtn} activeOpacity={0.8} disabled={loading}>
              <LinearGradient colors={loading ? ['#555','#333'] : ['#FF9800', '#F57C00']} style={styles.gradient} start={{x: 0, y: 0}} end={{x: 1, y: 1}}>
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Text style={styles.submitText}>Kod Gönder</Text>
                    <Ionicons name="send" size={20} color="#fff" />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push('/login')} style={styles.linkBtn}>
              <Text style={styles.linkText}>
                <Ionicons name="arrow-back" size={14} color="#00D4FF" /> <Text style={styles.linkHighlight}>Giriş sayfasına dön</Text>
              </Text>
            </TouchableOpacity>
          </>)}

          {/* ═══ STEP 2: CODE VERIFICATION ═══ */}
          {step === 2 && (<>
            <View style={styles.iconCircle}>
              <Ionicons name="keypad-outline" size={60} color="#00D4FF" />
            </View>
            <Text style={styles.title}>Doğrulama Kodu</Text>
            <Text style={styles.subtitle}>Gmail adresinize gönderilen 6 haneli kodu girin</Text>
            <Text style={styles.emailDisplay}>{email}</Text>

            {error ? <Text style={styles.errorMsg}>{error}</Text> : null}
            {success ? <Text style={styles.successMsg}>{success}</Text> : null}

            <View style={[styles.inputContainer, isFocused === 'code' && styles.inputFocused, { justifyContent: 'center' }]}>
              <TextInput
                style={[styles.input, { textAlign: 'center', fontSize: 28, fontWeight: '900', letterSpacing: 8 }]}
                placeholder="000000"
                placeholderTextColor="#333"
                value={code}
                onChangeText={(t) => setCode(t.replace(/[^0-9]/g, '').slice(0, 6))}
                keyboardType="number-pad"
                maxLength={6}
                onFocus={() => setIsFocused('code')}
                onBlur={() => setIsFocused(null)}
              />
            </View>

            <TouchableOpacity onPress={handleVerifyCode} style={styles.submitBtn} activeOpacity={0.8} disabled={loading}>
              <LinearGradient colors={loading ? ['#555','#333'] : ['#00D4FF', '#007BFF']} style={styles.gradient} start={{x: 0, y: 0}} end={{x: 1, y: 1}}>
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Text style={styles.submitText}>Doğrula</Text>
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleResend} style={styles.linkBtn}>
              <Text style={styles.linkText}>Kod gelmedi mi? <Text style={styles.linkHighlight}>Tekrar Gönder</Text></Text>
            </TouchableOpacity>
          </>)}

          {/* ═══ STEP 3: NEW PASSWORD ═══ */}
          {step === 3 && (<>
            <View style={styles.iconCircle}>
              <Ionicons name="lock-open-outline" size={60} color="#00E676" />
            </View>
            <Text style={styles.title}>Yeni Şifre</Text>
            <Text style={styles.subtitle}>Yeni şifrenizi belirleyin</Text>

            {error ? <Text style={styles.errorMsg}>{error}</Text> : null}

            <View style={[styles.inputContainer, isFocused === 'password' && styles.inputFocused]}>
              <Ionicons name="lock-closed-outline" size={20} color="#888" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Yeni Şifre"
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

            {strength && (
              <View style={styles.strengthWrap}>
                <View style={styles.strengthBarBg}>
                  <View style={[styles.strengthBarFill, { width: strength.width, backgroundColor: strength.color }]} />
                </View>
                <Text style={[styles.strengthLabel, { color: strength.color }]}>{strength.label}</Text>
              </View>
            )}

            <View style={[styles.inputContainer, isFocused === 'confirm' && styles.inputFocused]}>
              <Ionicons name="lock-closed-outline" size={20} color="#888" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Şifre Tekrar"
                placeholderTextColor="#888"
                secureTextEntry={!showPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                onFocus={() => setIsFocused('confirm')}
                onBlur={() => setIsFocused(null)}
              />
            </View>

            <TouchableOpacity onPress={handleResetPassword} style={styles.submitBtn} activeOpacity={0.8} disabled={loading}>
              <LinearGradient colors={loading ? ['#555','#333'] : ['#00E676', '#00C853']} style={styles.gradient} start={{x: 0, y: 0}} end={{x: 1, y: 1}}>
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Text style={styles.submitText}>Şifreyi Değiştir</Text>
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </>)}

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  scrollContent: { flexGrow: 1, justifyContent: 'center' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 25, width: '100%', maxWidth: 400, alignSelf: 'center' },
  iconCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#0D1825', alignItems: 'center', justifyContent: 'center', marginBottom: 24, borderWidth: 2, borderColor: '#333' },
  title: { fontSize: 28, fontWeight: '900', color: '#fff', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#888', marginBottom: 30, textAlign: 'center' },
  emailDisplay: { fontSize: 14, color: '#00D4FF', marginBottom: 20, textAlign: 'center' },
  errorMsg: { color: '#FF3D00', fontSize: 14, marginBottom: 15, textAlign: 'center', backgroundColor: '#1A0000', padding: 10, borderRadius: 8, width: '100%' },
  successMsg: { color: '#00E676', fontSize: 14, marginBottom: 15, textAlign: 'center', backgroundColor: '#001A0D', padding: 10, borderRadius: 8, width: '100%' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A1A', borderRadius: 12, borderWidth: 1, borderColor: '#333', marginBottom: 15, width: '100%', paddingHorizontal: 15 },
  inputFocused: { borderColor: '#00D4FF', backgroundColor: '#111', shadowColor: '#00D4FF', shadowOpacity: 0.2, shadowRadius: 10, elevation: 5 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: 18, color: '#fff', fontSize: 16 },
  eyeBtn: { padding: 8 },
  strengthWrap: { flexDirection: 'row', alignItems: 'center', width: '100%', marginBottom: 15, gap: 10 },
  strengthBarBg: { flex: 1, height: 6, backgroundColor: '#333', borderRadius: 3, overflow: 'hidden' },
  strengthBarFill: { height: 6, borderRadius: 3 },
  strengthLabel: { fontSize: 12, fontWeight: 'bold', width: 50 },
  submitBtn: { width: '100%', borderRadius: 12, overflow: 'hidden', marginTop: 15, shadowColor: '#00D4FF', shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  gradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, gap: 10 },
  submitText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  linkBtn: { marginTop: 30 },
  linkText: { color: '#888', fontSize: 15 },
  linkHighlight: { color: '#00D4FF', fontWeight: 'bold' },
});
