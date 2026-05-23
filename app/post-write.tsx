import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiRequest } from '../utils/api';

export default function PostWriteScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  const boardId = typeof params.boardId === 'string' ? params.boardId : '';
  const boardTitle =
    typeof params.boardTitle === 'string' ? params.boardTitle : '게시판';
  const boardCategory =
    typeof params.category === 'string' ? params.category : '공지';

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (title.trim() === '' || content.trim() === '') return;

    setLoading(true);

    try {
      await apiRequest(`/boards/${boardId}/posts`, {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
        }),
      });

      Alert.alert('등록 완료', '게시글이 등록되었습니다.', [
        {
          text: '확인',
          onPress: () => router.back(),
        },
      ]);
    } catch (error: any) {
      Alert.alert('오류', '게시글 등록에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContainer,
            { paddingBottom: Math.max(insets.bottom + 86, 96) },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.back()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="chevron-back" size={26} color="#111" />
            </TouchableOpacity>

            <Text style={styles.headerTitle}>게시글 작성</Text>

            <View style={{ width: 26 }} />
          </View>

          {/* 게시판 표시 */}
          <View style={styles.boardSelectBox}>
            <View
              style={[
                styles.badge,
                {
                  backgroundColor:
                    boardCategory === '공지' ? '#F0F4FF' : '#F5F5F5',
                },
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  {
                    color: boardCategory === '공지' ? '#2140DC' : '#333',
                  },
                ]}
              >
                {boardCategory}
              </Text>
            </View>

            <Text style={styles.selectedBoardName}>{boardTitle}</Text>
          </View>

          <TextInput
            style={styles.titleInput}
            placeholder="제목을 입력하세요"
            placeholderTextColor="#BDBDBD"
            value={title}
            onChangeText={setTitle}
          />

          <View style={styles.inputWrapper}>
            <View style={styles.charCountContainer}>
              <Text style={styles.charCountText}>
                {content.length.toLocaleString()}/1,000
              </Text>
            </View>

            <TextInput
              style={styles.contentInput}
              placeholder="내용을 입력해주세요"
              placeholderTextColor="#BDBDBD"
              multiline
              maxLength={1000}
              value={content}
              onChangeText={setContent}
              textAlignVertical="top"
            />
          </View>
        </ScrollView>

        <View
          style={[
            styles.bottomButtonContainer,
            { paddingBottom: Math.max(insets.bottom, 6) },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.submitButton,
              (title.trim() === '' || content.trim() === '' || loading) && {
                backgroundColor: '#E0E0E0',
              },
            ]}
            onPress={handleRegister}
            disabled={title.trim() === '' || content.trim() === '' || loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.submitButtonText}>등록하기</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  keyboardAvoidingView: {
    flex: 1,
  },

  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },

  headerTitle: {
    fontSize: 17,
    fontWeight: 'bold',
  },

  boardSelectBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 14,
    marginBottom: 16,
    marginTop: 10,
  },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 10,
  },

  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },

  selectedBoardName: {
    flex: 1,
    fontSize: 15,
    color: '#111',
    fontWeight: '600',
  },

  titleInput: {
    fontSize: 18,
    fontWeight: 'bold',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    paddingVertical: 12,
    marginBottom: 20,
  },

  inputWrapper: {
    flex: 1,
    minHeight: 300,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    borderRadius: 8,
    marginBottom: 20,
    position: 'relative',
  },

  charCountContainer: {
    position: 'absolute',
    top: 14,
    right: 14,
    zIndex: 1,
  },

  charCountText: {
    fontSize: 12,
    color: '#BDBDBD',
  },

  contentInput: {
    flex: 1,
    fontSize: 15,
    paddingTop: 14,
    paddingHorizontal: 14,
    paddingRight: 60,
    minHeight: 300,
  },

  bottomButtonContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    backgroundColor: '#FFFFFF',
  },

  submitButton: {
    backgroundColor: '#2140DC',
    height: 52,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },

  submitButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});