import React, { useState, useMemo } from 'react';
import {
  SafeAreaView, View, Text, StyleSheet, TouchableOpacity,
  ScrollView, TextInput, Alert, Modal, Pressable,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

type ManualItem = {
  id: string;
  description: string;
};

type ManualCategory = {
  id: string;
  title: string;
  isExpanded: boolean;
  items: ManualItem[];
};

const MAIN_COLOR = '#2140DC';
const LIGHT_COLOR = '#EEF1FF';

export default function ManualScreen() {
  const router = useRouter();

  const [categories, setCategories] = useState<ManualCategory[]>([
    {
      id: '1',
      title: '고객 응대',
      isExpanded: false,
      items: [
        { id: '1-1', description: '고객 입장 시 밝게 인사하기' },
        { id: '1-2', description: '고객 불만은 즉시 매니저에게 보고' },
        { id: '1-3', description: '주문 후 반드시 복창 확인' },
        { id: '1-4', description: '영수증은 고객에게 먼저 제공' },
      ],
    },
    {
      id: '2',
      title: '포스기 사용법',
      isExpanded: false,
      items: [
        { id: '2-1', description: '카드/현금 결제 방법' },
        { id: '2-2', description: '주문 취소 시 관리자 승인 필요' },
        { id: '2-3', description: '영업 종료 후 일일 마감 필수' },
      ],
    },
    {
      id: '3',
      title: '메뉴 안내',
      isExpanded: true,
      items: [
        { id: '3-1', description: '라떼에 우유는 오트, 아몬드로 무료 변경 가능' },
        { id: '3-2', description: '메뉴 간 샷 이동은 불가. 샷추가 해야함.' },
      ],
    },
  ]);

  // 검색
  const [searchText, setSearchText] = useState('');
  const [isSearchVisible, setIsSearchVisible] = useState(false);

  // 점 세개 메뉴
  const [openCategoryMenuId, setOpenCategoryMenuId] = useState<string | null>(null);
  const [openItemMenuId, setOpenItemMenuId] = useState<string | null>(null);

  // 대분류 추가 모달
  const [isAddCategoryVisible, setIsAddCategoryVisible] = useState(false);
  const [newCategoryTitle, setNewCategoryTitle] = useState('');

  // 소분류 추가 모달
  const [isAddItemVisible, setIsAddItemVisible] = useState(false);
  const [addItemCategoryId, setAddItemCategoryId] = useState('');
  const [newItemDescription, setNewItemDescription] = useState('');

  // 대분류 수정 모달
  const [isEditCategoryVisible, setIsEditCategoryVisible] = useState(false);
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editCategoryTitle, setEditCategoryTitle] = useState('');

  // 소분류 수정 모달
  const [isEditItemVisible, setIsEditItemVisible] = useState(false);
  const [editItemCategoryId, setEditItemCategoryId] = useState('');
  const [editItemId, setEditItemId] = useState('');
  const [editItemDescription, setEditItemDescription] = useState('');

  // 검색 필터링
  const filteredCategories = useMemo(() => {
    if (!searchText.trim()) return categories;
    const keyword = searchText.toLowerCase();
    return categories
      .map(cat => ({
        ...cat,
        isExpanded: true,
        items: cat.items.filter(item =>
          item.description.toLowerCase().includes(keyword)
        ),
      }))
      .filter(cat =>
        cat.title.toLowerCase().includes(keyword) || cat.items.length > 0
      );
  }, [categories, searchText]);

  const toggleCategory = (id: string) => {
    setCategories(prev =>
      prev.map(cat => cat.id === id ? { ...cat, isExpanded: !cat.isExpanded } : cat)
    );
  };

  // 대분류 추가
  const handleAddCategory = () => {
    if (!newCategoryTitle.trim()) return;
    setCategories(prev => [...prev, {
      id: Date.now().toString(),
      title: newCategoryTitle.trim(),
      isExpanded: true,
      items: [],
    }]);
    setNewCategoryTitle('');
    setIsAddCategoryVisible(false);
  };

  // 대분류 수정
  const handleEditCategory = () => {
    if (!editCategoryTitle.trim()) return;
    setCategories(prev =>
      prev.map(cat =>
        cat.id === editCategoryId
          ? { ...cat, title: editCategoryTitle.trim() }
          : cat
      )
    );
    setIsEditCategoryVisible(false);
  };

  // 대분류 삭제
  const handleDeleteCategory = (id: string) => {
    setOpenCategoryMenuId(null);
    Alert.alert('대분류 삭제', '이 카테고리와 모든 항목을 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제', style: 'destructive',
        onPress: () => setCategories(prev => prev.filter(cat => cat.id !== id)),
      },
    ]);
  };

  // 소분류 추가
  const handleAddItem = () => {
    if (!newItemDescription.trim()) return;
    setCategories(prev =>
      prev.map(cat =>
        cat.id === addItemCategoryId
          ? { ...cat, items: [...cat.items, { id: Date.now().toString(), description: newItemDescription.trim() }] }
          : cat
      )
    );
    setNewItemDescription('');
    setIsAddItemVisible(false);
  };

  // 소분류 수정
  const handleEditItem = () => {
    if (!editItemDescription.trim()) return;
    setCategories(prev =>
      prev.map(cat =>
        cat.id === editItemCategoryId
          ? {
              ...cat,
              items: cat.items.map(item =>
                item.id === editItemId
                  ? { ...item, description: editItemDescription.trim() }
                  : item
              ),
            }
          : cat
      )
    );
    setIsEditItemVisible(false);
  };

  // 소분류 삭제
  const handleDeleteItem = (categoryId: string, itemId: string) => {
    setOpenItemMenuId(null);
    Alert.alert('항목 삭제', '이 항목을 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제', style: 'destructive',
        onPress: () =>
          setCategories(prev =>
            prev.map(cat =>
              cat.id === categoryId
                ? { ...cat, items: cat.items.filter(item => item.id !== itemId) }
                : cat
            )
          ),
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* 바깥 클릭 시 메뉴 닫기 */}
      {(openCategoryMenuId || openItemMenuId) && (
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
        {filteredCategories.map((category) => (
          <View
            key={category.id}
            style={[styles.categoryBlock, { zIndex: openCategoryMenuId === category.id ? 999 : 1 }]}
          >
            {/* 대분류 행 */}
            <TouchableOpacity
              style={styles.categoryRow}
              onPress={() => toggleCategory(category.id)}
              activeOpacity={0.7}
            >
              <View style={styles.categoryLeft}>
                <View style={styles.categoryIconCircle}>
                  <Ionicons name="document-text-outline" size={15} color={MAIN_COLOR} />
                </View>
                <Text style={styles.categoryTitle}>{category.title}</Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{category.items.length}</Text>
                </View>
              </View>

              <View style={styles.categoryRight}>
                <Ionicons
                  name={category.isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color="#888"
                />
                {/* 대분류 점 세개 */}
                <TouchableOpacity
                  style={styles.menuDotBtn}
                  onPress={(e) => {
                    e.stopPropagation();
                    setOpenCategoryMenuId(openCategoryMenuId === category.id ? null : category.id);
                    setOpenItemMenuId(null);
                  }}
                >
                  <Ionicons name="ellipsis-vertical" size={16} color="#888" />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>

            {/* 대분류 드롭다운 메뉴 */}
            {openCategoryMenuId === category.id && (
              <View style={styles.categoryDropdown}>
                <TouchableOpacity
                  style={styles.dropdownItem}
                  onPress={() => {
                    setOpenCategoryMenuId(null);
                    setEditCategoryId(category.id);
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
                  onPress={() => handleDeleteCategory(category.id)}
                >
                  <Ionicons name="trash-outline" size={15} color="#FF3B30" />
                  <Text style={[styles.dropdownItemText, { color: '#FF3B30' }]}>삭제</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* 소분류 목록 */}
            {category.isExpanded && (
              <View style={styles.itemList}>
                {category.items.map((item) => (
                  <View
                    key={item.id}
                    style={[styles.itemRow, { zIndex: openItemMenuId === item.id ? 999 : 1 }]}
                  >
                    <Text style={styles.itemDescription}>{item.description}</Text>

                    {/* 소분류 점 세개 */}
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

                      {/* 소분류 드롭다운 */}
                      {openItemMenuId === item.id && (
                        <View style={styles.itemDropdown}>
                          <TouchableOpacity
                            style={styles.dropdownItem}
                            onPress={() => {
                              setOpenItemMenuId(null);
                              setEditItemCategoryId(category.id);
                              setEditItemId(item.id);
                              setEditItemDescription(item.description);
                              setIsEditItemVisible(true);
                            }}
                          >
                            <Ionicons name="pencil-outline" size={15} color={MAIN_COLOR} />
                            <Text style={styles.dropdownItemText}>수정</Text>
                          </TouchableOpacity>
                          <View style={styles.dropdownDivider} />
                          <TouchableOpacity
                            style={styles.dropdownItem}
                            onPress={() => handleDeleteItem(category.id, item.id)}
                          >
                            <Ionicons name="trash-outline" size={15} color="#FF3B30" />
                            <Text style={[styles.dropdownItemText, { color: '#FF3B30' }]}>삭제</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </View>
                ))}

                {/* 소분류 추가 버튼 */}
                <TouchableOpacity
                  style={styles.addItemBtn}
                  onPress={() => {
                    setAddItemCategoryId(category.id);
                    setNewItemDescription('');
                    setIsAddItemVisible(true);
                  }}
                >
                  <Ionicons name="add" size={18} color="#AAAAAA" />
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.divider} />
          </View>
        ))}

        {/* 검색 중일 때는 대분류 추가 버튼 숨김 */}
        {!searchText.trim() && (
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
      </ScrollView>

      {/* ===== 대분류 추가 모달 ===== */}
      <Modal visible={isAddCategoryVisible} transparent animationType="slide">
        <Pressable style={styles.modalBackdrop} onPress={() => setIsAddCategoryVisible(false)} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalSlide}
        >
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
              style={[styles.confirmBtn, !newCategoryTitle.trim() && { backgroundColor: '#BDBDBD' }]}
              onPress={handleAddCategory}
              disabled={!newCategoryTitle.trim()}
            >
              <Text style={styles.confirmBtnText}>확인</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ===== 대분류 수정 모달 ===== */}
      <Modal visible={isEditCategoryVisible} transparent animationType="slide">
        <Pressable style={styles.modalBackdrop} onPress={() => setIsEditCategoryVisible(false)} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalSlide}
        >
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
              style={[styles.confirmBtn, !editCategoryTitle.trim() && { backgroundColor: '#BDBDBD' }]}
              onPress={handleEditCategory}
              disabled={!editCategoryTitle.trim()}
            >
              <Text style={styles.confirmBtnText}>확인</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ===== 소분류 추가 모달 ===== */}
      <Modal visible={isAddItemVisible} transparent animationType="slide">
        <Pressable style={styles.modalBackdrop} onPress={() => setIsAddItemVisible(false)} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalSlide}
        >
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
              <Text style={styles.categorySelectText}>
                {categories.find(c => c.id === addItemCategoryId)?.title ?? ''}
              </Text>
            </View>

            <Text style={styles.inputLabel}>*설명</Text>
            <TextInput
              style={[styles.textInput, { minHeight: 100, textAlignVertical: 'top' }]}
              placeholder="매뉴얼 내용을 입력하세요"
              placeholderTextColor="#BDBDBD"
              value={newItemDescription}
              onChangeText={setNewItemDescription}
              multiline
              autoFocus
            />

            <TouchableOpacity
              style={[styles.confirmBtn, !newItemDescription.trim() && { backgroundColor: '#BDBDBD' }]}
              onPress={handleAddItem}
              disabled={!newItemDescription.trim()}
            >
              <Text style={styles.confirmBtnText}>확인</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ===== 소분류 수정 모달 ===== */}
      <Modal visible={isEditItemVisible} transparent animationType="slide">
        <Pressable style={styles.modalBackdrop} onPress={() => setIsEditItemVisible(false)} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalSlide}
        >
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
              value={editItemDescription}
              onChangeText={setEditItemDescription}
              multiline
              autoFocus
            />

            <TouchableOpacity
              style={[styles.confirmBtn, !editItemDescription.trim() && { backgroundColor: '#BDBDBD' }]}
              onPress={handleEditItem}
              disabled={!editItemDescription.trim()}
            >
              <Text style={styles.confirmBtnText}>확인</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#111' },
  searchIconBtn: { width: 36, alignItems: 'flex-end' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', borderRadius: 10, marginHorizontal: 20, marginTop: 10, marginBottom: 4, paddingHorizontal: 12, height: 42, gap: 8 },
  searchInput: { flex: 1, fontSize: 15, color: '#333' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 100 },
  categoryBlock: { marginBottom: 0, position: 'relative' },
  categoryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  categoryLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 },
  categoryIconCircle: { width: 30, height: 30, borderRadius: 15, backgroundColor: LIGHT_COLOR, justifyContent: 'center', alignItems: 'center' },
  categoryTitle: { fontSize: 15, fontWeight: '600', color: '#222' },
  countBadge: { backgroundColor: MAIN_COLOR, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2, minWidth: 22, alignItems: 'center' },
  countBadgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  categoryRight: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  menuDotBtn: { padding: 6 },
  categoryDropdown: { position: 'absolute', right: 0, top: 50, backgroundColor: '#FFF', borderRadius: 10, borderWidth: 1, borderColor: '#EFEFEF', zIndex: 100, elevation: 10, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, minWidth: 100 },
  itemList: { paddingLeft: 4, paddingBottom: 4 },
  itemRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 14, marginBottom: 8, position: 'relative' },
  itemDescription: { fontSize: 14, color: '#333', flex: 1, lineHeight: 20 },
  itemDropdown: { position: 'absolute', right: 0, top: 28, backgroundColor: '#FFF', borderRadius: 10, borderWidth: 1, borderColor: '#EFEFEF', zIndex: 100, elevation: 10, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, minWidth: 100 },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, paddingHorizontal: 14, gap: 8 },
  dropdownItemText: { fontSize: 14, color: '#333', fontWeight: '500' },
  dropdownDivider: { height: 1, backgroundColor: '#F5F5F5' },
  addItemBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: 10, backgroundColor: '#F7F8FF', borderRadius: 10, marginBottom: 8 },
  addCategoryBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: 14 },
  divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 4 },
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