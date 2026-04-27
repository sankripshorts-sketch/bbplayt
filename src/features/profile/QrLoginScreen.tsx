import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '../../components/DinText';
import { useAppAlert } from '../../components/AppAlertContext';
import { FirstHintBanner } from '../../hints/FirstHintBanner';
import { useLocale } from '../../i18n/LocaleContext';
import type { ProfileStackParamList } from '../../navigation/types';
import { useThemeColors } from '../../theme';
import type { ColorPalette } from '../../theme/palettes';
import { loadServiceBindings, type ServiceBindings } from './serviceBindingsStorage';

type BarcodeScanResult = {
  data?: string;
};

type PendingLogin = {
  qrData: string;
  pcName: string;
  clubName: string;
  pcLocation: string;
};

const MOCK_PC_NAMES = ['ПК-03', 'ПК-07', 'ПК-11', 'ПК-16', 'VIP-02', 'Arena-04', 'Bootcamp-09'] as const;
const MOCK_CLUB_NAME = 'Тамбов, Медвежья, д.1';
const MOCK_PC_LOCATIONS = [
  'Основной зал, ряд 1',
  'Основной зал, ряд 2',
  'Турнирная зона, место 4',
  'VIP-зона, место 2',
  'Bootcamp, место 1',
] as const;

