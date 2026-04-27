import React, { useEffect, useRef } from 'react';
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
}: Props) {
  const opacity = useRef(new Animated.Value(DEFAULT_DIM)).current;
  const resolvedPresentationStyle =
    presentationStyle ?? (Platform.OS === 'ios' ? 'overFullScreen' : undefined);

  useEffect(() => {
    if (visible) {
      opacity.setValue(DEFAULT_DIM);
    }
  }, [visible, opacity]);

  const onDrag = (offsetPx: number, maxOffsetPx: number) => {
    const k = maxOffsetPx > 1 ? Math.min(1, Math.max(0, offsetPx / maxOffsetPx)) : 0;
    opacity.setValue(DEFAULT_DIM * (1 - k));
  };

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
              backgroundColor: 'rgba(0,0,0,0.72)',
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
