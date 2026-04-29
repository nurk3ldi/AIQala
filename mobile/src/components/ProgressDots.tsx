import React from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { ThemeColors, lightColors } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';

type ProgressDotsProps = {
  activeIndex: number;
  count: number;
};

export function ProgressDots({ activeIndex, count }: ProgressDotsProps) {
  return (
    <View style={styles.container} accessibilityRole="progressbar">
      {Array.from({ length: count }).map((_, index) => (
        <ProgressDot active={activeIndex === index} key={index} />
      ))}
    </View>
  );
}

function ProgressDot({ active }: { active: boolean }) {
  const theme = useTheme();
  styles = createStyles(theme.colors);
  const colors = theme.colors;
  const progress = React.useRef(new Animated.Value(active ? 1 : 0)).current;

  React.useEffect(() => {
    Animated.timing(progress, {
      toValue: active ? 1 : 0,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [active, progress]);

  return (
    <Animated.View
      style={[
        styles.dot,
        {
          width: progress.interpolate({
            inputRange: [0, 1],
            outputRange: [8, 26],
          }),
          backgroundColor: progress.interpolate({
            inputRange: [0, 1],
            outputRange: [colors.border, colors.accent],
          }),
        },
      ]}
    />
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
});

let styles = createStyles(lightColors);
