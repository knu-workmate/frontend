import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiRequest } from '../../utils/api';
import { deleteAccessToken } from '../../utils/tokenStorage';

const MAIN_COLOR = '#2140DC';
const MAIN_LIGHT_COLOR = '#EEF1FF';

type RoleType = '사장님' | '알바생';

type WorkplaceUser = {
  id: number;
  name: string;
  role: string;
};

type WorkplaceInfo = {
  id?: number;
  name?: string;
  inviteCode?: string;
  createdAt?: string;
  users?: WorkplaceUser[];
  admins?: WorkplaceUser[];
};

const avatarColors = [MAIN_COLOR, '#FF8A00', '#27AE60', '#9B51E0', '#EB5757'];

type PasswordInputProps = {
  label: string;
  placeholder: string;
  value: string;
  visible: boolean;
  onChangeText: (text: string) => void;
  onToggleVisible: () => void;
};

function PasswordInput({
  label,
  placeholder,
  value,
  visible,
  onChangeText,
  onToggleVisible,
}: PasswordInputProps) {
  return (
    <>
      <Text style={styles.inputLabel}>{label}</Text>

      <View style={styles.passwordInputWrap}>
        <TextInput
          style={styles.passwordInput}
          placeholder={placeholder}
          placeholderTextColor="#A9A9A9"
          secureTextEntry={!visible}
          value={value}
          onChangeText={onChangeText}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <TouchableOpacity
          style={styles.eyeButton}
          onPress={onToggleVisible}
          activeOpacity={0.7}
        >
          <Ionicons
            name={visible ? 'eye-outline' : 'eye-off-outline'}
            size={22}
            color="#8A8A8A"
          />
        </TouchableOpacity>
      </View>
    </>
  );
}

