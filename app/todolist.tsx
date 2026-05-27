import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function TodoListScreen() {
  const router = useRouter();

  // ==========================================
  // 1. 상태 관리 (State)
  // ==========================================
  
  // 전체 할 일 목록 데이터
  const [todos, setTodos] = useState([
    { id: 1, date: '4월 6일 월요일', text: '제빙기 얼음 상태 확인', checked: false },
    { id: 2, date: '4월 6일 월요일', text: '신메뉴 물류 넣기', checked: true },
    { id: 3, date: '4월 6일 월요일', text: '물류 정리하기', checked: true },
    { id: 4, date: '4월 12일 일요일', text: '홀 테이블 닦기', checked: false },
  ]);

  // 바텀시트 모달 관련 상태 (열림/닫힘, 현재 수정 중인 항목의 ID)
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingTodoId, setEditingTodoId] = useState<number | null>(null);

  // 모달 내부의 입력 폼 상태 (날짜, 할 일 내용, 달력 표시 여부)
  const [sheetDate, setSheetDate] = useState('');
  const [sheetText, setSheetText] = useState('');
  const [showCalendarInSheet, setShowCalendarInSheet] = useState(false);

  // 4월 달력 렌더링을 위한 임시 배열 (1~30)
  const aprilDays = Array.from({ length: 30 }, (_, i) => i + 1);


  // ==========================================
  // 2. 주요 로직 및 함수
  // ==========================================

  // 날짜 문자열("M월 D일")을 시간(숫자)으로 변환하는 함수 (정렬 및 비교용)
  const parseDateToTime = (dateStr: string) => {
    const match = dateStr.match(/(\d+)월 (\d+)일/);
    if (match) {
      return new Date(2026, parseInt(match[1]) - 1, parseInt(match[2])).getTime();
    }
    return 0;
  };

  // [초기화] 앱 실행 시, 과거 날짜이면서 체크 완료된 항목은 삭제
  useEffect(() => {
    const todayTime = new Date(2026, 3, 12).getTime(); 
    setTodos(prev => prev.filter(todo => {
      const todoTime = parseDateToTime(todo.date);
      if (todoTime < todayTime && todo.checked) return false; // 지우기
      return true; // 남기기
    }));
  }, []);

  // 모달 열기: 새로운 할 일 추가할 때
  const openModalForAdd = () => {
    setSheetDate(''); 
    setSheetText('');
    setEditingTodoId(null);
    setShowCalendarInSheet(false);
    setIsModalVisible(true);
  };

  // 모달 열기: 기존 할 일 수정할 때 (기존 데이터 불러오기)
  const openModalForEdit = (todo: typeof todos[0]) => {
    setSheetDate(todo.date);
    setSheetText(todo.text);
    setEditingTodoId(todo.id);
    setShowCalendarInSheet(false);
    setIsModalVisible(true);
  };

  // 모달 제출: '추가 완료' 또는 '수정 완료' 버튼 눌렀을 때
  const handleSheetSubmit = () => {
    if (!sheetDate || !sheetText) {
      Alert.alert('필수 입력 누락', '날짜와 할 일을 입력해주세요.');
      return;
    }

    if (editingTodoId === null) {
      // 새 항목 추가
      const newTodo = { id: Date.now(), date: sheetDate, text: sheetText, checked: false };
      setTodos(prev => [...prev, newTodo]);
    } else {
      // 기존 항목 수정
      setTodos(prev => prev.map(t => 
        t.id === editingTodoId ? { ...t, date: sheetDate, text: sheetText } : t
      ));
    }
    setIsModalVisible(false); // 처리 후 모달 닫기
  };

  // 할 일 체크/체크해제 토글
  const toggleTodo = (id: number) => {
    setTodos(prev => prev.map(todo => 
      todo.id === id ? { ...todo, checked: !todo.checked } : todo
    ));
  };

  // 모달 내부 달력에서 날짜 선택 시
  const handleDateSelect = (day: number) => {
    const dateObj = new Date(2026, 3, day);
    const week = ['일', '월', '화', '수', '목', '금', '토'];
    const dayOfWeek = week[dateObj.getDay()];
    setSheetDate(`4월 ${day}일 ${dayOfWeek}요일`);
    setShowCalendarInSheet(false); // 선택 후 달력 닫기
  };


  // ==========================================
  // 3. 화면 렌더링을 위한 데이터 가공
  // ==========================================

  // 같은 날짜끼리 항목 묶기
  const groupedTodos = todos.reduce((acc, todo) => {
    if (!acc[todo.date]) acc[todo.date] = [];
    acc[todo.date].push(todo);
    return acc;
  }, {} as Record<string, typeof todos>);

  // 보여줄 날짜 목록 추려내기 (완료된 날짜 숨기기 & 빠른 날짜순 정렬)
  const sortedDates = Object.keys(groupedTodos)
    .filter(dateString => groupedTodos[dateString].some(todo => !todo.checked)) // 체크 안 된게 하나라도 있어야 표시
    .sort((a, b) => parseDateToTime(a) - parseDateToTime(b)); // 오름차순 정렬


  // ==========================================
  // 4. UI 렌더링 (JSX)
  // ==========================================
  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* --- 상단 헤더 --- */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#2F4AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>투두리스트</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* --- 메인 투두리스트 영역 --- */}
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {/* 할 일이 없을 때 보여주는 문구 */}
        {sortedDates.length === 0 && (
          <View style={styles.emptyView}>
            <Text style={styles.emptyText}>모든 할 일을 완료했습니다! 🎉</Text>
          </View>
        )}
        
        {/* 날짜별 그룹 렌더링 */}
        {sortedDates.map((dateString) => {
          // 체크 안 된 항목이 위로, 체크 된 항목이 아래로 가도록 정렬
          const sortedTodos = groupedTodos[dateString].sort((a, b) => Number(a.checked) - Number(b.checked));

          return (
            <View key={dateString} style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>{dateString}</Text>
              
              {/* 해당 날짜의 할 일 목록 렌더링 */}
              {sortedTodos.map((item) => (
                <View key={item.id}>
                  <View style={styles.todoRow}>
                    
                    {/* 체크박스 및 텍스트 영역 */}
                    <TouchableOpacity style={styles.todoContent} onPress={() => toggleTodo(item.id)} activeOpacity={0.7}>
                      <View style={[styles.checkbox, item.checked && styles.checkboxChecked]}>
                        {item.checked && <Ionicons name="checkmark" size={18} color="#fff" />}
                      </View>
                      <Text style={[styles.todoText, item.checked && styles.todoTextChecked]}>
                        {item.text}
                      </Text>
                    </TouchableOpacity>
                    
                    {/* 수정(연필) 버튼 */}
                    <TouchableOpacity style={styles.editButton} onPress={() => openModalForEdit(item)}>
                      <Ionicons name="pencil-outline" size={18} color="#AAA" />
                    </TouchableOpacity>

                  </View>
                  <View style={styles.divider} />
                </View>
              ))}
            </View>
          );
        })}
      </ScrollView>

      {/* --- 우측 하단 글쓰기 플로팅 버튼 --- */}
      <TouchableOpacity style={styles.floatingButton} onPress={openModalForAdd}>
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>

      {/* --- 바텀시트 모달 영역 --- */}
      <Modal animationType="slide" transparent={true} visible={isModalVisible} onRequestClose={() => setIsModalVisible(false)}>
        {/* 모달 뒷배경 어둡게 처리 */}
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setIsModalVisible(false)} />
        
        {/* 키보드가 올라올 때 입력창이 가려지지 않게 방지 */}
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.sheetModalView}>
          <View style={styles.sheetContent}>
            
            {/* 모달 상단 헤더 */}
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>할 일 {editingTodoId ? '수정' : '작성'}</Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)} style={styles.sheetCloseButton}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {/* 입력 폼 영역 (터치 시 키보드 유지) */}
            <ScrollView style={styles.sheetFormScroll} bounces={false} keyboardShouldPersistTaps="handled">
              
              {/* 1. 날짜 선택 영역 */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>*날짜 선택</Text>
                <TouchableOpacity 
                  style={[styles.inputField, showCalendarInSheet && styles.inputFieldActive]} 
                  onPress={() => setShowCalendarInSheet(!showCalendarInSheet)}
                >
                  <Text style={{ color: sheetDate ? '#333' : '#CCC', fontSize: 16 }}>
                    {sheetDate || '날짜를 고르세요'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* 달력 UI (날짜 선택 시 나타남) */}
              {showCalendarInSheet && (
                <View style={styles.calendarContainer}>
                  <View style={styles.calendarHeader}>
                    <Text style={styles.calendarMonth}>Apr 2026</Text>
                  </View>
                  <View style={styles.daysGrid}>
                    <View style={styles.dayCell} /><View style={styles.dayCell} />
                    {aprilDays.map((day) => (
                      <TouchableOpacity key={day} style={[styles.dayCell, sheetDate.includes(`4월 ${day}일`) && styles.dayCellHighlight]} onPress={() => handleDateSelect(day)}>
                        <Text style={[styles.dayText, sheetDate.includes(`4월 ${day}일`) && { color: '#fff' }]}>{day}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* 2. 할 일 입력 영역 */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>*할 일</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="예: 제빙기 얼음 상태 확인"
                  value={sheetText}
                  onChangeText={setSheetText}
                  multiline={false}
                />
              </View>

            </ScrollView>

            {/* 제출 버튼 */}
            <TouchableOpacity style={styles.submitButton} onPress={handleSheetSubmit}>
              <Text style={styles.submitButtonText}>{editingTodoId ? '수정 완료' : '추가 완료'}</Text>
            </TouchableOpacity>

          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ==========================================
// 5. 스타일 속성 (Styles)
// ==========================================
const styles = StyleSheet.create({
  // 기존 스타일 내용은 동일하므로 생략 없이 그대로 유지
  safeArea: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  container: { flex: 1 },
  contentContainer: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 100 },
  sectionContainer: { marginBottom: 30 },
  sectionTitle: { fontSize: 14, color: '#888', fontWeight: '600', marginBottom: 15 },
  emptyView: { alignItems: 'center', marginTop: 80 },
  emptyText: { color: '#888', fontSize: 16 },
  
  todoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, justifyContent: 'space-between' },
  todoContent: { flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 10 },
  checkbox: { width: 26, height: 26, borderRadius: 8, borderWidth: 1.5, borderColor: '#2F4AFF', marginRight: 16, justifyContent: 'center', alignItems: 'center' },
  checkboxChecked: { backgroundColor: '#2F4AFF', borderColor: '#2F4AFF' },
  todoText: { fontSize: 16, color: '#333', flexShrink: 1 },
  todoTextChecked: { textDecorationLine: 'line-through', color: '#888' },
  
  editButton: { padding: 6 },
  divider: { height: 1, backgroundColor: '#F5F5F5', marginLeft: 42 },
  floatingButton: { position: 'absolute', bottom: 30, right: 24, backgroundColor: '#2F4AFF', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4, zIndex: 10 },

  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheetModalView: { flex: 1, justifyContent: 'flex-end' },
  sheetContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 30, maxHeight: '85%', shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 20 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  sheetTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  sheetCloseButton: { padding: 4, marginRight: -4 },
  
  sheetFormScroll: { marginBottom: 20 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 10 },
  inputField: { borderWidth: 1, borderColor: '#DDD', borderRadius: 12, padding: 16, backgroundColor: '#FBFBFB' },
  inputFieldActive: { borderColor: '#2F4AFF', borderWidth: 1.5, backgroundColor: '#fff' },
  textInput: { borderWidth: 1, borderColor: '#DDD', borderRadius: 12, padding: 16, fontSize: 16, color: '#333' },
  
  calendarContainer: { marginBottom: 20, padding: 10, backgroundColor: '#F9FAFF', borderRadius: 12 },
  calendarHeader: { alignItems: 'center', marginBottom: 15 },
  calendarMonth: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: '14.28%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center', marginBottom: 5 },
  dayText: { fontSize: 15, color: '#333' },
  dayCellHighlight: { backgroundColor: '#2F4AFF', borderRadius: 20 },
  
  submitButton: { backgroundColor: '#2F4AFF', borderRadius: 12, paddingVertical: 18, alignItems: 'center', width: '100%' },
  submitButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});