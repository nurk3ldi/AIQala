import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { ThemeColors, lightColors } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';

type OnboardingArtProps = {
  index: number;
};

export function OnboardingArt({ index }: OnboardingArtProps) {
  const theme = useTheme();
  styles = createStyles(theme.colors);
  const floatValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(floatValue, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(floatValue, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();

    return () => animation.stop();
  }, [floatValue]);

  const floatStyle = {
    transform: [
      {
        translateY: floatValue.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -12],
        }),
      },
      {
        scale: floatValue.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.035],
        }),
      },
    ],
  };

  return (
    <View style={styles.stage}>
      <Animated.View style={[styles.glow, floatStyle]} />
      <Animated.Text style={[styles.backgroundMark, floatStyle]}>AI</Animated.Text>
      <Animated.View style={[styles.cardWrap, floatStyle]}>
        <View style={[styles.card, index === 1 && styles.cardTiltLeft, index === 2 && styles.cardTiltRight]}>
          <View style={styles.cardHeader}>
            <View style={styles.headerDot} />
            <View style={styles.headerLine} />
          </View>
          <View style={styles.cardBody}>
            <View style={[styles.symbolCircle, index === 1 && styles.symbolSquare, index === 2 && styles.symbolTall]}>
              <Text style={styles.symbolText}>{index + 1}</Text>
            </View>
            <View style={styles.lines}>
              <View style={styles.lineWide} />
              <View style={styles.lineMedium} />
              <View style={styles.lineShort} />
            </View>
          </View>
        </View>
      </Animated.View>
      <Animated.View style={[styles.orbitOne, floatStyle]} />
      <Animated.View style={[styles.orbitTwo, floatStyle]} />
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  stage: {
    height: 310,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: colors.accentSoft,
    opacity: 0.5,
    shadowColor: colors.accent,
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
  },
  backgroundMark: {
    position: 'absolute',
    bottom: 8,
    right: -18,
    color: colors.accentPale,
    fontSize: 180,
    lineHeight: 190,
    fontWeight: '900',
  },
  cardWrap: {
    width: 192,
    height: 232,
  },
  card: {
    flex: 1,
    width: 192,
    height: 232,
    borderRadius: 32,
    backgroundColor: colors.surface,
    padding: 18,
    shadowColor: colors.black,
    shadowOpacity: 0.13,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 22 },
    elevation: 9,
  },
  cardTiltLeft: {
    transform: [{ rotate: '-8deg' }],
  },
  cardTiltRight: {
    transform: [{ rotate: '7deg' }],
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.accent,
  },
  headerLine: {
    height: 10,
    width: 74,
    borderRadius: 5,
    backgroundColor: colors.border,
  },
  cardBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  symbolCircle: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  symbolSquare: {
    borderRadius: 24,
  },
  symbolTall: {
    height: 104,
    borderRadius: 26,
  },
  symbolText: {
    color: colors.white,
    fontSize: 34,
    fontWeight: '900',
  },
  lines: {
    alignItems: 'center',
    gap: 8,
  },
  lineWide: {
    width: 112,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.text,
  },
  lineMedium: {
    width: 86,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  lineShort: {
    width: 58,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  orbitOne: {
    position: 'absolute',
    top: 58,
    left: 28,
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 10,
    borderColor: colors.accentPale,
  },
  orbitTwo: {
    position: 'absolute',
    right: 30,
    bottom: 42,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.accent,
    opacity: 0.16,
  },
});

let styles = createStyles(lightColors);
