import React, { useState, useMemo, useCallback } from 'react';
import {
  SafeAreaView, View, Text, StyleSheet, TouchableOpacity,
  ScrollView, TextInput, Alert, Modal, Pressable,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { apiRequest } from '../../utils/api';

type ManualItem = {
  id: number;
  content: string;
  createdAt: string;
};

type ManualCategory = {
  manualId: number;
  title: string;
  role: string;
  manuals: ManualItem[];
  isExpanded: boolean;
};

const MAIN_COLOR = '#2140DC';

export default function ManualScreen() {
  const [categories, setCategories] = useState<ManualCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [myRole, setMyRole] = useState<string>('WORKER');

  // 검색
  const [searchText, setSearchText] = useState('');
  const [isSearchVisible, setIsSearchVisible] = useState(false);

  // 점 세개 메뉴
  const [openCategoryMenuId, setOpenCategoryMenuId] = useState<number | null>(null);
  const [openItemMenuId, setOpenItemMenuId] = useState<number | null>(null);

  // 대분류 추가 모달
  const [isAddCategoryVisible, setIsAddCategoryVisible] = useState(false);
  const [newCategoryTitle, setNewCategoryTitle] = useState('');
  const [addCategoryLoading, setAddCategoryLoading] = useState(false);

  // 소분류 추가 모달
  const [isAddItemVisible, setIsAddItemVisible] = useState(false);
  const [addItemCategoryId, setAddItemCategoryId] = useState<number | null>(null);
  const [addItemCategoryName, setAddItemCategoryName] = useState('');
  const [newItemContent, setNewItemContent] = useState('');
  const [addItemLoading, setAddItemLoading] = useState(false);

  // 대분류 수정 모달
  const [isEditCategoryVisible, setIsEditCategoryVisible] = useState(false);
  const [editCategoryId, setEditCategoryId] = useState<number | null>(null);
  const [editCategoryTitle, setEditCategoryTitle] = useState('');
  const [editCategoryLoading, setEditCategoryLoading] = useState(false);

  // 소분류 수정 모달
  const [isEditItemVisible, setIsEditItemVisible] = useState(false);
  const [editItemId, setEditItemId] = useState<number | null>(null);
  const [editItemCategoryId, setEditItemCategoryId] = useState<number | null>(null);
  const [editItemContent, setEditItemContent] = useState('');
  const [editItemLoading, setEditItemLoading] = useState(false);

  const fetchManuals = async () => {
    setLoading(true);
    try {
      const result = await apiRequest('/manuals/categoriesAndManuals');
      const mapped: ManualCategory[] = (Array.isArray(result) ? result : []).map((item: any) => ({
        manualId: item.manualId,
        title: item.title,
        role: item.role,
        manuals: item.manuals ?? [],
        isExpanded: false,
      }));
      setCategories(mapped);
      if (mapped.length > 0) setMyRole(mapped[0].role);
    } catch (e: any) {
      Alert.alert('오류', '매뉴얼을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchManuals();
    }, [])
  );

  const toggleCategory = (id: number) => {
    setCategories(prev =>
      prev.map(cat => cat.manualId === id ? { ...cat, isExpanded: !cat.isExpanded } : cat)
    );
  };

  const filteredCategories = useMemo(() => {
    if (!searchText.trim()) return categories;
    const keyword = searchText.toLowerCase();
    return categories
      .map(cat => ({
        ...cat,
        isExpanded: true,
        manuals: cat.manuals.filter(item =>
          item.content.toLowerCase().includes(keyword)
        ),
      }))
      .filter(cat =>
        cat.title.toLowerCase().includes(keyword) || cat.manuals.length > 0
      );
  }, [categories, searchText]);

  // 대분류 추가
  const handleAddCategory = async () => {
    if (!newCategoryTitle.trim()) return;
    setAddCategoryLoading(true);
    try {
      await apiRequest('/manuals/categories', {
        method: 'POST',
        body: JSON.stringify({ name: newCategoryTitle.trim() }),
      });
      setNewCategoryTitle('');
      setIsAddCategoryVisible(false);
      await fetchManuals();
    } catch (e: any) {
      Alert.alert('오류', '카테고리 생성에 실패했습니다.');
    } finally {
      setAddCategoryLoading(false);
    }
  };

  // 대분류 수정
  const handleEditCategory = async () => {
    if (!editCategoryTitle.trim() || !editCategoryId) return;
    setEditCategoryLoading(true);
    try {
      await apiRequest(`/manuals/categories/${editCategoryId}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: editCategoryTitle.trim() }),
      });
      setIsEditCategoryVisible(false);
      await fetchManuals();
    } catch (e: any) {
      Alert.alert('오류', '카테고리 수정에 실패했습니다.');
    } finally {
      setEditCategoryLoading(false);
    }
  };

  // 대분류 삭제
  const handleDeleteCategory = (id: number) => {
    setOpenCategoryMenuId(null);
    Alert.alert('카테고리 삭제', '이 카테고리와 모든 항목을 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제', style: 'destructive',
        onPress: async () => {
          try {
            await apiRequest(`/manuals/categories/${id}`, { method: 'DELETE' });
            await fetchManuals();
          } catch (e: any) {
            Alert.alert('오류', '카테고리 삭제에 실패했습니다.');
          }
        },
      },
    ]);
  };

  // 소분류 추가
  const handleAddItem = async () => {
    if (!newItemContent.trim() || !addItemCategoryId) return;
    setAddItemLoading(true);
    try {
      await apiRequest('/manuals/manuals', {
        method: 'POST',
        body: JSON.stringify({
          content: newItemContent.trim(),
          categoryId: addItemCategoryId,
        }),
      });
      setNewItemContent('');
      setIsAddItemVisible(false);
      await fetchManuals();
    } catch (e: any) {
      Alert.alert('오류', '매뉴얼 추가에 실패했습니다.');
    } finally {
      setAddItemLoading(false);
    }
  };

  // 소분류 수정
  const handleEditItem = async () => {
    if (!editItemContent.trim() || !editItemId || !editItemCategoryId) return;
    setEditItemLoading(true);
    try {
      await apiRequest(`/manuals/manuals/${editItemId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          content: editItemContent.trim(),
          categoryId: editItemCategoryId,
        }),
      });
      setIsEditItemVisible(false);
      await fetchManuals();
    } catch (e: any) {
      Alert.alert('오류', '매뉴얼 수정에 실패했습니다.');
    } finally {
      setEditItemLoading(false);
    }
  };

  // 소분류 삭제
  const handleDeleteItem = (itemId: number) => {
    setOpenItemMenuId(null);
    Alert.alert('매뉴얼 삭제', '이 항목을 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제', style: 'destructive',
        onPress: async () => {
          try {
            await apiRequest(`/manuals/manuals/${itemId}`, { method: 'DELETE' });
            await fetchManuals();
          } catch (e: any) {
            Alert.alert('오류', '매뉴얼 삭제에 실패했습니다.');
          }
        },
      },
    ]);
  };

  const isAdmin = myRole === 'ADMIN';

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={MAIN_COLOR} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {(openCategoryMenuId !== null || openItemMenuId !== null) && (
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => {
            setOpenCategoryMenuId(null);
            setOpenItemMenuId(null);
          }}
        />
      )}

      {/* 헤더 */}
      <View style={styles.header}>
        <View style={{ width: 36 }} />
        <Text style={styles.headerTitle}>매뉴얼</Text>
        <TouchableOpacity
          style={styles.searchIconBtn}
          onPress={() => {
            setIsSearchVisible(!isSearchVisible);
            if (isSearchVisible) setSearchText('');
          }}
        >
          <Ionicons
            name={isSearchVisible ? 'close-outline' : 'search-outline'}
            size={22}
            color="#333"
          />
        </TouchableOpacity>
      </View>

      {/* 검색창 */}
      {isSearchVisible && (
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={18} color="#BDBDBD" />
          <TextInput
            style={styles.searchInput}
            placeholder="검색"
            placeholderTextColor="#BDBDBD"
            value={searchText}
            onChangeText={setSearchText}
            autoFocus
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Ionicons name="close-circle" size={18} color="#BDBDBD" />
            </TouchableOpacity>
          )}
        </View>
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ADMIN만 대분류 추가 버튼 - 상단 */}
        {isAdmin && !searchText.trim() && (
          <>
            <TouchableOpacity
              style={styles.addCategoryBtn}
              onPress={() => {
                setNewCategoryTitle('');
                setIsAddCategoryVisible(true);
              }}
            >
              <Ionicons name="add" size={20} color="#AAAAAA" />
            </TouchableOpacity>
            <View style={styles.divider} />
          </>
        )}

        {/* 카테고리 목록 */}
        {filteredCategories.length === 0 ? (
          // 빈 상태 화면
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={52} color="#CCCCCC" />
            <Text style={styles.emptyText}>
              {searchText ? '검색 결과가 없습니다.' : '등록된 매뉴얼이 없습니다.'}
            </Text>
          </View>
        ) : (
          filteredCategories.map((category) => (
            <View
              key={category.manualId}
              style={[styles.categoryBlock, { zIndex: openCategoryMenuId === category.manualId ? 999 : 1 }]}
            >
              {/* 대분류 행 */}
              <TouchableOpacity
                style={styles.categoryRow}
                onPress={() => toggleCategory(category.manualId)}
                activeOpacity={0.7}
              >
                <View style={styles.categoryLeft}>
                  <Text style={styles.categoryTitle}>{category.title}</Text>
                  <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>{category.manuals.length}</Text>
                  </View>
                </View>

                <View style={styles.categoryRight}>
                  <Ionicons
                    name={category.isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color="#888"
                  />
                  {isAdmin && (
                    <TouchableOpacity
                      style={styles.menuDotBtn}
                      onPress={(e) => {
                        e.stopPropagation();
                        setOpenCategoryMenuId(openCategoryMenuId === category.manualId ? null : category.manualId);
                        setOpenItemMenuId(null);
                      }}
                    >
                      <Ionicons name="ellipsis-vertical" size={16} color="#888" />
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>

              {/* 대분류 드롭다운 메뉴 */}
              {openCategoryMenuId === category.manualId && (
                <View style={styles.categoryDropdown}>
                  <TouchableOpacity
                    style={styles.dropdownItem}
                    onPress={() => {
                      setOpenCategoryMenuId(null);
                      setEditCategoryId(category.manualId);
                      setEditCategoryTitle(category.title);
                      setIsEditCategoryVisible(true);
                    }}
                  >
                    <Ionicons name="pencil-outline" size={15} color={MAIN_COLOR} />
                    <Text style={styles.dropdownItemText}>수정</Text>
                  </TouchableOpacity>
                  <View style={styles.dropdownDivider} />
                  <TouchableOpacity
                    style={styles.dropdownItem}
                    onPress={() => handleDeleteCategory(category.manualId)}
                  >
                    <Ionicons name="trash-outline" size={15} color="#FF3B30" />
                    <Text style={[styles.dropdownItemText, { color: '#FF3B30' }]}>삭제</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* 소분류 목록 */}
              {category.isExpanded && (
                <View style={styles.itemList}>
                  {category.manuals.map((item) => (
                    <View
                      key={item.id}
                      style={[styles.itemRow, { zIndex: openItemMenuId === item.id ? 999 : 1 }]}
                    >
                      <Text style={styles.itemContent}>{item.content}</Text>
                      {isAdmin && (
                        <View style={{ position: 'relative' }}>
                          <TouchableOpacity
                            style={styles.menuDotBtn}
                            onPress={(e) => {
                              e.stopPropagation();
                              setOpenItemMenuId(openItemMenuId === item.id ? null : item.id);
                              setOpenCategoryMenuId(null);
                            }}
                          >
                            <Ionicons name="ellipsis-vertical" size={16} color="#888" />
                          </TouchableOpacity>
                          {openItemMenuId === item.id && (
                            <View style={styles.itemDropdown}>
                              <TouchableOpacity
                                style={styles.dropdownItem}
                                onPress={() => {
                                  setOpenItemMenuId(null);
                                  setEditItemId(item.id);
                                  setEditItemCategoryId(category.manualId);
                                  setEditItemContent(item.content);
                                  setIsEditItemVisible(true);
                                }}
                              >
                                <Ionicons name="pencil-outline" size={15} color={MAIN_COLOR} />
                                <Text style={styles.dropdownItemText}>수정</Text>
                              </TouchableOpacity>
                              <View style={styles.dropdownDivider} />
                              <TouchableOpacity
                                style={styles.dropdownItem}
                                onPress={() => handleDeleteItem(item.id)}
                              >
                                <Ionicons name="trash-outline" size={15} color="#FF3B30" />
                                <Text style={[styles.dropdownItemText, { color: '#FF3B30' }]}>삭제</Text>
                              </TouchableOpacity>
                            </View>
                          )}
                        </View>
                      )}
                    </View>
                  ))}

                  {/* ADMIN만 소분류 추가 버튼 */}
                  {isAdmin && (
                    <TouchableOpacity
                      style={styles.addItemBtn}
                      onPress={() => {
                        setAddItemCategoryId(category.manualId);
                        setAddItemCategoryName(category.title);
                        setNewItemContent('');
                        setIsAddItemVisible(true);
                      }}
                    >
                      <Ionicons name="add" size={18} color="#AAAAAA" />
                    </TouchableOpacity>
                  )}
                </View>
              )}

              <View style={styles.divider} />
            </View>
          ))
        )}
      </ScrollView>

      {/* ===== 대분류 추가 모달 ===== */}
      <Modal visible={isAddCategoryVisible} transparent animationType="slide">
        <Pressable style={styles.modalBackdrop} onPress={() => setIsAddCategoryVisible(false)} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalSlide}>
          <View style={styles.modalSlideContent}>
            <View style={styles.modalSlideHeader}>
              <TouchableOpacity onPress={() => setIsAddCategoryVisible(false)}>
                <Ionicons name="chevron-back" size={24} color="#333" />
              </TouchableOpacity>
              <Text style={styles.modalSlideTitle}>카테고리 추가</Text>
              <View style={{ width: 24 }} />
            </View>
            <Text style={styles.sectionBigTitle}>카테고리 추가</Text>
            <Text style={styles.inputLabel}>*카테고리 이름</Text>
            <TextInput
              style={[styles.textInput, styles.textInputActive]}
              placeholder="예) 매장운영, 고객응대"
              placeholderTextColor="#BDBDBD"
              value={newCategoryTitle}
              onChangeText={setNewCategoryTitle}
              autoFocus
            />
            <TouchableOpacity
              style={[styles.confirmBtn, (!newCategoryTitle.trim() || addCategoryLoading) && { backgroundColor: '#BDBDBD' }]}
              onPress={handleAddCategory}
              disabled={!newCategoryTitle.trim() || addCategoryLoading}
            >
              {addCategoryLoading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.confirmBtnText}>확인</Text>
              }
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ===== 대분류 수정 모달 ===== */}
      <Modal visible={isEditCategoryVisible} transparent animationType="slide">
        <Pressable style={styles.modalBackdrop} onPress={() => setIsEditCategoryVisible(false)} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalSlide}>
          <View style={styles.modalSlideContent}>
            <View style={styles.modalSlideHeader}>
              <TouchableOpacity onPress={() => setIsEditCategoryVisible(false)}>
                <Ionicons name="chevron-back" size={24} color="#333" />
              </TouchableOpacity>
              <Text style={styles.modalSlideTitle}>카테고리 수정</Text>
              <View style={{ width: 24 }} />
            </View>
            <Text style={styles.sectionBigTitle}>카테고리 수정</Text>
            <Text style={styles.inputLabel}>*카테고리 이름</Text>
            <TextInput
              style={[styles.textInput, styles.textInputActive]}
              placeholder="카테고리 이름"
              placeholderTextColor="#BDBDBD"
              value={editCategoryTitle}
              onChangeText={setEditCategoryTitle}
              autoFocus
            />
            <TouchableOpacity
              style={[styles.confirmBtn, (!editCategoryTitle.trim() || editCategoryLoading) && { backgroundColor: '#BDBDBD' }]}
              onPress={handleEditCategory}
              disabled={!editCategoryTitle.trim() || editCategoryLoading}
            >
              {editCategoryLoading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.confirmBtnText}>확인</Text>
              }
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ===== 소분류 추가 모달 ===== */}
      <Modal visible={isAddItemVisible} transparent animationType="slide">
        <Pressable style={styles.modalBackdrop} onPress={() => setIsAddItemVisible(false)} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalSlide}>
          <View style={styles.modalSlideContent}>
            <View style={styles.modalSlideHeader}>
              <TouchableOpacity onPress={() => setIsAddItemVisible(false)}>
                <Ionicons name="chevron-back" size={24} color="#333" />
              </TouchableOpacity>
              <Text style={styles.modalSlideTitle}>매뉴얼 추가</Text>
              <View style={{ width: 24 }} />
            </View>
            <Text style={styles.sectionBigTitle}>매뉴얼 추가</Text>
            <Text style={styles.inputLabel}>*카테고리</Text>
            <View style={styles.categorySelectDisplay}>
              <Text style={styles.categorySelectText}>{addItemCategoryName}</Text>
            </View>
            <Text style={styles.inputLabel}>*설명</Text>
            <TextInput
              style={[styles.textInput, { minHeight: 100, textAlignVertical: 'top' }]}
              placeholder="매뉴얼 내용을 입력하세요"
              placeholderTextColor="#BDBDBD"
              value={newItemContent}
              onChangeText={setNewItemContent}
              multiline
              autoFocus
            />
            <TouchableOpacity
              style={[styles.confirmBtn, (!newItemContent.trim() || addItemLoading) && { backgroundColor: '#BDBDBD' }]}
              onPress={handleAddItem}
              disabled={!newItemContent.trim() || addItemLoading}
            >
              {addItemLoading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.confirmBtnText}>확인</Text>
              }
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ===== 소분류 수정 모달 ===== */}
      <Modal visible={isEditItemVisible} transparent animationType="slide">
        <Pressable style={styles.modalBackdrop} onPress={() => setIsEditItemVisible(false)} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalSlide}>
          <View style={styles.modalSlideContent}>
            <View style={styles.modalSlideHeader}>
              <TouchableOpacity onPress={() => setIsEditItemVisible(false)}>
                <Ionicons name="chevron-back" size={24} color="#333" />
              </TouchableOpacity>
              <Text style={styles.modalSlideTitle}>매뉴얼 수정</Text>
              <View style={{ width: 24 }} />
            </View>
            <Text style={styles.sectionBigTitle}>매뉴얼 수정</Text>
            <Text style={styles.inputLabel}>*설명</Text>
            <TextInput
              style={[styles.textInput, { minHeight: 100, textAlignVertical: 'top' }]}
              placeholder="매뉴얼 내용"
              placeholderTextColor="#BDBDBD"
              value={editItemContent}
              onChangeText={setEditItemContent}
              multiline
              autoFocus
            />
            <TouchableOpacity
              style={[styles.confirmBtn, (!editItemContent.trim() || editItemLoading) && { backgroundColor: '#BDBDBD' }]}
              onPress={handleEditItem}
              disabled={!editItemContent.trim() || editItemLoading}
            >
              {editItemLoading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.confirmBtnText}>확인</Text>
              }
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#111' },
  searchIconBtn: { width: 36, alignItems: 'flex-end' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', borderRadius: 10, marginHorizontal: 20, marginTop: 10, marginBottom: 4, paddingHorizontal: 12, height: 42, gap: 8 },
  searchInput: { flex: 1, fontSize: 15, color: '#333' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 100 },

  // 빈 상태
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 80, gap: 12 },
  emptyText: { fontSize: 14, color: '#AAAAAA' },

  // 대분류 추가 버튼
  addCategoryBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: 14 },
  divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 4 },

  // 카테고리
  categoryBlock: { marginBottom: 0, position: 'relative' },
  categoryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  categoryLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 },
  categoryTitle: { fontSize: 15, fontWeight: '600', color: '#222' },
  countBadge: { backgroundColor: MAIN_COLOR, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2, minWidth: 22, alignItems: 'center' },
  countBadgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  categoryRight: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  menuDotBtn: { padding: 6 },
  categoryDropdown: { position: 'absolute', right: 0, top: 50, backgroundColor: '#FFF', borderRadius: 10, borderWidth: 1, borderColor: '#EFEFEF', zIndex: 100, elevation: 10, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, minWidth: 100 },

  // 소분류
  itemList: { paddingLeft: 4, paddingBottom: 4 },
  itemRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 14, marginBottom: 8, position: 'relative' },
  itemContent: { fontSize: 14, color: '#333', flex: 1, lineHeight: 20 },
  itemDropdown: { position: 'absolute', right: 0, top: 28, backgroundColor: '#FFF', borderRadius: 10, borderWidth: 1, borderColor: '#EFEFEF', zIndex: 100, elevation: 10, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, minWidth: 100 },
  addItemBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: 10, backgroundColor: '#F7F8FF', borderRadius: 10, marginBottom: 8 },

  // 드롭다운 공통
  dropdownItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, paddingHorizontal: 14, gap: 8 },
  dropdownItemText: { fontSize: 14, color: '#333', fontWeight: '500' },
  dropdownDivider: { height: 1, backgroundColor: '#F5F5F5' },

  // 모달
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)' },
  modalSlide: { flex: 1, justifyContent: 'flex-end' },
  modalSlideContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40 },
  modalSlideHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  modalSlideTitle: { fontSize: 16, fontWeight: 'bold', color: '#111' },
  sectionBigTitle: { fontSize: 22, fontWeight: 'bold', color: '#111', marginBottom: 24 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 8 },
  textInput: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10, padding: 14, fontSize: 15, color: '#111', marginBottom: 16, backgroundColor: '#FAFAFA' },
  textInputActive: { borderColor: MAIN_COLOR, backgroundColor: '#FFF' },
  categorySelectDisplay: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10, padding: 14, marginBottom: 16, backgroundColor: '#F5F5F5' },
  categorySelectText: { fontSize: 15, color: '#666' },
  confirmBtn: { backgroundColor: MAIN_COLOR, paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 8 },
  confirmBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});