import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert, KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiRequest } from '../utils/api';

type SubstituteType = {
  substituteId: number;
  scheduleId: number;
  requesterName: string;
  substituteUserName: string;
  shiftStartTime: string;
  shiftEndTime: string;
  status: 'REQUESTED' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  note?: string;
  reason?: string;
};

type ScheduleType = {
  id: string;
  workDate: string;
  startTime: string;
  endTime: string;
  note: string;
};

// 날짜 포맷팅 헬퍼 함수
const formatDateTime = (dateTimeStr: string) => {
  if (!dateTimeStr) return '';
  const date = new Date(dateTimeStr);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours().toString().padStart(2, '0');
  const mins = date.getMinutes().toString().padStart(2, '0');
  return `${month}월 ${day}일 ${hours}:${mins}`;
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length < 3) return dateStr;
  const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const dayOfWeek = days[date.getDay()];
  return `${month}월 ${day}일 ${dayOfWeek}요일`;
};

// 오늘부터 지정된 일수 후까지의 날짜(YYYY-MM-DD)를 계산하는 함수
const getFutureDateRange = (daysToAdd: number) => {
  const today = new Date();
  const future = new Date();
  future.setDate(today.getDate() + daysToAdd);

  const format = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  return { startDate: format(today), endDate: format(future) };
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'REQUESTED': return '구인 중';
    case 'PENDING_APPROVAL': return '승인 대기';
    case 'APPROVED': return '승인 완료';
    case 'REJECTED': return '거절됨';
    default: return status;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'REQUESTED': return '#F0F2FF';
    case 'PENDING_APPROVAL': return '#FFF4E5';
    case 'APPROVED': return '#2F4AFF';
    case 'REJECTED': return '#F5F5F5';
    default: return '#F0F2FF';
  }
};

