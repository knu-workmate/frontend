import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
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

type CommentType = {
  id: number;
  name: string;
  text: string;
  time: string;
  color: string;
  isMine: boolean;
  authorId: number;
};

type PostDetailType = {
  postId: number;
  title: string;
  content: string;
  authorName: string;
  authorId: number;
  createdAt: string;
};

export default function CommentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const scrollViewRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();

  const boardId = String(params.boardId ?? '');
  const postId = String(params.postId ?? '');
  const boardTitle = String(params.boardTitle ?? '게시판');

  const [post, setPost] = useState<PostDetailType | null>(null);
  const [comments, setComments] = useState<CommentType[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [myName, setMyName] = useState<string | null>(null);
  const [isEditingPost, setIsEditingPost] = useState(false);
  const [editPostTitle, setEditPostTitle] = useState('');
  const [editPostContent, setEditPostContent] = useState('');
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  const fetchMyProfile = async () => {
    try {
      const result = await apiRequest('/user/profile');
      setMyName(result.name);
      return result.name;
    } catch (e: any) {
      return null;
    }
  };

  const fetchPost = async () => {
    setLoading(true);

    try {
      const result = await apiRequest(`/boards/${boardId}/posts/${postId}`);
      setPost(result);
      setEditPostTitle(result.title);
      setEditPostContent(result.content);
    } catch (e: any) {
      Alert.alert('오류', '게시글을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async (currentName?: string) => {
    try {
      const result = await apiRequest(`/posts/${postId}/comments`);
      const name = currentName ?? myName;

      const mapped: CommentType[] = result.map((item: any, index: number) => ({
        id: item.commentId,
        name: item.authorName,
        text: item.content,
        time: item.createdAt?.slice(0, 10) ?? '',
        color: getAvatarColor(index),
        isMine: item.authorName === name,
        authorId: item.authorId,
      }));

      setComments(mapped);
    } catch (e: any) {}
  };

  useEffect(() => {
    const init = async () => {
      const currentName = await fetchMyProfile();
      await fetchPost();
      await fetchComments(currentName);
    };

    init();
  }, []);

  useEffect(() => {
    const keyboardShowEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const keyboardHideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(keyboardShowEvent, () => {
      setIsKeyboardVisible(true);

      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 250);
    });

    const hideSubscription = Keyboard.addListener(keyboardHideEvent, () => {
      setIsKeyboardVisible(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const handleEditPost = async () => {
    if (editPostTitle.trim() === '' || editPostContent.trim() === '') {
      Alert.alert('알림', '제목과 내용을 모두 입력해주세요.');
      return;
    }

    try {
      await apiRequest(`/boards/${boardId}/posts/${postId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: editPostTitle.trim(),
          content: editPostContent.trim(),
        }),
      });

      setIsEditingPost(false);
      await fetchPost();
    } catch (e: any) {
      Alert.alert('오류', '게시글 수정에 실패했습니다.');
    }
  };

  const handleDeletePost = () => {
    Alert.alert('게시글 삭제', '정말로 이 게시글을 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiRequest(`/boards/${boardId}/posts/${postId}`, {
              method: 'DELETE',
            });

            Alert.alert('완료', '게시글이 삭제되었습니다.', [
              { text: '확인', onPress: () => router.back() },
            ]);
          } catch (e: any) {
            console.log('게시글 삭제 에러:', e.message);
            Alert.alert('오류', '게시글 삭제에 실패했습니다.');
          }
        },
      },
    ]);
  };

  const handleSubmit = async () => {
    if (inputText.trim() === '') return;

    setSubmitLoading(true);

    try {
      await apiRequest(`/posts/${postId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content: inputText.trim() }),
      });

      setInputText('');
      await fetchComments();

      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 300);
    } catch (e: any) {
      Alert.alert('오류', '댓글 등록에 실패했습니다.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeleteComment = (commentId: number) => {
    Alert.alert('댓글 삭제', '이 댓글을 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiRequest(`/posts/${postId}/comments/${commentId}`, {
              method: 'DELETE',
            });

            await fetchComments();
          } catch (e: any) {
            Alert.alert('오류', '댓글 삭제에 실패했습니다.');
          }
        },
      },
    ]);
  };

  const getAvatarColor = (index: number) => {
    const colors = ['#F5A623', '#F78FB3', '#2140DC', '#4CAF50', '#9C27B0'];
    return colors[index % colors.length];
  };

  const isMyPost = post && myName !== null && post.authorName === myName;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={24} color="#333" />
            </TouchableOpacity>

            <Text style={styles.headerTitle}>{boardTitle}</Text>

            {isMyPost && !isEditingPost ? (
              <View style={styles.headerActions}>
                <TouchableOpacity
                  onPress={() => setIsEditingPost(true)}
                  style={styles.headerBtn}
                >
                  <Ionicons name="pencil-outline" size={20} color="#666" />
                </TouchableOpacity>

                <TouchableOpacity onPress={handleDeletePost} style={styles.headerBtn}>
                  <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ width: 60 }} />
            )}
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#2140DC" style={{ marginTop: 40 }} />
          ) : (
            <ScrollView
              ref={scrollViewRef}
              style={styles.scrollView}
              contentContainerStyle={[
                styles.contentContainer,
                {
                  paddingBottom: isKeyboardVisible
                    ? 24
                    : Math.max(insets.bottom + 50, 60),
                },
              ]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {post && (
                <>
                  {isEditingPost ? (
                    <View style={styles.editContainer}>
                      <TextInput
                        style={styles.editTitleInput}
                        value={editPostTitle}
                        onChangeText={setEditPostTitle}
                        placeholder="제목을 입력하세요"
                        placeholderTextColor="#BDBDBD"
                      />

                      <TextInput
                        style={styles.editContentInput}
                        value={editPostContent}
                        onChangeText={setEditPostContent}
                        placeholder="내용을 입력하세요"
                        placeholderTextColor="#BDBDBD"
                        multiline
                        textAlignVertical="top"
                      />

                      <View style={styles.editBtnRow}>
                        <TouchableOpacity
                          style={styles.cancelBtn}
                          onPress={() => setIsEditingPost(false)}
                        >
                          <Text style={styles.cancelBtnText}>취소</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.saveBtn} onPress={handleEditPost}>
                          <Text style={styles.saveBtnText}>저장 완료</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.postSection}>
                      <Text style={styles.title}>{post.title}</Text>

                      <View style={styles.infoRow}>
                        <View style={styles.authorInfo}>
                          <Ionicons
                            name="person-circle-outline"
                            size={16}
                            color="#888"
                            style={{ marginRight: 4 }}
                          />
                          <Text style={styles.infoText}>{post.authorName}</Text>
                        </View>

                        <Text style={styles.infoText}>
                          {post.createdAt?.slice(0, 10)}
                        </Text>
                      </View>

                      <View style={styles.postBox}>
                        <Text style={styles.content}>{post.content}</Text>
                      </View>
                    </View>
                  )}
                </>
              )}

              <View style={styles.divider} />

              <Text style={styles.commentCountText}>댓글 {comments.length}개</Text>

              {comments.map((comment, index) => (
                <View key={comment.id} style={styles.commentItem}>
                  <View
                    style={[
                      styles.avatarCircle,
                      { backgroundColor: getAvatarColor(index) },
                    ]}
                  >
                    <Text style={styles.avatarText}>{comment.name.charAt(0)}</Text>
                  </View>

                  <View style={styles.commentContentRow}>
                    <View style={styles.commentMain}>
                      <Text style={styles.commentName}>{comment.name}</Text>
                      <Text style={styles.commentText}>{comment.text}</Text>
                    </View>

                    <View style={styles.commentRightSide}>
                      <Text style={styles.commentTime}>{comment.time}</Text>

                      {comment.isMine && (
                        <TouchableOpacity
                          style={styles.deleteBtn}
                          onPress={() => handleDeleteComment(comment.id)}
                        >
                          <Text style={styles.actionText}>삭제</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>
              ))}

              <View style={{ height: 20 }} />
            </ScrollView>
          )}

          <View style={styles.inputWrapper}>
            <View
              style={[
                styles.inputContainer,
                {
                  paddingBottom: isKeyboardVisible
                    ? 8
                    : Math.max(insets.bottom, 6),
                },
              ]}
            >
              <TextInput
                placeholder="댓글을 남겨보세요..."
                placeholderTextColor="#A0A0A0"
                style={styles.input}
                value={inputText}
                onChangeText={setInputText}
                multiline={true}
                maxLength={200}
                onFocus={() => {
                  setIsKeyboardVisible(true);

                  setTimeout(() => {
                    scrollViewRef.current?.scrollToEnd({ animated: true });
                  }, 300);
                }}
              />

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  inputText.trim() === '' && { backgroundColor: '#E0E0E0' },
                ]}
                onPress={handleSubmit}
                disabled={submitLoading || inputText.trim() === ''}
              >
                {submitLoading ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Ionicons name="arrow-up" size={18} color="#FFF" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
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

  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },

  backBtn: {
    padding: 6,
  },

  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
  },

  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  headerBtn: {
    padding: 8,
  },

  scrollView: {
    flex: 1,
  },

  contentContainer: {
    paddingHorizontal: 20,
  },

  postSection: {
    marginTop: 20,
  },

  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111',
    marginBottom: 12,
  },

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },

  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  infoText: {
    fontSize: 13,
    color: '#777',
  },

  postBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 20,
    minHeight: 120,
    marginBottom: 10,
  },

  content: {
    fontSize: 15,
    lineHeight: 24,
    color: '#333',
  },

  editContainer: {
    marginVertical: 20,
  },

  editTitleInput: {
    fontSize: 18,
    fontWeight: 'bold',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    paddingVertical: 10,
    marginBottom: 16,
    color: '#111',
  },

  editContentInput: {
    borderWidth: 1,
    borderColor: '#EEE',
    borderRadius: 12,
    padding: 16,
    minHeight: 150,
    fontSize: 15,
    color: '#111',
    marginBottom: 16,
    backgroundColor: '#FAFAFA',
  },

  editBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },

  cancelBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
  },

  cancelBtnText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },

  saveBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#2140DC',
  },

  saveBtnText: {
    fontSize: 14,
    color: '#FFF',
    fontWeight: 'bold',
  },

  divider: {
    height: 1,
    backgroundColor: '#EFEFEF',
    marginTop: 10,
    marginBottom: 20,
  },

  commentCountText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111',
    marginBottom: 16,
  },

  commentItem: {
    flexDirection: 'row',
    marginBottom: 20,
  },

  avatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  avatarText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },

  commentContentRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  commentMain: {
    flex: 1,
    paddingRight: 10,
  },

  commentName: {
    fontWeight: '700',
    fontSize: 14,
    color: '#222',
    marginBottom: 4,
  },

  commentText: {
    fontSize: 14,
    color: '#444',
    lineHeight: 20,
  },

  commentRightSide: {
    alignItems: 'flex-end',
    minWidth: 60,
  },

  commentTime: {
    fontSize: 12,
    color: '#999',
  },

  deleteBtn: {
    marginTop: 6,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },

  actionText: {
    fontSize: 12,
    color: '#FF3B30',
    fontWeight: '600',
  },

  inputWrapper: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },

  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: '#F5F6F8',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 12 : 10,
    paddingBottom: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 14,
    marginRight: 10,
    color: '#111',
  },

  submitButton: {
    backgroundColor: '#2140DC',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
});