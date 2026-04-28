import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AuthResult } from '../services/auth';
import { HomeMapScreen } from './HomeMapScreen';
import { colors } from '../theme/colors';

type MainTabsScreenProps = {
  auth: AuthResult;
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

export function MainTabsScreen({ auth }: MainTabsScreenProps) {
  const [activeTab, setActiveTab] = React.useState<TabKey>('home');

  return (
    <View style={styles.screen}>
      <View style={styles.content}>
        {activeTab === 'home' ? (
          <HomeMapScreen auth={auth} onProfilePress={() => setActiveTab('profile')} />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.brand}>AIQala</Text>
            <Text style={styles.title}>{screenTitles[activeTab]}</Text>
            <Text style={styles.subtitle}>{screenSubtitles[activeTab]}</Text>
          </View>
        )}
      </View>

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
});
