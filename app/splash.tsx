import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { getAccessToken } from '@/utils/tokenStorage';

export default function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    const checkLoginStatus = async () => {
      try {
        const accessToken = await getAccessToken();

        timer = setTimeout(() => {
          if (accessToken) {
            // 로그아웃하지 않았다면 메인 화면으로 이동
            router.replace('/(tabs)');
          } else {
            // 저장된 토큰이 없으면 역할 선택 화면으로 이동
            router.replace('/role-select');
          }
        }, 2000);
      } catch (error) {
        console.log('자동 로그인 확인 실패:', error);

        timer = setTimeout(() => {
          router.replace('/role-select');
        }, 2000);
      }
    };

    checkLoginStatus();

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [router]);

  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/images/logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.logoText}>Work Mate</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2140DC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 16,
  },
  logoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});