export default function SubstituteScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [myRole, setMyRole] = useState<string | null>(null);
  const [myName, setMyName] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const [availableList, setAvailableList] = useState<SubstituteType[]>([]);
  const [mySchedules, setMySchedules] = useState<ScheduleType[]>([]);
  const [pendingList, setPendingList] = useState<SubstituteType[]>([]);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);

  const [isRejectModalVisible, setIsRejectModalVisible] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [selectedSubstituteId, setSelectedSubstituteId] = useState<number | null>(null);

  const fetchMyProfile = async () => {
    try {
      const result = await apiRequest('/user/profile');
      setMyRole(result.role);
      setMyName(result.name);
      return result.role;
    } catch (e: any) {
      console.log('프로필 조회 실패:', e.message);
      return null;
    }
  };

  const fetchAvailableList = async () => {
    try {
      const result = await apiRequest('/api/substitutes/available');
      setAvailableList(Array.isArray(result) ? result : []);
    } catch (e: any) {
      console.log('대타 목록 조회 실패:', e.message);
      setAvailableList([]);
    }
  };

  const fetchMySchedules = async () => {
    try {
      const { startDate, endDate } = getFutureDateRange(21);

      const result = await apiRequest(`/schedule/period?startDate=${startDate}&endDate=${endDate}`);
      const schedules = Array.isArray(result)
        ? result
        : result?.scheduleDates ?? result?.schedules ?? result?.content ?? result?.data ?? [];

      const mapped = Array.isArray(schedules)
        ? schedules
            .filter((item: any) => item?.id != null || item?.scheduleId != null)
            .map((item: any) => ({
              id: String(item?.id ?? item?.scheduleId),
              workDate: item?.workDate ?? item?.date ?? '',
              startTime: item?.startTime ?? '',
              endTime: item?.endTime ?? '',
              note: item?.note ?? '',
            }))
        : [];

      setMySchedules(mapped);
    } catch (e: any) {
      console.log('스케줄 조회 실패:', e.message);
      setMySchedules([]);
    }
  };

  const fetchPendingList = async () => {
    try {
      const result = await apiRequest('/api/substitutes/pending-approvals');
      setPendingList(Array.isArray(result) ? result : []);
    } catch (e: any) {
      console.log('승인 대기 목록 조회 실패:', e.message);
      setPendingList([]);
    }
  };

  const loadData = async () => {
    setLoading(true);
    const role = await fetchMyProfile();

    if (role === 'ADMIN' || role?.includes('OWNER') || role?.includes('MANAGER')) {
      await fetchPendingList();
    } else {
      await fetchAvailableList();
      await fetchMySchedules();
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const handleCreateSubstitute = async () => {
    if (!selectedScheduleId) {
      Alert.alert('알림', '대타 신청할 스케줄을 선택해주세요.');
      return;
    }

    setSubmitLoading(true);

    try {
      await apiRequest('/api/substitutes', {
        method: 'POST',
        body: JSON.stringify({
          scheduleId: Number(selectedScheduleId),
          note: note.trim(),
          reason: note.trim(),
        }),
      });

      Alert.alert('완료', '대타 신청이 완료되었습니다.');
      setIsModalVisible(false);
      setSelectedScheduleId(null);
      setNote('');
      await fetchAvailableList();
    } catch (e: any) {
      Alert.alert('오류', '대타 신청에 실패했습니다.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleApply = async (substituteId: number) => {
    Alert.alert('대타 지원', '이 대타에 지원하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '지원',
        onPress: async () => {
          try {
            await apiRequest(`/api/substitutes/${substituteId}/apply`, { method: 'PATCH' });
            Alert.alert('완료', '대타 지원이 완료되었습니다. 점주 승인을 기다려주세요.');
            await fetchAvailableList();
          } catch (e: any) {
            Alert.alert('오류', '대타 지원에 실패했습니다.');
          }
        },
      },
    ]);
  };

  const handleApprove = async (substituteId: number) => {
    Alert.alert('대타 승인', '이 대타를 승인하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '승인',
        onPress: async () => {
          try {
            await apiRequest(`/api/substitutes/${substituteId}/approve`, { method: 'PATCH' });
            Alert.alert('완료', '대타가 승인되었습니다.');
            await fetchPendingList();
          } catch (e: any) {
            Alert.alert('오류', '승인에 실패했습니다.');
          }
        },
      },
    ]);
  };

  const handleReject = async () => {
    if (!selectedSubstituteId) return;

    if (!rejectReason.trim()) {
      Alert.alert('알림', '거절 사유를 입력해주세요.');
      return;
    }

    try {
      await apiRequest(`/api/substitutes/${selectedSubstituteId}/reject`, {
        method: 'PATCH',
        body: JSON.stringify({ reason: rejectReason.trim() }),
      });

      Alert.alert('완료', '대타가 거절되었습니다.');
      setIsRejectModalVisible(false);
      setRejectReason('');
      setSelectedSubstituteId(null);
      await fetchPendingList();
    } catch (e: any) {
      Alert.alert('오류', '거절에 실패했습니다.');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2F4AFF" />
        </View>
      </SafeAreaView>
    );
  }

  // 사장님 화면 (승인 관리)
  if (myRole === 'ADMIN' || myRole?.includes('OWNER') || myRole?.includes('MANAGER')) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Stack.Screen options={{ headerShown: false }} />

        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color="#2F4AFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>대타 승인 관리</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView
          style={styles.container}
          contentContainerStyle={[
            styles.contentContainer,
            { paddingBottom: Math.max(insets.bottom + 80, 100) },
          ]}
        >
          {pendingList.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="checkmark-circle-outline" size={48} color="#BDBDBD" />
              <Text style={styles.emptyText}>승인 대기 중인 대타가 없습니다.</Text>
            </View>
          ) : (
            pendingList.map((item) => (
              <View key={`pending-${item.substituteId}`} style={styles.card}>
                <View style={styles.cardTopRow}>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusBadgeText}>승인 대기</Text>
                  </View>
                </View>

                <Text style={styles.dateText}>
                  {formatDateTime(item.shiftStartTime)} ~ {new Date(item.shiftEndTime).getHours().toString().padStart(2, '0')}:{new Date(item.shiftEndTime).getMinutes().toString().padStart(2, '0')}
                </Text>

                <Text style={styles.nameText}>요청자: {item.requesterName}</Text>

                {(item.note || item.reason) && (
                  <View style={styles.reasonDisplayBox}>
                    <Ionicons name="chatbubble-outline" size={14} color="#555" />
                    <Text style={styles.reasonDisplayText}>{item.note || item.reason}</Text>
                  </View>
                )}

                <Text style={styles.nameText}>지원자: {item.substituteUserName}</Text>

                <View style={styles.adminBtnGroup}>
                  <TouchableOpacity
                    style={styles.approveBtn}
                    onPress={() => handleApprove(item.substituteId)}
                  >
                    <Text style={styles.approveBtnText}>승인</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.rejectBtn}
                    onPress={() => {
                      setSelectedSubstituteId(item.substituteId);
                      setIsRejectModalVisible(true);
                    }}
                  >
                    <Text style={styles.rejectBtnText}>거절</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>

        <Modal animationType="fade" transparent visible={isRejectModalVisible}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setIsRejectModalVisible(false)}
          />

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalView}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>거절 사유 입력</Text>
                <TouchableOpacity onPress={() => setIsRejectModalVisible(false)}>
                  <Ionicons name="close" size={24} />
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.textArea}
                placeholder="거절 사유를 입력해주세요"
                placeholderTextColor="#C0C0C0"
                value={rejectReason}
                onChangeText={setRejectReason}
                multiline
              />

              <TouchableOpacity style={styles.submitBtn} onPress={handleReject}>
                <Text style={styles.submitText}>거절하기</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </SafeAreaView>
    );
  }

  // 알바생 화면 (대타 목록 및 신청)
  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#2F4AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>대타 신청</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: Math.max(insets.bottom + 80, 100) },
        ]}
      >
        <Text style={styles.sectionTitle}>지원 가능한 대타 목록</Text>

        {availableList.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={48} color="#BDBDBD" />
            <Text style={styles.emptyText}>지원 가능한 대타가 없습니다.</Text>
          </View>
        ) : (
          availableList.map((item) => {
            const isMyRequest = item.requesterName === myName;

            return (
              <View
                key={`available-${item.substituteId}`}
                style={[styles.card, { backgroundColor: getStatusColor(item.status) }]}
              >
                <View style={styles.cardTopRow}>
                  <View style={[styles.statusBadge, { backgroundColor: '#2F4AFF' }]}>
                    <Text style={styles.statusBadgeText}>{getStatusText(item.status)}</Text>
                  </View>
                </View>

                <Text style={styles.dateText}>
                  {formatDateTime(item.shiftStartTime)} ~ {new Date(item.shiftEndTime).getHours().toString().padStart(2, '0')}:{new Date(item.shiftEndTime).getMinutes().toString().padStart(2, '0')}
                </Text>

                <Text style={styles.nameText}>
                  요청자: {item.requesterName} {isMyRequest ? '(나)' : ''}
                </Text>

                {(item.note || item.reason) && (
                  <View style={styles.reasonDisplayBox}>
                    <Ionicons name="chatbubble-outline" size={14} color="#555" />
                    <Text style={styles.reasonDisplayText}>{item.note || item.reason}</Text>
                  </View>
                )}

                {item.status === 'REQUESTED' && !isMyRequest && (
                  <TouchableOpacity
                    style={styles.applyBtn}
                    onPress={() => handleApply(item.substituteId)}
                  >
                    <Text style={styles.applyBtnText}>지원하기</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      <TouchableOpacity
        style={[
          styles.floatingButton,
          { bottom: Math.max(insets.bottom + 16, 30) },
        ]}
        onPress={() => {
          setSelectedScheduleId(null);
          setNote('');
          setIsModalVisible(true);
        }}
      >
        <Ionicons name="pencil" size={24} color="#fff" />
      </TouchableOpacity>

      <Modal animationType="slide" transparent visible={isModalVisible}>
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setIsModalVisible(false)}
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalView}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>대타 신청</Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <Ionicons name="close" size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>*대타 신청할 스케줄 선택 (최대 3주)</Text>

              {mySchedules.length === 0 ? (
                <View style={styles.emptySchedule}>
                  <Text style={styles.emptyScheduleText}>예정된 스케줄이 없습니다.</Text>
                </View>
              ) : (
                mySchedules.map((schedule, index) => {
                  const isSelected = selectedScheduleId === schedule.id;

                  return (
                    <TouchableOpacity
                      key={`schedule-${schedule.id}-${index}`}
                      style={[styles.scheduleItem, isSelected && styles.scheduleItemSelected]}
                      onPress={() => setSelectedScheduleId(schedule.id)}
                    >
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.scheduleItemText,
                            isSelected && styles.scheduleItemTextSelected,
                          ]}
                        >
                          {formatDate(schedule.workDate)}
                        </Text>

                        <Text
                          style={[
                            styles.scheduleTimeSubText,
                            isSelected && { color: '#2F4AFF' },
                          ]}
                        >
                          {schedule.startTime} ~ {schedule.endTime}
                        </Text>
                      </View>

                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={24} color="#2F4AFF" />
                      )}
                    </TouchableOpacity>
                  );
                })
              )}

              <Text style={[styles.label, { marginTop: 16 }]}>사유 (선택)</Text>

              <TextInput
                style={styles.input}
                placeholder="ex) 개인사정, 가족행사 등"
                placeholderTextColor="#C0C0C0"
                value={note}
                onChangeText={setNote}
              />

              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  (!selectedScheduleId || submitLoading) && { backgroundColor: '#BDBDBD' },
                ]}
                onPress={handleCreateSubstitute}
                disabled={!selectedScheduleId || submitLoading}
              >
                {submitLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitText}>신청하기</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 15,
  },

  backButton: {
    padding: 4,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },

  container: {
    flex: 1,
  },

  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 100,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },

  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
    gap: 12,
  },

  emptyText: {
    fontSize: 14,
    color: '#BDBDBD',
  },

  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    backgroundColor: '#F0F2FF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },

  cardTopRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },

  statusBadge: {
    backgroundColor: '#2F4AFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },

  statusBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },

  dateText: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 8,
  },

  nameText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },

  reasonDisplayBox: {
    backgroundColor: 'rgba(0,0,0,0.04)',
    padding: 12,
    borderRadius: 12,
    marginVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  reasonDisplayText: {
    fontSize: 13,
    color: '#444',
    fontWeight: '500',
    flex: 1,
  },

  adminBtnGroup: {
    flexDirection: 'row',
    marginTop: 14,
    gap: 10,
  },

  approveBtn: {
    flex: 1,
    backgroundColor: '#2F4AFF',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },

  approveBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },

  rejectBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#FF3B30',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },

  rejectBtnText: {
    color: '#FF3B30',
    fontWeight: 'bold',
    fontSize: 15,
  },

  applyBtn: {
    marginTop: 12,
    backgroundColor: '#2F4AFF',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },

  applyBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },

  floatingButton: {
    position: 'absolute',
    bottom: 30,
    right: 24,
    backgroundColor: '#2F4AFF',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#2F4AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },

  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },

  modalView: {
    flex: 1,
    justifyContent: 'flex-end',
  },

  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    maxHeight: '92%',
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111',
  },

  label: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },

  input: {
    borderWidth: 1,
    borderColor: '#EEE',
    borderRadius: 14,
    padding: 16,
    backgroundColor: '#F9F9F9',
    fontSize: 15,
    color: '#333',
  },

  textArea: {
    borderWidth: 1,
    borderColor: '#EEE',
    borderRadius: 14,
    padding: 16,
    backgroundColor: '#F9F9F9',
    minHeight: 120,
    marginBottom: 16,
    textAlignVertical: 'top',
    fontSize: 15,
  },

  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#EEE',
    borderRadius: 16,
    padding: 18,
    marginBottom: 10,
    backgroundColor: '#F9F9F9',
  },

  scheduleItemSelected: {
    borderColor: '#2F4AFF',
    backgroundColor: '#F0F2FF',
  },

  scheduleItemText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '600',
    marginBottom: 4,
  },

  scheduleItemTextSelected: {
    color: '#2F4AFF',
  },

  scheduleTimeSubText: {
    fontSize: 13,
    color: '#888',
  },

  emptySchedule: {
    alignItems: 'center',
    paddingVertical: 30,
  },

  emptyScheduleText: {
    fontSize: 14,
    color: '#BDBDBD',
  },

  submitBtn: {
    backgroundColor: '#2F4AFF',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 20,
  },

  submitText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 17,
  },
});