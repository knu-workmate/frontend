import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Modal, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function TodoListScreen() {
  const router = useRouter();

  // ==========================================
  // 1. 상태 관리 (State)
  // ==========================================
  
  // 전체 할 일 목록 데이터 (예시 제거 → 빈 배열)
  const [todos, setTodos] = useState<{ id: number; date: string; text: string; checked: boolean }[]>([]);

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
      if (todoTime < todayTime && todo.checked) return false;
      return true;
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
      const newTodo = { id: Date.now(), date: sheetDate, text: sheetText, checked: false };
      setTodos(prev => [...prev, newTodo]);
    } else {
      setTodos(prev => prev.map(t => 
        t.id === editingTodoId ? { ...t, date: sheetDate, text: sheetText } : t
      ));
    }
    setIsModalVisible(false);
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
    setShowCalendarInSheet(false);
  };


  // ==========================================
  // 3. 화면 렌더링을 위한 데이터 가공
  // ==========================================

  const groupedTodos = todos.reduce((acc, todo) => {
    if (!acc[todo.date]) acc[todo.date] = [];
    acc[todo.date].push(todo);
    return acc;
  }, {} as Record<string, typeof todos>);

  const sortedDates = Object.keys(groupedTodos)
    .filter(dateString => groupedTodos[dateString].some(todo => !todo.checked))
    .sort((a, b) => parseDateToTime(a) - parseDateToTime(b));


  // ==========================================
  // 4. UI 렌더링 (JSX)
  // ==========================================
  return (
    // 헤더 제거 → SafeAreaView 유지하되 헤더 View 삭제
    <SafeAreaView style={styles.safeArea}>

      {/* --- 메인 투두리스트 영역 --- */}
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {/* 할 일이 없을 때 보여주는 문구 */}
        {sortedDates.length === 0 && (
          <View style={styles.emptyView}>
            <Text style={styles.emptyText}>할 일을 추가해보세요 ✏️</Text>
          </View>
        )}
        
        {/* 날짜별 그룹 렌더링 */}
        {sortedDates.map((dateString) => {
          const sortedTodos = groupedTodos[dateString].sort((a, b) => Number(a.checked) - Number(b.checked));

          return (
            <View key={dateString} style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>{dateString}</Text>
              
              {sortedTodos.map((item) => (
                <View key={item.id}>
                  <View style={styles.todoRow}>
                    
                    <TouchableOpacity style={styles.todoContent} onPress={() => toggleTodo(item.id)} activeOpacity={0.7}>
                      <View style={[styles.checkbox, item.checked && styles.checkboxChecked]}>
                        {item.checked && <Ionicons name="checkmark" size={18} color="#fff" />}
                      </View>
                      <Text style={[styles.todoText, item.checked && styles.todoTextChecked]}>
                        {item.text}
                      </Text>
                    </TouchableOpacity>
                    
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
      {/* bottom 값을 80으로 올려서 갤럭시 하단 네비게이션 바에 가리지 않도록 수정 */}
      <TouchableOpacity style={styles.floatingButton} onPress={openModalForAdd}>
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>

      {/* --- 바텀시트 모달 영역 --- */}
      <Modal animationType="slide" transparent={true} visible={isModalVisible} onRequestClose={() => setIsModalVisible(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setIsModalVisible(false)} />
        
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.sheetModalView}>
          <View style={styles.sheetContent}>
            
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>할 일 {editingTodoId ? '수정' : '작성'}</Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)} style={styles.sheetCloseButton}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.sheetFormScroll} bounces={false} keyboardShouldPersistTaps="handled">
              
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
  safeArea: { flex: 1, backgroundColor: '#fff' },
  // 헤더 관련 스타일 제거 (header, backButton, headerTitle)
  container: { flex: 1 },
  contentContainer: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 120 }, // paddingBottom을 120으로 늘려 플로팅 버튼과 겹침 방지
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

  // bottom을 80으로 올려서 갤럭시 하단 네비게이션 바(약 48~60px) 위로 띄움
  floatingButton: { position: 'absolute', bottom: 80, right: 24, backgroundColor: '#2F4AFF', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4, zIndex: 10 },

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