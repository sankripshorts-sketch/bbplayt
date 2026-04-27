import React, { useCallback, useEffect, useRef } from 'react';
import { Animated, Modal, Platform, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

const DEFAULT_DIM = 0.72;

type Props = {
  visible: boolean;
  onRequestClose: () => void;
  /** iOS: overFullScreen helps safe-area; передавайте из места вызова при необходимости */
  presentationStyle?: 'overFullScreen' | 'fullScreen' | 'pageSheet' | 'formSheet';
  /**
   * Рендер шторки. Получает callback для `DraggableWheelSheet` / `DraggableScreenSheet` —
   * затемнение плавно схлопывается при сдвиге вниз.
   */
  children: (onDragOffsetChange: (offsetPx: number, maxOffsetPx: number) => void) => React.ReactNode;
  /** flex-end (шторка снизу) или full — контент `flex:1` */
  contentAlign: 'flex-end' | 'stretch';
  /** Стили для обёртки `children` (например flex:1 при full sheet) */
  contentWrapperStyle?: ViewStyle;
  /** Базовая сила затемнения фона (0..1). */
  dimOpacity?: number;
};

/**
 * `Modal` с `animationType: fade` и затемнённым фоном, который **не** едет вверх
 * вместе с шторкой (в отличие от `animationType: slide` на `transparent` Modal).
 */
export function DimmedSheetModal({
  visible,
  onRequestClose,
  presentationStyle,
  children,
  contentAlign,
  contentWrapperStyle,
  dimOpacity = DEFAULT_DIM,
}: Props) {
  const opacity = useRef(new Animated.Value(dimOpacity)).current;
  const resolvedPresentationStyle =
    presentationStyle ?? (Platform.OS === 'ios' ? 'overFullScreen' : undefined);

  useEffect(() => {
    if (visible) {
      opacity.setValue(dimOpacity);
    }
  }, [visible, opacity, dimOpacity]);

  const onDrag = useCallback((offsetPx: number, maxOffsetPx: number) => {
    const k = maxOffsetPx > 1 ? Math.min(1, Math.max(0, offsetPx / maxOffsetPx)) : 0;
    opacity.setValue(dimOpacity * (1 - k));
  }, [opacity, dimOpacity]);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onRequestClose}
      presentationStyle={resolvedPresentationStyle}
    >
      <View style={styles.root}>
        <Animated.View
          style={[
            StyleSheet.absoluteFillObject,
            {
              backgroundColor: `rgba(0,0,0,${dimOpacity})`,
              opacity,
              zIndex: 0,
              ...(Platform.OS === 'android' ? { elevation: 0 } : {}),
            },
          ]}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onRequestClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
          />
        </Animated.View>
        <View
          style={[
            contentAlign === 'flex-end' ? { flex: 1, justifyContent: 'flex-end' } : { flex: 1 },
            contentWrapperStyle,
            /** Шторка над dim (Android/web: без elevation/z-index затемнение иногда перекрывает контент). */
            {
              zIndex: 10,
              position: 'relative',
              ...(Platform.OS === 'android' ? { elevation: 24 } : {}),
              pointerEvents: 'box-none',
            },
          ]}
        >
          {children(onDrag)}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    elevation: 1000,
    zIndex: 1000,
  },
});
