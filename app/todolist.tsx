import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

// 각 월의 일수 반환
const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();

// 해당 월 1일의 요일 반환 (0=일, 1=월 ...)
const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

export default function TodoListScreen() {
  const router = useRouter();

  // ==========================================
  // 1. 상태 관리 (State)
  // ==========================================

  const [todos, setTodos] = useState<{ id: number; date: string; text: string; checked: boolean }[]>([]);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingTodoId, setEditingTodoId] = useState<number | null>(null);

  const [sheetDate, setSheetDate] = useState('');
  const [sheetText, setSheetText] = useState('');
  const [showCalendarInSheet, setShowCalendarInSheet] = useState(false);

  // 달력 현재 표시 연/월 (6월부터 시작)
  const [calYear, setCalYear] = useState(2026);
  const [calMonth, setCalMonth] = useState(5); // 0-indexed: 5 = 6월

  const MONTH_NAMES = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
  const WEEK_DAYS = ['일', '월', '화', '수', '목', '금', '토'];

  // ==========================================
  // 2. 주요 로직 및 함수
  // ==========================================

  const parseDateToTime = (dateStr: string) => {
    const match = dateStr.match(/(\d+)월 (\d+)일/);
    if (match) {
      return new Date(2026, parseInt(match[1]) - 1, parseInt(match[2])).getTime();
    }
    return 0;
  };

  useEffect(() => {
    const todayTime = new Date(2026, 3, 12).getTime();
    setTodos(prev => prev.filter(todo => {
      const todoTime = parseDateToTime(todo.date);
      if (todoTime < todayTime && todo.checked) return false;
      return true;
    }));
  }, []);

  const openModalForAdd = () => {
    setSheetDate('');
    setSheetText('');
    setEditingTodoId(null);
    setShowCalendarInSheet(false);
    setCalYear(2026);
    setCalMonth(5); // 6월로 초기화
    setIsModalVisible(true);
  };

  const openModalForEdit = (todo: typeof todos[0]) => {
    setSheetDate(todo.date);
    setSheetText(todo.text);
    setEditingTodoId(todo.id);
    setShowCalendarInSheet(false);
    setCalYear(2026);
    setCalMonth(5);
    setIsModalVisible(true);
  };

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

  const toggleTodo = (id: number) => {
    setTodos(prev => prev.map(todo =>
      todo.id === id ? { ...todo, checked: !todo.checked } : todo
    ));
  };

  // 달력에서 날짜 선택
  const handleDateSelect = (day: number) => {
    const dateObj = new Date(calYear, calMonth, day);
    const dayOfWeek = WEEK_DAYS[dateObj.getDay()];
    setSheetDate(`${calMonth + 1}월 ${day}일 ${dayOfWeek}요일`);
    setShowCalendarInSheet(false);
  };

  // 이전 달로 이동
  const goPrevMonth = () => {
    if (calMonth === 0) {
      setCalYear(y => y - 1);
      setCalMonth(11);
    } else {
      setCalMonth(m => m - 1);
    }
  };

  // 다음 달로 이동
  const goNextMonth = () => {
    if (calMonth === 11) {
      setCalYear(y => y + 1);
      setCalMonth(0);
    } else {
      setCalMonth(m => m + 1);
    }
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

  // 달력 렌더링용 데이터
  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const firstDay = getFirstDayOfMonth(calYear, calMonth);
  const calDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyBefore = Array.from({ length: firstDay });

  // ==========================================
  // 4. UI 렌더링 (JSX)
  // ==========================================
  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* --- 상단 헤더 (복원) --- */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#2F4AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>투두리스트</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* --- 메인 투두리스트 영역 --- */}
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {sortedDates.length === 0 && (
          <View style={styles.emptyView}>
            <Text style={styles.emptyText}>할 일을 추가해보세요 ✏️</Text>
          </View>
        )}

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

      {/* --- 우측 하단 플로팅 버튼 --- */}
      <TouchableOpacity style={styles.floatingButton} onPress={openModalForAdd}>
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>

      {/* --- 바텀시트 모달 --- */}
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

              {/* 날짜 선택 */}
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

              {/* 달력 (월 이동 가능) */}
              {showCalendarInSheet && (
                <View style={styles.calendarContainer}>
                  {/* 월 이동 헤더 */}
                  <View style={styles.calendarNavRow}>
                    <TouchableOpacity onPress={goPrevMonth} style={styles.calNavBtn}>
                      <Ionicons name="chevron-back" size={20} color="#333" />
                    </TouchableOpacity>
                    <Text style={styles.calendarMonth}>{calYear}년 {MONTH_NAMES[calMonth]}</Text>
                    <TouchableOpacity onPress={goNextMonth} style={styles.calNavBtn}>
                      <Ionicons name="chevron-forward" size={20} color="#333" />
                    </TouchableOpacity>
                  </View>

                  {/* 요일 헤더 */}
                  <View style={styles.daysGrid}>
                    {WEEK_DAYS.map(d => (
                      <View key={d} style={styles.dayCell}>
                        <Text style={styles.weekDayText}>{d}</Text>
                      </View>
                    ))}
                  </View>

                  {/* 날짜 그리드 */}
                  <View style={styles.daysGrid}>
                    {/* 첫 날 앞 빈칸 */}
                    {emptyBefore.map((_, i) => (
                      <View key={`empty-${i}`} style={styles.dayCell} />
                    ))}
                    {calDays.map((day) => {
                      const isSelected = sheetDate.includes(`${calMonth + 1}월 ${day}일`);
                      return (
                        <TouchableOpacity
                          key={day}
                          style={[styles.dayCell, isSelected && styles.dayCellHighlight]}
                          onPress={() => handleDateSelect(day)}
                        >
                          <Text style={[styles.dayText, isSelected && { color: '#fff' }]}>{day}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* 할 일 입력 */}
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
// 5. 스타일
// ==========================================
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  container: { flex: 1 },
  contentContainer: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 120 },
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

  calendarContainer: { marginBottom: 20, padding: 12, backgroundColor: '#F9FAFF', borderRadius: 12 },
  calendarNavRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  calNavBtn: { padding: 6 },
  calendarMonth: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  weekDayText: { fontSize: 12, color: '#888', fontWeight: '600' },
  dayCell: { width: '14.28%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  dayText: { fontSize: 14, color: '#333' },
  dayCellHighlight: { backgroundColor: '#2F4AFF', borderRadius: 20 },

  submitButton: { backgroundColor: '#2F4AFF', borderRadius: 12, paddingVertical: 18, alignItems: 'center', width: '100%' },
  submitButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});