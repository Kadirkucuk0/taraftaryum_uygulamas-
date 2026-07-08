import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import api from '../services/api';

interface LineupModalProps {
  visible: boolean;
  matchId: string | number;
  onClose: () => void;
  homeTeam: string;
  awayTeam: string;
}

interface Player {
  name: string;
  number?: string;
  position?: string;
}

interface TeamLineup {
  team_name: string;
  players: Player[];
  formation?: string;
}

export default function LineupModal({ visible, matchId, onClose, homeTeam, awayTeam }: LineupModalProps) {
  const [loading, setLoading] = useState(true);
  const [lineups, setLineups] = useState<TeamLineup[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible && matchId) {
      fetchLineups();
    } else {
      setLineups([]);
      setError(null);
    }
  }, [visible, matchId]);

  const fetchLineups = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/api/match/${matchId}/lineups`);
      if (response.data && response.data.lineups) {
        setLineups(response.data.lineups);
      } else {
        setError("Kadrolar henüz açıklanmadı.");
      }
    } catch (err) {
      console.error("Kadro çekme hatası:", err);
      setError("Kadrolar alınırken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const renderTeam = (teamData: TeamLineup, fallbackName: string) => (
    <View style={styles.teamColumn}>
      <Text style={styles.teamTitle}>{teamData?.team_name || fallbackName}</Text>
      {teamData?.formation ? <Text style={styles.formation}>{teamData.formation}</Text> : null}
      
      {teamData?.players && teamData.players.length > 0 ? (
        teamData.players.map((player, idx) => (
          <View key={idx} style={styles.playerRow}>
            <Text style={styles.playerNumber}>{player.number || '-'}</Text>
            <Text style={styles.playerName} numberOfLines={1}>{player.name}</Text>
          </View>
        ))
      ) : (
        <Text style={styles.noData}>Oyuncu verisi yok</Text>
      )}
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Maç Kadroları</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.centerContent}>
              <ActivityIndicator size="large" color="#00D4FF" />
              <Text style={styles.loadingText}>Kadrolar Yükleniyor...</Text>
            </View>
          ) : error || lineups.length === 0 ? (
            <View style={styles.centerContent}>
              <Ionicons name="information-circle-outline" size={48} color="#888" />
              <Text style={styles.errorText}>{error || "Kadro bilgisi bulunamadı."}</Text>
            </View>
          ) : (
            <ScrollView style={styles.scrollArea}>
              <View style={styles.columnsContainer}>
                {renderTeam(lineups[0], homeTeam)}
                <View style={styles.divider} />
                {renderTeam(lineups[1], awayTeam)}
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 600,
    maxHeight: '80%',
    backgroundColor: '#1A1A1A',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#333',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    backgroundColor: '#111',
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 5,
  },
  centerContent: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#888',
    marginTop: 15,
  },
  errorText: {
    color: '#888',
    marginTop: 15,
    textAlign: 'center',
  },
  scrollArea: {
    padding: 15,
  },
  columnsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  divider: {
    width: 1,
    backgroundColor: '#333',
    marginHorizontal: 10,
  },
  teamColumn: {
    flex: 1,
  },
  teamTitle: {
    color: '#00D4FF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    textAlign: 'center',
  },
  formation: {
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 15,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  playerNumber: {
    color: '#AAA',
    fontSize: 12,
    width: 20,
    marginRight: 8,
    textAlign: 'right',
  },
  playerName: {
    color: '#FFF',
    fontSize: 13,
    flex: 1,
  },
  noData: {
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 20,
  }
});
