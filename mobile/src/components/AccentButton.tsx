import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';

type AccentButtonProps = {
  label: string;
  onPress: () => void;
};

export function AccentButton({ label, onPress }: AccentButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
    >
      <Text style={styles.label}>{label}</Text>
      <View style={styles.iconCircle}>
        <Text style={styles.arrow}>→</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 58,
    borderRadius: 29,
    backgroundColor: colors.accent,
    paddingLeft: 24,
    paddingRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: colors.accent,
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  buttonPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.98 }],
  },
  label: {
    color: colors.white,
    fontSize: 17,
    fontWeight: '700',
  },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrow: {
    color: colors.accent,
    fontSize: 24,
    lineHeight: 26,
    fontWeight: '700',
  },
});
