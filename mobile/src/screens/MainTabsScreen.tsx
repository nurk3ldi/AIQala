import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React from 'react';
import { ActivityIndicator, Alert, Animated, Image, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';

import { env } from '../config/env';
import { AuthResult, AuthUser, deleteAvatar, updateProfile, uploadAvatar } from '../services/auth';
import { ChatScreen } from './ChatScreen';
import { CreateRequestScreen } from './CreateRequestScreen';
import { HomeMapScreen } from './HomeMapScreen';
import { RequestsScreen } from './RequestsScreen';
import { colors } from '../theme/colors';

type MainTabsScreenProps = {
  auth: AuthResult;
  onAuthUpdate: (auth: AuthResult) => void;
  onLogout: () => void;
};

type TabKey = 'home' | 'requests' | 'create' | 'chat' | 'profile';

type TabItem = {
  key: TabKey;
  icon: keyof typeof Ionicons.glyphMap;
};

const tabs: TabItem[] = [
  {
    key: 'home',
    icon: 'home-outline',
  },
  {
    key: 'requests',
    icon: 'document-text-outline',
  },
  {
    key: 'create',
    icon: 'add-circle-outline',
  },
  {
    key: 'chat',
    icon: 'chatbubble-ellipses-outline',
  },
];

const screenTitles: Record<Exclude<TabKey, 'home'>, string> = {
  requests: 'Өтінімдер',
  create: 'Жаңа өтінім құру',
  chat: 'Чат',
  profile: 'Профиль',
};

const screenSubtitles: Record<Exclude<TabKey, 'home'>, string> = {
  requests: 'Өтінімдеріңіз осы жерде болады',
  create: 'Мәселені тіркеу формасы осында ашылады',
  chat: 'AIQala көмекшісімен сөйлесу',
  profile: 'Өз профиліңіздің мәліметтері',
};

export function MainTabsScreen({ auth, onAuthUpdate, onLogout }: MainTabsScreenProps) {
  const [activeTab, setActiveTab] = React.useState<TabKey>('home');
  const [isHomeDetailOpen, setIsHomeDetailOpen] = React.useState(false);

  return (
    <View style={styles.screen}>
      <View style={styles.content}>
        {activeTab === 'home' ? (
          <HomeMapScreen auth={auth} onIssueDetailOpenChange={setIsHomeDetailOpen} onProfilePress={() => setActiveTab('profile')} />
        ) : activeTab === 'requests' ? (
          <RequestsScreen auth={auth} />
        ) : activeTab === 'create' ? (
          <CreateRequestScreen auth={auth} onCreated={() => setActiveTab('requests')} />
        ) : activeTab === 'chat' ? (
          <ChatScreen auth={auth} />
        ) : activeTab === 'profile' ? (
          <ProfileScreen auth={auth} onAuthUpdate={onAuthUpdate} onBack={() => setActiveTab('home')} onLogout={onLogout} />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.brand}>AIQala</Text>
            <Text style={styles.title}>{screenTitles[activeTab]}</Text>
            <Text style={styles.subtitle}>{screenSubtitles[activeTab]}</Text>
          </View>
        )}
      </View>

      {activeTab === 'home' && isHomeDetailOpen ? null : (
      <View style={styles.tabBar}>
        {tabs.map((tab) => {
          const isActive = tab.key === activeTab;

          return (
            <Pressable
              accessibilityRole="button"
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={({ pressed }) => [styles.tabButton, pressed && styles.pressed]}
            >
              <Ionicons
                color={isActive ? colors.accent : colors.muted}
                name={tab.icon}
                size={24}
              />
            </Pressable>
          );
        })}
      </View>
      )}
    </View>
  );
}

const languages = ['ҚАЗ', 'РУС', 'ENG'];

