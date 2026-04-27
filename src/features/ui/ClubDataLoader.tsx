import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  type ImageSourcePropType,
  Platform,
  StyleSheet,
  type StyleProp,
  View,
  type ViewStyle,
} from 'react-native';
import { Text } from '../../components/DinText';
import { useLocale } from '../../i18n/LocaleContext';
import type { MessageKey } from '../../i18n/messagesRu';
import { useThemeColors } from '../../theme';

const LOADER_IMAGE_ANIMATED = require('../../../assets/club-loading-bear-animated.gif') as ImageSourcePropType;
const LOADER_IMAGE_FALLBACK = require('../../../assets/club-loading-bear.webp') as ImageSourcePropType;

const CAPTION_INTERVAL_MS = 1800;

const DEFAULT_CAPTION_KEYS: MessageKey[] = [
  'common.loader.captionDevices',
  'common.loader.captionPc',
  'common.loader.captionClub',
  'common.loader.captionHeadset',
  'common.loader.captionNetwork',
  'common.loader.captionChairs',
];

export function ClubDataLoader({
  message,
  captionKeys = DEFAULT_CAPTION_KEYS,
  compact = false,
  imageSize = compact ? 150 : 240,
  minHeight = compact ? 170 : 300,
  style,
}: {
  message?: string;
  captionKeys?: MessageKey[];
  compact?: boolean;
  imageSize?: number;
  minHeight?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const colors = useThemeColors();
  const { t } = useLocale();
  const styles = useMemo(() => createStyles(imageSize), [imageSize]);
  const [captionIndex, setCaptionIndex] = useState(0);
  const [useFallbackImage, setUseFallbackImage] = useState(false);
  const float = useRef(new Animated.Value(0)).current;

  const captions = useMemo(
    () => captionKeys.map((key) => t(key)).filter((caption) => caption.trim().length > 0),
    [captionKeys, t],
  );

  useEffect(() => {
    if (captions.length <= 1) return undefined;
    const id = setInterval(() => {
      setCaptionIndex((idx) => (idx + 1) % captions.length);
    }, CAPTION_INTERVAL_MS);
    return () => clearInterval(id);
  }, [captions.length]);

  useEffect(() => {
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, {
          toValue: 1,
          duration: 720,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(float, {
          toValue: 0,
          duration: 720,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]),
    );
    floatLoop.start();
    return () => {
      floatLoop.stop();
    };
  }, [float]);

  const loaderTransform = {
    transform: [
      {
        translateY: float.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -4],
        }),
      },
      {
        scale: float.interpolate({
          inputRange: [0, 1],
          outputRange: [0.99, 1.04],
        }),
      },
      {
        rotate: float.interpolate({
          inputRange: [0, 1],
          outputRange: ['-10deg', '10deg'],
        }),
      },
    ],
  };

  return (
    <View
      style={[styles.root, { minHeight }, compact && styles.rootCompact, style]}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={message ?? t('common.loadingData')}
    >
      <Animated.View style={[styles.imageWrap, loaderTransform]}>
        <Image
          source={useFallbackImage ? LOADER_IMAGE_FALLBACK : LOADER_IMAGE_ANIMATED}
          style={styles.image}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
          onError={() => setUseFallbackImage(true)}
        />
      </Animated.View>
      <Text style={[styles.message, { color: colors.text }]}>{message ?? t('common.loadingData')}</Text>
      <Text style={[styles.caption, { color: colors.muted }]}>
        {captions[captionIndex % Math.max(1, captions.length)] ?? t('common.loader.captionPc')}
      </Text>
    </View>
  );
}

function createStyles(imageSize: number) {
  const logoSize = Math.round(imageSize * 1.45);

  return StyleSheet.create({
    root: {
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 18,
      transform: [{ translateY: 0 }],
    },
    rootCompact: {
      paddingVertical: 12,
      transform: [{ translateY: 0 }],
    },
    imageWrap: {
      width: imageSize,
      height: imageSize,
      justifyContent: 'center',
      alignItems: 'center',
    },
    image: {
      width: logoSize,
      height: logoSize,
    },
    message: {
      marginTop: 20,
      fontSize: 18,
      fontWeight: '800',
      textAlign: 'center',
    },
    caption: {
      marginTop: 7,
      fontSize: 15,
      lineHeight: 20,
      textAlign: 'center',
      fontWeight: '600',
    },
  });
}
