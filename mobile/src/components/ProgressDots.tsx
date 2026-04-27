import { StyleSheet, View } from 'react-native';

import { colors } from '../theme/colors';

type ProgressDotsProps = {
  activeIndex: number;
  count: number;
};

export function ProgressDots({ activeIndex, count }: ProgressDotsProps) {
  return (
    <View style={styles.container} accessibilityRole="progressbar">
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} style={[styles.dot, activeIndex === index && styles.activeDot]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
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
  activeDot: {
    width: 26,
    backgroundColor: colors.accent,
  },
});
