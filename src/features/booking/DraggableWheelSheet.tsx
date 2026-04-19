import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Dimensions,
  type LayoutChangeEvent,
  PanResponder,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import type { ColorPalette } from '../../theme/palettes';

type Props = {
  /** Когда true — сбрасываем сдвиг (модалка открыта) */
  open: boolean;
  onRequestClose: () => void;
  colors: ColorPalette;
  sheetStyle: ViewStyle | ViewStyle[];
  children: React.ReactNode;
};

const DISMISS_DY = 96;
const DISMISS_VY = 1.15;

/**
 * Нижняя шторка: тянуть за полоску вниз — движется за пальцем, отпускание закрывает или возвращает.
 */
export function DraggableWheelSheet({ open, onRequestClose, colors, sheetStyle, children }: Props) {
  const translateY = useRef(new Animated.Value(0)).current;
  const closingRef = useRef(false);
  const sheetHeightRef = useRef(400);

  const screenH = Dimensions.get('window').height;

  useEffect(() => {
    if (open) {
      translateY.setValue(0);
      closingRef.current = false;
    }
  }, [open, translateY]);

  const onCloseRef = useRef(onRequestClose);
  onCloseRef.current = onRequestClose;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        /** Ручка сразу забирает жест — иначе FlatList/Modal перехватывают касание */
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponderCapture: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderMove: (_, g) => {
          translateY.setValue(Math.max(0, g.dy));
        },
        onPanResponderRelease: (_, g) => {
          const shouldClose = g.dy > DISMISS_DY || g.vy > DISMISS_VY;
          if (shouldClose && !closingRef.current) {
            closingRef.current = true;
            const travel = Math.max(sheetHeightRef.current, screenH * 0.35);
            Animated.timing(translateY, {
              toValue: travel,
              duration: 240,
              useNativeDriver: true,
            }).start(() => {
              onCloseRef.current();
              translateY.setValue(0);
              closingRef.current = false;
            });
          } else {
            Animated.spring(translateY, {
              toValue: 0,
              useNativeDriver: true,
              friction: 7,
              tension: 80,
            }).start();
          }
        },
      }),
    [screenH, translateY],
  );

  const onSheetLayout = (e: LayoutChangeEvent) => {
    sheetHeightRef.current = e.nativeEvent.layout.height;
  };

  return (
    <Animated.View
      style={[sheetStyle, { transform: [{ translateY }] }]}
      onLayout={onSheetLayout}
      collapsable={false}
    >
      <View style={styles.grabberHit} collapsable={false} {...panResponder.panHandlers}>
        <View style={[styles.bar, { backgroundColor: colors.borderLight }]} />
      </View>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  grabberHit: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    minHeight: 44,
    paddingTop: 8,
    paddingBottom: 8,
    zIndex: 10,
  },
  bar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    opacity: 0.85,
  },
});
