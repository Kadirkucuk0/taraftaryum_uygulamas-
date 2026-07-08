import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';

const LINKS = [
  { title: 'Süper Lig Resmi', url: 'https://www.tff.org/', icon: 'football' as const, color: '#FF6B00' },
  { title: 'UEFA', url: 'https://www.uefa.com/', icon: 'trophy' as const, color: '#00D4FF' },
  { title: 'Transfermarkt', url: 'https://www.transfermarkt.com.tr/', icon: 'swap-horizontal' as const, color: '#00E676' },
  { title: 'beIN Sports', url: 'https://www.beinsports.com/tr/', icon: 'tv' as const, color: '#FF3D00' },
  { title: 'TFF', url: 'https://www.tff.org/', icon: 'shield-checkmark' as const, color: '#E53935' },
  { title: 'Mackolik', url: 'https://www.mackolik.com/', icon: 'stats-chart' as const, color: '#4CAF50' },
  { title: 'NTV Spor', url: 'https://www.ntvspor.net/', icon: 'newspaper' as const, color: '#2196F3' },
];

export default function ExploreScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Ionicons name="compass" size={48} color="#00D4FF" />
        <Text style={styles.title}>Keşfet</Text>
        <Text style={styles.subtitle}>Futbol dünyasındaki en güncel kaynaklar</Text>

        {LINKS.map((link, i) => (
          <TouchableOpacity key={i} style={styles.card} activeOpacity={0.8} onPress={() => Linking.openURL(link.url)}>
            <LinearGradient colors={[link.color, '#111']} style={styles.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Ionicons name={link.icon} size={28} color="#fff" />
              <Text style={styles.cardText}>{link.title}</Text>
              <Ionicons name="open-outline" size={18} color="#888" style={{ marginLeft: 'auto' }} />
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0A0A0A' },
  content: { alignItems: 'center', padding: 20, paddingTop: 40 },
  title: { fontSize: 28, fontWeight: '900', color: '#fff', marginTop: 12 },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 30 },
  card: { width: '100%', maxWidth: 400, borderRadius: 14, overflow: 'hidden', marginBottom: 14 },
  gradient: { flexDirection: 'row', alignItems: 'center', padding: 18, gap: 14 },
  cardText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
});
