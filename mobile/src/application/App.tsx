import { useState } from 'react';
import { SafeAreaView, StatusBar, StyleSheet } from 'react-native';

import { OnboardingScreen } from '../screens/OnboardingScreen';
import { AuthScreen } from '../screens/AuthScreen';
import { MainTabsScreen } from '../screens/MainTabsScreen';
import { AuthResult } from '../services/auth';
import { LanguageProvider } from '../theme/LanguageContext';
import { ThemeProvider, useTheme } from '../theme/ThemeContext';

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AppContent />
      </LanguageProvider>
    </ThemeProvider>
  );
}

function AppContent() {
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
  const [auth, setAuth] = useState<AuthResult | null>(null);
  const { colors, isDarkMode } = useTheme();

  const renderContent = () => {
    if (auth) {
      return <MainTabsScreen auth={auth} onAuthUpdate={setAuth} onLogout={() => setAuth(null)} />;
    }

    if (hasSeenOnboarding) {
      return <AuthScreen onAuthSuccess={setAuth} />;
    }

    return <OnboardingScreen onFinish={() => setHasSeenOnboarding(true)} />;
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      {renderContent()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
});
