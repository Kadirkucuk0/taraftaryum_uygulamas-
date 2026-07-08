import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, TextInput, KeyboardAvoidingView, Platform, FlatList, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import socketService from '../services/socket';
import { LinearGradient } from 'expo-linear-gradient';

const ROOMS = [
  { id: 'dunya-kupasi', name: 'Dünya Kupası', color: '#FFD700' },
  { id: 'galatasaray', name: 'Galatasaray', color: '#A90432' },
  { id: 'fenerbahce', name: 'Fenerbahçe', color: '#001E62' },
  { id: 'besiktas', name: 'Beşiktaş', color: '#FFFFFF' },
  { id: 'trabzonspor', name: 'Trabzonspor', color: '#880026' },
];

interface ChatMessage {
  id: number;
  user_id: number;
  username: string;
  text: string;
  timestamp: string;
  upvotes: number;
  downvotes: number;
}

export default function ChatScreen() {
  const router = useRouter();
  const [username, setUsername] = useState<string | null>(null);
  const [activeRoom, setActiveRoom] = useState(ROOMS[0].id);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [cooldown, setCooldown] = useState(0); // in seconds
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    (async () => {
      const u = await AsyncStorage.getItem('username');
      if (!u) {
        router.replace('/login');
        return;
      }
      setUsername(u);
      socketService.connect();
      joinRoom(activeRoom);
    })();

    return () => {
      if (socketService.socket) {
        socketService.socket.emit('leave_chat', { room: activeRoom });
        socketService.socket.off('chat_history');
        socketService.socket.off('new_chat_message');
        socketService.socket.off('chat_error');
        socketService.socket.off('chat_vote_update');
      }
    };
  }, []);

  const joinRoom = (roomId: string) => {
    if (!socketService.socket) return;
    
    // leave old room if changing
    if (activeRoom !== roomId) {
      socketService.socket.emit('leave_chat', { room: activeRoom });
    }
    
    setActiveRoom(roomId);
    setMessages([]);
    
    socketService.socket.emit('join_chat', { room: roomId });

    socketService.socket.off('chat_history');
    socketService.socket.on('chat_history', (data: { messages: ChatMessage[] }) => {
      setMessages(data.messages);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 300);
    });

    socketService.socket.off('new_chat_message');
    socketService.socket.on('new_chat_message', (msg: ChatMessage) => {
      setMessages(prev => [...prev, msg]);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    });

    socketService.socket.off('chat_error');
    socketService.socket.on('chat_error', (data: { msg: string, cooldown?: number }) => {
      Alert.alert("Uyarı", data.msg);
      if (data.cooldown) setCooldown(data.cooldown);
    });

    socketService.socket.off('chat_vote_update');
    socketService.socket.on('chat_vote_update', (data: { message_id: number, upvotes: number, downvotes: number }) => {
      setMessages(prev => prev.map(m => 
        m.id === data.message_id 
          ? { ...m, upvotes: data.upvotes, downvotes: data.downvotes } 
          : m
      ));
    });

    socketService.socket.off('chat_message_deleted');
    socketService.socket.on('chat_message_deleted', (data: { message_id: number }) => {
      setMessages(prev => prev.filter(m => m.id !== data.message_id));
    });
  };

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setInterval(() => setCooldown(prev => prev - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [cooldown]);

  const sendMessage = async () => {
    if (!inputText.trim() || cooldown > 0 || !socketService.socket) return;
    const token = await AsyncStorage.getItem('token');
    
    socketService.socket.emit('send_chat', {
      room: activeRoom,
      text: inputText.trim(),
      token: token
    });
    
    setInputText('');
    setCooldown(10); // Start cooldown locally immediately to give instant UI feedback
  };

  const voteMessage = async (messageId: number, type: 'up' | 'down') => {
    if (!socketService.socket) return;
    const token = await AsyncStorage.getItem('token');
    socketService.socket.emit('vote_chat', {
      message_id: messageId,
      vote_type: type,
      token: token
    });
  };

  const deleteMessage = async (messageId: number) => {
    const executeDelete = async () => {
      const token = await AsyncStorage.getItem('token');
      if (!token || !socketService.socket) return;
      socketService.socket.emit('delete_chat', {
        message_id: messageId,
        token: token
      });
    };

    if (Platform.OS === 'web') {
      if (window.confirm("Bu mesajı silmek istediğinize emin misiniz?")) {
        executeDelete();
      }
    } else {
      Alert.alert(
        "Mesajı Sil",
        "Bu mesajı silmek istediğinize emin misiniz?",
        [
          { text: "İptal", style: "cancel" },
          { 
            text: "Sil", 
            style: "destructive",
            onPress: executeDelete
          }
        ]
      );
    }
  };

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  const formatCooldown = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isMe = item.username === username;
    return (
      <View style={[styles.msgWrapper, isMe ? styles.msgWrapperMe : null]}>
        {!isMe && <Text style={styles.msgUser}>{item.username}</Text>}
        <View style={[styles.msgBubble, isMe ? styles.msgBubbleMe : null]}>
          <Text style={styles.msgText}>{item.text}</Text>
          <View style={styles.msgFooter}>
            <Text style={styles.msgTime}>{formatTime(item.timestamp)}</Text>
            <View style={styles.voteContainer}>
              {isMe && (
                <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteMessage(item.id)}>
                  <Ionicons name="trash-outline" size={14} color="#888" />
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.voteBtn} onPress={() => voteMessage(item.id, 'up')}>
                <Ionicons name="arrow-up" size={14} color="#00E676" />
                <Text style={styles.voteText}>{item.upvotes}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.voteBtn} onPress={() => voteMessage(item.id, 'down')}>
                <Ionicons name="arrow-down" size={14} color="#FF5252" />
                <Text style={styles.voteText}>{item.downvotes}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>💬 Canlı Sohbet</Text>
      </View>

      <View style={styles.roomsContainer}>
        {ROOMS.map(r => (
          <TouchableOpacity 
            key={r.id} 
            style={[styles.roomBtn, activeRoom === r.id && { borderColor: r.color, backgroundColor: '#222' }]}
            onPress={() => joinRoom(r.id)}
          >
            <Text style={[styles.roomText, activeRoom === r.id && { color: r.color }]}>{r.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.chatList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        <View style={styles.inputArea}>
          <TextInput
            style={styles.input}
            placeholder={cooldown > 0 ? `Lütfen ${cooldown} saniye bekleyin...` : "Şimdi mesaj atabilirsiniz..."}
            placeholderTextColor="#888"
            value={inputText}
            onChangeText={setInputText}
            editable={cooldown === 0}
            maxLength={200}
            onSubmitEditing={sendMessage}
          />
          <TouchableOpacity 
            style={[styles.sendBtn, (!inputText.trim() || cooldown > 0) && { opacity: 0.5 }]} 
            onPress={sendMessage}
            disabled={cooldown > 0}
          >
            <LinearGradient colors={['#00D4FF', '#007BFF']} style={styles.sendGrad} start={{x:0, y:0}} end={{x:1, y:1}}>
              <Ionicons name={cooldown > 0 ? "time" : "send"} size={20} color="#FFF" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0A0A0A' },
  header: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#1A1A1A', backgroundColor: '#111' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFF' },
  roomsContainer: { flexDirection: 'row', flexWrap: 'wrap', padding: 10, gap: 8, backgroundColor: '#0A0A0A', borderBottomWidth: 1, borderBottomColor: '#1A1A1A' },
  roomBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15, borderWidth: 1, borderColor: '#333', backgroundColor: '#111' },
  roomText: { color: '#888', fontSize: 12, fontWeight: 'bold' },
  chatList: { padding: 15, flexGrow: 1 },
  msgWrapper: { marginBottom: 15, maxWidth: '80%', alignSelf: 'flex-start' },
  msgWrapperMe: { alignSelf: 'flex-end' },
  msgUser: { color: '#888', fontSize: 11, marginBottom: 4, marginLeft: 4, fontWeight: 'bold' },
  msgBubble: { backgroundColor: '#1A1A1A', padding: 12, borderRadius: 16, borderTopLeftRadius: 4, borderWidth: 1, borderColor: '#333' },
  msgBubbleMe: { backgroundColor: '#002244', borderTopLeftRadius: 16, borderTopRightRadius: 4, borderColor: '#003366' },
  msgText: { color: '#FFF', fontSize: 15, lineHeight: 20 },
  msgFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, gap: 15 },
  msgTime: { color: '#666', fontSize: 10 },
  voteContainer: { flexDirection: 'row', gap: 10 },
  voteBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,0,0,0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  voteText: { color: '#AAA', fontSize: 11, fontWeight: 'bold' },
  inputArea: { flexDirection: 'row', padding: 10, paddingBottom: Platform.OS === 'ios' ? 25 : 10, backgroundColor: '#111', borderTopWidth: 1, borderTopColor: '#1A1A1A', alignItems: 'center' },
  input: { flex: 1, backgroundColor: '#1A1A1A', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 10, color: '#FFF', fontSize: 15, borderWidth: 1, borderColor: '#333' },
  sendBtn: { marginLeft: 10, borderRadius: 20, overflow: 'hidden' },
  sendGrad: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 20 },
});