function ProfileScreen({
  auth,
  onAuthUpdate,
  onBack,
  onLogout,
}: {
  auth: AuthResult;
  onAuthUpdate: (auth: AuthResult) => void;
  onBack: () => void;
  onLogout: () => void;
}) {
  const { width } = useWindowDimensions();
  const slideX = React.useRef(new Animated.Value(width)).current;
  const [languageIndex, setLanguageIndex] = React.useState(0);
  const [isDarkMode, setIsDarkMode] = React.useState(false);
  const [isPhotoSheetVisible, setIsPhotoSheetVisible] = React.useState(false);
  const [isPhotoUpdating, setIsPhotoUpdating] = React.useState(false);
  const [isNameModalVisible, setIsNameModalVisible] = React.useState(false);
  const [nameDraft, setNameDraft] = React.useState(auth.user.fullName);
  const [isNameUpdating, setIsNameUpdating] = React.useState(false);
  const palette = isDarkMode
    ? {
        background: '#15131a',
        surface: '#211b29',
        border: '#382d45',
        text: colors.white,
        muted: '#c8bdd2',
      }
    : {
        background: colors.background,
        surface: colors.white,
        border: colors.border,
        text: colors.text,
        muted: colors.muted,
      };

  const toggleLanguage = () => {
    setLanguageIndex((current) => (current + 1) % languages.length);
  };

  const applyUserUpdate = (user: AuthUser) => {
    onAuthUpdate({
      ...auth,
      user,
    });
  };

  const handleLogoutPress = () => {
    Alert.alert('Шығу', 'Аккаунттан шығуды растайсыз ба?', [
      {
        text: 'Болдырмау',
        style: 'cancel',
      },
      {
        text: 'Шығу',
        style: 'destructive',
        onPress: onLogout,
      },
    ]);
  };

  const handlePickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Рұқсат керек', 'Фотоны таңдау үшін галереяға рұқсат беріңіз.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });

    if (result.canceled || !result.assets[0]) {
      return;
    }

    const asset = result.assets[0];
    const extension = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
    const mimeType = asset.mimeType || (extension === 'png' ? 'image/png' : 'image/jpeg');

    try {
      setIsPhotoUpdating(true);
      const user = await uploadAvatar(auth.accessToken, {
        uri: asset.uri,
        name: `avatar.${extension}`,
        type: mimeType,
      });
      applyUserUpdate(user);
      setIsPhotoSheetVisible(false);
    } catch (error) {
      Alert.alert('Қате', error instanceof Error ? error.message : 'Фотоны жүктеу мүмкін болмады.');
    } finally {
      setIsPhotoUpdating(false);
    }
  };

  const handleDeletePhoto = async () => {
    if (!auth.user.avatarUrl || isPhotoUpdating) {
      return;
    }

    try {
      setIsPhotoUpdating(true);
      const user = await deleteAvatar(auth.accessToken);
      applyUserUpdate(user);
      setIsPhotoSheetVisible(false);
    } catch (error) {
      Alert.alert('Қате', error instanceof Error ? error.message : 'Фотоны өшіру мүмкін болмады.');
    } finally {
      setIsPhotoUpdating(false);
    }
  };

  const openNameEditor = () => {
    setNameDraft(auth.user.fullName);
    setIsNameModalVisible(true);
  };

  const handleSaveName = async () => {
    const nextName = nameDraft.trim();

    if (nextName.length < 2) {
      Alert.alert('Қате', 'Аккаунт аты кемінде 2 таңбадан тұруы керек.');
      return;
    }

    if (nextName === auth.user.fullName) {
      setIsNameModalVisible(false);
      return;
    }

    try {
      setIsNameUpdating(true);
      const user = await updateProfile(auth.accessToken, { fullName: nextName });
      applyUserUpdate(user);
      setIsNameModalVisible(false);
    } catch (error) {
      Alert.alert('Қате', error instanceof Error ? error.message : 'Аккаунт атын өзгерту мүмкін болмады.');
    } finally {
      setIsNameUpdating(false);
    }
  };

  React.useEffect(() => {
    slideX.setValue(width);
    Animated.timing(slideX, {
      toValue: 0,
      duration: 260,
      useNativeDriver: true,
    }).start();
  }, [slideX, width]);

  return (
    <Animated.View style={[styles.profileScreen, { backgroundColor: palette.background, transform: [{ translateX: slideX }] }]}>
      <View style={[styles.profileHeader, { borderBottomColor: palette.border }]}>
        <Pressable accessibilityRole="button" onPress={onBack} style={({ pressed }) => [styles.headerIconButton, pressed && styles.pressed]}>
          <Ionicons name="chevron-back" size={24} color={palette.text} />
        </Pressable>

        <Text style={[styles.profileHeaderTitle, { color: palette.text }]}>Профиль</Text>

        <View style={styles.headerActions}>
          <Pressable
            accessibilityRole="button"
            onPress={toggleLanguage}
            style={({ pressed }) => [styles.headerIconButton, styles.languageButton, { borderColor: palette.border }, pressed && styles.pressed]}
          >
            <Ionicons name="language-outline" size={20} color={colors.accent} />
            <Text style={styles.languageText}>{languages[languageIndex]}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => setIsDarkMode((current) => !current)}
            style={({ pressed }) => [styles.headerIconButton, { borderColor: palette.border }, pressed && styles.pressed]}
          >
            <Ionicons name={isDarkMode ? 'sunny-outline' : 'moon-outline'} size={21} color={colors.accent} />
          </Pressable>
        </View>
      </View>

      <View style={styles.profileBody}>
        <View style={styles.avatarBlock}>
          <View style={[styles.profileAvatarLarge, { borderColor: palette.border }]}>
            {auth.user.avatarUrl ? (
              <Image source={{ uri: `${env.apiUrl}${auth.user.avatarUrl}` }} style={styles.profileAvatarImage} resizeMode="cover" />
            ) : (
              <View style={styles.profileAvatarFallback}>
                <Text style={styles.profileInitialText}>{auth.user.fullName.charAt(0).toUpperCase()}</Text>
              </View>
            )}
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => setIsPhotoSheetVisible(true)}
            style={({ pressed }) => [styles.changeAvatarButton, pressed && styles.pressed]}
          >
            <Ionicons name="camera-outline" size={18} color={colors.white} />
            <Text style={styles.changeAvatarText}>Фото өзгерту</Text>
          </Pressable>
        </View>

        <View style={[styles.profileDivider, { backgroundColor: palette.border }]} />

        <View style={styles.accountInfo}>
          <ProfileInfoRow
            label="Аккаунт аты"
            value={auth.user.fullName}
            textColor={palette.text}
            mutedColor={palette.muted}
            onPress={openNameEditor}
          />
          <View style={[styles.infoDivider, { backgroundColor: palette.border }]} />
          <ProfileInfoRow label="Email" value={auth.user.email} textColor={palette.text} mutedColor={palette.muted} />
          <View style={[styles.infoDivider, { backgroundColor: palette.border }]} />
          <ProfileInfoRow label="Рөл" value={auth.user.role} textColor={palette.text} mutedColor={palette.muted} />
          <View style={[styles.infoDivider, { backgroundColor: palette.border }]} />
          <ProfileInfoRow label="Аккаунт ID" value={auth.user.id} textColor={palette.text} mutedColor={palette.muted} />
        </View>

        <Pressable accessibilityRole="button" onPress={handleLogoutPress} style={({ pressed }) => [styles.logoutButton, pressed && styles.pressed]}>
          <Ionicons name="log-out-outline" size={20} color={colors.white} />
          <Text style={styles.logoutText}>Шығу</Text>
        </Pressable>
      </View>

      <Modal animationType="fade" transparent visible={isPhotoSheetVisible} onRequestClose={() => setIsPhotoSheetVisible(false)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => !isPhotoUpdating && setIsPhotoSheetVisible(false)} />
          <View style={[styles.photoSheet, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Text style={[styles.photoSheetTitle, { color: palette.text }]}>Профиль фотосы</Text>
            <Pressable
              accessibilityRole="button"
              disabled={isPhotoUpdating}
              onPress={handlePickPhoto}
              style={({ pressed }) => [styles.photoSheetButton, { borderColor: palette.border }, pressed && styles.pressed]}
            >
              <Ionicons name="image-outline" size={21} color={colors.accent} />
              <Text style={[styles.photoSheetButtonText, { color: palette.text }]}>Басқасын жүктеу</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={!auth.user.avatarUrl || isPhotoUpdating}
              onPress={handleDeletePhoto}
              style={({ pressed }) => [
                styles.photoSheetButton,
                { borderColor: palette.border },
                !auth.user.avatarUrl && styles.disabledButton,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons name="trash-outline" size={21} color="#dc2626" />
              <Text style={[styles.photoSheetButtonText, { color: auth.user.avatarUrl ? '#dc2626' : palette.muted }]}>Фотоны өшіру</Text>
            </Pressable>
            {isPhotoUpdating ? <ActivityIndicator color={colors.accent} style={styles.photoLoader} /> : null}
          </View>
        </View>
      </Modal>

      <Modal animationType="fade" transparent visible={isNameModalVisible} onRequestClose={() => !isNameUpdating && setIsNameModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalAvoidingView}>
          <View style={styles.modalBackdrop}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => !isNameUpdating && setIsNameModalVisible(false)} />
            <View style={[styles.nameDialog, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <Text style={[styles.photoSheetTitle, { color: palette.text }]}>Аккаунт атын өзгерту</Text>
              <TextInput
                autoFocus
                editable={!isNameUpdating}
                onChangeText={setNameDraft}
                placeholder="Аккаунт аты"
                placeholderTextColor={palette.muted}
                returnKeyType="done"
                onSubmitEditing={handleSaveName}
                style={[styles.nameInput, { borderColor: palette.border, color: palette.text }]}
                value={nameDraft}
              />
              <View style={styles.nameDialogActions}>
                <Pressable
                  accessibilityRole="button"
                  disabled={isNameUpdating}
                  onPress={() => setIsNameModalVisible(false)}
                  style={({ pressed }) => [styles.nameCancelButton, { borderColor: palette.border }, pressed && styles.pressed]}
                >
                  <Text style={[styles.nameCancelText, { color: palette.text }]}>Болдырмау</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={isNameUpdating}
                  onPress={handleSaveName}
                  style={({ pressed }) => [styles.nameSaveButton, pressed && styles.pressed]}
                >
                  {isNameUpdating ? <ActivityIndicator color={colors.white} /> : <Text style={styles.nameSaveText}>Сақтау</Text>}
                </Pressable>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Animated.View>
  );
}

function ProfileInfoRow({
  label,
  value,
  textColor,
  mutedColor,
  onPress,
}: {
  label: string;
  value: string;
  textColor: string;
  mutedColor: string;
  onPress?: () => void;
}) {
  const content = (
    <>
      <View style={styles.infoTextBlock}>
        <Text style={[styles.infoLabel, { color: mutedColor }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: textColor }]} numberOfLines={2}>
          {value}
        </Text>
      </View>
      {onPress ? <Ionicons name="create-outline" size={20} color={colors.accent} /> : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.infoRow, styles.editableInfoRow, pressed && styles.pressed]}>
        {content}
      </Pressable>
    );
  }

  return (
    <View style={styles.infoRow}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  brand: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 12,
  },
  title: {
    color: colors.text,
    fontSize: 38,
    lineHeight: 44,
    fontWeight: '900',
    letterSpacing: 0,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '600',
    marginTop: 10,
  },
  tabBar: {
    minHeight: 58,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    paddingBottom: 0,
  },
  tabButton: {
    flex: 1,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
  },
  pressed: {
    opacity: 0.65,
  },
  profileScreen: {
    flex: 1,
  },
  profileHeader: {
    minHeight: 64,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
  },
  headerIconButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  profileHeaderTitle: {
    position: 'absolute',
    left: 96,
    right: 96,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '900',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  languageButton: {
    width: 58,
    flexDirection: 'row',
    gap: 3,
  },
  languageText: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: '900',
  },
  profileBody: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 26,
  },
  avatarBlock: {
    alignItems: 'center',
  },
  profileAvatarLarge: {
    width: 116,
    height: 116,
    borderRadius: 58,
    borderWidth: 3,
    overflow: 'hidden',
  },
  profileAvatarImage: {
    width: '100%',
    height: '100%',
  },
  profileAvatarFallback: {
    flex: 1,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInitialText: {
    color: colors.white,
    fontSize: 42,
    fontWeight: '900',
  },
  changeAvatarButton: {
    minHeight: 42,
    borderRadius: 14,
    backgroundColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
    paddingHorizontal: 18,
  },
  changeAvatarText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '900',
  },
  profileDivider: {
    height: 1,
    marginTop: 28,
    marginBottom: 22,
  },
  accountInfo: {
    gap: 14,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 5,
  },
  editableInfoRow: {
    minHeight: 52,
  },
  infoTextBlock: {
    flex: 1,
    gap: 5,
    paddingRight: 12,
  },
  infoDivider: {
    height: 1,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '800',
  },
  infoValue: {
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '900',
  },
  logoutButton: {
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: '#dc2626',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    marginTop: 'auto',
    marginBottom: 24,
  },
  logoutText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '900',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.36)',
    justifyContent: 'flex-end',
  },
  modalAvoidingView: {
    flex: 1,
  },
  photoSheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 28,
  },
  photoSheetTitle: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 14,
    textAlign: 'center',
  },
  photoSheetButton: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    marginTop: 10,
  },
  photoSheetButtonText: {
    fontSize: 15,
    fontWeight: '900',
  },
  disabledButton: {
    opacity: 0.45,
  },
  photoLoader: {
    marginTop: 16,
  },
  nameDialog: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 28,
  },
  nameInput: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 16,
    fontWeight: '700',
  },
  nameDialogActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  nameCancelButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameCancelText: {
    fontSize: 14,
    fontWeight: '900',
  },
  nameSaveButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 15,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameSaveText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '900',
  },
});