export function QrLoginScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();
  const { t } = useLocale();
  const { showAlert } = useAppAlert();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [pendingLogin, setPendingLogin] = useState<PendingLogin | null>(null);
  const [successfulLogin, setSuccessfulLogin] = useState<PendingLogin | null>(null);
  const [isScenarioRunning, setIsScenarioRunning] = useState(false);
  const [serviceBindings, setServiceBindings] = useState<ServiceBindings>({
    steam: false,
    epicGames: false,
  });
  const [useLinkedServices, setUseLinkedServices] = useState(false);

  const close = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  useEffect(() => {
    void loadServiceBindings().then(setServiceBindings);
  }, []);

  const createPendingLogin = useCallback((rawQr: string): PendingLogin => {
    const index = Math.floor(Math.random() * MOCK_PC_NAMES.length);
    const locationIndex = Math.floor(Math.random() * MOCK_PC_LOCATIONS.length);
    return {
      qrData: rawQr,
      pcName: MOCK_PC_NAMES[index],
      clubName: MOCK_CLUB_NAME,
      pcLocation: MOCK_PC_LOCATIONS[locationIndex],
    };
  }, []);

  const onBindService = useCallback((service: 'steam' | 'epicGames') => {
    const serviceName = service === 'steam' ? 'Steam' : 'Epic Games';
    showAlert(
      serviceName,
      t('profile.qrLoginServiceNotLinked', { service: serviceName }),
    );
  }, [t]);

  const onApproveLogin = useCallback(() => {
    if (isScenarioRunning || !pendingLogin) return;
    setIsScenarioRunning(true);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setPendingLogin(null);
    setSuccessfulLogin(pendingLogin);
  }, [isScenarioRunning, pendingLogin]);

  const onRejectLogin = useCallback(() => {
    if (isScenarioRunning) return;
    setIsScenarioRunning(true);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    showAlert(t('profile.qrLoginRejectedTitle'), t('profile.qrLoginRejectedBody'));
    close();
  }, [close, isScenarioRunning, t]);

  const onBarcodeScanned = useCallback(
    (result: BarcodeScanResult) => {
      const data = result.data?.trim();
      if (!data || isScenarioRunning || pendingLogin != null) return;
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setPendingLogin(createPendingLogin(data));
    },
    [createPendingLogin, isScenarioRunning, pendingLogin]
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
        <ScrollView
          style={styles.fallbackScroll}
          contentContainerStyle={styles.fallbackScrollContent}
          showsVerticalScrollIndicator={false}
        >
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
        </ScrollView>
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
        onBarcodeScanned={isScenarioRunning || pendingLogin != null ? undefined : onBarcodeScanned}
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
        <View style={styles.topSection}>
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
            <FirstHintBanner hintId="profile_qr_scan" messageKey="hints.profileQrScan" />
          </View>
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
            onPress={() => setPendingLogin(createPendingLogin('manual-capture'))}
            accessibilityRole="button"
            accessibilityLabel={t('profile.qrLoginCapture')}
          >
            <View style={styles.captureButtonInner} />
          </Pressable>
          <Text style={styles.captureButtonText}>{t('profile.qrLoginCapture')}</Text>
        </View>
      </SafeAreaView>

      {pendingLogin ? (
        <View style={styles.confirmWrap}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>{t('profile.qrLoginConfirmTitle')}</Text>
            <Text style={styles.confirmBody}>{t('profile.qrLoginConfirmBody')}</Text>
            <View style={styles.pcInfoCard}>
              <Text style={styles.pcInfoLabel}>{t('profile.qrLoginPcNameLabel')}</Text>
              <Text style={styles.pcInfoValue}>{pendingLogin.pcName}</Text>
              <Text style={styles.pcInfoLabel}>{t('profile.qrLoginPcClubLabel')}</Text>
              <Text style={styles.pcInfoValue}>{pendingLogin.clubName}</Text>
              <Text style={styles.pcInfoLabel}>{t('profile.qrLoginPcLocationLabel')}</Text>
              <Text style={styles.pcInfoValue}>{pendingLogin.pcLocation}</Text>
            </View>
            <Pressable
              style={({ pressed }) => [styles.checkboxRow, pressed && styles.pressed]}
              onPress={() => setUseLinkedServices((v) => !v)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: useLinkedServices }}
              accessibilityLabel={t('profile.qrLoginLinkedServicesToggle')}
            >
              <MaterialCommunityIcons
                name={useLinkedServices ? 'checkbox-marked' : 'checkbox-blank-outline'}
                size={22}
                color={useLinkedServices ? colors.accentBright : colors.muted}
              />
              <Text style={styles.checkboxText}>{t('profile.qrLoginLinkedServicesToggle')}</Text>
            </Pressable>
            {useLinkedServices ? (
              <View style={styles.servicesCard}>
                <View style={styles.serviceRow}>
                  <View style={styles.serviceNameWrap}>
                    <Text style={styles.serviceName}>Steam</Text>
                  </View>
                  {serviceBindings.steam ? (
                    <View style={styles.serviceLinkedWrap}>
                      <MaterialCommunityIcons name="check-circle" size={18} color={colors.success} />
                      <Text style={styles.serviceLinkedText}>{t('profile.qrLoginServiceLinked')}</Text>
                    </View>
                  ) : (
                    <Pressable
                      style={({ pressed }) => [styles.bindButton, pressed && styles.pressed]}
                      onPress={() => onBindService('steam')}
                      accessibilityRole="button"
                      accessibilityLabel={t('profile.qrLoginServiceBind')}
                    >
                      <Text style={styles.bindButtonText}>{t('profile.qrLoginServiceBind')}</Text>
                    </Pressable>
                  )}
                </View>
                <View style={styles.serviceRow}>
                  <View style={styles.serviceNameWrap}>
                    <Text style={styles.serviceName}>Epic Games</Text>
                  </View>
                  {serviceBindings.epicGames ? (
                    <View style={styles.serviceLinkedWrap}>
                      <MaterialCommunityIcons name="check-circle" size={18} color={colors.success} />
                      <Text style={styles.serviceLinkedText}>{t('profile.qrLoginServiceLinked')}</Text>
                    </View>
                  ) : (
                    <Pressable
                      style={({ pressed }) => [styles.bindButton, pressed && styles.pressed]}
                      onPress={() => onBindService('epicGames')}
                      accessibilityRole="button"
                      accessibilityLabel={t('profile.qrLoginServiceBind')}
                    >
                      <Text style={styles.bindButtonText}>{t('profile.qrLoginServiceBind')}</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            ) : null}
            <View style={styles.confirmButtonsRow}>
              <Pressable
                style={({ pressed }) => [styles.rejectButton, pressed && styles.pressed]}
                onPress={onRejectLogin}
                accessibilityRole="button"
                accessibilityLabel={t('profile.qrLoginReject')}
              >
                <Text style={styles.rejectButtonText}>{t('profile.qrLoginReject')}</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.approveButton, pressed && styles.pressed]}
                onPress={onApproveLogin}
                accessibilityRole="button"
                accessibilityLabel={t('profile.qrLoginApprove')}
              >
                <Text style={styles.approveButtonText}>{t('profile.qrLoginApprove')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}
      {successfulLogin ? (
        <View style={styles.successWrap}>
          <View style={styles.successCard}>
            <MaterialCommunityIcons name="check-circle" size={46} color={colors.accentBright} />
            <Text style={styles.successTitle}>{t('profile.qrLoginSuccessTitle')}</Text>
            <Text style={styles.successBody}>{t('profile.qrLoginSuccessBody')}</Text>
            <View style={styles.successPcInfoCard}>
              <Text style={styles.pcInfoLabel}>{t('profile.qrLoginPcNameLabel')}</Text>
              <Text style={styles.pcInfoValue}>{successfulLogin.pcName}</Text>
              <Text style={styles.pcInfoLabel}>{t('profile.qrLoginPcClubLabel')}</Text>
              <Text style={styles.pcInfoValue}>{successfulLogin.clubName}</Text>
            </View>
            <Pressable
              style={({ pressed }) => [styles.successButton, pressed && styles.pressed]}
              onPress={close}
              accessibilityRole="button"
              accessibilityLabel={t('profile.qrLoginSuccessCta')}
            >
              <Text style={styles.successButtonText}>{t('profile.qrLoginSuccessCta')}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: '#000' },
    fallbackRoot: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    fallbackScroll: { flex: 1 },
    fallbackScrollContent: {
      flexGrow: 1,
      paddingHorizontal: 24,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 24,
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
      minHeight: 52,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.accent,
      marginBottom: 10,
    },
    primaryButtonText: { color: colors.accentTextOnButton, fontSize: 16, fontWeight: '800', lineHeight: 22 },
    secondaryButton: {
      width: '100%',
      borderRadius: 14,
      paddingVertical: 15,
      minHeight: 52,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    secondaryButtonText: { color: colors.text, fontSize: 16, fontWeight: '700', lineHeight: 22 },
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
    confirmWrap: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.5)',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 18,
    },
    successWrap: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.58)',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 18,
    },
    confirmCard: {
      width: '100%',
      borderRadius: 18,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      gap: 10,
    },
    successCard: {
      width: '100%',
      maxWidth: 380,
      borderRadius: 18,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 18,
      alignItems: 'center',
      gap: 12,
    },
    successTitle: {
      color: colors.text,
      fontSize: 30,
      lineHeight: 34,
      fontWeight: '900',
      textAlign: 'center',
    },
    successBody: {
      color: colors.muted,
      fontSize: 17,
      lineHeight: 24,
      textAlign: 'center',
    },
    successPcInfoCard: {
      width: '100%',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.cardElevated,
      padding: 12,
      gap: 4,
    },
    successButton: {
      width: '100%',
      borderRadius: 12,
      minHeight: 48,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.accent,
      marginTop: 2,
    },
    successButtonText: {
      color: colors.accentTextOnButton,
      fontSize: 16,
      lineHeight: 22,
      fontWeight: '800',
    },
    confirmTitle: {
      color: colors.text,
      fontSize: 20,
      lineHeight: 26,
      fontWeight: '800',
    },
    confirmBody: {
      color: colors.muted,
      fontSize: 14,
      lineHeight: 20,
    },
    pcInfoCard: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.cardElevated,
      padding: 12,
      gap: 4,
    },
    pcInfoLabel: {
      color: colors.muted,
      fontSize: 12,
      lineHeight: 16,
      textTransform: 'uppercase',
      fontWeight: '700',
    },
    pcInfoValue: {
      color: colors.text,
      fontSize: 15,
      lineHeight: 20,
      fontWeight: '700',
      marginBottom: 4,
    },
    checkboxRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: 2,
    },
    checkboxText: {
      color: colors.text,
      fontSize: 14,
      lineHeight: 20,
      flex: 1,
      fontWeight: '600',
    },
    servicesCard: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.cardElevated,
      paddingHorizontal: 10,
      paddingVertical: 8,
      gap: 8,
    },
    serviceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    serviceNameWrap: { flex: 1, minWidth: 0 },
    serviceName: {
      color: colors.text,
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '700',
    },
    serviceLinkedWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    serviceLinkedText: {
      color: colors.success,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: '700',
    },
    bindButton: {
      borderWidth: 1,
      borderColor: colors.accentBright,
      backgroundColor: colors.accentDim,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 6,
      minHeight: 34,
      alignItems: 'center',
      justifyContent: 'center',
    },
    bindButtonText: {
      color: colors.accentBright,
      fontSize: 13,
      lineHeight: 16,
      fontWeight: '800',
    },
    confirmButtonsRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 4,
    },
    rejectButton: {
      flex: 1,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      minHeight: 46,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.cardElevated,
    },
    rejectButtonText: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '700',
    },
    approveButton: {
      flex: 1,
      borderRadius: 12,
      minHeight: 46,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.accent,
    },
    approveButtonText: {
      color: colors.accentTextOnButton,
      fontSize: 15,
      fontWeight: '800',
    },
    topSection: {
      paddingTop: 2,
      gap: 12,
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
      marginTop: Platform.OS === 'android' ? 4 : 8,
      marginHorizontal: 10,
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: 16,
      backgroundColor: 'rgba(0,0,0,0.36)',
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
      maxWidth: 320,
      ...Platform.select({
        web: { textShadow: '0px 1px 8px rgba(0,0,0,0.55)' },
        default: {
          textShadowColor: 'rgba(0,0,0,0.55)',
          textShadowOffset: { width: 0, height: 1 },
          textShadowRadius: 8,
        },
      }),
    },
    statusBlock: {
      minHeight: 136,
      justifyContent: 'flex-end',
      alignItems: 'center',
      paddingBottom: 12,
    },
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
      width: 82,
      height: 82,
      borderRadius: 41,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 18,
      borderWidth: 4,
      borderColor: '#fff',
      backgroundColor: 'rgba(255,255,255,0.15)',
    },
    captureButtonInner: {
      width: 58,
      height: 58,
      borderRadius: 29,
      backgroundColor: '#fff',
    },
    captureButtonText: {
      color: '#fff',
      fontSize: 15,
      fontWeight: '800',
      lineHeight: 20,
      marginTop: 8,
      textAlign: 'center',
      ...Platform.select({
        web: { textShadow: '0px 1px 6px rgba(0,0,0,0.45)' },
        default: {
          textShadowColor: 'rgba(0,0,0,0.45)',
          textShadowOffset: { width: 0, height: 1 },
          textShadowRadius: 6,
        },
      }),
    },
    pressed: { opacity: 0.86 },
  });
}
