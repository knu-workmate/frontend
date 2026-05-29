import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { apiRequest } from './api';


export async function registerForPushNotificationsAsync() {
  try {
    if (!Device.isDevice) {
      console.log('푸시 알림은 실제 기기에서만 테스트할 수 있습니다.');
      return null;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2140DC',
      });
    }

    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();

    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('알림 권한이 허용되지 않았습니다.');
      return null;
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    if (!projectId) {
      console.log('Expo projectId를 찾을 수 없습니다.');
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    const pushToken = tokenData.data;

    console.log('Expo Push Token:', pushToken);

    await apiRequest('/api/expo/push-token', {
      method: 'PATCH',
      body: JSON.stringify({
        token: pushToken,
      }),
    });

    console.log('Expo Push Token 서버 저장 완료');

    return pushToken;
  } catch (error: any) {
    console.log('Expo Push Token 등록 실패:', error?.message || error);
    return null;
  }
}
export async function sendTestPushNotificationAsync() {
  try {
    const pushToken = await registerForPushNotificationsAsync();

    if (!pushToken) {
      console.log('테스트 알림 실패: Expo Push Token 없음');
      return null;
    }

    const result = await apiRequest('/api/expo/test', {
      method: 'POST',
      body: JSON.stringify({
        token: pushToken,
      }),
    });

    console.log('테스트 알림 성공:', result);

    return result;
  } catch (error: any) {
    console.log('테스트 알림 실패:', error?.message || error);
    return null;
  }
}