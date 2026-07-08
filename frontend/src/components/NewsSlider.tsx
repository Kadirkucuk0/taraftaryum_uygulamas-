import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Dimensions, TouchableOpacity, Linking, ActivityIndicator } from 'react-native';
import api from '../services/api';

const { width } = Dimensions.get('window');

interface NewsItem {
  title: string;
  link: string;
  description: string;
  published: string;
}

interface NewsSliderProps {
  vertical?: boolean;
}

export default function NewsSlider({ vertical = false }: NewsSliderProps) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    try {
      const response = await api.get('/api/news');
      if (response.data) {
        setNews(response.data);
      }
    } catch (error) {
      console.error("Haberler çekilemedi:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item, index }: { item: NewsItem; index: number }) => (
    <TouchableOpacity 
      style={[styles.newsCard, vertical && styles.newsCardVertical]} 
      activeOpacity={0.8}
      onPress={() => Linking.openURL(item.link)}
    >
      <View style={styles.newsHeader}>
        <Text style={styles.newsTag}>SON DAKİKA</Text>
        <Text style={styles.newsDate}>{item.published}</Text>
      </View>
      <Text style={styles.newsTitle} numberOfLines={2}>{item.title}</Text>
      <Text style={styles.newsDescription} numberOfLines={3}>{item.description}</Text>
      {!vertical && <Text style={styles.pageIndicator}>{index + 1} / {news.length}</Text>}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#00D4FF" />
        <Text style={styles.loadingText}>Haberler yükleniyor...</Text>
      </View>
    );
  }

  if (news.length === 0) return null;

  return (
    <View style={styles.container}>
      {!vertical && <Text style={styles.sectionTitle}>Haberler</Text>}
      {vertical ? (
        <View>
          {news.map((item, index) => (
            <React.Fragment key={index}>
              {renderItem({ item, index })}
            </React.Fragment>
          ))}
        </View>
      ) : (
        <FlatList
          data={news}
          renderItem={renderItem}
          keyExtractor={(item, index) => index.toString()}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          snapToInterval={width - 40}
          decelerationRate="fast"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 20,
    marginBottom: 10,
  },
  loadingContainer: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#888',
    marginTop: 10,
    fontSize: 14,
  },
  newsCard: {
    width: width - 40,
    marginHorizontal: 20,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: '#333',
    justifyContent: 'space-between',
  },
  newsCardVertical: {
    width: '100%',
    marginHorizontal: 0,
    marginBottom: 15,
  },
  newsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  newsTag: {
    backgroundColor: '#E70000',
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  newsDate: {
    color: '#888',
    fontSize: 12,
  },
  newsTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  newsDescription: {
    color: '#AAA',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  pageIndicator: {
    alignSelf: 'flex-end',
    color: '#555',
    fontSize: 12,
    fontWeight: 'bold',
  }
});
