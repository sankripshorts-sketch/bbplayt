import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '../../components/DinText';
import { useAuth } from '../../auth/AuthContext';
import { useLocale } from '../../i18n/LocaleContext';
import type { ProfileStackParamList } from '../../navigation/types';
import { useThemeColors } from '../../theme';
import type { ColorPalette } from '../../theme/palettes';

type BarcodeScanResult = {
  data?: string;
};

export function QrLoginScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();
  const { user } = useAuth();
  const { t } = useLocale();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [isScenarioRunning, setIsScenarioRunning] = useState(false);

  const close = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const runScenario = useCallback(() => {
    if (isScenarioRunning) return;
    setIsScenarioRunning(true);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    const account = user?.memberAccount ?? t('profile.qrLoginAccountFallback');
    Alert.alert('', t('profile.qrLoginMockSuccess', { account }));
    close();
  }, [close, isScenarioRunning, t, user?.memberAccount]);

  const onBarcodeScanned = useCallback(
    (result: BarcodeScanResult) => {
      const data = result.data?.trim();
      if (!data || isScenarioRunning) return;
      runScenario();
    },
    [isScenarioRunning, runScenario]
  );

  if (!permission) {
    return (
      <SafeAreaView style={styles.fallbackRoot} edges={['top', 'bottom']}>
        <ActivityIndicator color={colors.accentBright} />
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.fallbackRoot} edges={['top', 'bottom']}>
        <MaterialCommunityIcons name="camera-outline" size={42} color={colors.accentBright} />
        <Text style={styles.fallbackTitle}>{t('profile.qrLoginPermissionTitle')}</Text>
        <Text style={styles.fallbackText}>{t('profile.qrLoginPermissionBody')}</Text>
        <Pressable
          style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
          onPress={() => void requestPermission()}
          accessibilityRole="button"
          accessibilityLabel={t('profile.qrLoginPermissionButton')}
        >
          <Text style={styles.primaryButtonText}>{t('profile.qrLoginPermissionButton')}</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
          onPress={close}
          accessibilityRole="button"
          accessibilityLabel={t('profile.qrLoginCancel')}
        >
          <Text style={styles.secondaryButtonText}>{t('profile.qrLoginCancel')}</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.root}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        autofocus="on"
        onCameraReady={() => setCameraReady(true)}
        onMountError={() => setCameraError(true)}
        onBarcodeScanned={scannedValue ? undefined : onBarcodeScanned}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
      />

      <View style={[styles.cameraDim, styles.pointerNone]}>
        <View style={styles.scanFrame}>
          <View style={[styles.corner, styles.cornerTopLeft]} />
          <View style={[styles.corner, styles.cornerTopRight]} />
          <View style={[styles.corner, styles.cornerBottomLeft]} />
          <View style={[styles.corner, styles.cornerBottomRight]} />
        </View>
      </View>

      <SafeAreaView style={styles.overlay} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable
            style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
            onPress={close}
            accessibilityRole="button"
            accessibilityLabel={t('profile.qrLoginCancel')}
          >
            <MaterialCommunityIcons name="close" size={24} color={colors.text} />
          </Pressable>
        </View>

        <View style={styles.copyBlock}>
          <Text style={styles.title}>{t('profile.qrLoginTitle')}</Text>
          <Text style={styles.subtitle}>{t('profile.qrLoginSubtitle')}</Text>
        </View>

        <View style={styles.statusBlock}>
          {!cameraReady && !cameraError ? (
            <Text style={styles.statusText}>{t('profile.qrLoginStartingCamera')}</Text>
          ) : null}
          {cameraError ? (
            <Text style={styles.errorText}>{t('profile.qrLoginCameraError')}</Text>
          ) : null}
          <Pressable
            style={({ pressed }) => [styles.captureButton, pressed && styles.pressed]}
            onPress={runScenario}
            accessibilityRole="button"
            accessibilityLabel={t('profile.qrLoginCapture')}
          >
            <Text style={styles.captureButtonText}>{t('profile.qrLoginCapture')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: '#000' },
    fallbackRoot: {
      flex: 1,
      paddingHorizontal: 24,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.bg,
    },
    fallbackTitle: {
      marginTop: 16,
      color: colors.text,
      fontSize: 22,
      fontWeight: '800',
      textAlign: 'center',
    },
    fallbackText: {
      marginTop: 8,
      color: colors.muted,
      fontSize: 15,
      lineHeight: 22,
      textAlign: 'center',
      marginBottom: 22,
    },
    primaryButton: {
      width: '100%',
      borderRadius: 14,
      paddingVertical: 15,
      alignItems: 'center',
      backgroundColor: colors.accent,
      marginBottom: 10,
    },
    primaryButtonText: { color: colors.accentTextOnButton, fontSize: 16, fontWeight: '800' },
    secondaryButton: {
      width: '100%',
      borderRadius: 14,
      paddingVertical: 15,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    secondaryButtonText: { color: colors.text, fontSize: 16, fontWeight: '700' },
    cameraDim: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.28)',
    },
    pointerNone: { pointerEvents: 'none' },
    scanFrame: {
      width: 248,
      height: 248,
      borderRadius: 28,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.35)',
      backgroundColor: 'rgba(0,0,0,0.08)',
    },
    corner: {
      position: 'absolute',
      width: 54,
      height: 54,
      borderColor: colors.accentBright,
    },
    cornerTopLeft: { top: -1, left: -1, borderLeftWidth: 5, borderTopWidth: 5, borderTopLeftRadius: 28 },
    cornerTopRight: { top: -1, right: -1, borderRightWidth: 5, borderTopWidth: 5, borderTopRightRadius: 28 },
    cornerBottomLeft: { bottom: -1, left: -1, borderLeftWidth: 5, borderBottomWidth: 5, borderBottomLeftRadius: 28 },
    cornerBottomRight: { bottom: -1, right: -1, borderRightWidth: 5, borderBottomWidth: 5, borderBottomRightRadius: 28 },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      paddingHorizontal: 18,
      justifyContent: 'space-between',
    },
    header: { alignItems: 'flex-end', paddingTop: 6 },
    closeButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.45)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.18)',
    },
    copyBlock: {
      position: 'absolute',
      top: Platform.OS === 'android' ? 86 : 96,
      left: 22,
      right: 22,
      alignItems: 'center',
    },
    title: {
      color: '#fff',
      fontSize: 24,
      lineHeight: 30,
      fontWeight: '800',
      textAlign: 'center',
      ...Platform.select({
        web: { textShadow: '0px 1px 8px rgba(0,0,0,0.55)' },
        default: {
          textShadowColor: 'rgba(0,0,0,0.55)',
          textShadowOffset: { width: 0, height: 1 },
          textShadowRadius: 8,
        },
      }),
    },
    subtitle: {
      color: 'rgba(255,255,255,0.86)',
      fontSize: 15,
      lineHeight: 22,
      textAlign: 'center',
      marginTop: 8,
      ...Platform.select({
        web: { textShadow: '0px 1px 8px rgba(0,0,0,0.55)' },
        default: {
          textShadowColor: 'rgba(0,0,0,0.55)',
          textShadowOffset: { width: 0, height: 1 },
          textShadowRadius: 8,
        },
      }),
    },
    statusBlock: { minHeight: 128, justifyContent: 'center', paddingBottom: 12 },
    statusText: {
      color: 'rgba(255,255,255,0.82)',
      fontSize: 14,
      lineHeight: 20,
      textAlign: 'center',
    },
    errorText: {
      color: '#ffd0d0',
      fontSize: 14,
      lineHeight: 20,
      textAlign: 'center',
      fontWeight: '700',
    },
    captureButton: {
      width: '100%',
      borderRadius: 15,
      paddingVertical: 15,
      alignItems: 'center',
      backgroundColor: colors.accent,
      marginTop: 20,
    },
    captureButtonText: { color: colors.accentTextOnButton, fontSize: 16, fontWeight: '800' },
    pressed: { opacity: 0.86 },
  });
}
