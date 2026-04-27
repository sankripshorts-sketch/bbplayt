import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Dimensions,
  type LayoutChangeEvent,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ColorPalette } from '../../theme/palettes';

type ShellProps = {
  /** Когда true — сбрасываем сдвиг (модалка открыта) */
  open: boolean;
  onRequestClose: () => void;
  colors: ColorPalette;
  frameStyle: ViewStyle | ViewStyle[];
  children: React.ReactNode;
  dragExtendBelowGrabberPx?: number;
  onDragOffsetChange?: (offsetPx: number, maxOffsetPx: number) => void;
  extendToBottomEdge?: boolean;
  /**
   * Для шторки на весь экран: отступ сверху под «челку», чтобы ручка и контент не залезли под status bar
   */
  applyTopSafeInset?: boolean;
  /** Крестик у ручки: выкл., если закрытие только кнопкой внизу (напр. «Условия и цены»). */
  showHeaderClose?: boolean;
};

const DISMISS_DY = 96;
const DISMISS_VY = 1.15;

const DEFAULT_DRAG_BELOW_GRABBER_PX = 88;
const BOTTOM_EDGE_BLEED_PX = 128;

type WheelProps = {
  open: boolean;
  onRequestClose: () => void;
  colors: ColorPalette;
  sheetStyle: ViewStyle | ViewStyle[];
  children: React.ReactNode;
  dragExtendBelowGrabberPx?: number;
  onDragOffsetChange?: (offsetPx: number, maxOffsetPx: number) => void;
  extendToBottomEdge?: boolean;
  showHeaderClose?: boolean;
};

type ScreenProps = Omit<WheelProps, 'sheetStyle'> & {
  sheetStyle?: ViewStyle | ViewStyle[];
  /**
   * `fill` — как раньше: flex 1 под полноэкранную шторку.
   * `hug` — высота по контенту + maxHeight; иначе сочетание justifyContent:flex-end и flex:1 в базе даёт невидимую шторку.
   */
  sheetHeightMode?: 'fill' | 'hug';
};

/**
 * Внутренняя оболочка: ручка, крестик, pan — для колёс и для полноэкранных шторок.
 */
function SheetDragShell({
  open,
  onRequestClose,
  colors,
  frameStyle,
  children,
  dragExtendBelowGrabberPx = DEFAULT_DRAG_BELOW_GRABBER_PX,
  onDragOffsetChange,
  extendToBottomEdge = false,
  applyTopSafeInset = false,
  showHeaderClose = true,
}: ShellProps) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(0)).current;
  const closingRef = useRef(false);
  const sheetHeightRef = useRef(400);
  const [grabberBottomY, setGrabberBottomY] = React.useState(56);

  const screenH = Dimensions.get('window').height;
  const captureMaxY = grabberBottomY + dragExtendBelowGrabberPx + (applyTopSafeInset ? insets.top : 0);

  const runClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    const travel = Math.max(sheetHeightRef.current, screenH * 0.35);
    Animated.timing(translateY, {
      toValue: travel,
      duration: 220,
      useNativeDriver: false,
    }).start(() => {
      onRequestClose();
      closingRef.current = false;
    });
  }, [onRequestClose, screenH, translateY]);

  useEffect(() => {
    if (open) {
      const travel = Math.max(sheetHeightRef.current, screenH * 0.35);
      translateY.setValue(travel);
      closingRef.current = false;
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: false,
        friction: 8,
        tension: 90,
      }).start();
      onDragOffsetChange?.(0, travel);
    }
  }, [open, translateY, onDragOffsetChange, screenH]);

  useEffect(() => {
    if (!onDragOffsetChange) return;
    const id = translateY.addListener(({ value }) => {
      onDragOffsetChange(value, Math.max(sheetHeightRef.current, screenH * 0.35));
    });
    return () => {
      translateY.removeListener(id);
    };
  }, [translateY, onDragOffsetChange, screenH]);

  const onCloseRef = useRef(onRequestClose);
  onCloseRef.current = onRequestClose;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onStartShouldSetPanResponderCapture: () => false,
        onMoveShouldSetPanResponder: (evt, g) => {
          const startY = evt.nativeEvent.locationY - g.dy;
          if (startY > captureMaxY) return false;
          return g.dy > 12 && Math.abs(g.dy) > Math.abs(g.dx) * 1.05;
        },
        onMoveShouldSetPanResponderCapture: (evt, g) => {
          const startY = evt.nativeEvent.locationY - g.dy;
          if (startY > captureMaxY) return false;
          return g.dy > 12 && Math.abs(g.dy) > Math.abs(g.dx) * 1.05;
        },
        onPanResponderTerminationRequest: () => true,
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
              useNativeDriver: false,
            }).start(() => {
              onCloseRef.current();
              closingRef.current = false;
            });
          } else {
            Animated.spring(translateY, {
              toValue: 0,
              useNativeDriver: false,
              friction: 7,
              tension: 80,
            }).start();
          }
        },
      }),
    [captureMaxY, screenH, translateY],
  );

  const onSheetLayout = (e: LayoutChangeEvent) => {
    sheetHeightRef.current = e.nativeEvent.layout.height;
  };

  const onGrabberLayout = (e: LayoutChangeEvent) => {
    const { y, height } = e.nativeEvent.layout;
    setGrabberBottomY(y + height);
  };

  return (
    <Animated.View
      style={[
        frameStyle,
        extendToBottomEdge ? styles.bottomEdgeFrame : null,
        { transform: [{ translateY }] },
      ]}
      onLayout={onSheetLayout}
      collapsable={false}
      {...panResponder.panHandlers}
    >
      <View
        style={[applyTopSafeInset ? { paddingTop: insets.top } : null]}
        collapsable={false}
      >
        <View style={styles.grabberHit} collapsable={false} onLayout={onGrabberLayout}>
          <View style={[styles.bar, { backgroundColor: colors.borderLight }]} />
          {showHeaderClose ? (
            <Pressable
              onPress={runClose}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Close"
              style={({ pressed }) => [
                styles.closeBtn,
                { borderColor: colors.border, backgroundColor: colors.card, opacity: pressed ? 0.78 : 1 },
              ]}
            >
              <Text style={[styles.closeBtnText, { color: colors.text }]}>×</Text>
            </Pressable>
          ) : null}
        </View>
        {children}
        {extendToBottomEdge ? <View style={[styles.bottomEdgeSpacer, styles.pointerNone]} /> : null}
      </View>
    </Animated.View>
  );
}

