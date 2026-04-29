import React from 'react';
import {
  Animated,
  Easing,
  Pressable,
  PressableProps,
  StyleProp,
  ViewStyle,
} from 'react-native';

type AnimatedScreenProps = {
  children: React.ReactNode;
  delay?: number;
  distance?: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
};

export function AnimatedScreen({
  children,
  delay = 0,
  distance = 18,
  duration = 280,
  style,
}: AnimatedScreenProps) {
  const progress = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [delay, duration, progress]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [distance, 0],
              }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

type AnimatedListItemProps = AnimatedScreenProps & {
  index?: number;
};

export function AnimatedListItem({ children, index = 0, delay, ...props }: AnimatedListItemProps) {
  return (
    <AnimatedScreen delay={delay ?? Math.min(index * 45, 240)} {...props}>
      {children}
    </AnimatedScreen>
  );
}

type AnimatedPressableProps = PressableProps & {
  pressedScale?: number;
};

const AnimatedPressableBase = Animated.createAnimatedComponent(Pressable);

export function AnimatedPressable({
  onPressIn,
  onPressOut,
  pressedScale = 0.96,
  style,
  ...props
}: AnimatedPressableProps) {
  const scale = React.useRef(new Animated.Value(1)).current;

  const animateTo = (value: number) => {
    Animated.spring(scale, {
      toValue: value,
      friction: 7,
      tension: 120,
      useNativeDriver: true,
    }).start();
  };

  return (
    <AnimatedPressableBase
      {...props}
      onPressIn={(event) => {
        animateTo(pressedScale);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        animateTo(1);
        onPressOut?.(event);
      }}
      style={(state) => [
        typeof style === 'function' ? style(state) : style,
        { transform: [{ scale }] },
      ]}
    />
  );
}
