import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Platform } from 'react-native';

export default function Layout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: '#111',
          },
          headerTintColor: '#00D4FF',
          headerTitleStyle: {
            fontWeight: 'bold',
            color: '#fff',
            fontSize: 16,
          },
          headerShadowVisible: false,
          contentStyle: {
            backgroundColor: '#0A0A0A',
          },
          animation: Platform.OS === 'web' ? 'none' : 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Taraftaryum', headerShown: false }} />
        <Stack.Screen name="login" options={{ title: 'Giriş Yap', headerBackTitle: 'Geri' }} />
        <Stack.Screen name="register" options={{ title: 'Kayıt Ol', headerBackTitle: 'Geri' }} />
        <Stack.Screen name="chat" options={{ title: 'Canlı Maç Sohbeti', headerBackTitle: 'Geri' }} />
        <Stack.Screen name="explore" options={{ title: 'Keşfet', headerBackTitle: 'Geri' }} />
        <Stack.Screen name="store/index" options={{ title: 'Resmi Mağazalar', headerBackTitle: 'Geri' }} />
        <Stack.Screen name="profile" options={{ title: 'Profilim', headerBackTitle: 'Geri' }} />
        <Stack.Screen name="verify" options={{ title: 'E-posta Doğrulama', headerShown: false }} />
        <Stack.Screen name="forgot-password" options={{ title: 'Şifremi Unuttum', headerBackTitle: 'Geri' }} />
        <Stack.Screen name="admin" options={{ title: 'Yönetim Paneli', headerBackTitle: 'Geri' }} />
        <Stack.Screen name="prediction" options={{ title: 'Tahmin Oyunu', headerBackTitle: 'Geri' }} />
      </Stack>
    </>
  );
}
