import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getAccessToken } from '../utils/tokenStorage'; // ✅ 경로는 프로젝트 구조에 맞게 수정해주세요

const BASE_URL = 'http://douzonesumin.kro.kr:8082'; // 프로덕션 서버
const TOP_K = 3; // 유사도 높은 매뉴얼 몇 개를 참고할지 (백엔드 공지 참고)

const WORKY_LOGO = require('../assets/images/worky_logo.png');

// ─── 타입 정의 ────────────────────────────────────────────────
type ManualReference = {
  manualId: number;
  content: string;
  categoryName: string;
  similarityScore: number;
};

type Message = {
  id: number;
  sender: 'user' | 'worky';
  text: string;
  references?: ManualReference[]; // 워키 답변일 때 참고 매뉴얼 표시용
  isError?: boolean;
};

// ─── API 호출 함수 ────────────────────────────────────────────
async function askChatbot(question: string): Promise<{
  answer: string;
  references: ManualReference[];
}> {
  const token = await getAccessToken();

  const response = await fetch(`${BASE_URL}/api/qa/ask`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      question,
      topK: TOP_K,
    }),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('AUTH_ERROR');
    }
    throw new Error(`SERVER_ERROR_${response.status}`);
  }

  const data = await response.json();
  // ChatResponse: { answer, references, averageSimilarity, referencedManualCount, generatedAt }
  return {
    answer: data.answer || '매뉴얼에서 관련 내용을 찾았지만 답변 생성에 실패했어요. 참고 매뉴얼을 직접 확인해 주세요.',
    references: data.references ?? [],
  };
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────
export default function ChatbotScreen() {
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      sender: 'worky',
      text: '안녕하세요! 워크메이트의 AI 조수, 워키입니다. 매뉴얼에 대해 무엇이든 물어보세요!',
    },
  ]);

  // ─── 메시지 전송 ──────────────────────────────────────────
  const handleSend = async () => {
    const trimmed = inputText.trim();
    if (!trimmed || isLoading) return;

    // 1) 사용자 메시지 추가
    const userMessage: Message = {
      id: Date.now(),
      sender: 'user',
      text: trimmed,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    // 2) API 호출
    try {
      const { answer, references } = await askChatbot(trimmed);

      const workyMessage: Message = {
        id: Date.now() + 1,
        sender: 'worky',
        text: answer,
        references: references.length > 0 ? references : undefined,
      };
      setMessages((prev) => [...prev, workyMessage]);
    } catch (error: any) {
      let errorText = '일시적인 오류가 발생했어요. 잠시 후 다시 시도해 주세요.';
      if (error.message === 'AUTH_ERROR') {
        errorText = '인증이 만료되었어요. 다시 로그인해 주세요.';
      }

      const errorMessage: Message = {
        id: Date.now() + 1,
        sender: 'worky',
        text: errorText,
        isError: true,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // ─── 새 메시지 오면 스크롤 아래로 ────────────────────────
  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages, isLoading]);

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#2F4AFF" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Image source={WORKY_LOGO} style={styles.headerLogo} />
          <Text style={styles.headerTitle}>워키 (Worky)</Text>
        </View>
        <View style={{ width: 28 }} />
      </View>

      {/* 채팅 영역 */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.chatContainer}
        contentContainerStyle={styles.chatContent}
      >
        {messages.map((message) => {
          const isUser = message.sender === 'user';
          return (
            <View
              key={message.id}
              style={[
                styles.messageRow,
                isUser ? styles.userMessageRow : styles.workyMessageRow,
              ]}
            >
              {!isUser && <Image source={WORKY_LOGO} style={styles.avatar} />}
              <View style={[styles.bubble, isUser ? styles.userBubble : styles.workyBubble, message.isError && styles.errorBubble]}>
                <Text style={[styles.messageText, isUser ? styles.userText : styles.workyText]}>
                  {message.text}
                </Text>

                {/* 참고 매뉴얼 표시 */}
                {message.references && message.references.length > 0 && (
                  <View style={styles.referencesContainer}>
                    <Text style={styles.referencesTitle}>📋 참고한 매뉴얼</Text>
                    {message.references.map((ref, index) => (
                      <View key={ref.manualId} style={styles.referenceItem}>
                        <Text style={styles.referenceCategoryText}>
                          [{ref.categoryName}]
                        </Text>
                        <Text style={styles.referenceContentText} numberOfLines={2}>
                          {ref.content}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>
          );
        })}

        {/* 로딩 인디케이터 */}
        {isLoading && (
          <View style={[styles.messageRow, styles.workyMessageRow]}>
            <Image source={WORKY_LOGO} style={styles.avatar} />
            <View style={[styles.bubble, styles.workyBubble, styles.loadingBubble]}>
              <ActivityIndicator size="small" color="#2F4AFF" />
              <Text style={[styles.messageText, styles.workyText, { marginLeft: 8 }]}>
                매뉴얼을 검색하는 중...
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* 입력창 */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.inputBar}>
          <TextInput
            style={styles.textInput}
            placeholder="무엇을 물어보시겠습니까?"
            placeholderTextColor="#A0A0A0"
            value={inputText}
            onChangeText={setInputText}
            multiline
            editable={!isLoading}
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!inputText.trim() || isLoading) && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() || isLoading}
          >
            <MaterialCommunityIcons name="send" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── 스타일 ───────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  // 헤더
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: { padding: 5 },
  headerTitleContainer: { flexDirection: 'row', alignItems: 'center' },
  headerLogo: { width: 28, height: 28, marginRight: 8, borderRadius: 14 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#2F4AFF' },

  // 채팅
  chatContainer: { flex: 1, backgroundColor: '#FAFAFA' },
  chatContent: { paddingHorizontal: 15, paddingVertical: 20 },
  messageRow: { flexDirection: 'row', marginBottom: 15, maxWidth: '85%' },
  userMessageRow: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
  workyMessageRow: { alignSelf: 'flex-start' },
  avatar: { width: 36, height: 36, borderRadius: 18, marginRight: 8, marginTop: 2 },
  bubble: { paddingHorizontal: 15, paddingVertical: 12, borderRadius: 20 },
  userBubble: { backgroundColor: '#2F4AFF', borderBottomRightRadius: 5 },
  workyBubble: { backgroundColor: '#E9ECFF', borderTopLeftRadius: 5 },
  errorBubble: { backgroundColor: '#FFF0F0' },
  loadingBubble: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  messageText: { fontSize: 15, lineHeight: 22 },
  userText: { color: '#fff' },
  workyText: { color: '#333' },

  // 참고 매뉴얼
  referencesContainer: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(47, 74, 255, 0.15)',
  },
  referencesTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2F4AFF',
    marginBottom: 6,
  },
  referenceItem: {
    marginBottom: 6,
    paddingLeft: 8,
    borderLeftWidth: 2,
    borderLeftColor: '#2F4AFF',
  },
  referenceCategoryText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2F4AFF',
    marginBottom: 2,
  },
  referenceContentText: {
    fontSize: 12,
    color: '#555',
    lineHeight: 17,
  },

  // 입력창
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#EDEDED',
    paddingBottom: Platform.OS === 'ios' ? 10 : 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    fontSize: 15,
    maxHeight: 100,
    color: '#333',
  },
  sendButton: {
    backgroundColor: '#2F4AFF',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#B0BAFF',
  },
});