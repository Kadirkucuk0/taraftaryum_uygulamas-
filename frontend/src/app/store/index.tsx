import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';

const SUPER_LIG_STORES = [
  { id: 'galatasaray', name: 'GSStore', url: 'https://www.gsstore.org/', colors: ['#A90432', '#FDB912'] },
  { id: 'fenerbahce', name: 'Fenerium', url: 'https://fenerium.com/', colors: ['#001E62', '#FFED00'] },
  { id: 'besiktas', name: 'Kartal Yuvası', url: 'https://www.kartalyuvasi.com.tr/', colors: ['#000000', '#444444'] },
  { id: 'trabzonspor', name: 'TSClub', url: 'https://www.tsclub.com.tr/', colors: ['#880026', '#00AEEF'] },
  { id: 'goztepe', name: 'GÖZGÖZ Mağazası', url: 'https://www.gozgoz.com.tr/', colors: ['#FFD700', '#FF0000'] },
  { id: 'konyaspor', name: 'KS Store', url: 'https://store.konyaspor.org.tr/', colors: ['#008000', '#FFFFFF'] },
  { id: 'basaksehir', name: 'Başakşehir Store', url: 'https://www.basaksehir.com.tr/store', colors: ['#FF6600', '#002B5C'] },
  { id: 'sivasspor', name: 'Yiğido Store', url: 'https://yigidostore.com/', colors: ['#FF0000', '#FFFFFF'] },
  { id: 'antalyaspor', name: 'Antalyaspor Store', url: 'https://www.antalyasporstore.com.tr/', colors: ['#FF0000', '#FFFFFF'] },
];

export default function StoreListScreen() {
  
  const openStore = (url: string) => {
    Linking.openURL(url).catch((err) => console.error("Sayfa yüklenemedi", err));
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="cart" size={40} color="#00E676" />
        <Text style={styles.title}>Süper Lig Mağazaları</Text>
        <Text style={styles.subtitle}>Resmi lisanslı ürünlere doğrudan erişin.</Text>
      </View>

      <FlatList
        data={SUPER_LIG_STORES}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.card}
            activeOpacity={0.8}
            onPress={() => openStore(item.url)}
          >
            <LinearGradient colors={item.colors as [string, string]} style={styles.gradient} start={{x: 0, y: 0}} end={{x: 1, y: 1}}>
              <View style={styles.cardContent}>
                <Text style={styles.cardText}>{item.name}</Text>
                <View style={styles.iconCircle}>
                  <Ionicons name="open-outline" size={20} color={item.colors[0] === '#FFFFFF' ? '#000' : item.colors[0]} />
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  header: { padding: 30, alignItems: 'center', backgroundColor: '#111', borderBottomWidth: 1, borderBottomColor: '#222', marginBottom: 10 },
  title: { fontSize: 28, fontWeight: '900', color: '#fff', marginTop: 10, letterSpacing: 1 },
  subtitle: { fontSize: 15, color: '#888', marginTop: 5 },
  list: { padding: 20 },
  card: { borderRadius: 16, overflow: 'hidden', marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.5, shadowRadius: 10, elevation: 8 },
  gradient: { padding: 25 },
  cardContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardText: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  iconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.9)', justifyContent: 'center', alignItems: 'center' }
});
