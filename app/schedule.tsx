import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiRequest } from '../utils/api';

const MAIN_COLOR = '#2B50E6';

const WEEKDAY_KR = ['일', '월', '화', '수', '목', '금', '토'];

function formatMonthLabel(date: Date) {
  return `${date.getFullYear()} ${date.getMonth() + 1}월`;
}

function formatTime(time?: string | null) {
  if (!time) return '';

  const parts = time.split(':');

  if (parts.length >= 2) {
    return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
  }

  return time;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getWeekStart(date: Date) {
  const copy = new Date(date);
  const day = copy.getDay();

  copy.setDate(copy.getDate() - day);
  copy.setHours(0, 0, 0, 0);

  return copy;
}

function getWeekDates(baseDate: Date) {
  const start = getWeekStart(baseDate);

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

function toDateString(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');

  return `${y}-${m}-${d}`;
}

function parseDateLocal(dateText: string) {
  const [year, month, day] = dateText.split('-').map(Number);

  if (!year || !month || !day) {
    return new Date();
  }

  return new Date(year, month - 1, day);
}

function formatCardDate(date: Date) {
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

function formatScheduleDateLabel(dateText: string) {
  const date = parseDateLocal(dateText);
  return `${date.getMonth() + 1}월 ${date.getDate()}일 ${WEEKDAY_KR[date.getDay()]}요일`;
}

function getMonthOffsetFromToday(baseDate: Date) {
  const today = new Date();

  return (
    (baseDate.getFullYear() - today.getFullYear()) * 12 +
    (baseDate.getMonth() - today.getMonth())
  );
}

function getDayOffsetFromToday(date: Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(date);
  target.setHours(0, 0, 0, 0);

  return Math.round((target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
}

function normalizeName(value?: string | null) {
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

async function scheduleReadRequest<T>(endpoint: string): Promise<T | null> {
  try {
    return (await apiRequest(endpoint)) as T | null;
  } catch (error: any) {
    console.log('스케줄 조회 실패:', endpoint, error?.message || error);
    return null;
  }
}

async function deleteScheduleByPermission(
  scheduleId: number | string,
  isAdminLike: boolean
) {
  const encodedScheduleId = encodeURIComponent(String(scheduleId));

  if (isAdminLike) {
    await apiRequest(`/schedule/delete-admin?scheduleId=${encodedScheduleId}`, {
      method: 'DELETE',
    });
    return;
  }

  await apiRequest(`/schedule/delete?scheduleId=${encodedScheduleId}`, {
    method: 'DELETE',
  });
}

type UserProfile = {
  id?: number | null;
  userId?: number | null;
  name?: string | null;
  userName?: string | null;
  nickname?: string | null;
  role?: string | null;
};

type ScheduleDate = {
  id?: number | null;
  workDate: string;
  startTime: string;
  endTime: string;
  note?: string | null;
};

type MyScheduleResponse = {
  userId?: number | null;
  userName?: string | null;
  workplaceId?: number | null;
  workplaceName?: string | null;
  scheduleDates?: ScheduleDate[];
};

type ScheduleWorker = {
  id?: number | null;
  userId?: number | null;
  scheduleId?: number | null;
  userName?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  note?: string | null;
};

type ScheduleAllByDate = {
  workDate?: string | null;
  scheduleWorkers?: ScheduleWorker[] | null;
};

type ScheduleItemResponse = {
  id?: number | null;
  userId?: number | null;
  userName?: string | null;
  workplaceId?: number | null;
  workplaceName?: string | null;
  workDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  note?: string | null;
};

type TeamShift = {
  id?: number | null;
  userId?: number | null;
  start: string;
  end: string;
  date: Date;
  originalWorker: string;
  note?: string | null;
  isMine?: boolean;
  isSubstituted: boolean;
  substituteWorker?: string;
};

type SubRequest = {
  id?: number | null;
  shiftId?: number | null;
  date: Date;
  start: string;
  end: string;
};

function makeShiftStableKey(item: TeamShift, index: number) {
  const dateText = toDateString(item.date);

  return [
    item.id ?? 'no-schedule-id',
    item.userId ?? 'no-user-id',
    dateText,
    item.start || 'no-start',
    item.end || 'no-end',
    item.originalWorker || 'no-worker',
    index,
  ].join('-');
}

function makeSubRequestKey(item: SubRequest, index: number) {
  return [
    item.id ?? 'no-request-id',
    item.shiftId ?? 'no-shift-id',
    toDateString(item.date),
    item.start,
    item.end,
    index,
  ].join('-');
}

function makeMyScheduleKey(item: ScheduleDate, index: number) {
  return [
    item.id ?? 'no-id',
    item.workDate,
    item.startTime,
    item.endTime,
    index,
  ].join('-');
}

function getShiftDedupeKey(item: TeamShift) {
  return [
    item.id ?? 'no-schedule-id',
    item.userId ?? 'no-user-id',
    toDateString(item.date),
    item.start,
    item.end,
    item.originalWorker,
  ].join('|');
}

function getLooseShiftIdentityKey(item: TeamShift) {
  return [
    item.userId ?? 'no-user-id',
    toDateString(item.date),
    normalizeName(item.originalWorker),
  ].join('|');
}

function getExactShiftIdentityKey(item: TeamShift) {
  return [
    item.userId ?? 'no-user-id',
    toDateString(item.date),
    item.start,
    item.end,
    normalizeName(item.originalWorker),
  ].join('|');
}

function fillMissingShiftIds(newItems: TeamShift[], oldItems: TeamShift[]) {
  const oldExactMap = new Map<string, TeamShift>();
  const oldLooseMap = new Map<string, TeamShift[]>();

  oldItems.forEach((oldItem) => {
    if (!oldItem.id) return;

    oldExactMap.set(getExactShiftIdentityKey(oldItem), oldItem);

    const looseKey = getLooseShiftIdentityKey(oldItem);
    const list = oldLooseMap.get(looseKey) || [];
    list.push(oldItem);
    oldLooseMap.set(looseKey, list);
  });

  return newItems.map((newItem) => {
    if (newItem.id) return newItem;

    const exactMatched = oldExactMap.get(getExactShiftIdentityKey(newItem));

    if (exactMatched?.id) {
      return {
        ...newItem,
        id: exactMatched.id,
      };
    }

    const looseMatchedList = oldLooseMap.get(getLooseShiftIdentityKey(newItem)) || [];

    if (looseMatchedList.length === 1 && looseMatchedList[0]?.id) {
      return {
        ...newItem,
        id: looseMatchedList[0].id,
      };
    }

    return newItem;
  });
}

function dedupeShifts(items: TeamShift[]) {
  const map = new Map<string, TeamShift>();

  items.forEach((item) => {
    const key = getShiftDedupeKey(item);
    const existing = map.get(key);

    if (!existing) {
      map.set(key, item);
      return;
    }

    map.set(key, {
      ...existing,
      id: existing.id ?? item.id,
      userId: existing.userId ?? item.userId,
      note: existing.note || item.note || '',
      isMine: Boolean(existing.isMine || item.isMine),
      isSubstituted: Boolean(existing.isSubstituted || item.isSubstituted),
      substituteWorker: existing.substituteWorker || item.substituteWorker,
    });
  });

  return Array.from(map.values());
}

function normalizeScheduleWorkers(data: ScheduleAllByDate | null): ScheduleWorker[] {
  if (!data?.scheduleWorkers || !Array.isArray(data.scheduleWorkers)) {
    return [];
  }

  return data.scheduleWorkers;
}

function normalizeScheduleAllList(data: ScheduleAllByDate[] | null): ScheduleAllByDate[] {
  if (!data || !Array.isArray(data)) {
    return [];
  }

  return data;
}

function isMineByUserId(currentUserId?: number, targetUserId?: number | null) {
  if (currentUserId == null || targetUserId == null) {
    return false;
  }

  return Number(currentUserId) === Number(targetUserId);
}

function isMineByUserName(currentUserName: string, targetUserName?: string | null) {
  const me = normalizeName(currentUserName);
  const target = normalizeName(targetUserName);

  if (!me || !target) {
    return false;
  }

  return me === target;
}

function isMyShift(
  shift: TeamShift,
  currentUserId?: number,
  currentUserName: string = ''
) {
  return (
    !!shift.isMine ||
    isMineByUserId(currentUserId, shift.userId) ||
    isMineByUserName(currentUserName, shift.originalWorker)
  );
}

function convertAllScheduleListToShifts(
  data: ScheduleAllByDate[] | null,
  currentUserId?: number,
  currentUserName: string = ''
): TeamShift[] {
  const days = normalizeScheduleAllList(data);

  const converted = days.flatMap((day) => {
    if (!day.workDate) return [];

    return normalizeScheduleWorkers(day)
      .filter((worker) => worker.startTime && worker.endTime)
      .map((worker) => ({
        id: worker.scheduleId ?? worker.id ?? null,
        userId: worker.userId ?? null,
        start: formatTime(worker.startTime),
        end: formatTime(worker.endTime),
        date: parseDateLocal(day.workDate || toDateString(new Date())),
        originalWorker: worker.userName || '이름 없음',
        note: worker.note || '',
        isMine:
          isMineByUserId(currentUserId, worker.userId) ||
          isMineByUserName(currentUserName, worker.userName),
        isSubstituted: false,
      }));
  });

  return dedupeShifts(converted);
}

function convertDateAllToShifts(
  data: ScheduleAllByDate | null,
  currentUserId?: number,
  currentUserName: string = ''
): TeamShift[] {
  if (!data?.workDate) return [];

  const converted = normalizeScheduleWorkers(data)
    .filter((worker) => worker.startTime && worker.endTime)
    .map((worker) => ({
      id: worker.scheduleId ?? worker.id ?? null,
      userId: worker.userId ?? null,
      start: formatTime(worker.startTime),
      end: formatTime(worker.endTime),
      date: parseDateLocal(data.workDate || toDateString(new Date())),
      originalWorker: worker.userName || '이름 없음',
      note: worker.note || '',
      isMine:
        isMineByUserId(currentUserId, worker.userId) ||
        isMineByUserName(currentUserName, worker.userName),
      isSubstituted: false,
    }));

  return dedupeShifts(converted);
}

function convertMyScheduleResponseToShifts(
  data: MyScheduleResponse | null,
  currentUserId?: number,
  currentUserName: string = ''
): TeamShift[] {
  if (!data?.scheduleDates || !Array.isArray(data.scheduleDates)) {
    return [];
  }

  return data.scheduleDates
    .filter((item) => item.workDate && item.startTime && item.endTime)
    .map((item) => ({
      id: item.id ?? null,
      userId: data.userId ?? currentUserId ?? null,
      start: formatTime(item.startTime),
      end: formatTime(item.endTime),
      date: parseDateLocal(item.workDate),
      originalWorker: data.userName || currentUserName || '나',
      note: item.note || '',
      isMine: true,
      isSubstituted: false,
    }));
}

function convertScheduleItemToShift(
  item: ScheduleItemResponse,
  currentUserId?: number,
  currentUserName: string = ''
): TeamShift | null {
  if (!item.workDate || !item.startTime || !item.endTime) {
    return null;
  }

  return {
    id: item.id ?? null,
    userId: item.userId ?? null,
    start: formatTime(item.startTime),
    end: formatTime(item.endTime),
    date: parseDateLocal(item.workDate),
    originalWorker: item.userName || '이름 없음',
    note: item.note || '',
    isMine:
      isMineByUserId(currentUserId, item.userId) ||
      isMineByUserName(currentUserName, item.userName),
    isSubstituted: false,
  };
}

export default function ScheduleScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  const today = useMemo(() => new Date(), []);

  const [selectedDate, setSelectedDate] = useState(today);
  const [currentWeekBase, setCurrentWeekBase] = useState(today);

  const [pickerVisible, setPickerVisible] = useState(false);
  const [tempYear, setTempYear] = useState(today.getFullYear());
  const [tempMonth, setTempMonth] = useState(today.getMonth());

  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [selectedShift, setSelectedShift] = useState<TeamShift | null>(null);

  const [myScheduleModalVisible, setMyScheduleModalVisible] = useState(false);
  const [myScheduleTitle, setMyScheduleTitle] = useState('');
  const [myScheduleSubTitle, setMyScheduleSubTitle] = useState('');
  const [myScheduleItems, setMyScheduleItems] = useState<ScheduleDate[]>([]);

  const [loading, setLoading] = useState(false);
  const [dateLoading, setDateLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [currentUserId, setCurrentUserId] = useState<number | undefined>();
  const [currentUserName, setCurrentUserName] = useState('');
  const [currentUserRole, setCurrentUserRole] = useState('');

  const [shifts, setShifts] = useState<TeamShift[]>([]);
  const [nextShift, setNextShift] = useState<TeamShift | null>(null);
  const [monthScheduleCount, setMonthScheduleCount] = useState(0);
  const [myWeekDateSet, setMyWeekDateSet] = useState<Set<string>>(new Set());

  const [subRequests, setSubRequests] = useState<SubRequest[]>([]);

  const isAdminLike = useMemo(() => {
    return isAdminRole(currentUserRole);
  }, [currentUserRole]);

  const canManageShift = useCallback(
    (shift: TeamShift) => {
      if (isAdminLike) return true;
      return isMyShift(shift, currentUserId, currentUserName);
    },
    [isAdminLike, currentUserId, currentUserName]
  );

  const weekDates = useMemo(() => getWeekDates(currentWeekBase), [currentWeekBase]);

  const visibleWeekRange = useMemo(() => {
    const dates = getWeekDates(currentWeekBase);
    return {
      startDate: toDateString(dates[0]),
      endDate: toDateString(dates[6]),
    };
  }, [currentWeekBase]);

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);
  }, []);

  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => i), []);

  const dailyShifts = useMemo(() => {
    const filtered = shifts
      .filter((item) => isSameDay(item.date, selectedDate))
      .sort((a, b) => a.start.localeCompare(b.start));

    return dedupeShifts(filtered);
  }, [shifts, selectedDate]);

  const dailySubRequests = useMemo(() => {
    return subRequests.filter((item) => isSameDay(item.date, selectedDate));
  }, [subRequests, selectedDate]);

  const loadProfile = useCallback(async () => {
    try {
      const profile = (await apiRequest('/user/profile')) as UserProfile | null;

      if (!profile) return;

      const userId = profile.id ?? profile.userId ?? undefined;
      const role = profile.role ?? '';
      const name = profile.nickname || profile.name || profile.userName || '';

      console.log('현재 사용자 프로필:', {
        userId,
        role,
        name,
        isAdminLike: isAdminRole(role),
      });

      setCurrentUserId(userId || undefined);
      setCurrentUserName(name);
      setCurrentUserRole(role);
    } catch (error: any) {
      console.log('프로필 조회 실패:', error?.message || error);
      setCurrentUserId(undefined);
      setCurrentUserName('');
      setCurrentUserRole('');
    }
  }, []);

  const loadVisibleWeekSchedules = useCallback(async () => {
    setLoading(true);

    try {
      const data = await scheduleReadRequest<ScheduleAllByDate[]>(
        `/schedule/period-all?startDate=${visibleWeekRange.startDate}&endDate=${visibleWeekRange.endDate}`
      );

      const converted = convertAllScheduleListToShifts(
        data,
        currentUserId,
        currentUserName
      );

      setShifts((prev) => {
        const weekStart = parseDateLocal(visibleWeekRange.startDate);
        const weekEnd = parseDateLocal(visibleWeekRange.endDate);

        weekStart.setHours(0, 0, 0, 0);
        weekEnd.setHours(23, 59, 59, 999);

        const outsideWeek = prev.filter((item) => {
          const t = item.date.getTime();
          return t < weekStart.getTime() || t > weekEnd.getTime();
        });

        const convertedWithIds = fillMissingShiftIds(converted, prev);

        return dedupeShifts([...outsideWeek, ...convertedWithIds]);
      });
    } finally {
      setLoading(false);
    }
  }, [
    visibleWeekRange.startDate,
    visibleWeekRange.endDate,
    currentUserId,
    currentUserName,
  ]);

  const loadMyWeekDateDots = useCallback(async () => {
    const data = await scheduleReadRequest<MyScheduleResponse>(
      `/schedule/period?startDate=${visibleWeekRange.startDate}&endDate=${visibleWeekRange.endDate}`
    );

    const nextSet = new Set<string>();

    if (data?.scheduleDates && Array.isArray(data.scheduleDates)) {
      data.scheduleDates.forEach((item) => {
        if (item.workDate) {
          nextSet.add(item.workDate);
        }
      });
    }

    setMyWeekDateSet(nextSet);
  }, [visibleWeekRange.startDate, visibleWeekRange.endDate]);

  const loadSelectedDateSchedules = useCallback(async () => {
    setDateLoading(true);

    try {
      const dateText = toDateString(selectedDate);
      const offset = getDayOffsetFromToday(selectedDate);

      const [allData, myDateData, myDayData] = await Promise.all([
        scheduleReadRequest<ScheduleAllByDate>(
          `/schedule/date-all?date=${dateText}`
        ),
        scheduleReadRequest<MyScheduleResponse>(
          `/schedule/date?date=${dateText}`
        ),
        offset === 0
          ? scheduleReadRequest<MyScheduleResponse>('/schedule/day?offset=0')
          : Promise.resolve(null),
      ]);

      const myDateShifts = convertMyScheduleResponseToShifts(
        myDateData,
        currentUserId,
        currentUserName
      );
      const myTodayShifts = convertMyScheduleResponseToShifts(
        myDayData,
        currentUserId,
        currentUserName
      );
      const allShifts = convertDateAllToShifts(
        allData,
        currentUserId,
        currentUserName
      );

      const selectedDateShifts = dedupeShifts([
        ...myDateShifts,
        ...myTodayShifts,
        ...allShifts,
      ]);

      setShifts((prev) => {
        const sameDayPrevious = prev.filter((item) => isSameDay(item.date, selectedDate));
        const others = prev.filter((item) => !isSameDay(item.date, selectedDate));
        const selectedDateShiftsWithIds = fillMissingShiftIds(
          selectedDateShifts,
          sameDayPrevious
        );

        return dedupeShifts([...others, ...selectedDateShiftsWithIds]);
      });

      setMyWeekDateSet((prev) => {
        const next = new Set(prev);

        [...myDateShifts, ...myTodayShifts].forEach((item) => {
          next.add(toDateString(item.date));
        });

        if (myDateShifts.length > 0 || myTodayShifts.length > 0) {
          next.add(dateText);
        }

        return next;
      });
    } finally {
      setDateLoading(false);
    }
  }, [selectedDate, currentUserId, currentUserName]);

  const loadMonthSchedules = useCallback(async () => {
    const offset = getMonthOffsetFromToday(currentWeekBase);

    const data = await scheduleReadRequest<ScheduleAllByDate[]>(
      `/schedule/month-all?offset=${offset}`
    );

    const days = normalizeScheduleAllList(data);

    const count = days.reduce((sum, day) => {
      return sum + normalizeScheduleWorkers(day).length;
    }, 0);

    setMonthScheduleCount(count);
  }, [currentWeekBase]);

  const loadNextSchedule = useCallback(async () => {
    const data = await scheduleReadRequest<ScheduleItemResponse>('/schedule/next');

    if (!data) {
      setNextShift(null);
      return;
    }

    const converted = convertScheduleItemToShift(
      data,
      currentUserId,
      currentUserName
    );
    setNextShift(converted);
  }, [currentUserId, currentUserName]);

  const refreshAll = useCallback(async () => {
    setRefreshing(true);

    try {
      await Promise.all([
        loadVisibleWeekSchedules(),
        loadMyWeekDateDots(),
        loadSelectedDateSchedules(),
        loadMonthSchedules(),
        loadNextSchedule(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [
    loadVisibleWeekSchedules,
    loadMyWeekDateDots,
    loadSelectedDateSchedules,
    loadMonthSchedules,
    loadNextSchedule,
  ]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  useFocusEffect(
    useCallback(() => {
      refreshAll();
    }, [refreshAll])
  );

  useEffect(() => {
    const selectedDateParam = params.selectedDate;

    if (!selectedDateParam) return;

    const dateText = Array.isArray(selectedDateParam)
      ? selectedDateParam[0]
      : String(selectedDateParam);

    const dateObj = parseDateLocal(dateText);

    setSelectedDate(dateObj);
    setCurrentWeekBase(dateObj);
    setTempYear(dateObj.getFullYear());
    setTempMonth(dateObj.getMonth());
  }, [params.selectedDate, params.refreshAt]);

  const openMyScheduleModal = (
    title: string,
    subTitle: string,
    items: ScheduleDate[]
  ) => {
    setMyScheduleTitle(title);
    setMyScheduleSubTitle(subTitle);
    setMyScheduleItems(
      [...items].sort((a, b) => {
        if (a.workDate !== b.workDate) {
          return a.workDate.localeCompare(b.workDate);
        }
        return a.startTime.localeCompare(b.startTime);
      })
    );
    setMyScheduleModalVisible(true);
  };

  const handlePrevWeek = () => {
    const newDate = new Date(currentWeekBase);
    newDate.setDate(newDate.getDate() - 7);

    setCurrentWeekBase(newDate);

    if (!getWeekDates(newDate).some((d) => isSameDay(d, selectedDate))) {
      setSelectedDate(getWeekDates(newDate)[0]);
    }
  };

  const handleNextWeek = () => {
    const newDate = new Date(currentWeekBase);
    newDate.setDate(newDate.getDate() + 7);

    setCurrentWeekBase(newDate);

    if (!getWeekDates(newDate).some((d) => isSameDay(d, selectedDate))) {
      setSelectedDate(getWeekDates(newDate)[0]);
    }
  };

  const openMonthPicker = () => {
    setTempYear(currentWeekBase.getFullYear());
    setTempMonth(currentWeekBase.getMonth());
    setPickerVisible(true);
  };

  const applyMonthPicker = () => {
    const newDate = new Date(tempYear, tempMonth, 1);

    setCurrentWeekBase(newDate);
    setSelectedDate(newDate);
    setPickerVisible(false);
  };

  const openActionSheet = (shift: TeamShift) => {
    if (!canManageShift(shift)) {
      return;
    }

    setSelectedShift(shift);
    setActionSheetVisible(true);
  };

  const handleEdit = () => {
    if (!selectedShift) return;

    if (!canManageShift(selectedShift)) {
      Alert.alert('수정 불가', '다른 직원의 근무는 수정할 수 없습니다.');
      setActionSheetVisible(false);
      return;
    }

    if (!selectedShift.id) {
      Alert.alert('수정 불가', '스케줄 ID가 없어 수정할 수 없습니다.');
      setActionSheetVisible(false);
      return;
    }

    setActionSheetVisible(false);

    router.push({
      pathname: '/schedule-register',
      params: {
        editId: String(selectedShift.id),
        editUserId: selectedShift.userId ? String(selectedShift.userId) : '',
        editWorker: selectedShift.originalWorker,
        editDate: toDateString(selectedShift.date),
        editTime: `${selectedShift.start} ~ ${selectedShift.end}`,
        editNote: selectedShift.note || '',
        editAsAdmin: isAdminLike ? 'true' : 'false',
      },
    });
  };

  const handleDelete = () => {
    if (!selectedShift) return;

    if (!canManageShift(selectedShift)) {
      Alert.alert('삭제 불가', '다른 직원의 근무는 삭제할 수 없습니다.');
      setActionSheetVisible(false);
      return;
    }

    if (!selectedShift.id) {
      Alert.alert('삭제 불가', '스케줄 ID가 없어 삭제할 수 없습니다.');
      setActionSheetVisible(false);
      return;
    }

    const idToDelete = selectedShift.id;
    const workerName = selectedShift.originalWorker;
    const timeText = `${selectedShift.start} ~ ${selectedShift.end}`;

    setActionSheetVisible(false);

    const showDeleteAlert = () => {
      Alert.alert(
        '근무 삭제',
        `${workerName}의 ${timeText} 근무를 삭제하시겠습니까?`,
        [
          { text: '취소', style: 'cancel' },
          {
            text: '삭제',
            style: 'destructive',
            onPress: async () => {
              try {
                console.log('스케줄 삭제 요청:', {
                  isAdminLike,
                  scheduleId: idToDelete,
                  workerName,
                  timeText,
                });

                await deleteScheduleByPermission(idToDelete, isAdminLike);

                setShifts((prev) =>
                  prev.filter((s) => String(s.id) !== String(idToDelete))
                );

                setSubRequests((prev) =>
                  prev.filter((r) => String(r.shiftId) !== String(idToDelete))
                );

                await refreshAll();

                Alert.alert('삭제 완료', '근무 일정이 삭제되었습니다.');
              } catch (error: any) {
                Alert.alert(
                  '삭제 실패',
                  error?.message || '근무 일정을 삭제하지 못했습니다.'
                );
              }
            },
          },
        ]
      );
    };

    if (Platform.OS === 'web') {
      showDeleteAlert();
    } else {
      setTimeout(showDeleteAlert, 400);
    }
  };

  const handleAcceptSubstitute = (req: SubRequest) => {
    Alert.alert(
      '대타 신청',
      '대타 신청 API가 아직 구현되지 않아 화면 동작만 처리합니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '확인',
          onPress: () => {
            setSubRequests((prev) => prev.filter((r) => r.id !== req.id));
          },
        },
      ]
    );
  };

  const handleLoadWeekMySchedule = async () => {
    const data = await scheduleReadRequest<MyScheduleResponse>(
      `/schedule/period?startDate=${visibleWeekRange.startDate}&endDate=${visibleWeekRange.endDate}`
    );

    if (!data || !data.scheduleDates?.length) {
      Alert.alert('내 주간 스케줄', '이번 주 내 스케줄이 없습니다.');
      return;
    }

    openMyScheduleModal(
      '이번 주 내 근무',
      `${formatScheduleDateLabel(visibleWeekRange.startDate)} ~ ${formatScheduleDateLabel(
        visibleWeekRange.endDate
      )}`,
      data.scheduleDates
    );
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color={MAIN_COLOR} />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>스케줄표</Text>

          <TouchableOpacity onPress={refreshAll} style={styles.refreshButton}>
            <Ionicons name="refresh-outline" size={22} color={MAIN_COLOR} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.contentContainer,
            { paddingBottom: Math.max(insets.bottom + 100, 110) },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refreshAll} />
          }
        >
          <TouchableOpacity
            style={styles.monthButton}
            activeOpacity={0.8}
            onPress={openMonthPicker}
          >
            <Text style={styles.monthButtonText}>
              {formatMonthLabel(currentWeekBase)}
            </Text>
            <Ionicons name="chevron-down" size={16} color="#222222" />
          </TouchableOpacity>

          <View style={styles.monthSummaryBox}>
            <Text style={styles.monthSummaryText}>
              이번 달 전체 근무 {monthScheduleCount}건
            </Text>
          </View>

          {nextShift && (
            <View style={styles.nextCard}>
              <View style={styles.nextIconBox}>
                <Ionicons name="time-outline" size={18} color={MAIN_COLOR} />
              </View>

              <View style={styles.nextInfo}>
                <Text style={styles.nextLabel}>가장 가까운 다음 근무</Text>
                <Text style={styles.nextText}>
                  {formatCardDate(nextShift.date)} {nextShift.start} ~ {nextShift.end}
                </Text>
              </View>
            </View>
          )}

          <View style={styles.weekRowWrapper}>
            <TouchableOpacity style={styles.arrowButton} onPress={handlePrevWeek}>
              <Ionicons name="chevron-back" size={20} color={MAIN_COLOR} />
            </TouchableOpacity>

            <View style={styles.weekRow}>
              {weekDates.map((date) => {
                const dateText = toDateString(date);
                const active = isSameDay(date, selectedDate);

                const hasMyEvent =
                  myWeekDateSet.has(dateText) ||
                  shifts.some(
                    (s) =>
                      isSameDay(s.date, date) &&
                      isMyShift(s, currentUserId, currentUserName)
                  );

                return (
                  <TouchableOpacity
                    key={`week-${dateText}`}
                    style={[styles.dayChip, active && styles.dayChipActive]}
                    activeOpacity={0.85}
                    onPress={() => setSelectedDate(date)}
                  >
                    <Text style={[styles.dayNumber, active && styles.dayNumberActive]}>
                      {date.getDate()}
                    </Text>

                    <Text style={[styles.dayLabel, active && styles.dayLabelActive]}>
                      {WEEKDAY_KR[date.getDay()]}
                    </Text>

                    <View
                      style={[
                        styles.eventDot,
                        !hasMyEvent && styles.eventDotHidden,
                        active && hasMyEvent && styles.eventDotActive,
                      ]}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity style={styles.arrowButton} onPress={handleNextWeek}>
              <Ionicons name="chevron-forward" size={20} color={MAIN_COLOR} />
            </TouchableOpacity>
          </View>

          <View style={styles.quickButtonRow}>
            <TouchableOpacity
              style={styles.quickButtonFull}
              onPress={handleLoadWeekMySchedule}
            >
              <Ionicons name="calendar-number-outline" size={16} color={MAIN_COLOR} />
              <Text style={styles.quickButtonText}>이번 주 내 근무</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="calendar-outline" size={18} color="#151515" />
              <Text style={styles.sectionTitle}>
                {selectedDate.getDate()}일 전체 근무
              </Text>

              {(loading || dateLoading) && (
                <ActivityIndicator
                  size="small"
                  color={MAIN_COLOR}
                  style={{ marginLeft: 8 }}
                />
              )}
            </View>

            {dailyShifts.length > 0 ? (
              dailyShifts.map((item, index) => {
                const itemIsMine = isMyShift(item, currentUserId, currentUserName);
                const showMoreButton = canManageShift(item);

                return (
                  <View key={makeShiftStableKey(item, index)} style={styles.shiftCard}>
                    <View style={styles.shiftCardLeft}>
                      <View style={styles.shiftTopRow}>
                        <Text style={styles.shiftTimeText}>
                          {item.start} ~ {item.end}
                        </Text>

                        {itemIsMine && (
                          <View style={styles.myBadge}>
                            <Text style={styles.myBadgeText}>내 근무</Text>
                          </View>
                        )}
                      </View>

                      {item.isSubstituted ? (
                        <View style={styles.substitutedRow}>
                          <Text style={styles.originalWorkerText}>
                            {item.originalWorker}
                          </Text>
                          <Ionicons
                            name="arrow-forward"
                            size={14}
                            color={MAIN_COLOR}
                            style={{ marginHorizontal: 6 }}
                          />
                          <Text style={styles.substituteWorkerText}>
                            {item.substituteWorker} 근무
                          </Text>
                        </View>
                      ) : (
                        <Text style={styles.normalWorkerText}>
                          {item.originalWorker} 근무
                        </Text>
                      )}

                      {!!item.note && (
                        <Text style={styles.noteText}>메모: {item.note}</Text>
                      )}
                    </View>

                    {showMoreButton && (
                      <TouchableOpacity
                        style={styles.moreBtn}
                        onPress={() => openActionSheet(item)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="ellipsis-vertical" size={18} color="#BBBBBB" />
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })
            ) : (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>예정된 근무 일정이 없어요.</Text>
              </View>
            )}
          </View>

          {dailySubRequests.length > 0 && (
            <View style={[styles.sectionContainer, { marginTop: 10 }]}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="notifications-outline" size={18} color="#151515" />
                <Text style={styles.sectionTitle}>대타 요청</Text>
              </View>

              {dailySubRequests.map((req, index) => (
                <View key={makeSubRequestKey(req, index)} style={styles.subRequestCard}>
                  <View>
                    <Text style={styles.shiftTimeText}>
                      {req.start} ~ {req.end}
                    </Text>
                    <Text style={styles.subRequestDate}>
                      {formatCardDate(req.date)}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.applyButton}
                    onPress={() => handleAcceptSubstitute(req)}
                  >
                    <Text style={styles.applyButtonText}>신청하기</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        <View
          style={[
            styles.bottomButtonContainer,
            { paddingBottom: Math.max(insets.bottom, 6) },
          ]}
        >
          <TouchableOpacity
            style={styles.registerButton}
            onPress={() => router.push('/schedule-register')}
          >
            <Text style={styles.registerButtonText}>근무 등록</Text>
          </TouchableOpacity>
        </View>

        <Modal
          visible={myScheduleModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setMyScheduleModalVisible(false)}
        >
          <View style={styles.myModalOverlay}>
            <TouchableOpacity
              style={styles.myModalBackdrop}
              activeOpacity={1}
              onPress={() => setMyScheduleModalVisible(false)}
            />

            <View
              style={[
                styles.myModalSheet,
                { paddingBottom: 24 + Math.max(insets.bottom, 12) },
              ]}
            >
              <View style={styles.myModalHandle} />

              <View style={styles.myModalHeader}>
                <View>
                  <Text style={styles.myModalTitle}>{myScheduleTitle}</Text>
                  <Text style={styles.myModalSubTitle}>{myScheduleSubTitle}</Text>
                </View>

                <TouchableOpacity
                  style={styles.myModalCloseBtn}
                  onPress={() => setMyScheduleModalVisible(false)}
                >
                  <Ionicons name="close" size={20} color="#777777" />
                </TouchableOpacity>
              </View>

              <View style={styles.myModalSummary}>
                <View style={styles.myModalSummaryIcon}>
                  <Ionicons name="briefcase-outline" size={18} color={MAIN_COLOR} />
                </View>

                <Text style={styles.myModalSummaryText}>
                  총 {myScheduleItems.length}개의 근무가 있어요
                </Text>
              </View>

              <ScrollView
                style={styles.myScheduleList}
                contentContainerStyle={styles.myScheduleListContent}
                showsVerticalScrollIndicator={false}
              >
                {myScheduleItems.map((item, index) => (
                  <View key={makeMyScheduleKey(item, index)} style={styles.myScheduleCard}>
                    <View style={styles.myScheduleDateBadge}>
                      <Text style={styles.myScheduleDateMonth}>
                        {parseDateLocal(item.workDate).getMonth() + 1}월
                      </Text>
                      <Text style={styles.myScheduleDateDay}>
                        {parseDateLocal(item.workDate).getDate()}
                      </Text>
                    </View>

                    <View style={styles.myScheduleInfo}>
                      <Text style={styles.myScheduleDateText}>
                        {formatScheduleDateLabel(item.workDate)}
                      </Text>

                      <Text style={styles.myScheduleTimeText}>
                        {formatTime(item.startTime)} ~ {formatTime(item.endTime)}
                      </Text>

                      {!!item.note && (
                        <View style={styles.myScheduleNoteBox}>
                          <Ionicons name="document-text-outline" size={13} color="#888" />
                          <Text style={styles.myScheduleNoteText}>{item.note}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        <Modal
          visible={actionSheetVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setActionSheetVisible(false)}
        >
          <View style={styles.asOverlay}>
            <TouchableOpacity
              style={styles.asBackdrop}
              activeOpacity={1}
              onPress={() => setActionSheetVisible(false)}
            />

            <View
              style={[
                styles.asSheet,
                { paddingBottom: Math.max(insets.bottom, 6) },
              ]}
            >
              <View style={styles.asHandle} />

              {selectedShift && (
                <View style={styles.asInfo}>
                  <Text style={styles.asInfoWorker}>
                    {selectedShift.originalWorker}
                  </Text>
                  <Text style={styles.asInfoTime}>
                    {selectedShift.start} ~ {selectedShift.end}
                  </Text>

                  {!!selectedShift.note && (
                    <Text style={styles.asInfoNote}>{selectedShift.note}</Text>
                  )}
                </View>
              )}

              <View style={styles.asDivider} />

              <TouchableOpacity style={styles.asItem} onPress={handleEdit}>
                <View style={styles.asIconWrap}>
                  <Ionicons name="create-outline" size={20} color={MAIN_COLOR} />
                </View>

                <Text style={styles.asItemText}>수정하기</Text>
                <Ionicons name="chevron-forward" size={18} color="#CCCCCC" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.asItem} onPress={handleDelete}>
                <View style={[styles.asIconWrap, { backgroundColor: '#FFF0F0' }]}>
                  <Ionicons name="trash-outline" size={20} color="#FF4444" />
                </View>

                <Text style={[styles.asItemText, { color: '#FF4444' }]}>
                  삭제하기
                </Text>
                <Ionicons name="chevron-forward" size={18} color="#CCCCCC" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.asCancelBtn}
                onPress={() => setActionSheetVisible(false)}
              >
                <Text style={styles.asCancelText}>취소</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal
          visible={pickerVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setPickerVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>년 / 월 선택</Text>

              <Text style={styles.modalSectionLabel}>년도</Text>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.pickerRow}
              >
                {years.map((year) => {
                  const selected = tempYear === year;

                  return (
                    <TouchableOpacity
                      key={`year-${year}`}
                      style={[styles.pickerChip, selected && styles.pickerChipActive]}
                      onPress={() => setTempYear(year)}
                    >
                      <Text
                        style={[
                          styles.pickerChipText,
                          selected && styles.pickerChipTextActive,
                        ]}
                      >
                        {year}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <Text style={styles.modalSectionLabel}>월</Text>

              <View style={styles.monthGrid}>
                {months.map((month) => {
                  const selected = tempMonth === month;

                  return (
                    <TouchableOpacity
                      key={`month-${month}`}
                      style={[styles.monthCell, selected && styles.monthCellActive]}
                      onPress={() => setTempMonth(month)}
                    >
                      <Text
                        style={[
                          styles.monthCellText,
                          selected && styles.monthCellTextActive,
                        ]}
                      >
                        {month + 1}월
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.modalButtonRow}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setPickerVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>취소</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.confirmButton} onPress={applyMonthPicker}>
                  <Text style={styles.confirmButtonText}>확인</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scroll: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: 10,
  },
  header: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 5,
    width: 38,
    alignItems: 'flex-start',
  },
  refreshButton: {
    padding: 5,
    width: 38,
    alignItems: 'flex-end',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
  },
  monthButton: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 10,
    marginTop: 4,
  },
  monthButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222222',
  },
  monthSummaryBox: {
    alignSelf: 'center',
    backgroundColor: '#F0F3FF',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginBottom: 12,
  },
  monthSummaryText: {
    fontSize: 12,
    color: MAIN_COLOR,
    fontWeight: '700',
  },
  nextCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E4E8FF',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  nextIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#EEF0FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  nextInfo: {
    flex: 1,
  },
  nextLabel: {
    fontSize: 12,
    color: '#777',
    fontWeight: '600',
    marginBottom: 3,
  },
  nextText: {
    fontSize: 14,
    color: '#222',
    fontWeight: '700',
  },
  weekRowWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  arrowButton: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'space-between',
    marginHorizontal: 6,
  },
  dayChip: {
    width: 38,
    height: 64,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: '#D7D7D7',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingTop: 7,
    paddingBottom: 6,
  },
  dayChipActive: {
    backgroundColor: MAIN_COLOR,
    borderColor: MAIN_COLOR,
  },
  dayNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F1F1F',
    marginBottom: 2,
  },
  dayNumberActive: {
    color: '#FFFFFF',
  },
  dayLabel: {
    fontSize: 10,
    color: '#5F5F5F',
    fontWeight: '500',
    marginBottom: 5,
  },
  dayLabelActive: {
    color: '#FFFFFF',
  },
  eventDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: MAIN_COLOR,
  },
  eventDotHidden: {
    opacity: 0,
  },
  eventDotActive: {
    backgroundColor: '#FFFFFF',
  },
  quickButtonRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  quickButtonFull: {
    flex: 1,
    backgroundColor: '#F6F7FF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E6FF',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  quickButtonText: {
    fontSize: 13,
    color: MAIN_COLOR,
    fontWeight: '700',
  },
  sectionContainer: {
    backgroundColor: '#EEF0FF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#151515',
    marginLeft: 6,
  },
  shiftCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  shiftCardLeft: {
    flex: 1,
  },
  shiftTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  shiftTimeText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#262626',
  },
  myBadge: {
    backgroundColor: '#EEF0FF',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: 8,
  },
  myBadgeText: {
    fontSize: 10,
    color: MAIN_COLOR,
    fontWeight: '700',
  },
  normalWorkerText: {
    fontSize: 13,
    color: '#767676',
    fontWeight: '500',
  },
  noteText: {
    marginTop: 6,
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  moreBtn: {
    padding: 4,
    marginLeft: 8,
  },
  substitutedRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  originalWorkerText: {
    fontSize: 13,
    color: '#B0B0B0',
    fontWeight: '500',
    textDecorationLine: 'line-through',
  },
  substituteWorkerText: {
    fontSize: 14,
    color: MAIN_COLOR,
    fontWeight: '700',
  },
  emptyBox: {
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#8A8A8A',
  },
  subRequestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subRequestDate: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  applyButton: {
    borderWidth: 1,
    borderColor: MAIN_COLOR,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  applyButtonText: {
    color: MAIN_COLOR,
    fontSize: 13,
    fontWeight: '600',
  },
  bottomButtonContainer: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  registerButton: {
    backgroundColor: MAIN_COLOR,
    borderRadius: 16,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  registerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  myModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  myModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.32)',
  },
  myModalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    maxHeight: '82%',
  },
  myModalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E0E0E0',
    alignSelf: 'center',
    marginBottom: 18,
  },
  myModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  myModalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111111',
    marginBottom: 5,
  },
  myModalSubTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888888',
    lineHeight: 17,
  },
  myModalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  myModalSummary: {
    backgroundColor: '#F3F5FF',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  myModalSummaryIcon: {
    width: 32,
    height: 32,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  myModalSummaryText: {
    fontSize: 14,
    color: MAIN_COLOR,
    fontWeight: '800',
  },
  myScheduleList: {
    maxHeight: 440,
  },
  myScheduleListContent: {
    paddingBottom: 8,
  },
  myScheduleCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#ECEEFF',
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  myScheduleDateBadge: {
    width: 54,
    height: 62,
    borderRadius: 16,
    backgroundColor: '#EEF0FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  myScheduleDateMonth: {
    fontSize: 11,
    color: MAIN_COLOR,
    fontWeight: '700',
    marginBottom: 2,
  },
  myScheduleDateDay: {
    fontSize: 22,
    color: MAIN_COLOR,
    fontWeight: '900',
  },
  myScheduleInfo: {
    flex: 1,
  },
  myScheduleDateText: {
    fontSize: 12,
    color: '#888888',
    fontWeight: '700',
    marginBottom: 5,
  },
  myScheduleTimeText: {
    fontSize: 18,
    color: '#222222',
    fontWeight: '800',
  },
  myScheduleNoteBox: {
    marginTop: 8,
    backgroundColor: '#F8F8F8',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  myScheduleNoteText: {
    flex: 1,
    fontSize: 12,
    color: '#777777',
    fontWeight: '600',
  },
  asOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  asBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.32)',
  },
  asSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  asHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E0E0E0',
    alignSelf: 'center',
    marginBottom: 20,
  },
  asInfo: {
    marginBottom: 14,
    alignItems: 'center',
  },
  asInfoWorker: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
    marginBottom: 4,
  },
  asInfoTime: {
    fontSize: 14,
    color: '#888',
    fontWeight: '500',
  },
  asInfoNote: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  asDivider: {
    height: 1,
    backgroundColor: '#F2F2F2',
    marginBottom: 10,
  },
  asItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 14,
  },
  asIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F0F3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  asItemText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
  },
  asCancelBtn: {
    marginTop: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  asCancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#888',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.28)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1B1B1B',
    marginBottom: 18,
  },
  modalSectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#444444',
    marginBottom: 10,
    marginTop: 4,
  },
  pickerRow: {
    paddingBottom: 8,
    gap: 8,
  },
  pickerChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: '#F3F4F8',
    marginRight: 8,
  },
  pickerChipActive: {
    backgroundColor: MAIN_COLOR,
  },
  pickerChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B4B4B',
  },
  pickerChipTextActive: {
    color: '#FFFFFF',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 2,
    marginBottom: 10,
  },
  monthCell: {
    width: '30%',
    backgroundColor: '#F3F4F8',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  monthCellActive: {
    backgroundColor: MAIN_COLOR,
  },
  monthCellText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B4B4B',
  },
  monthCellTextActive: {
    color: '#FFFFFF',
  },
  modalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 8,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#777777',
  },
  confirmButton: {
    backgroundColor: MAIN_COLOR,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});