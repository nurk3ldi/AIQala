import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { OnboardingArt } from './OnboardingArt';
import { OnboardingItem } from '../data/onboarding';
import { ThemeColors, lightColors } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../theme/LanguageContext';

type OnboardingSlideProps = {
  item: OnboardingItem;
  index: number;
};

export function OnboardingSlide({ item, index }: OnboardingSlideProps) {
  const theme = useTheme();
  const { t } = useLanguage();
  styles = createStyles(theme.colors);
  const transitionValue = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    transitionValue.setValue(0);
    Animated.timing(transitionValue, {
      toValue: 1,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [index, transitionValue]);

  const copyStyle = {
    opacity: transitionValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    }),
    transform: [
      {
        translateY: transitionValue.interpolate({
          inputRange: [0, 1],
          outputRange: [24, 0],
        }),
      },
    ],
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.copy, copyStyle]}>
        <Text style={styles.kicker}>{item.kicker}</Text>
        <Text style={styles.title}>{t(item.titleKey)}</Text>
      </Animated.View>
      <OnboardingArt index={index} />
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  copy: {
    gap: 12,
    paddingTop: 30,
  },
  kicker: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0,
  },
  title: {
    color: colors.text,
    fontSize: 40,
    lineHeight: 47,
    fontWeight: '900',
    letterSpacing: 0,
  },
});

let styles = createStyles(lightColors);
