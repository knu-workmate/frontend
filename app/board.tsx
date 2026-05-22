import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiRequest } from '../utils/api';

type CategoryType = '공지' | '일반' | '매뉴얼';

type BoardType = {
  id: string;
  category: CategoryType;
  title: string;
  isNew: boolean;
};

const typeToCategory = (type: string): CategoryType => {
  if (type === 'NOTICE') return '공지';
  if (type === 'NORMAL') return '일반';
  return '일반';
};

const categoryToType = (category: CategoryType): string => {
  if (category === '공지') return 'NOTICE';
  return 'NORMAL';
};

export default function BoardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [searchText, setSearchText] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>('공지');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isEditDropdownOpen, setIsEditDropdownOpen] = useState(false);
  const [newBoardTitle, setNewBoardTitle] = useState('');
  const [editBoardTitle, setEditBoardTitle] = useState('');
  const [editBoardCategory, setEditBoardCategory] = useState<CategoryType>('공지');
  const [editBoardId, setEditBoardId] = useState<string>('');
  const [boards, setBoards] = useState<BoardType[]>([]);
  const [loading, setLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const fetchBoards = async () => {
    setLoading(true);

    try {
      const result = await apiRequest('/boards/my');

      const mapped: BoardType[] = result.map((item: any) => ({
        id: String(item.boardId),
        category: typeToCategory(item.type),
        title: item.boardName,
        isNew: false,
      }));

      setBoards(mapped);
    } catch (e: any) {
      Alert.alert('오류', '게시판 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBoards();
  }, []);

  const filteredBoards = useMemo(() => {
    return boards.filter(
      (board) =>
        board.title.includes(searchText) || board.category.includes(searchText)
    );
  }, [boards, searchText]);

  const handleCreateBoard = async () => {
    if (newBoardTitle.trim() === '') return;

    setCreateLoading(true);

    try {
      await apiRequest('/boards', {
        method: 'POST',
        body: JSON.stringify({
          boardName: newBoardTitle.trim(),
          type: categoryToType(selectedCategory),
        }),
      });

      setIsModalOpen(false);
      setNewBoardTitle('');
      setIsDropdownOpen(false);
      await fetchBoards();
    } catch (e: any) {
      Alert.alert('오류', '게시판 생성에 실패했습니다.');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDeleteBoard = (boardId: string, boardTitle: string) => {
    setOpenMenuId(null);

    Alert.alert('게시판 삭제', `"${boardTitle}" 게시판을 삭제하시겠습니까?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiRequest(`/boards/${boardId}`, { method: 'DELETE' });
            await fetchBoards();
          } catch (e: any) {
            console.log('삭제 에러:', e.message);
            Alert.alert('오류', '게시판 삭제에 실패했습니다.');
          }
        },
      },
    ]);
  };

  const handleOpenEditModal = (board: BoardType) => {
    setOpenMenuId(null);
    setEditBoardId(board.id);
    setEditBoardTitle(board.title);
    setEditBoardCategory(board.category);
    setIsEditModalOpen(true);
  };

  const handleEditBoard = async () => {
    if (editBoardTitle.trim() === '') return;

    try {
      await apiRequest(`/boards/${editBoardId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          boardName: editBoardTitle.trim(),
          type: categoryToType(editBoardCategory),
        }),
      });

      setIsEditModalOpen(false);
      await fetchBoards();
    } catch (e: any) {
      Alert.alert('오류', '게시판 수정에 실패했습니다.');
    }
  };

  const getBadgeStyle = (category: CategoryType) => {
    switch (category) {
      case '공지':
        return { bg: '#F0F4FF', text: '#2140DC' };
      case '매뉴얼':
        return { bg: '#FFF4E5', text: '#FF8C00' };
      case '일반':
        return { bg: '#F5F5F5', text: '#333333' };
      default:
        return { bg: '#F5F5F5', text: '#333333' };
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.replace('/')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={26} color="#111" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>게시판</Text>

          <View style={{ width: 26 }} />
        </View>

        <Pressable style={{ flex: 1 }} onPress={() => setOpenMenuId(null)}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: insets.bottom + 120 },
            ]}
          >
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#BDBDBD" />

              <TextInput
                style={styles.searchInput}
                placeholder="검색"
                placeholderTextColor="#BDBDBD"
                value={searchText}
                onChangeText={setSearchText}
                autoCorrect={false}
              />
            </View>

            {loading ? (
              <ActivityIndicator
                size="large"
                color="#2140DC"
                style={{ marginTop: 40 }}
              />
            ) : (
              filteredBoards.map((board) => {
                const badgeColor = getBadgeStyle(board.category);

                return (
                  <View
                    key={board.id}
                    style={[
                      styles.boardCardWrapper,
                      openMenuId === board.id && { zIndex: 999 },
                    ]}
                  >
                    <TouchableOpacity
                      style={styles.boardCard}
                      activeOpacity={0.7}
                      onPress={() => {
                        setOpenMenuId(null);
                        router.push({
                          pathname: '/post-list',
                          params: {
                            boardId: board.id,
                            boardTitle: board.title,
                            category: board.category,
                          },
                        });
                      }}
                    >
                      <View style={styles.cardLeft}>
                        <View
                          style={[
                            styles.badge,
                            { backgroundColor: badgeColor.bg },
                          ]}
                        >
                          <Text
                            style={[
                              styles.badgeText,
                              { color: badgeColor.text },
                            ]}
                          >
                            {board.category}
                          </Text>
                        </View>

                        <Text style={styles.boardTitle}>{board.title}</Text>
                      </View>

                      <TouchableOpacity
                        style={styles.menuBtn}
                        onPress={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === board.id ? null : board.id);
                        }}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Ionicons name="ellipsis-vertical" size={18} color="#888" />
                      </TouchableOpacity>
                    </TouchableOpacity>

                    {openMenuId === board.id && (
                      <View style={styles.dropdownMenuCard}>
                        <TouchableOpacity
                          style={styles.dropdownMenuItem}
                          onPress={() => handleOpenEditModal(board)}
                        >
                          <Ionicons
                            name="pencil-outline"
                            size={15}
                            color="#2140DC"
                          />
                          <Text style={styles.dropdownMenuText}>수정</Text>
                        </TouchableOpacity>

                        <View style={styles.dropdownDivider} />

                        <TouchableOpacity
                          style={styles.dropdownMenuItem}
                          onPress={() => handleDeleteBoard(board.id, board.title)}
                        >
                          <Ionicons
                            name="trash-outline"
                            size={15}
                            color="#FF3B30"
                          />
                          <Text
                            style={[
                              styles.dropdownMenuText,
                              { color: '#FF3B30' },
                            ]}
                          >
                            삭제
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </ScrollView>
        </Pressable>
      </View>

      <TouchableOpacity
        style={[styles.fab, { bottom: Math.max(insets.bottom, ) }]}
        activeOpacity={0.8}
        onPress={() => setIsModalOpen(true)}
      >
        <Ionicons name="create-outline" size={24} color="#FFF" />
        <Text style={styles.fabText}>게시판 생성</Text>
      </TouchableOpacity>

      {/* 게시판 생성 모달 */}
      <Modal visible={isModalOpen} transparent={true} animationType="fade">
        <Pressable
          style={styles.modalOverlay}
          onPress={() => {
            Keyboard.dismiss();
            setIsDropdownOpen(false);
          }}
        >
          <Pressable
            style={styles.modalContainer}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <View style={{ width: 24 }} />

              <Text style={styles.modalTitle}>게시판 생성</Text>

              <TouchableOpacity
                onPress={() => {
                  setIsModalOpen(false);
                  setNewBoardTitle('');
                  setIsDropdownOpen(false);
                }}
              >
                <Ionicons name="close" size={24} color="#2140DC" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.inputBoxArea}>
                <TouchableOpacity
                  style={styles.categorySelectBtn}
                  activeOpacity={0.7}
                  onPress={() => {
                    Keyboard.dismiss();
                    setIsDropdownOpen(!isDropdownOpen);
                  }}
                >
                  <Text style={styles.categorySelectText}>{selectedCategory}</Text>
                  <Ionicons
                    name={isDropdownOpen ? 'chevron-up' : 'chevron-down'}
                    size={14}
                    color="#2140DC"
                  />
                </TouchableOpacity>

                {isDropdownOpen && (
                  <View style={styles.categoryDropdownMenu}>
                    {(['공지', '일반'] as CategoryType[]).map((item, index) => (
                      <TouchableOpacity
                        key={item}
                        style={[
                          styles.dropdownItem,
                          index === 1 && { borderBottomWidth: 0 },
                        ]}
                        onPress={() => {
                          setSelectedCategory(item);
                          setIsDropdownOpen(false);
                        }}
                      >
                        <Text style={styles.dropdownItemText}>{item}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <TextInput
                  style={styles.modalTextInput}
                  placeholder="제목을 입력하세요"
                  placeholderTextColor="#A9A9A9"
                  value={newBoardTitle}
                  onChangeText={setNewBoardTitle}
                  maxLength={30}
                />
              </View>

              <View style={styles.submitRow}>
                <TouchableOpacity
                  style={[
                    styles.submitBtn,
                    (newBoardTitle.trim() === '' || createLoading) && {
                      backgroundColor: '#BDBDBD',
                    },
                  ]}
                  activeOpacity={0.8}
                  onPress={handleCreateBoard}
                  disabled={newBoardTitle.trim() === '' || createLoading}
                >
                  {createLoading ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.submitBtnText}>등록하기</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* 게시판 수정 모달 */}
      <Modal visible={isEditModalOpen} transparent={true} animationType="fade">
        <Pressable
          style={styles.modalOverlay}
          onPress={() => {
            Keyboard.dismiss();
            setIsEditDropdownOpen(false);
          }}
        >
          <Pressable
            style={styles.modalContainer}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <View style={{ width: 24 }} />

              <Text style={styles.modalTitle}>게시판 수정</Text>

              <TouchableOpacity
                onPress={() => {
                  setIsEditModalOpen(false);
                  setIsEditDropdownOpen(false);
                }}
              >
                <Ionicons name="close" size={24} color="#2140DC" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.inputBoxArea}>
                <TouchableOpacity
                  style={styles.categorySelectBtn}
                  activeOpacity={0.7}
                  onPress={() => {
                    Keyboard.dismiss();
                    setIsEditDropdownOpen(!isEditDropdownOpen);
                  }}
                >
                  <Text style={styles.categorySelectText}>
                    {editBoardCategory}
                  </Text>
                  <Ionicons
                    name={isEditDropdownOpen ? 'chevron-up' : 'chevron-down'}
                    size={14}
                    color="#2140DC"
                  />
                </TouchableOpacity>

                {isEditDropdownOpen && (
                  <View style={styles.categoryDropdownMenu}>
                    {(['공지', '일반'] as CategoryType[]).map((item, index) => (
                      <TouchableOpacity
                        key={item}
                        style={[
                          styles.dropdownItem,
                          index === 1 && { borderBottomWidth: 0 },
                        ]}
                        onPress={() => {
                          setEditBoardCategory(item);
                          setIsEditDropdownOpen(false);
                        }}
                      >
                        <Text style={styles.dropdownItemText}>{item}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <TextInput
                  style={styles.modalTextInput}
                  placeholder="제목을 입력하세요"
                  placeholderTextColor="#A9A9A9"
                  value={editBoardTitle}
                  onChangeText={setEditBoardTitle}
                  maxLength={30}
                />
              </View>

              <View style={styles.submitRow}>
                <TouchableOpacity
                  style={[
                    styles.submitBtn,
                    editBoardTitle.trim() === '' && {
                      backgroundColor: '#BDBDBD',
                    },
                  ]}
                  activeOpacity={0.8}
                  onPress={handleEditBoard}
                  disabled={editBoardTitle.trim() === ''}
                >
                  <Text style={styles.submitBtnText}>수정하기</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
    color: '#111',
  },

  scrollContent: {
    paddingTop: 10,
  },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 24,
  },

  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    color: '#333',
  },

  boardCardWrapper: {
    marginBottom: 12,
    position: 'relative',
    zIndex: 1,
  },

  boardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: 16,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    borderRadius: 4,
  },

  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  menuBtn: {
    padding: 4,
  },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 12,
  },

  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },

  boardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111',
    flex: 1,
  },

  dropdownMenuCard: {
    position: 'absolute',
    right: 16,
    top: 50,
    backgroundColor: '#FFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    zIndex: 999,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    minWidth: 100,
  },

  dropdownMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },

  dropdownMenuText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },

  dropdownDivider: {
    height: 1,
    backgroundColor: '#F5F5F5',
  },

  fab: {
    position: 'absolute',
    right: 20,
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#2140DC',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },

  fabText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },

  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#E8EAFF',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },

  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111',
  },

  modalBody: {
    padding: 20,
  },

  inputBoxArea: {
    borderWidth: 1,
    borderColor: '#EFEFEF',
    borderRadius: 8,
    padding: 16,
    minHeight: 160,
    position: 'relative',
  },

  categorySelectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F4FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },

  categorySelectText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginRight: 4,
  },

  categoryDropdownMenu: {
    position: 'absolute',
    top: 48,
    left: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    width: 80,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    zIndex: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },

  dropdownItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
    alignItems: 'center',
  },

  dropdownItemText: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
  },

  modalTextInput: {
    fontSize: 15,
    color: '#111',
    paddingTop: 10,
  },

  submitRow: {
    alignItems: 'flex-end',
    marginTop: 16,
  },

  submitBtn: {
    backgroundColor: '#2140DC',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },

  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
});