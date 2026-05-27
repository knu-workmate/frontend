import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { Tabs, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

type TabItemProps = {
  focused: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
  label: string;
};

function TabBarItem({ focused, icon, activeIcon, label }: TabItemProps) {
  return (
    <View style={styles.tabItem}>
      <View style={[styles.iconWrap, focused && styles.iconWrapFocused]}>
        <Ionicons
          name={focused ? activeIcon : icon}
          size={22}
          color={focused ? '#2140DC' : '#A0A0A0'}
        />
      </View>
      <Text style={[styles.tabLabel, focused && styles.tabLabelFocused]}>
        {label}
      </Text>
    </View>
  );
}

function TabsContent() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(() => {
      router.push('/notification');
    });
    return () => subscription.remove();
  }, []);

  return (
    <Tabs
      initialRouteName="index"
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          height: Platform.OS === 'ios' ? 92 : 74 + insets.bottom,
          paddingTop: 14,
          paddingBottom: Platform.OS === 'ios' ? 18 : Math.max(insets.bottom, 10),
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#F0F0F0',
        },
      }}
    >
      {/* 1번째 - 캘린더 */}
      <Tabs.Screen
        name="calendar"
        options={{
          title: '캘린더',
          tabBarIcon: ({ focused }) => (
            <TabBarItem
              focused={focused}
              icon="calendar-outline"
              activeIcon="calendar"
              label="캘린더"
            />
          ),
        }}
      />

      {/* 2번째 - 홈 */}
      <Tabs.Screen
        name="index"
        options={{
          title: '홈',
          tabBarIcon: ({ focused }) => (
            <TabBarItem
              focused={focused}
              icon="home-outline"
              activeIcon="home"
              label="홈"
            />
          ),
        }}
      />

      {/* 3번째 - 매뉴얼 ← 새로 추가 */}
      <Tabs.Screen
        name="manual"
        options={{
          title: '매뉴얼',
          tabBarIcon: ({ focused }) => (
            <TabBarItem
              focused={focused}
              icon="document-text-outline"
              activeIcon="document-text"
              label="매뉴얼"
            />
          ),
        }}
      />

      {/* 4번째 - 마이페이지 */}
      <Tabs.Screen
        name="mypage"
        options={{
          title: '마이페이지',
          tabBarIcon: ({ focused }) => (
            <TabBarItem
              focused={focused}
              icon="person-outline"
              activeIcon="person"
              label="마이"
            />
          ),
        }}
      />

      <Tabs.Screen
        name="request"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  return (
    <SafeAreaProvider>
      <TabsContent />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  tabItem: {
    width: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapFocused: {
    backgroundColor: '#F0F4FF',
  },
  tabLabel: {
    marginTop: 4,
    fontSize: 11,
    color: '#A0A0A0',
    fontWeight: '500',
  },
  tabLabelFocused: {
    color: '#2140DC',
    fontWeight: '700',
  },
});