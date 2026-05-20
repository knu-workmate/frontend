import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiRequest } from '../../utils/api';

import WORKY_LOGO from '../../assets/images/worky_logo.png';

const MAIN_COLOR = '#2140DC';
const LIGHT_MAIN_COLOR = '#EEF1FF';

type UserData = {
  name: string;
  role: string;
  workplaceName: string;
  time: string;
};

type Notice = {
  id: number;
  title: string;
  isNew: boolean;
  boardId: string;
  boardName: string;
  boardCategory: string;
  createdAt: string;
};

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [userData, setUserData] = useState<UserData>({
    name: '사용자',
    role: '알바생',
    workplaceName: '사업장 정보 없음',
    time: '오늘 근무 확인 필요',
  });

  const [avatarColor, setAvatarColor] = useState(MAIN_COLOR);
  const [noticeList, setNoticeList] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);

  const menuItems = [
    { id: 1, name: '게시판', icon: 'create-outline', path: '/board' },
    { id: 2, name: '투두리스트', icon: 'checkbox-outline', path: '/todolist' },
    { id: 3, name: '대타신청', icon: 'link-outline', path: '/substitute' },
    { id: 4, name: '스케줄표', icon: 'calendar-outline', path: '/schedule' },
  ];

  const getRoleText = (role: any) => {
    if (
      role === 1 ||
      role === true ||
      role === '1' ||
      role === 'OWNER' ||
      role === 'owner' ||
      role === 'ADMIN' ||
      role === 'admin' ||
      role === 'BOSS' ||
      role === 'boss' ||
      role === '사장님'
    ) {
      return '사장님';
    }

    return '알바생';
  };

  const getAvatarColorKey = (
    profileUserId?: number | null,
    profileEmail?: string
  ) => {
    if (profileUserId !== null && profileUserId !== undefined) {
      return `avatarColor_${profileUserId}`;
    }

    if (profileEmail) {
      return `avatarColor_${profileEmail}`;
    }

    return null;
  };

  const loadAvatarColor = async (
    profileUserId?: number | null,
    profileEmail?: string
  ) => {
    try {
      const key = getAvatarColorKey(profileUserId, profileEmail);

      if (!key) {
        setAvatarColor(MAIN_COLOR);
        return;
      }

      const savedColor = await AsyncStorage.getItem(key);

      if (savedColor !== null) {
        setAvatarColor(savedColor);
      } else {
        setAvatarColor(MAIN_COLOR);
      }
    } catch (e) {
      console.log('색상 불러오기 오류:', e);
      setAvatarColor(MAIN_COLOR);
    }
  };

  const loadHomeData = async () => {
    setLoading(true);

    try {
      const profileResult = await apiRequest('/user/profile');

      const profileUserId = profileResult?.id ?? profileResult?.userId ?? null;
      const profileEmail = profileResult?.email ?? '';

      setUserData((prev) => ({
        ...prev,
        name: profileResult?.name ?? profileResult?.nickname ?? '사용자',
        role: getRoleText(
          profileResult?.role ??
            profileResult?.userRole ??
            profileResult?.authority ??
            profileResult?.isAdmin ??
            profileResult?.admin
        ),
      }));

      if (profileResult?.avatarColor) {
        setAvatarColor(profileResult.avatarColor);
      } else {
        await loadAvatarColor(profileUserId, profileEmail);
      }
    } catch (error: any) {
      console.log('프로필 조회 실패:', error.message);
      setAvatarColor(MAIN_COLOR);
    }

    try {
      const workplaceResult = await apiRequest('/workplace/info');

      setUserData((prev) => ({
        ...prev,
        workplaceName:
          workplaceResult?.name ??
          workplaceResult?.workplaceName ??
          '사업장 정보 없음',
      }));
    } catch (error: any) {
      console.log('사업장 정보 조회 실패:', error.message);
    }

    try {
      const boardsResult = await apiRequest('/boards/my');

      const boardsArray = Array.isArray(boardsResult)
        ? boardsResult
        : boardsResult?.boards ?? boardsResult?.content ?? [];

      if (boardsArray.length === 0) {
        setNoticeList([]);
        setLoading(false);
        return;
      }

      const allNotices: Notice[] = [];

      await Promise.all(
        boardsArray.map(async (board: any) => {
          const boardId = board.boardId ?? board.id;
          const boardName = board.boardName ?? board.name ?? '게시판';
          const boardType = board.type ?? '';
          const boardCategory = boardType === 'NOTICE' ? '공지' : '일반';

          if (!boardId) return;

          try {
            const postsResult = await apiRequest(`/boards/${boardId}/posts`);

            const postsArray = Array.isArray(postsResult)
              ? postsResult
              : postsResult?.posts ?? postsResult?.content ?? [];

            postsArray.forEach((post: any, index: number) => {
              allNotices.push({
                id: post.postId ?? post.id ?? index,
                title: post.title ?? '제목 없음',
                isNew: false,
                boardId: String(boardId),
                boardName,
                boardCategory,
                createdAt: post.createdAt ?? '',
              });
            });
          } catch (e) {}
        })
      );

      const sorted = allNotices
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        .slice(0, 4)
        .map((notice, index) => ({
          ...notice,
          isNew: index === 0,
        }));

      setNoticeList(sorted);
    } catch (error: any) {
      console.log('게시판 또는 게시글 조회 실패:', error.message);
      setNoticeList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHomeData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadHomeData();
    }, [])
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={MAIN_COLOR} />
          <Text style={styles.loadingText}>메인 화면을 불러오는 중...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: insets.bottom + 150 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerTextGroup}>
            <Text style={styles.greetingTitle}>Hi </Text>
            <Text style={styles.userNameText}>{userData.name}</Text>
          </View>

          <TouchableOpacity onPress={() => router.push('/notification')}>
            <Ionicons name="notifications-outline" size={26} color={MAIN_COLOR} />
          </TouchableOpacity>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.profileAvatarGroup}>
            <View style={[styles.avatarIcon, { backgroundColor: avatarColor }]}>
              <Ionicons
                name={userData.role === '사장님' ? 'briefcase-outline' : 'happy-outline'}
                size={28}
                color="#FFFFFF"
              />
            </View>

            <View>
              <Text style={styles.cardName}>{userData.name}</Text>
              <Text style={styles.cardRole}>{userData.role}</Text>
            </View>
          </View>

          <View style={styles.cardDivider} />

          <View style={styles.profileCardBottom}>
            <View style={styles.cardInfoItem}>
              <Ionicons name="business-outline" size={16} color="#FFFFFF" />
              <Text style={styles.cardInfoText}>{userData.workplaceName}</Text>
            </View>

            <View style={styles.cardInfoItem}>
              <Ionicons name="time-outline" size={16} color="#FFFFFF" />
              <Text style={styles.cardInfoText}>{userData.time}</Text>
            </View>
          </View>
        </View>

        <View style={styles.menuContainer}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.menuItem}
              onPress={() => router.push(item.path as any)}
            >
              <View style={styles.menuIconCircle}>
                <Ionicons name={item.icon as any} size={28} color={MAIN_COLOR} />
              </View>

              <Text style={styles.menuName}>{item.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.noticeSection}>
          <Text style={styles.noticeTitle}>공지사항</Text>

          <View style={styles.noticeCard}>
            {noticeList.length > 0 ? (
              noticeList.map((notice) => (
                <TouchableOpacity
                  key={notice.id}
                  style={styles.noticeItem}
                  activeOpacity={0.7}
                  onPress={() => {
                    router.push({
                      pathname: '/post-list',
                      params: {
                        boardId: notice.boardId,
                        boardTitle: notice.boardName,
                        category: notice.boardCategory,
                      },
                    });
                  }}
                >
                  <View style={styles.noticeItemContent}>
                    <View
                      style={[
                        styles.noticeBoardBadge,
                        {
                          backgroundColor:
                            notice.boardCategory === '공지' ? '#F0F4FF' : '#F5F5F5',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.noticeBoardText,
                          {
                            color:
                              notice.boardCategory === '공지' ? '#2140DC' : '#333333',
                          },
                        ]}
                      >
                        {notice.boardName}
                      </Text>
                    </View>

                    <Text style={styles.noticeItemTitle} numberOfLines={1}>
                      {notice.title}
                    </Text>
                  </View>

                  {notice.isNew && (
                    <View style={styles.newBadge}>
                      <Text style={styles.newBadgeText}>NEW</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.emptyNoticeText}>등록된 공지사항이 없습니다.</Text>
            )}
          </View>
        </View>
      </ScrollView>

      <TouchableOpacity
        style={[styles.floatingButton, { bottom: insets.bottom }]}
        onPress={() => router.push('/chatbot')}
        activeOpacity={0.85}
      >
        <Image source={WORKY_LOGO} style={styles.workyIcon} />
        <Text style={styles.floatingText}>워키</Text>
      </TouchableOpacity>
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
  },

  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: 26,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    marginTop: 12,
    color: '#777777',
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },

  headerTextGroup: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },

  greetingTitle: {
    fontSize: 26,
    color: '#222222',
    fontWeight: 'bold',
  },

  userNameText: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#222222',
  },

  profileCard: {
    backgroundColor: MAIN_COLOR,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 22,
    borderRadius: 20,
    marginBottom: 32,
  },

  profileAvatarGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatarIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    marginRight: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },

  cardName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },

  cardRole: {
    color: '#DDE3FF',
    marginTop: 4,
    fontSize: 14,
  },

  cardDivider: {
    height: 1,
    backgroundColor: '#DDE3FF',
    opacity: 0.5,
    marginTop: 22,
    marginBottom: 18,
  },

  profileCardBottom: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  cardInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginTop: 4,
  },

  cardInfoText: {
    color: '#FFFFFF',
    marginLeft: 6,
    fontSize: 14,
  },

  menuContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 0,
    marginBottom: 38,
  },

  menuItem: {
    alignItems: 'center',
    width: '22%',
  },

  menuIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: LIGHT_MAIN_COLOR,
    justifyContent: 'center',
    alignItems: 'center',
  },

  menuName: {
    marginTop: 8,
    fontSize: 13,
    color: '#555555',
  },

  noticeSection: {
    marginTop: 0,
  },

  noticeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222222',
    marginBottom: 12,
  },

  noticeCard: {
    marginTop: 0,
    borderWidth: 1,
    borderColor: '#D7DCFF',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
    paddingVertical: 18,
    minHeight: 180,
    borderRadius: 16,
  },

  noticeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF0FF',
  },

  noticeItemContent: {
    flex: 1,
    flexDirection: 'column',
  },

  noticeBoardBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },

  noticeBoardText: {
    fontSize: 11,
    fontWeight: '600',
  },

  noticeItemTitle: {
    fontSize: 14,
    color: '#333333',
  },

  newBadge: {
    backgroundColor: MAIN_COLOR,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginLeft: 8,
  },

  newBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },

  emptyNoticeText: {
    color: '#999999',
  },

  floatingButton: {
    position: 'absolute',
    right: 24,
    backgroundColor: MAIN_COLOR,
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
  },

  workyIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'transparent',
  },

  floatingText: {
    color: '#FFFFFF',
    fontSize: 10,
    marginTop: 2,
  },
});