export default function MyPageScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [userId, setUserId] = useState<number | null>(null);
  const [nickname, setNickname] = useState('사용자');
  const [role, setRole] = useState<RoleType>('알바생');
  const [email, setEmail] = useState('');
  const [avatarColor, setAvatarColor] = useState(MAIN_COLOR);

  const [workplace, setWorkplace] = useState<WorkplaceInfo | null>(null);
  const [staffList, setStaffList] = useState<WorkplaceUser[]>([]);
  const [tempWorkplaceName, setTempWorkplaceName] = useState('');

  const [loading, setLoading] = useState(true);
  const [workplaceLoading, setWorkplaceLoading] = useState(false);

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [staffModalVisible, setStaffModalVisible] = useState(false);
  const [workplaceModalVisible, setWorkplaceModalVisible] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);

  const [tempNickname, setTempNickname] = useState('');
  const [tempAvatarColor, setTempAvatarColor] = useState(MAIN_COLOR);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [currentPasswordVisible, setCurrentPasswordVisible] = useState(false);
  const [newPasswordVisible, setNewPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);

  const isBoss = role === '사장님';

  const getRoleText = (value: any): RoleType => {
    console.log('role 값 확인:', value);

    if (
      value === 1 ||
      value === true ||
      value === '1' ||
      value === 'OWNER' ||
      value === 'owner' ||
      value === 'ADMIN' ||
      value === 'admin' ||
      value === 'BOSS' ||
      value === 'boss' ||
      value === '사장님'
    ) {
      return '사장님';
    }

    return '알바생';
  };

  const getStaffRoleText = (value: any) => {
    if (
      value === 'ADMIN' ||
      value === 'admin' ||
      value === 'OWNER' ||
      value === 'owner' ||
      value === 'BOSS' ||
      value === 'boss' ||
      value === '사장님'
    ) {
      return '사장님';
    }

    return '알바생';
  };

  const getProfileIconName = () => {
    return role === '사장님' ? 'briefcase-outline' : 'happy-outline';
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

  const getCurrentAvatarColorKey = () => {
    return getAvatarColorKey(userId, email);
  };

  const loadSavedAvatarColor = async (
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

      if (savedColor) {
        setAvatarColor(savedColor);
      } else {
        setAvatarColor(MAIN_COLOR);
      }
    } catch (error) {
      console.log('프로필 색상 불러오기 실패:', error);
      setAvatarColor(MAIN_COLOR);
    }
  };

  const mergeUsers = (users: WorkplaceUser[] = [], admins: WorkplaceUser[] = []) => {
    const map = new Map<number, WorkplaceUser>();

    users.forEach((user) => {
      map.set(user.id, user);
    });

    admins.forEach((admin) => {
      map.set(admin.id, {
        ...admin,
        role: admin.role || 'ADMIN',
      });
    });

    return Array.from(map.values());
  };

  const deleteExpoPushTokenOnLogout = async () => {
    try {
      await apiRequest('/api/expo/push-token', {
        method: 'DELETE',
      });

      console.log('Expo Push Token 삭제 성공');
    } catch (error: any) {
      console.log('Expo Push Token 삭제 실패:', error?.message || error);
    }
  };

  const loadProfile = async () => {
    try {
      const result = await apiRequest('/user/profile');

      const profileUserId = result?.id ?? result?.userId ?? null;
      const profileEmail = result?.email ?? '';

      setUserId(profileUserId);
      setNickname(result?.name ?? result?.nickname ?? '사용자');
      setEmail(profileEmail);

      setRole(
        getRoleText(
          result?.role ??
            result?.userRole ??
            result?.authority ??
            result?.isAdmin ??
            result?.admin
        )
      );

      if (result?.avatarColor) {
        setAvatarColor(result.avatarColor);
      } else {
        await loadSavedAvatarColor(profileUserId, profileEmail);
      }
    } catch (error: any) {
      console.log('프로필 조회 실패:', error.message);
      Alert.alert('오류', '프로필 정보를 불러오지 못했습니다.');
    }
  };

  const loadWorkplaceInfo = async () => {
    try {
      const result = await apiRequest('/workplace/info');

      setWorkplace(result);
      setTempWorkplaceName(result?.name ?? '');

      const mergedUsers = mergeUsers(result?.users, result?.admins);
      setStaffList(mergedUsers);
    } catch (error: any) {
      console.log('사업장 정보 조회 실패:', error.message);
      setWorkplace(null);
      setStaffList([]);
    }
  };

  const loadStaffList = async () => {
    try {
      const result = await apiRequest('/workplace/users');
      setStaffList(Array.isArray(result) ? result : []);
    } catch (error: any) {
      console.log('직원 조회 실패:', error.message);
      Alert.alert('오류', '직원 정보를 불러오지 못했습니다.');
    }
  };

  const loadAllData = async () => {
    setLoading(true);

    try {
      await Promise.all([loadProfile(), loadWorkplaceInfo()]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const openProfileEditModal = () => {
    setTempNickname(nickname);
    setTempAvatarColor(avatarColor);
    setEditModalVisible(true);
  };

  const openStaffModal = async () => {
    setStaffModalVisible(true);
    await loadStaffList();
  };

  const openWorkplaceModal = async () => {
    setWorkplaceModalVisible(true);
    await loadWorkplaceInfo();
  };

  const openPasswordModal = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');

    setCurrentPasswordVisible(false);
    setNewPasswordVisible(false);
    setConfirmPasswordVisible(false);

    setPasswordModalVisible(true);
  };

  const closePasswordModal = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');

    setCurrentPasswordVisible(false);
    setNewPasswordVisible(false);
    setConfirmPasswordVisible(false);

    setPasswordModalVisible(false);
  };

  const saveProfile = async () => {
    if (!tempNickname.trim()) {
      Alert.alert('알림', '닉네임을 입력해주세요.');
      return;
    }

    try {
      const key = getCurrentAvatarColorKey();

      if (key) {
        await AsyncStorage.setItem(key, tempAvatarColor);
      }

      setNickname(tempNickname.trim());
      setAvatarColor(tempAvatarColor);
      setEditModalVisible(false);

      Alert.alert('완료', '프로필이 수정되었습니다.');
    } catch (error: any) {
      console.log('프로필 수정 실패:', error.message);
      Alert.alert('수정 실패', error.message || '다시 시도해주세요.');
    }
  };

  const saveWorkplaceName = async () => {
    if (!tempWorkplaceName.trim()) {
      Alert.alert('알림', '사업장 이름을 입력해주세요.');
      return;
    }

    if (!isBoss) {
      Alert.alert('권한 없음', '사업장 이름 수정은 사장님만 가능합니다.');
      return;
    }

    setWorkplaceLoading(true);

    try {
      const result = await apiRequest('/workplace', {
        method: 'PATCH',
        body: JSON.stringify({
          name: tempWorkplaceName.trim(),
        }),
      });

      setWorkplace((prev) => ({
        ...prev,
        ...result,
        name: result?.name ?? tempWorkplaceName.trim(),
      }));

      Alert.alert('완료', '사업장 이름이 수정되었습니다.');
    } catch (error: any) {
      console.log('사업장 이름 수정 실패:', error.message);
      Alert.alert('수정 실패', error.message || '다시 시도해주세요.');
    } finally {
      setWorkplaceLoading(false);
    }
  };

  const changePassword = async () => {
    if (!currentPassword.trim()) {
      Alert.alert('알림', '현재 비밀번호를 입력해주세요.');
      return;
    }

    if (!newPassword.trim() || !confirmPassword.trim()) {
      Alert.alert('알림', '새 비밀번호를 모두 입력해주세요.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('알림', '새 비밀번호가 일치하지 않습니다.');
      return;
    }

    if (currentPassword === newPassword) {
      Alert.alert('알림', '현재 비밀번호와 다른 새 비밀번호를 입력해주세요.');
      return;
    }

    try {
      await apiRequest('/user/password', {
        method: 'PATCH',
        body: JSON.stringify({
          currentPassword: currentPassword,
          newPassword: newPassword,
        }),
      });

      closePasswordModal();

      Alert.alert('완료', '비밀번호가 변경되었습니다.');
    } catch (error: any) {
      console.log('비밀번호 변경 실패:', error.message);
      Alert.alert(
        '변경 실패',
        error.message || '현재 비밀번호가 맞는지 다시 확인해주세요.'
      );
    }
  };

  const removeStaff = (staff: WorkplaceUser) => {
    if (!isBoss) {
      Alert.alert('권한 없음', '직원 퇴장은 사장님만 가능합니다.');
      return;
    }

    if (userId !== null && staff.id === userId) {
      Alert.alert('알림', '본인은 퇴장시킬 수 없습니다.');
      return;
    }

    Alert.alert(
      '직원 퇴장',
      `${staff.name}님을 사업장에서 퇴장시키겠어요?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '퇴장',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiRequest(`/workplace/users/${staff.id}`, {
                method: 'DELETE',
              });

              setStaffList((prev) => prev.filter((item) => item.id !== staff.id));

              Alert.alert('완료', '직원을 퇴장시켰습니다.');
            } catch (error: any) {
              console.log('직원 퇴장 실패:', error.message);
              Alert.alert('퇴장 실패', error.message || '다시 시도해주세요.');
            }
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert('로그아웃', '로그아웃 하시겠어요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteExpoPushTokenOnLogout();
          } finally {
            await deleteAccessToken();
            Alert.alert('안내', '로그아웃 되었습니다.');
            router.replace('/role-select');
          }
        },
      },
    ]);
  };

  const handleLeaveWorkplace = () => {
    Alert.alert(
      '사업장 탈퇴',
      '현재 참여 중인 사업장에서 탈퇴하시겠어요?\n계정은 삭제되지 않습니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '탈퇴하기',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiRequest('/workplace/leave', {
                method: 'DELETE',
              });

              setWorkplace(null);
              setStaffList([]);
              setTempWorkplaceName('');

              Alert.alert('완료', '사업장에서 탈퇴했습니다.', [
                {
                  text: '확인',
                  onPress: () => {
                    router.replace('/role-select');
                  },
                },
              ]);
            } catch (error: any) {
              console.log('사업장 탈퇴 실패:', error.message);
              Alert.alert('탈퇴 실패', error.message || '다시 시도해주세요.');
            }
          },
        },
      ]
    );
  };

  const handleDeleteWorkplace = () => {
    Alert.alert(
      '사업장 삭제',
      '사업장을 삭제하면 사업장 정보와 소속 직원 정보가 삭제될 수 있습니다.\n계정은 삭제되지 않습니다.\n정말 삭제하시겠어요?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제하기',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiRequest('/workplace', {
                method: 'DELETE',
              });

              setWorkplace(null);
              setStaffList([]);
              setTempWorkplaceName('');

              Alert.alert('완료', '사업장이 삭제되었습니다.', [
                {
                  text: '확인',
                  onPress: () => {
                    router.replace('/role-select');
                  },
                },
              ]);
            } catch (error: any) {
              console.log('사업장 삭제 실패:', error.message);
              Alert.alert('삭제 실패', error.message || '다시 시도해주세요.');
            }
          },
        },
      ]
    );
  };

  const handleWithdrawAccount = () => {
    Alert.alert(
      '회원탈퇴',
      '회원탈퇴 시 계정이 완전히 삭제됩니다.\n소속된 사업장 정보도 함께 삭제되거나 사업장에서 퇴장 처리됩니다.\n정말 탈퇴하시겠어요?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '회원탈퇴',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteExpoPushTokenOnLogout();
              
              await apiRequest('/auth/withdraw', {
                method: 'DELETE',
              });

              const key = getCurrentAvatarColorKey();

              if (key) {
                await AsyncStorage.removeItem(key);
              }

              await deleteAccessToken();

              Alert.alert('완료', '회원탈퇴가 완료되었습니다.', [
                {
                  text: '확인',
                  onPress: () => {
                    router.replace('/role-select');
                  },
                },
              ]);
            } catch (error: any) {
              console.log('회원탈퇴 실패:', error.message);
              Alert.alert('탈퇴 실패', error.message || '다시 시도해주세요.');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={MAIN_COLOR} />
          <Text style={styles.loadingText}>프로필을 불러오는 중...</Text>
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
          { paddingBottom: insets.bottom + 120 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>마이페이지</Text>

        <Text style={styles.sectionLabel}>프로필 화면</Text>

        <View style={styles.profileCard}>
          <View style={styles.profileLeft}>
            <View style={[styles.avatarIcon, { backgroundColor: avatarColor }]}>
              <Ionicons name={getProfileIconName() as any} size={28} color="#FFFFFF" />
            </View>

            <View>
              <Text style={styles.profileName}>{nickname}</Text>
              <Text style={styles.profileRole}>{role}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.editButton}
            onPress={openProfileEditModal}
            activeOpacity={0.8}
          >
            <Ionicons name="pencil" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionLabel}>정보</Text>

        <View style={styles.menuCard}>
          <TouchableOpacity
            style={styles.menuRow}
            activeOpacity={0.8}
            onPress={() => setInfoModalVisible(true)}
          >
            <View style={styles.menuLeft}>
              <View style={styles.iconCircle}>
                <Ionicons name="person-outline" size={18} color={MAIN_COLOR} />
              </View>

              <View style={styles.menuTextBox}>
                <Text style={styles.menuTitle}>나의 정보</Text>
                <Text style={styles.menuDescription}>
                  이메일과 역할 정보를 확인할 수 있습니다
                </Text>
              </View>
            </View>

            <Ionicons name="chevron-forward" size={20} color="#B7B7B7" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.menuRow}
            activeOpacity={0.8}
            onPress={openStaffModal}
          >
            <View style={styles.menuLeft}>
              <View style={styles.iconCircle}>
                <Ionicons name="people-outline" size={18} color={MAIN_COLOR} />
              </View>

              <View style={styles.menuTextBox}>
                <Text style={styles.menuTitle}>직원 정보</Text>
                <Text style={styles.menuDescription}>
                  내 사업장에 속한 직원 닉네임을 확인합니다
                </Text>
              </View>
            </View>

            <Ionicons name="chevron-forward" size={20} color="#B7B7B7" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.menuRow}
            activeOpacity={0.8}
            onPress={openWorkplaceModal}
          >
            <View style={styles.menuLeft}>
              <View style={styles.iconCircle}>
                <Ionicons name="storefront-outline" size={18} color={MAIN_COLOR} />
              </View>

              <View style={styles.menuTextBox}>
                <Text style={styles.menuTitle}>사업장 정보</Text>
                <Text style={styles.menuDescription}>
                  사업장 이름과 초대코드를 확인합니다
                </Text>
              </View>
            </View>

            <Ionicons name="chevron-forward" size={20} color="#B7B7B7" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.menuRow}
            activeOpacity={0.8}
            onPress={openPasswordModal}
          >
            <View style={styles.menuLeft}>
              <View style={styles.iconCircle}>
                <Ionicons name="shield-checkmark-outline" size={18} color={MAIN_COLOR} />
              </View>

              <View style={styles.menuTextBox}>
                <Text style={styles.menuTitle}>비밀번호 변경</Text>
                <Text style={styles.menuDescription}>
                  현재 비밀번호 확인 후 새 비밀번호로 변경합니다
                </Text>
              </View>
            </View>

            <Ionicons name="chevron-forward" size={20} color="#B7B7B7" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.menuRow} activeOpacity={0.8} onPress={handleLogout}>
            <View style={styles.menuLeft}>
              <View style={styles.iconCircle}>
                <Ionicons name="log-out-outline" size={18} color={MAIN_COLOR} />
              </View>

              <View style={styles.menuTextBox}>
                <Text style={styles.menuTitle}>로그아웃</Text>
                <Text style={styles.menuDescription}>현재 계정에서 로그아웃합니다</Text>
              </View>
            </View>

            <Ionicons name="chevron-forward" size={20} color="#B7B7B7" />
          </TouchableOpacity>

          {isBoss ? (
            <>
              <View style={styles.divider} />

              <TouchableOpacity
                style={styles.menuRow}
                activeOpacity={0.8}
                onPress={handleDeleteWorkplace}
              >
                <View style={styles.menuLeft}>
                  <View style={styles.withdrawIconCircle}>
                    <Ionicons name="trash-outline" size={18} color="#E24A4A" />
                  </View>

                  <View style={styles.menuTextBox}>
                    <Text style={styles.withdrawMenuTitle}>사업장 삭제</Text>
                    <Text style={styles.menuDescription}>
                      계정은 유지하고 현재 사업장만 삭제합니다
                    </Text>
                  </View>
                </View>

                <Ionicons name="chevron-forward" size={20} color="#B7B7B7" />
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.divider} />

              <TouchableOpacity
                style={styles.menuRow}
                activeOpacity={0.8}
                onPress={handleLeaveWorkplace}
              >
                <View style={styles.menuLeft}>
                  <View style={styles.withdrawIconCircle}>
                    <Ionicons name="exit-outline" size={18} color="#E24A4A" />
                  </View>

                  <View style={styles.menuTextBox}>
                    <Text style={styles.withdrawMenuTitle}>사업장 탈퇴</Text>
                    <Text style={styles.menuDescription}>
                      계정은 유지하고 참여 중인 사업장에서 나갑니다
                    </Text>
                  </View>
                </View>

                <Ionicons name="chevron-forward" size={20} color="#B7B7B7" />
              </TouchableOpacity>
            </>
          )}

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.menuRow}
            activeOpacity={0.8}
            onPress={handleWithdrawAccount}
          >
            <View style={styles.menuLeft}>
              <View style={styles.withdrawIconCircle}>
                <Ionicons name="person-remove-outline" size={18} color="#E24A4A" />
              </View>

              <View style={styles.menuTextBox}>
                <Text style={styles.withdrawMenuTitle}>회원탈퇴</Text>
                <Text style={styles.menuDescription}>
                  계정 자체를 완전히 삭제합니다
                </Text>
              </View>
            </View>

            <Ionicons name="chevron-forward" size={20} color="#B7B7B7" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={editModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={[
            styles.modalOverlay,
            { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 },
          ]}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>프로필 편집</Text>

            <View style={styles.avatarPreviewRow}>
              <View style={[styles.avatarPreview, { backgroundColor: tempAvatarColor }]}>
                <Ionicons name={getProfileIconName() as any} size={34} color="#FFFFFF" />
              </View>

              <Text style={styles.avatarHelpText}>
                {role === '사장님' ? '사장님' : '알바생 픽토그램'}
              </Text>
            </View>

            <Text style={styles.inputLabel}>프로필 색상</Text>

            <View style={styles.colorRow}>
              {avatarColors.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorCircle,
                    { backgroundColor: color },
                    tempAvatarColor === color && styles.colorCircleSelected,
                  ]}
                  onPress={() => setTempAvatarColor(color)}
                  activeOpacity={0.8}
                />
              ))}
            </View>

            <Text style={styles.inputLabel}>닉네임</Text>

            <TextInput
              style={styles.input}
              placeholder="닉네임을 입력하세요"
              placeholderTextColor="#A9A9A9"
              value={tempNickname}
              onChangeText={setTempNickname}
            />

            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setEditModalVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelButtonText}>취소</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmButton}
                onPress={saveProfile}
                activeOpacity={0.8}
              >
                <Text style={styles.confirmButtonText}>저장</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={infoModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setInfoModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={[
            styles.modalOverlay,
            { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 },
          ]}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>나의 정보</Text>

            <Text style={styles.infoLabel}>이메일</Text>

            <View style={styles.readonlyBox}>
              <Text style={styles.readonlyText}>{email || '이메일 정보 없음'}</Text>
            </View>

            <Text style={[styles.infoLabel, { marginTop: 18 }]}>역할</Text>

            <View style={styles.readonlyBox}>
              <Text style={styles.readonlyText}>{role}</Text>
            </View>

            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={() => setInfoModalVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.confirmButtonText}>확인</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={staffModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setStaffModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={[
            styles.modalOverlay,
            { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 },
          ]}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>직원 정보</Text>

            <Text style={styles.modalSubText}>
              내 사업장에 속한 직원 닉네임을 확인할 수 있습니다.
            </Text>

            <ScrollView style={styles.staffListBox} showsVerticalScrollIndicator={false}>
              {staffList.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyText}>등록된 직원이 없습니다.</Text>
                </View>
              ) : (
                staffList.map((staff) => (
                  <View key={staff.id} style={styles.staffRow}>
                    <View style={styles.staffInfo}>
                      <View style={styles.staffIconCircle}>
                        <Ionicons name="person-outline" size={17} color={MAIN_COLOR} />
                      </View>

                      <View>
                        <Text style={styles.staffName}>{staff.name || '이름 없음'}</Text>
                        <Text style={styles.staffRole}>{getStaffRoleText(staff.role)}</Text>
                      </View>
                    </View>

                    {isBoss && userId !== staff.id && (
                      <TouchableOpacity
                        style={styles.kickButton}
                        onPress={() => removeStaff(staff)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.kickButtonText}>퇴장</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))
              )}
            </ScrollView>

            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={() => setStaffModalVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.confirmButtonText}>확인</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={workplaceModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setWorkplaceModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={[
            styles.modalOverlay,
            { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 },
          ]}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>사업장 정보</Text>

            <Text style={styles.inputLabel}>사업장 이름</Text>

            <TextInput
              style={[styles.input, !isBoss && styles.disabledInput]}
              placeholder="사업장 이름"
              placeholderTextColor="#A9A9A9"
              value={tempWorkplaceName}
              onChangeText={setTempWorkplaceName}
              editable={isBoss}
            />

            {!isBoss && (
              <Text style={styles.permissionNotice}>
                사업장 이름 수정은 사장님만 가능합니다.
              </Text>
            )}

            <Text style={[styles.infoLabel, { marginTop: 18 }]}>초대코드</Text>

            <View style={styles.readonlyBox}>
              <Text style={styles.readonlyText}>
                {workplace?.inviteCode || '초대코드 없음'}
              </Text>
            </View>

            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setWorkplaceModalVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelButtonText}>닫기</Text>
              </TouchableOpacity>

              {isBoss && (
                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={saveWorkplaceName}
                  activeOpacity={0.8}
                  disabled={workplaceLoading}
                >
                  <Text style={styles.confirmButtonText}>
                    {workplaceLoading ? '저장 중...' : '저장'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={passwordModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closePasswordModal}
      >
        <KeyboardAvoidingView
          style={[
            styles.modalOverlay,
            { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 },
          ]}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>비밀번호 변경</Text>

            <PasswordInput
              label="현재 비밀번호"
              placeholder="현재 비밀번호를 입력하세요"
              value={currentPassword}
              visible={currentPasswordVisible}
              onChangeText={setCurrentPassword}
              onToggleVisible={() => setCurrentPasswordVisible(!currentPasswordVisible)}
            />

            <PasswordInput
              label="새 비밀번호"
              placeholder="새 비밀번호를 입력하세요"
              value={newPassword}
              visible={newPasswordVisible}
              onChangeText={setNewPassword}
              onToggleVisible={() => setNewPasswordVisible(!newPasswordVisible)}
            />

            <PasswordInput
              label="새 비밀번호 확인"
              placeholder="새 비밀번호를 다시 입력하세요"
              value={confirmPassword}
              visible={confirmPasswordVisible}
              onChangeText={setConfirmPassword}
              onToggleVisible={() => setConfirmPasswordVisible(!confirmPasswordVisible)}
            />

            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={closePasswordModal}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelButtonText}>취소</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmButton}
                onPress={changePassword}
                activeOpacity={0.8}
              >
                <Text style={styles.confirmButtonText}>변경</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    backgroundColor: '#FFFFFF',
  },

  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 18,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#888888',
  },

  pageTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#171717',
    textAlign: 'center',
    marginBottom: 24,
  },

  sectionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#C7C7C7',
    marginBottom: 12,
  },

  profileCard: {
    backgroundColor: MAIN_COLOR,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
    shadowColor: MAIN_COLOR,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6,
  },

  profileLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  avatarIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },

  profileName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },

  profileRole: {
    fontSize: 12,
    color: '#DDE3FF',
    fontWeight: '500',
  },

  editButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },

  menuCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EEF0F5',
    overflow: 'hidden',
  },

  menuRow: {
    minHeight: 82,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },

  menuTextBox: {
    flex: 1,
  },

  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: MAIN_LIGHT_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  withdrawIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  menuTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#242424',
    marginBottom: 4,
  },

  withdrawMenuTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#E24A4A',
    marginBottom: 4,
  },

  menuDescription: {
    fontSize: 11,
    color: '#B8B8B8',
    lineHeight: 16,
  },

  divider: {
    height: 1,
    backgroundColor: '#F1F2F6',
    marginLeft: 62,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.32)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },

  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    maxHeight: '85%',
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111111',
    marginBottom: 18,
  },

  modalSubText: {
    fontSize: 13,
    color: '#777777',
    lineHeight: 19,
    marginBottom: 14,
  },

  avatarPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },

  avatarPreview: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  avatarHelpText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555555',
  },

  colorRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },

  colorCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    marginRight: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },

  colorCircleSelected: {
    borderColor: '#111111',
  },

  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555555',
    marginBottom: 8,
    marginTop: 8,
  },

  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#E4E7EE',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#111111',
    backgroundColor: '#FAFBFF',
  },

  disabledInput: {
    backgroundColor: '#F3F4F8',
    color: '#888888',
  },

  passwordInputWrap: {
    height: 48,
    borderWidth: 1,
    borderColor: '#E4E7EE',
    borderRadius: 12,
    backgroundColor: '#FAFBFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 14,
    paddingRight: 8,
  },

  passwordInput: {
    flex: 1,
    height: 48,
    fontSize: 14,
    color: '#111111',
    paddingRight: 8,
  },

  eyeButton: {
    width: 40,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 10,
  },

  cancelButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F1F3F8',
    justifyContent: 'center',
    alignItems: 'center',
  },

  confirmButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: MAIN_COLOR,
    justifyContent: 'center',
    alignItems: 'center',
  },

  cancelButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#555555',
  },

  confirmButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  infoLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555555',
    marginBottom: 8,
  },

  readonlyBox: {
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F6F7FB',
    borderWidth: 1,
    borderColor: '#E6E9F2',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },

  readonlyText: {
    fontSize: 14,
    color: '#333333',
  },

  staffListBox: {
    maxHeight: 320,
  },

  staffRow: {
    minHeight: 64,
    borderRadius: 14,
    backgroundColor: '#F8F9FD',
    borderWidth: 1,
    borderColor: '#EDF0F6',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  staffInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  staffIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: MAIN_LIGHT_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  staffName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#222222',
    marginBottom: 3,
  },

  staffRole: {
    fontSize: 11,
    color: '#999999',
  },

  kickButton: {
    paddingHorizontal: 12,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },

  kickButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E24A4A',
  },

  permissionNotice: {
    fontSize: 12,
    color: '#999999',
    lineHeight: 18,
    marginTop: 10,
  },

  emptyBox: {
    paddingVertical: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyText: {
    fontSize: 13,
    color: '#999999',
  },
});