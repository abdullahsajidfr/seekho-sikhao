import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Easing } from 'react-native';
import { colors, radius } from '../../../theme';

function Dot({ delay }: { delay: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(v, { toValue: 1, duration: 480, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 480, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.delay(480 - delay),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [v, delay]);

  const scale = v.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });
  const opacity = v.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });
  return <Animated.View style={[styles.dot, { transform: [{ scale }], opacity }]} />;
}

export default function ThinkingDots() {
  return (
    <View style={styles.row}>
      <View style={styles.bubble}>
        <Dot delay={0} />
        <Dot delay={200} />
        <Dot delay={400} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'flex-start' },
  bubble: {
    backgroundColor: colors.aiBubble,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
});
