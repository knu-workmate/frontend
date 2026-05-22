import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ListRenderItem,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { apiRequest } from '../utils/api';

const MAIN_COLOR = '#2140DC';

type NotificationItem = {
  id: number;
  title: string;
  content: string;
  isRead: boolean;
  createdAt: string;
};

function formatNotificationTime(createdAt?: string) {
  if (!createdAt) return '';

  const createdDate = new Date(createdAt);
  const now = new Date();

  if (Number.isNaN(createdDate.getTime())) {
    return '';
  }

  const diffMs = now.getTime() - createdDate.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return '방금 전';
  if (diffMinutes < 60) return `${diffMinutes}분 전`;
  if (diffHours < 24) return `${diffHours}시간 전`;
  if (diffDays === 1) return '어제';
  if (diffDays < 7) return `${diffDays}일 전`;

  const year = createdDate.getFullYear();
  const month = String(createdDate.getMonth() + 1).padStart(2, '0');
  const day = String(createdDate.getDate()).padStart(2, '0');

  return `${year}.${month}.${day}`;
}

function normalizeNotificationList(data: any): NotificationItem[] {
  if (!data) {
    return [];
  }

  if (Array.isArray(data)) {
    return data.map((item) => ({
      id: Number(item.id),
      title: item.title ?? '알림',
      content: item.content ?? '',
      isRead: Boolean(item.isRead),
      createdAt: item.createdAt ?? '',
    }));
  }

  if (Array.isArray(data.notifications)) {
    return normalizeNotificationList(data.notifications);
  }

  if (Array.isArray(data.content)) {
    return normalizeNotificationList(data.content);
  }

  if (Array.isArray(data.data)) {
    return normalizeNotificationList(data.data);
  }

  return [];
}

export default function NotificationScreen() {
  const router = useRouter();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadNotifications = async () => {
    try {
      setErrorMessage('');

      const result = await apiRequest('/api/notifications');

      const notificationList = normalizeNotificationList(result).sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setNotifications(notificationList);
    } catch (error: any) {
      console.log('알림 목록 조회 실패:', error?.message || error);
      setErrorMessage('알림을 불러오지 못했습니다.');
      setNotifications([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
  };

  const handlePressNotification = async (item: NotificationItem) => {
    if (item.isRead) {
      return;
    }

    try {
      await apiRequest(`/api/notifications/${item.id}/read`, {
        method: 'PATCH',
      });

      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === item.id
            ? {
                ...notification,
                isRead: true,
              }
            : notification
        )
      );
    } catch (error: any) {
      console.log('알림 읽음 처리 실패:', error?.message || error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadNotifications();
    }, [])
  );

  const renderItem: ListRenderItem<NotificationItem> = ({ item }) => {
    return (
      <TouchableOpacity
        style={[styles.notificationItem, item.isRead ? styles.readItem : null]}
        activeOpacity={0.75}
        onPress={() => handlePressNotification(item)}
      >
        <View
          style={[
            styles.iconContainer,
            item.isRead ? styles.readIconContainer : null,
          ]}
        >
          <Ionicons
            name="notifications-outline"
            size={20}
            color={item.isRead ? '#A0A0A0' : MAIN_COLOR}
          />
        </View>

        <View style={styles.textContainer}>
          <Text
            style={[styles.title, item.isRead ? styles.readText : null]}
            numberOfLines={1}
          >
            {item.title}
          </Text>

          {item.content ? (
            <Text
              style={[styles.content, item.isRead ? styles.readText : null]}
              numberOfLines={2}
            >
              {item.content}
            </Text>
          ) : null}

          <Text style={styles.time}>{formatNotificationTime(item.createdAt)}</Text>
        </View>

        {!item.isRead && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  const renderEmptyComponent = () => {
    if (loading) {
      return null;
    }

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="notifications-off-outline" size={44} color="#CCCCCC" />
        <Text style={styles.emptyTitle}>알림이 없습니다.</Text>
        <Text style={styles.emptyDescription}>
          새로운 알림이 오면 이곳에서 확인할 수 있습니다.
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#000000" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>알림</Text>

          <View style={styles.headerRightSpace} />
        </View>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={MAIN_COLOR} />
          <Text style={styles.loadingText}>알림을 불러오는 중...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#000000" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>알림</Text>

        <TouchableOpacity onPress={loadNotifications} style={styles.refreshButton}>
          <Ionicons name="refresh-outline" size={22} color={MAIN_COLOR} />
        </TouchableOpacity>
      </View>

      {errorMessage ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      <FlatList
        data={notifications}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.listContainer,
          notifications.length === 0 ? styles.emptyListContainer : null,
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmptyComponent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={MAIN_COLOR}
            colors={[MAIN_COLOR]}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    backgroundColor: '#FFFFFF',
  },

  backButton: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111111',
  },

  headerRightSpace: {
    width: 28,
    height: 28,
  },

  refreshButton: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },

  listContainer: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },

  emptyListContainer: {
    flexGrow: 1,
  },

  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },

  readItem: {
    opacity: 0.65,
  },

  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F0F4FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },

  readIconContainer: {
    backgroundColor: '#F5F5F5',
  },

  textContainer: {
    flex: 1,
  },

  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#222222',
    marginBottom: 4,
    lineHeight: 21,
  },

  content: {
    fontSize: 13,
    color: '#555555',
    marginBottom: 5,
    lineHeight: 19,
  },

  readText: {
    color: '#888888',
  },

  time: {
    fontSize: 12,
    color: '#999999',
  },

  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
    marginLeft: 10,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#777777',
  },

  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 80,
  },

  emptyTitle: {
    marginTop: 14,
    fontSize: 16,
    fontWeight: '700',
    color: '#555555',
  },

  emptyDescription: {
    marginTop: 6,
    fontSize: 13,
    color: '#999999',
    textAlign: 'center',
  },

  errorContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#FFF1F1',
    borderBottomWidth: 1,
    borderBottomColor: '#FFD6D6',
  },

  errorText: {
    fontSize: 13,
    color: '#D32F2F',
  },
});