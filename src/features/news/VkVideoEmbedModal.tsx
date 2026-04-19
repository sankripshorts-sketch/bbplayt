import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Text } from '../../components/DinText';
import type { WebViewNavigation } from 'react-native-webview';
import { WebView } from 'react-native-webview';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ColorPalette } from '../../theme/palettes';
import { useThemeColors } from '../../theme';

type Props = {
  visible: boolean;
  embedUri: string | null;
  title: string;
  onClose: () => void;
  loadErrorLabel: string;
  /** Сообщение при уходе с embed (маркет и т.д.) */
  externalBlockedLabel: string;
};

function isStoreOrExternalAppUrl(url: string): boolean {
  const u = url.trim().toLowerCase();
  if (u.startsWith('market:') || u.startsWith('intent:')) return true;
  if (u.includes('play.google.com/store')) return true;
  if (u.includes('apps.apple.com')) return true;
  return false;
}

export function VkVideoEmbedModal({
  visible,
  embedUri,
  title,
  onClose,
  loadErrorLabel,
  externalBlockedLabel,
}: Props) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors, insets.top), [colors, insets.top]);
  const [loadError, setLoadError] = useState(false);
  const [externalBlocked, setExternalBlocked] = useState(false);

  const onShouldStartLoadWithRequest = useCallback((request: WebViewNavigation) => {
    const { url } = request;
    if (isStoreOrExternalAppUrl(url)) {
      setExternalBlocked(true);
      return false;
    }
    if (
      url.startsWith('http://') ||
      url.startsWith('https://') ||
      url === 'about:blank' ||
      url.startsWith('file://')
    ) {
      return true;
    }
    return false;
  }, []);

  const onWebError = useCallback(() => {
    setLoadError(true);
  }, []);

  React.useEffect(() => {
    if (visible) {
      setLoadError(false);
      setExternalBlocked(false);
    }
  }, [visible, embedUri]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <View style={styles.header}>
          <Pressable
            onPress={onClose}
            style={styles.closeBtn}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <MaterialCommunityIcons name="close" size={24} color={colors.text} />
          </Pressable>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
        </View>
        {loadError ? (
          <View style={styles.banner}>
            <Text style={styles.bannerText}>{loadErrorLabel}</Text>
          </View>
        ) : null}
        {externalBlocked ? (
          <View style={styles.banner}>
            <Text style={styles.bannerText}>{externalBlockedLabel}</Text>
          </View>
        ) : null}
        {embedUri ? (
          <WebView
            source={{ uri: embedUri }}
            style={styles.web}
            startInLoadingState
            javaScriptEnabled
            domStorageEnabled
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            setSupportMultipleWindows={false}
            mixedContentMode="compatibility"
            originWhitelist={['http://*', 'https://*', 'about:*']}
            userAgent={
              Platform.OS === 'ios'
                ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
                : 'Mozilla/5.0 (Linux; Android 12; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
            }
            onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
            onError={onWebError}
            renderLoading={() => (
              <View style={styles.loading}>
                <ActivityIndicator size="large" color={colors.accentBright} />
              </View>
            )}
          />
        ) : (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={colors.accentBright} />
          </View>
        )}
      </View>
    </Modal>
  );
}

function createStyles(colors: ColorPalette, padTop: number) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg, paddingTop: padTop },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    closeBtn: {
      minWidth: 48,
      minHeight: 48,
      padding: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    title: { flex: 1, fontSize: 16, fontWeight: '600', color: colors.text },
    web: { flex: 1 },
    loading: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.bg,
    },
    banner: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.accentDark },
    bannerText: { color: colors.muted, fontSize: 13 },
  });
}
