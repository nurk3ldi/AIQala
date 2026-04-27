import { useState } from 'react';
import { SafeAreaView, StatusBar, StyleSheet } from 'react-native';

import { OnboardingScreen } from '../screens/OnboardingScreen';
import { AuthScreen } from '../screens/AuthScreen';
import { MainTabsScreen } from '../screens/MainTabsScreen';
import { AuthResult } from '../services/auth';
import { colors } from '../theme/colors';

export default function App() {
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
  const [auth, setAuth] = useState<AuthResult | null>(null);

  const renderContent = () => {
    if (auth) {
      return <MainTabsScreen auth={auth} />;
    }

    if (hasSeenOnboarding) {
      return <AuthScreen onAuthSuccess={setAuth} />;
    }

    return <OnboardingScreen onFinish={() => setHasSeenOnboarding(true)} />;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      {renderContent()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
