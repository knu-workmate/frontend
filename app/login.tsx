import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiRequest, publicRequest } from '../utils/api';
import { registerForPushNotificationsAsync } from '../utils/registerForPushNotifications';
import { saveAccessToken } from '../utils/tokenStorage';

function getLoginErrorMessage(error: any) {
  const message = String(error?.message || error || '');

  if (!message) {
    return '알 수 없는 오류가 발생했습니다.';
  }

  if (message.includes('401')) {
    return `로그인 인증 실패입니다.\n\n서버 응답:\n${message}`;
  }

  if (
    message.includes('Network request failed') ||
    message.includes('Failed to fetch') ||
    message.includes('Network Error')
  ) {
    return `서버에 연결하지 못했습니다.\n\n서버 주소, 인터넷 연결, HTTP 허용 설정을 확인해주세요.\n\n상세 오류:\n${message}`;
  }

  if (message.includes('404')) {
    return `로그인 API 주소를 찾을 수 없습니다.\n\nAPI 경로 또는 서버 주소를 확인해주세요.\n\n상세 오류:\n${message}`;
  }

  if (message.includes('500')) {
    return `서버 내부 오류가 발생했습니다.\n\n백엔드 서버 상태를 확인해주세요.\n\n상세 오류:\n${message}`;
  }

  return `로그인 중 오류가 발생했습니다.\n\n상세 오류:\n${message}`;
}

export default function LoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  const role = params.role as string;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const isValid = email.trim() && password;

  const handleLogin = async () => {
    if (!isValid) return;

    setLoading(true);

    try {
      const result = await publicRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: email.trim(),
          password: password,
        }),
      });

      await saveAccessToken(result.accessToken);
      console.log('로그인 성공, 토큰 저장 완료');

      try {
        await registerForPushNotificationsAsync();
        console.log('로그인 직후 Expo Push Token 등록 시도 완료');
      } catch (pushError: any) {
        console.log(
          '로그인은 성공했지만 Expo Push Token 등록 실패:',
          pushError?.message || pushError
        );
      }

      try {
        const workplaceInfo = await apiRequest('/workplace/info');

        if (
          workplaceInfo?.id ||
          workplaceInfo?.workplaceId ||
          workplaceInfo?.name ||
          workplaceInfo?.workplaceName
        ) {
          router.replace('/(tabs)');
          return;
        }
      } catch (error: any) {
        console.log('사업장 정보 없음:', error?.message || error);
      }

      if (role === 'owner') {
        router.replace('/workplace-create');
      } else {
        router.replace('/workplace-join');
      }
    } catch (error: any) {
      const loginErrorMessage = getLoginErrorMessage(error);

      console.log('로그인 실패 전체:', error);
      console.log('로그인 실패 메시지:', error?.message || error);

      Alert.alert('로그인 실패', loginErrorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingBottom: insets.bottom + 40 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>로그인</Text>

        <TextInput
          style={styles.input}
          placeholder="이메일"
          placeholderTextColor="#BDBDBD"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <TextInput
          style={styles.input}
          placeholder="비밀번호"
          placeholderTextColor="#BDBDBD"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity style={styles.forgotBtn}>
          <Text style={styles.forgotText}>비밀번호를 잊으셨나요?</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.loginBtn,
            (!isValid || loading) && { backgroundColor: '#BDBDBD' },
          ]}
          disabled={!isValid || loading}
          activeOpacity={0.8}
          onPress={handleLogin}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.loginBtnText}>로그인</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.bottomText}>아직 계정이 없으신가요?</Text>

        <TouchableOpacity onPress={() => router.push('/role-select')}>
          <Text style={styles.signupLink}>회원가입</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
  },

  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#111111',
    marginBottom: 32,
  },

  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    height: 52,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#111111',
    marginBottom: 12,
  },

  forgotBtn: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },

  forgotText: {
    fontSize: 12,
    color: '#888888',
  },

  loginBtn: {
    backgroundColor: '#2140DC',
    height: 52,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },

  loginBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },

  bottomText: {
    fontSize: 13,
    color: '#888888',
    textAlign: 'center',
    marginBottom: 8,
  },

  signupLink: {
    color: '#2140DC',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 14,
  },
});