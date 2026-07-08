import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

interface Match {
  id: string | number;
  home_team: string;
  away_team: string;
  status: string;
  home_score: string | number;
  match_date?: string;
  league?: string;
}

interface MatchNotificationProps {
  matches: Match[];
}

export default function MatchNotification({ matches }: MatchNotificationProps) {
  const [notifiedMatches, setNotifiedMatches] = useState<Set<string>>(new Set());
  const [currentNotification, setCurrentNotification] = useState<Match | null>(null);

  useEffect(() => {
    const checkUpcomingMatches = () => {
      // Create a Date object for the current time in Turkey
      const nowString = new Date().toLocaleString("en-US", { timeZone: "Europe/Istanbul" });
      const trNow = new Date(nowString);
      const currentHours = trNow.getHours();
      const currentMinutes = trNow.getMinutes();

      for (const match of matches) {
        if (match.status === 'TIMED' && typeof match.home_score === 'string' && match.home_score.includes(':')) {
          const matchIdStr = match.id.toString();
          if (notifiedMatches.has(matchIdStr)) continue;

          const [matchH, matchM] = match.home_score.split(':').map(Number);
          
          // Calculate difference in minutes
          let diffMinutes = (matchH * 60 + matchM) - (currentHours * 60 + currentMinutes);
          
          // Handle cross-day difference if match is early tomorrow and it's late today
          if (diffMinutes < -12 * 60) diffMinutes += 24 * 60;
          
          if (diffMinutes > 0 && diffMinutes <= 60 && diffMinutes >= 58) {
            // Match is exactly 1 hour away (giving a 2 min window for the interval check)
            setCurrentNotification(match);
            setNotifiedMatches(prev => new Set(prev).add(matchIdStr));
            break; // Show one at a time
          }
        }
      }
    };

    // Check immediately and then every minute
    checkUpcomingMatches();
    const interval = setInterval(checkUpcomingMatches, 60000);
    return () => clearInterval(interval);
  }, [matches, notifiedMatches]);

  if (!currentNotification) return null;

  return (
    <Modal visible={true} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.notificationBox}>
          <View style={styles.iconContainer}>
            <Ionicons name="notifications-circle" size={50} color="#00D4FF" />
          </View>
          
          <Text style={styles.title}>Maç Başlıyor!</Text>
          <Text style={styles.matchText}>
            <Text style={styles.team}>{currentNotification.home_team}</Text>
            {" - "}
            <Text style={styles.team}>{currentNotification.away_team}</Text>
          </Text>
          <Text style={styles.timeText}>
            Tarih & Saat: <Text style={styles.highlight}>{currentNotification.match_date ? `${currentNotification.match_date} ` : ''}{currentNotification.home_score}</Text>
          </Text>
          
          <TouchableOpacity 
            style={styles.closeBtn} 
            onPress={() => setCurrentNotification(null)}
          >
            <Text style={styles.closeText}>Kapat</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  notificationBox: {
    width: '85%',
    maxWidth: 400,
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#00D4FF',
    shadowColor: '#00D4FF',
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
  },
  iconContainer: {
    marginBottom: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 15,
  },
  matchText: {
    fontSize: 18,
    color: '#DDD',
    textAlign: 'center',
    marginBottom: 10,
  },
  team: {
    fontWeight: 'bold',
    color: '#FFF',
  },
  timeText: {
    fontSize: 16,
    color: '#AAA',
    marginBottom: 20,
  },
  highlight: {
    color: '#E70000',
    fontWeight: 'bold',
  },
  closeBtn: {
    backgroundColor: '#333',
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#555',
  },
  closeText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
