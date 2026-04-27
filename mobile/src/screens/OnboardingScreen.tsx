import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AccentButton } from '../components/AccentButton';
import { OnboardingSlide } from '../components/OnboardingSlide';
import { ProgressDots } from '../components/ProgressDots';
import { onboardingItems } from '../data/onboarding';
import { colors } from '../theme/colors';

type OnboardingScreenProps = {
  onFinish: () => void;
};

export function OnboardingScreen({ onFinish }: OnboardingScreenProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeItem = onboardingItems[activeIndex];
  const isLastSlide = activeIndex === onboardingItems.length - 1;

  const handleNext = () => {
    if (!isLastSlide) {
      setActiveIndex((current) => current + 1);
      return;
    }

    onFinish();
  };

  const handleSkip = () => {
    setActiveIndex(onboardingItems.length - 1);
  };

  return (
    <View style={styles.screen}>
      <OnboardingSlide item={activeItem} index={activeIndex} />

      <View style={styles.footer}>
        <View style={styles.footerTop}>
          <Pressable
            accessibilityRole="button"
            onPress={handleSkip}
            style={({ pressed }) => [styles.skipButton, pressed && styles.skipButtonPressed]}
          >
            <Text style={styles.skipText}>Пропустить</Text>
          </Pressable>
          <ProgressDots activeIndex={activeIndex} count={onboardingItems.length} />
        </View>
        <AccentButton label={isLastSlide ? 'Начать' : 'Далее'} onPress={handleNext} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 28,
    paddingTop: 14,
    paddingBottom: 22,
  },
  footer: {
    gap: 20,
  },
  footerTop: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  skipButton: {
    minHeight: 34,
    justifyContent: 'center',
  },
  skipButtonPressed: {
    opacity: 0.55,
  },
  skipText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
});