/**
 * Нижняя шторка: тянуть вниз в верхней части (ручка + заголовок) — движется за пальцем, отпускание закрывает или возвращает.
 */
export function DraggableWheelSheet({
  open,
  onRequestClose,
  colors,
  sheetStyle,
  children,
  dragExtendBelowGrabberPx = DEFAULT_DRAG_BELOW_GRABBER_PX,
  onDragOffsetChange,
  extendToBottomEdge = true,
  showHeaderClose = true,
}: WheelProps) {
  const frame = StyleSheet.flatten([wheelSheetBase, sheetStyle ?? {}]);
  return (
    <SheetDragShell
      open={open}
      onRequestClose={onRequestClose}
      colors={colors}
      frameStyle={frame}
      dragExtendBelowGrabberPx={dragExtendBelowGrabberPx}
      onDragOffsetChange={onDragOffsetChange}
      extendToBottomEdge={extendToBottomEdge}
      showHeaderClose={showHeaderClose}
    >
      {children}
    </SheetDragShell>
  );
}

const screenSheetShadows: ViewStyle = {
  ...(Platform.OS === 'android' ? { elevation: 12 } : {}),
  ...(Platform.OS === 'web' ? { boxShadow: '0 -2px 8px rgba(0,0,0,0.2)' } : {}),
  ...(Platform.OS === 'ios'
    ? { shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.2, shadowRadius: 8 }
    : {}),
};

const screenSheetBase: ViewStyle = {
  width: '100%',
  flex: 1,
  minHeight: 0,
  maxHeight: '100%',
  borderTopLeftRadius: 16,
  borderTopRightRadius: 16,
  ...screenSheetShadows,
};

/** Без flex:1 — высота рамки от детей (компактные шторки с maxHeight). */
const screenSheetBaseHug: ViewStyle = {
  width: '100%',
  alignSelf: 'stretch',
  minHeight: 0,
  maxHeight: '100%',
  borderTopLeftRadius: 16,
  borderTopRightRadius: 16,
  ...screenSheetShadows,
};

const wheelSheetBase: ViewStyle = {
  width: '100%',
  alignSelf: 'stretch',
  minHeight: 0,
  maxHeight: '100%',
};

/**
 * Почти на весь экран: та же ручка и крестик, выезд вниз при жесте.
 * `sheetStyle` дополняет базу (радиусы, flex).
 */
export function DraggableScreenSheet({
  open,
  onRequestClose,
  colors,
  sheetStyle,
  children,
  dragExtendBelowGrabberPx = 120,
  onDragOffsetChange,
  extendToBottomEdge = true,
  showHeaderClose = true,
  sheetHeightMode = 'fill',
}: ScreenProps) {
  const base = sheetHeightMode === 'hug' ? screenSheetBaseHug : screenSheetBase;
  const frame = StyleSheet.flatten([
    base,
    { backgroundColor: colors.card, paddingTop: 0 },
    sheetStyle ?? {},
  ]);

  return (
    <SheetDragShell
      open={open}
      onRequestClose={onRequestClose}
      colors={colors}
      frameStyle={frame}
      dragExtendBelowGrabberPx={dragExtendBelowGrabberPx}
      onDragOffsetChange={onDragOffsetChange}
      extendToBottomEdge={extendToBottomEdge}
      applyTopSafeInset
      showHeaderClose={showHeaderClose}
    >
      {children}
    </SheetDragShell>
  );
}

const styles = StyleSheet.create({
  bottomEdgeFrame: {
    marginBottom: -BOTTOM_EDGE_BLEED_PX,
  },
  bottomEdgeSpacer: {
    height: BOTTOM_EDGE_BLEED_PX,
  },
  pointerNone: {
    pointerEvents: 'none',
  },
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
  closeBtn: {
    position: 'absolute',
    right: 10,
    top: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 18,
    lineHeight: 20,
    fontWeight: '700',
    marginTop: -1,
  },
});
