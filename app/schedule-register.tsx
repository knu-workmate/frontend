import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiRequest } from '../utils/api';

const MAIN_COLOR = '#2B50E6';

const WEEKDAY_SHORT = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function toDateString(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseDateLocal(dateText: string) {
  const [year, month, day] = dateText.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

function normalizeText(value?: string | null) {
  return String(value || '').trim().toLowerCase();
}

function isAdminRole(role?: string | null) {
  const upperRole = String(role || '').trim().toUpperCase();

  return (
    upperRole.includes('ADMIN') ||
    upperRole.includes('OWNER') ||
    upperRole.includes('MANAGER') ||
    upperRole.includes('BOSS') ||
    upperRole.includes('EMPLOYER') ||
    upperRole.includes('STORE_OWNER') ||
    upperRole.includes('WORKPLACE_OWNER') ||
    upperRole.includes('사장') ||
    upperRole.includes('점주') ||
    upperRole.includes('관리자')
  );
}

type UserProfile = {
  id?: number | null;
  userId?: number | null;
  name?: string | null;
  userName?: string | null;
  nickname?: string | null;
  role?: string | null;
};

type WorkplaceUser = {
  id?: number | null;
  userId?: number | null;
  name?: string | null;
  userName?: string | null;
  nickname?: string | null;
  role?: string | null;
};

function normalizeWorkplaceUsers(data: any): WorkplaceUser[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.users)) return data.users;
  if (Array.isArray(data?.workers)) return data.workers;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function getUserId(user: WorkplaceUser | UserProfile | null | undefined) {
  if (!user) return null;
  return user.id ?? user.userId ?? null;
}

function getDisplayName(user: WorkplaceUser | UserProfile | null | undefined) {
  if (!user) return '이름 없음';
  return user.nickname || user.name || user.userName || '이름 없음';
}

function isSameUser(
  a: WorkplaceUser | UserProfile | null | undefined,
  b: WorkplaceUser | UserProfile | null | undefined
) {
  if (!a || !b) return false;

  const aId = getUserId(a);
  const bId = getUserId(b);

  if (aId != null && bId != null && Number(aId) === Number(bId)) {
    return true;
  }

  const aName = normalizeText(getDisplayName(a));
  const bName = normalizeText(getDisplayName(b));

  if (aName && bName && aName === bName && isAdminRole(a.role) && isAdminRole(b.role)) {
    return true;
  }

  return false;
}

function removeDuplicateUsers(users: WorkplaceUser[]) {
  const result: WorkplaceUser[] = [];

  users.forEach((user) => {
    const duplicated = result.some((saved) => isSameUser(saved, user));

    if (!duplicated) {
      result.push(user);
    }
  });

  return result;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

function TimeOptionColumn({
  label,
  items,
  selected,
  onSelect,
  fmt,
}: {
  label: string;
  items: number[];
  selected: number;
  onSelect: (v: number) => void;
  fmt: (v: number) => string;
}) {
  return (
    <View style={timeOption.column}>
      <Text style={timeOption.label}>{label}</Text>

      <ScrollView
        style={timeOption.scroll}
        contentContainerStyle={timeOption.scrollContent}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        {items.map((item) => {
          const active = item === selected;

          return (
            <TouchableOpacity
              key={`${label}-${item}`}
              style={[timeOption.item, active && timeOption.itemActive]}
              onPress={() => onSelect(item)}
              activeOpacity={0.8}
            >
              <Text style={[timeOption.itemText, active && timeOption.itemTextActive]}>
                {fmt(item)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const timeOption = StyleSheet.create({
  column: {
    flex: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#999',
    marginBottom: 8,
    textAlign: 'center',
  },
  scroll: {
    height: 230,
  },
  scrollContent: {
    paddingVertical: 4,
  },
  item: {
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    backgroundColor: '#F5F5F5',
  },
  itemActive: {
    backgroundColor: MAIN_COLOR,
  },
  itemText: {
    fontSize: 16,
    color: '#777',
    fontWeight: '600',
  },
  itemTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
});

function TimePickerModal({
  visible,
  title,
  hour,
  minute,
  onChangeHour,
  onChangeMinute,
  onClose,
  bottomInset,
}: {
  visible: boolean;
  title: string;
  hour: number;
  minute: number;
  onChangeHour: (h: number) => void;
  onChangeMinute: (m: number) => void;
  onClose: () => void;
  bottomInset: number;
}) {
  const pad = (v: number) => String(v).padStart(2, '0');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={tm.overlay}>
        <TouchableOpacity style={tm.backdrop} activeOpacity={1} onPress={onClose} />

        <View style={[tm.sheet, { paddingBottom: 28 + Math.max(bottomInset, 12) }]}>
          <View style={tm.handle} />

          <View style={tm.header}>
            <Text style={tm.title}>{title}</Text>

            <TouchableOpacity style={tm.doneBtn} onPress={onClose}>
              <Text style={tm.doneTxt}>완료</Text>
            </TouchableOpacity>
          </View>

          <Text style={tm.preview}>
            {pad(hour)}:{pad(minute)}
          </Text>

          <View style={tm.selectRow}>
            <TimeOptionColumn
              label="시"
              items={HOURS}
              selected={hour}
              onSelect={onChangeHour}
              fmt={pad}
            />

            <Text style={tm.colon}>:</Text>

            <TimeOptionColumn
              label="분"
              items={MINUTES}
              selected={minute}
              onSelect={onChangeMinute}
              fmt={pad}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const tm = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.32)',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E0E0E0',
    alignSelf: 'center',
    marginBottom: 18,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111',
  },
  doneBtn: {
    backgroundColor: MAIN_COLOR,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  doneTxt: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  preview: {
    fontSize: 36,
    fontWeight: '700',
    color: '#222',
    letterSpacing: 1,
    textAlign: 'center',
    marginVertical: 12,
  },
  selectRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  colon: {
    fontSize: 26,
    fontWeight: '700',
    color: '#666',
    marginTop: 102,
  },
});

export default function ScheduleRegisterScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  const today = useMemo(() => new Date(), []);
  const isEditMode = !!params.editId;

  const [selectedDate, setSelectedDate] = useState(today);
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [calendarOpen, setCalendarOpen] = useState(false);

  const [workerName, setWorkerName] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [workerPickerOpen, setWorkerPickerOpen] = useState(false);
  const [workplaceUsers, setWorkplaceUsers] = useState<WorkplaceUser[]>([]);

  const [note, setNote] = useState('');

  const [startHour, setStartHour] = useState(9);
  const [startMinute, setStartMinute] = useState(0);
  const [startOpen, setStartOpen] = useState(false);

  const [endHour, setEndHour] = useState(18);
  const [endMinute, setEndMinute] = useState(0);
  const [endOpen, setEndOpen] = useState(false);

  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState('');
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);

  const [loadingProfile, setLoadingProfile] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isAdminLike = useMemo(() => {
    return isAdminRole(currentUserRole);
  }, [currentUserRole]);

  const selectedWorkerIsMe = useMemo(() => {
    if (!currentUserProfile) return false;

    const currentName = normalizeText(getDisplayName(currentUserProfile));
    const selectedName = normalizeText(workerName);

    if (!currentName || !selectedName) return false;

    return currentName === selectedName;
  }, [currentUserProfile, workerName]);

  const workerSelectList = useMemo(() => {
    const currentUserAsWorker: WorkplaceUser | null = currentUserProfile
      ? {
          id: currentUserProfile.id ?? currentUserProfile.userId ?? currentUserId,
          userId: currentUserProfile.userId ?? currentUserProfile.id ?? currentUserId,
          name: currentUserProfile.name,
          userName: currentUserProfile.userName,
          nickname: currentUserProfile.nickname,
          role: currentUserProfile.role,
        }
      : null;

    const filteredUsers = currentUserAsWorker
      ? workplaceUsers.filter((user) => !isSameUser(user, currentUserAsWorker))
      : workplaceUsers;

    const merged = currentUserAsWorker
      ? [currentUserAsWorker, ...filteredUsers]
      : filteredUsers;

    return removeDuplicateUsers(merged);
  }, [currentUserProfile, currentUserId, workplaceUsers]);

  const pad = (v: number) => String(v).padStart(2, '0');

  const startStr = `${pad(startHour)}:${pad(startMinute)}`;
  const endStr = `${pad(endHour)}:${pad(endMinute)}`;

  const daysInMonth = useMemo(
    () => getDaysInMonth(calYear, calMonth),
    [calYear, calMonth]
  );

  const firstDayOffset = useMemo(
    () => getFirstDayOfWeek(calYear, calMonth),
    [calYear, calMonth]
  );

  const calCells = useMemo(() => {
    const cells: (number | null)[] = Array(firstDayOffset).fill(null);

    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(d);
    }

    while (cells.length % 7 !== 0) {
      cells.push(null);
    }

    return cells;
  }, [daysInMonth, firstDayOffset]);

  const selectedDateText = useMemo(() => toDateString(selectedDate), [selectedDate]);

  const shouldUseAdminPatch = useMemo(() => {
    return params.editAsAdmin === 'true' || isAdminLike;
  }, [params.editAsAdmin, isAdminLike]);

  const prevMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear((y) => y - 1);
    } else {
      setCalMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear((y) => y + 1);
    } else {
      setCalMonth((m) => m + 1);
    }
  };

  const isSelectedDay = (day: number | null) =>
    !!day &&
    selectedDate.getFullYear() === calYear &&
    selectedDate.getMonth() === calMonth &&
    selectedDate.getDate() === day;

  const goScheduleWithRefresh = (dateText: string) => {
    const target = {
      pathname: '/schedule',
      params: {
        refreshAt: String(Date.now()),
        selectedDate: dateText,
      },
    };

    if (typeof (router as any).dismissTo === 'function') {
      (router as any).dismissTo(target);
      return;
    }

    (router as any).navigate(target);
  };

  const loadProfile = useCallback(async () => {
    try {
      setLoadingProfile(true);

      const profile = (await apiRequest('/user/profile')) as UserProfile | null;

      if (!profile) return;

      const userId = profile.id ?? profile.userId ?? null;
      const role = profile.role ?? '';
      const nickname = profile.nickname || profile.name || profile.userName || '';

      setCurrentUserId(userId);
      setCurrentUserRole(role);
      setCurrentUserProfile(profile);

      if (!isEditMode) {
        setSelectedUserId(userId);
        setWorkerName(nickname);
      }
    } catch (error: any) {
      console.log('프로필 조회 실패:', error?.message || error);

      Alert.alert(
        '사용자 정보 조회 실패',
        '로그인 정보가 만료되었거나 사용자 정보를 불러오지 못했습니다. 다시 로그인 후 시도해주세요.'
      );
    } finally {
      setLoadingProfile(false);
    }
  }, [isEditMode]);

  const loadWorkplaceUsers = useCallback(async () => {
    try {
      const data = await apiRequest('/workplace/users');
      const users = normalizeWorkplaceUsers(data);

      setWorkplaceUsers(users);
    } catch (error: any) {
      console.log('사업장 근무자 목록 조회 실패:', error?.message || error);
      setWorkplaceUsers([]);
    }
  }, []);

  useEffect(() => {
    loadProfile();
    loadWorkplaceUsers();
  }, [loadProfile, loadWorkplaceUsers]);

  useEffect(() => {
    if (!isEditMode) return;

    if (params.editWorker) {
      setWorkerName(String(params.editWorker));
    }

    if (params.editUserId) {
      const parsedUserId = Number(params.editUserId);
      setSelectedUserId(Number.isFinite(parsedUserId) ? parsedUserId : null);
    }

    if (params.editDate) {
      const dateObj = parseDateLocal(String(params.editDate));

      setSelectedDate(dateObj);
      setCalYear(dateObj.getFullYear());
      setCalMonth(dateObj.getMonth());
    }

    if (params.editTime) {
      const [startText, endText] = String(params.editTime).split(' ~ ');
      const [sh, sm] = startText.split(':').map(Number);
      const [eh, em] = endText.split(':').map(Number);

      setStartHour(Number.isFinite(sh) ? sh : 9);
      setStartMinute(Number.isFinite(sm) ? sm : 0);
      setEndHour(Number.isFinite(eh) ? eh : 18);
      setEndMinute(Number.isFinite(em) ? em : 0);
    }

    if (params.editNote) {
      setNote(String(params.editNote));
    }
  }, [
    isEditMode,
    params.editWorker,
    params.editUserId,
    params.editDate,
    params.editTime,
    params.editNote,
  ]);

  const handleDayPress = (day: number | null) => {
    if (!day) return;

    if (isEditMode) {
      Alert.alert('날짜 변경 불가', '스케줄 수정 시 날짜는 변경할 수 없습니다.');
      return;
    }

    setSelectedDate(new Date(calYear, calMonth, day));
    setCalendarOpen(false);
  };

  const handleSelectWorker = (user: WorkplaceUser) => {
    const selectedName = getDisplayName(user);
    const userId = getUserId(user);
    const isMe = currentUserProfile ? isSameUser(user, currentUserProfile) : false;

    if (userId != null) {
      setSelectedUserId(Number(userId));
    } else if (isMe && currentUserId != null) {
      setSelectedUserId(Number(currentUserId));
    } else {
      setSelectedUserId(null);
    }

    setWorkerName(selectedName);
    setWorkerPickerOpen(false);
  };

  const closeTimeModals = () => {
    setStartOpen(false);
    setEndOpen(false);
  };

  const validateForm = () => {
    if (!workerName.trim()) {
      Alert.alert('입력 오류', '근무자 정보가 없습니다.');
      return false;
    }

    if (startHour * 60 + startMinute >= endHour * 60 + endMinute) {
      Alert.alert('시간 오류', '종료 시간은 시작 시간보다 늦어야 합니다.');
      return false;
    }

    if (!isEditMode && isAdminLike && !selectedUserId && !currentUserId && !selectedWorkerIsMe) {
      Alert.alert('입력 오류', '근무자를 선택해주세요.');
      return false;
    }

    return true;
  };

  const verifyCreatedSchedule = async (dateText: string) => {
    try {
      const endpoint = isAdminLike
        ? `/schedule/date-all?date=${dateText}`
        : `/schedule/date?date=${dateText}`;

      const result = await apiRequest(endpoint);
      console.log('등록/수정 후 스케줄 재조회 성공:', endpoint, result);
    } catch (error: any) {
      console.log('등록/수정 후 스케줄 재조회 실패:', error?.message || error);
    }
  };

  const handleConfirm = async () => {
    if (submitting) return;
    if (!validateForm()) return;

    const workDate = toDateString(selectedDate);

    try {
      setSubmitting(true);
      closeTimeModals();

      if (isEditMode) {
        const endpoint = shouldUseAdminPatch ? '/schedule/patch-admin' : '/schedule/patch';

        console.log('스케줄 수정 요청:', {
          endpoint,
          editAsAdmin: params.editAsAdmin,
          isAdminLike,
          shouldUseAdminPatch,
          scheduleId: Number(params.editId),
          newStartTime: startStr,
          newEndTime: endStr,
          newNote: note.trim(),
        });

        await apiRequest(endpoint, {
          method: 'PATCH',
          body: JSON.stringify({
            scheduleId: Number(params.editId),
            newStartTime: startStr,
            newEndTime: endStr,
            newNote: note.trim(),
          }),
        });

        await verifyCreatedSchedule(workDate);

        Alert.alert('수정 완료', '근무 일정이 수정되었습니다.', [
          {
            text: '확인',
            onPress: () => goScheduleWithRefresh(workDate),
          },
        ]);

        return;
      }

      const requestBody = [
        {
          workDate,
          startTime: startStr,
          endTime: endStr,
          note: note.trim(),
        },
      ];

      const targetUserId = selectedUserId ?? currentUserId;

      const isSelfSchedule =
        selectedWorkerIsMe ||
        (currentUserId != null &&
          targetUserId != null &&
          Number(currentUserId) === Number(targetUserId));

      console.log('스케줄 등록 요청:', {
        isAdminLike,
        isSelfSchedule,
        selectedWorkerIsMe,
        currentUserId,
        selectedUserId,
        targetUserId,
        workerName,
        body: requestBody,
      });

      if (isAdminLike && !isSelfSchedule) {
        if (!targetUserId) {
          Alert.alert('입력 오류', '근무자를 선택해주세요.');
          return;
        }

        await apiRequest(`/schedule/create-admin?userId=${targetUserId}`, {
          method: 'POST',
          body: JSON.stringify(requestBody),
        });
      } else {
        await apiRequest('/schedule/create', {
          method: 'POST',
          body: JSON.stringify(requestBody),
        });
      }

      await verifyCreatedSchedule(workDate);

      Alert.alert('등록 완료', '근무 일정이 등록되었습니다.', [
        {
          text: '확인',
          onPress: () => goScheduleWithRefresh(workDate),
        },
      ]);
    } catch (error: any) {
      console.log('스케줄 저장 실패:', error?.message || error);

      Alert.alert(
        isEditMode ? '수정 실패' : '등록 실패',
        error?.message || '스케줄 요청 중 오류가 발생했습니다.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <SafeAreaView style={s.safeArea} edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="chevron-back" size={28} color={MAIN_COLOR} />
          </TouchableOpacity>

          <Text style={s.headerTitle}>{isEditMode ? '근무 수정' : '근무 등록'}</Text>

          <View style={{ width: 38 }} />
        </View>

        <ScrollView
          style={s.scroll}
          contentContainerStyle={[
            s.content,
            { paddingBottom: Math.max(insets.bottom + 100, 110) },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={s.pageTitle}>{isEditMode ? '근무 수정' : '근무 등록'}</Text>

          {loadingProfile && (
            <View style={s.loadingBox}>
              <ActivityIndicator size="small" color={MAIN_COLOR} />
              <Text style={s.loadingText}>사용자 정보를 불러오는 중입니다.</Text>
            </View>
          )}

          <Text style={s.label}>*근무자</Text>

          {isAdminLike && !isEditMode ? (
            <>
              <TouchableOpacity
                style={s.inputBox}
                onPress={() => setWorkerPickerOpen(true)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="person-outline"
                  size={18}
                  color="#BDBDBD"
                  style={{ marginRight: 10 }}
                />

                <Text style={[s.inputText, !workerName && { color: '#BDBDBD' }]}>
                  {workerName || '근무자를 선택하세요'}
                </Text>

                <Ionicons name="chevron-down" size={18} color="#777777" />
              </TouchableOpacity>

              <Text style={s.helperText}>
                사장님은 본인 또는 직원 중 한 명을 선택해 근무를 등록할 수 있습니다.
              </Text>
            </>
          ) : (
            <View style={[s.inputBox, s.disabledBox]}>
              <Ionicons
                name="person-outline"
                size={18}
                color="#BDBDBD"
                style={{ marginRight: 10 }}
              />

              <Text style={s.inputText}>
                {workerName || '사용자 정보를 불러오는 중입니다.'}
              </Text>

              <Ionicons name="lock-closed-outline" size={16} color="#BDBDBD" />
            </View>
          )}

          <Text style={[s.label, { marginTop: 20 }]}>*날짜선택</Text>

          <TouchableOpacity
            style={[
              s.inputBox,
              calendarOpen && s.inputBoxActive,
              isEditMode && s.disabledBox,
            ]}
            onPress={() => {
              if (isEditMode) {
                Alert.alert('날짜 변경 불가', '스케줄 수정 시 날짜는 변경할 수 없습니다.');
                return;
              }

              setCalendarOpen((open) => !open);
            }}
            activeOpacity={0.8}
          >
            <Ionicons
              name="calendar-outline"
              size={18}
              color={calendarOpen ? MAIN_COLOR : '#BDBDBD'}
              style={{ marginRight: 10 }}
            />

            <Text style={[s.inputText, calendarOpen && { color: MAIN_COLOR }]}>
              {selectedDateText}
            </Text>

            <Ionicons
              name={calendarOpen ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={calendarOpen ? MAIN_COLOR : '#BDBDBD'}
            />
          </TouchableOpacity>

          {isEditMode && (
            <Text style={s.helperText}>
              스케줄 수정 시 날짜는 변경할 수 없고, 시간과 메모만 수정할 수 있습니다.
            </Text>
          )}

          {calendarOpen && !isEditMode && (
            <View style={s.cal}>
              <View style={s.calHead}>
                <Text style={s.calMonth}>
                  {MONTH_NAMES[calMonth]} {calYear}
                </Text>

                <View style={{ flexDirection: 'row', gap: 4 }}>
                  <TouchableOpacity onPress={prevMonth} style={s.navBtn}>
                    <Ionicons name="chevron-back" size={18} color="#888" />
                  </TouchableOpacity>

                  <TouchableOpacity onPress={nextMonth} style={s.navBtn}>
                    <Ionicons name="chevron-forward" size={18} color="#888" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={s.weekRow}>
                {WEEKDAY_SHORT.map((w) => (
                  <Text key={w} style={s.weekTxt}>
                    {w}
                  </Text>
                ))}
              </View>

              <View style={s.grid}>
                {calCells.map((day, idx) => {
                  const active = isSelectedDay(day);
                  const isToday =
                    day === today.getDate() &&
                    calMonth === today.getMonth() &&
                    calYear === today.getFullYear();

                  return (
                    <TouchableOpacity
                      key={`day-${calYear}-${calMonth}-${idx}`}
                      style={[s.cell, active && s.cellActive]}
                      onPress={() => handleDayPress(day)}
                      activeOpacity={day ? 0.7 : 1}
                    >
                      <Text
                        style={[
                          s.cellTxt,
                          active && s.cellTxtActive,
                          !active && isToday && s.cellTxtToday,
                          !day && { opacity: 0 },
                        ]}
                      >
                        {day ?? '.'}
                      </Text>

                      {isToday && !active && <View style={s.todayDot} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          <Text style={[s.label, { marginTop: 20 }]}>*시간</Text>

          <View style={s.timeRow}>
            <TouchableOpacity
              style={[s.timeCard, startOpen && s.timeCardActive]}
              onPress={() => {
                setStartOpen(true);
                setEndOpen(false);
              }}
              activeOpacity={0.8}
            >
              <Text style={s.timeCardLabel}>시작</Text>
              <Text style={[s.timeCardValue, startOpen && { color: '#222' }]}>
                {startStr}
              </Text>
            </TouchableOpacity>

            <Ionicons
              name="arrow-forward"
              size={18}
              color="#BDBDBD"
              style={{ paddingTop: 12 }}
            />

            <TouchableOpacity
              style={[s.timeCard, endOpen && s.timeCardActive]}
              onPress={() => {
                setEndOpen(true);
                setStartOpen(false);
              }}
              activeOpacity={0.8}
            >
              <Text style={s.timeCardLabel}>종료</Text>
              <Text style={[s.timeCardValue, endOpen && { color: '#222' }]}>
                {endStr}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={s.summary}>
            <Ionicons name="time-outline" size={15} color="#666" />
            <Text style={s.summaryTxt}>
              {startStr} ~ {endStr}
            </Text>
          </View>

          <Text style={[s.label, { marginTop: 20 }]}>메모</Text>

          <View style={[s.inputBox, s.noteBox]}>
            <TextInput
              style={[s.input, s.noteInput]}
              placeholder="특이사항 또는 메모를 입력하세요"
              placeholderTextColor="#BDBDBD"
              value={note}
              onChangeText={setNote}
              multiline
              textAlignVertical="top"
            />
          </View>
        </ScrollView>

        <View
          style={[
            s.bottomBar,
            { paddingBottom: Math.max(insets.bottom, 6) },
          ]}
        >
          <TouchableOpacity
            style={[s.confirmBtn, submitting && s.confirmBtnDisabled]}
            onPress={handleConfirm}
            activeOpacity={0.85}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={s.confirmTxt}>
                {isEditMode ? '수정 완료' : '확인'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <TimePickerModal
          visible={startOpen}
          title="시작 시간"
          hour={startHour}
          minute={startMinute}
          onChangeHour={setStartHour}
          onChangeMinute={setStartMinute}
          onClose={() => setStartOpen(false)}
          bottomInset={insets.bottom}
        />

        <TimePickerModal
          visible={endOpen}
          title="종료 시간"
          hour={endHour}
          minute={endMinute}
          onChangeHour={setEndHour}
          onChangeMinute={setEndMinute}
          onClose={() => setEndOpen(false)}
          bottomInset={insets.bottom}
        />

        <Modal
          visible={workerPickerOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setWorkerPickerOpen(false)}
          statusBarTranslucent
        >
          <View style={wm.overlay}>
            <TouchableOpacity
              style={wm.backdrop}
              activeOpacity={1}
              onPress={() => setWorkerPickerOpen(false)}
            />

            <View
              style={[
                wm.sheet,
                { paddingBottom: 24 + Math.max(insets.bottom, 12) },
              ]}
            >
              <View style={wm.handle} />

              <View style={wm.header}>
                <Text style={wm.title}>근무자 선택</Text>

                <TouchableOpacity onPress={() => setWorkerPickerOpen(false)}>
                  <Ionicons name="close" size={22} color="#777" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {workerSelectList.length > 0 ? (
                  workerSelectList.map((user, index) => {
                    const userId = getUserId(user);
                    const name = getDisplayName(user);
                    const selected =
                      selectedUserId != null &&
                      userId != null &&
                      Number(selectedUserId) === Number(userId);

                    const isMe =
                      currentUserProfile ? isSameUser(user, currentUserProfile) : false;

                    return (
                      <TouchableOpacity
                        key={`worker-${userId ?? 'no-id'}-${normalizeText(name)}-${index}`}
                        style={[
                          wm.userItem,
                          (selected || (isMe && selectedWorkerIsMe)) && wm.userItemActive,
                        ]}
                        onPress={() => handleSelectWorker(user)}
                        activeOpacity={0.8}
                      >
                        <View style={wm.userIcon}>
                          <Ionicons
                            name={isMe ? 'person-circle' : 'person'}
                            size={18}
                            color={
                              selected || (isMe && selectedWorkerIsMe)
                                ? MAIN_COLOR
                                : '#888'
                            }
                          />
                        </View>

                        <View style={{ flex: 1 }}>
                          <View style={wm.nameRow}>
                            <Text
                              style={[
                                wm.userName,
                                (selected || (isMe && selectedWorkerIsMe)) &&
                                  wm.userNameActive,
                              ]}
                            >
                              {name}
                            </Text>

                            {isMe && (
                              <View style={wm.meBadge}>
                                <Text style={wm.meBadgeText}>나</Text>
                              </View>
                            )}
                          </View>

                          {!!user.role && <Text style={wm.userRole}>{user.role}</Text>}
                        </View>

                        {(selected || (isMe && selectedWorkerIsMe)) && (
                          <Ionicons name="checkmark-circle" size={20} color={MAIN_COLOR} />
                        )}
                      </TouchableOpacity>
                    );
                  })
                ) : (
                  <View style={wm.emptyBox}>
                    <Text style={wm.emptyText}>불러온 근무자 목록이 없습니다.</Text>
                    <Text style={wm.emptySubText}>
                      사업장 근무자 API 응답 형식을 확인해주세요.
                    </Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </>
  );
}

const wm = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.32)',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    maxHeight: '75%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E0E0E0',
    alignSelf: 'center',
    marginBottom: 18,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111',
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: '#F8F9FA',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  userItemActive: {
    backgroundColor: '#F3F5FF',
    borderColor: MAIN_COLOR,
  },
  userIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#222',
  },
  userNameActive: {
    color: MAIN_COLOR,
  },
  meBadge: {
    marginLeft: 6,
    backgroundColor: '#EEF0FF',
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  meBadgeText: {
    fontSize: 10,
    color: MAIN_COLOR,
    fontWeight: '800',
  },
  userRole: {
    marginTop: 2,
    fontSize: 11,
    color: '#999',
    fontWeight: '600',
  },
  emptyBox: {
    paddingVertical: 36,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#777',
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySubText: {
    fontSize: 12,
    color: '#AAA',
    fontWeight: '500',
  },
});

const s = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    backgroundColor: '#FFFFFF',
  },
  backBtn: {
    padding: 5,
    width: 38,
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111',
    marginBottom: 24,
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F6F7FF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 18,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 13,
    color: MAIN_COLOR,
    fontWeight: '700',
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111',
    marginBottom: 8,
  },
  helperText: {
    fontSize: 12,
    color: '#999999',
    fontWeight: '500',
    marginTop: 7,
    lineHeight: 17,
  },
  inputBox: {
    borderWidth: 1.5,
    borderColor: '#DADADF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  inputBoxActive: {
    borderColor: MAIN_COLOR,
    backgroundColor: '#F5F7FF',
  },
  disabledBox: {
    backgroundColor: '#F3F3F3',
    borderColor: '#E0E0E0',
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#222',
    fontWeight: '500',
  },
  inputText: {
    flex: 1,
    fontSize: 15,
    color: '#222',
    fontWeight: '500',
  },
  noteBox: {
    minHeight: 92,
    alignItems: 'flex-start',
  },
  noteInput: {
    minHeight: 64,
    paddingTop: 0,
  },
  cal: {
    marginTop: 8,
    borderWidth: 1.5,
    borderColor: MAIN_COLOR,
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#F8F9FF',
  },
  calHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  calMonth: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111',
  },
  navBtn: {
    padding: 6,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 4,
  },
  weekTxt: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ABABAB',
    width: 36,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellActive: {
    backgroundColor: MAIN_COLOR,
    borderRadius: 999,
  },
  cellTxt: {
    fontSize: 14,
    color: '#222',
    fontWeight: '500',
  },
  cellTxtActive: {
    color: '#fff',
    fontWeight: '700',
  },
  cellTxtToday: {
    color: MAIN_COLOR,
    fontWeight: '800',
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: MAIN_COLOR,
    position: 'absolute',
    bottom: 4,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  timeCard: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#DADADF',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#FAFAFA',
    alignItems: 'center',
  },
  timeCardActive: {
    borderColor: MAIN_COLOR,
    backgroundColor: '#F5F7FF',
  },
  timeCardLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#AAAAAA',
    marginBottom: 4,
  },
  timeCardValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#444',
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  summaryTxt: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
  },
  bottomBar: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 0,
  },
  confirmBtn: {
    backgroundColor: MAIN_COLOR,
    borderRadius: 16,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: MAIN_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  confirmBtnDisabled: {
    opacity: 0.7,
  },
  confirmTxt: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});