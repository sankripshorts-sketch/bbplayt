import { CameraView, useCameraPermissions, type CameraCapturedPicture } from 'expo-camera';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '../../components/DinText';
import { useAppAlert } from '../../components/AppAlertContext';
import { useAuth } from '../../auth/AuthContext';
import { useLocale } from '../../i18n/LocaleContext';
import { useThemeColors } from '../../theme';
import type { ColorPalette } from '../../theme/palettes';
import {
  clearFaceEnrollment,
  faceProfileKey,
  persistFaceCapturePhoto,
  saveFaceEnrollment,
  type FaceCapture,
  type FaceCapturePose,
} from './faceEnrollmentStorage';

const CAPTURE_STEPS: Array<{
  pose: FaceCapturePose;
  titleKey: 'profile.faceStepCenterTitle';
  bodyKey: 'profile.faceStepCenterBody';
}> = [
  {
    pose: 'center',
    titleKey: 'profile.faceStepCenterTitle',
    bodyKey: 'profile.faceStepCenterBody',
  },
];

const FACE_SCAN_INTERVAL_MS = 700;
const STABLE_FACES_TO_CONFIRM = 2;

type FaceCheckStatus = 'READY' | 'NO_FACE' | 'MULTIPLE_FACES' | string;

type FaceCheckResult = {
  status: FaceCheckStatus;
};

type FaceCheckFn = (uri: string) => Promise<FaceCheckResult>;

let checkFaceImplPromise: Promise<FaceCheckFn | null> | null = null;

async function getCheckFaceImpl(): Promise<FaceCheckFn | null> {
  if (Platform.OS === 'web') return null;
  // Expo Go does not contain the native ExpoFaceCheck module.
  if (Constants.appOwnership === 'expo') return null;
  if (!checkFaceImplPromise) {
    checkFaceImplPromise = import('expo-face-check')
      .then((mod) => mod.checkFace)
      .catch(() => null);
  }
  return checkFaceImplPromise;
}

async function runFaceCheck(uri: string): Promise<FaceCheckResult | null> {
  const impl = await getCheckFaceImpl();
  if (!impl) return null;
  return impl(uri);
}

function isFaceOk(status: FaceCheckStatus): boolean {
  return status === 'READY';
}

/**
 * Полноэкранная съёмка лица: фиксация лица в рамке + сохранение по кнопке.
 * Нативный модуль `expo-face-check` (нужен dev build / prebuild, не Expo Go).
 */
export function FaceCaptureScreen() {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const { user } = useAuth();
  const { t } = useLocale();
  const { showAlert } = useAppAlert();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const profileKey = faceProfileKey(user?.memberId);

  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [stepIndex] = useState(0);
  const [captures, setCaptures] = useState<Partial<Record<FaceCapturePose, FaceCapture>>>({});
  const [faceScanOn, setFaceScanOn] = useState(true);
  const step = CAPTURE_STEPS[stepIndex];

  const probingRef = useRef(false);
  const stableRef = useRef(0);
  const faceModuleFailedRef = useRef(false);

  const finishWithEnrollment = useCallback(() => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    navigation.goBack();
    setTimeout(() => {
      showAlert(t('profile.faceAddedAlertTitle'), t('profile.faceAddedAlertBody'));
    }, 80);
  }, [navigation, showAlert, t]);

  const persistIfDone = useCallback(
    async (nextCaptures: Partial<Record<FaceCapturePose, FaceCapture>>) => {
      if (!nextCaptures.center) return false;
      await clearFaceEnrollment(profileKey);
      await saveFaceEnrollment(profileKey, { center: nextCaptures.center });
      finishWithEnrollment();
      return true;
    },
    [finishWithEnrollment, profileKey],
  );

  const saveFromPhoto = useCallback(
    async (photo: CameraCapturedPicture) => {
      if (!photo?.uri) throw new Error('empty');
      const captured = await persistFaceCapturePhoto(profileKey, step.pose, photo);
      const nextCaptures = { ...captures, [step.pose]: captured };
      setCaptures(nextCaptures);
      await persistIfDone(nextCaptures);
    },
    [captures, persistIfDone, profileKey, step.pose],
  );

  const manualCapture = useCallback(async () => {
    if (!cameraRef.current || !ready || saving) return;
    setSaving(true);
    setError('');
    try {
      const photo: CameraCapturedPicture | undefined = await cameraRef.current.takePictureAsync({
        quality: 0.82,
        base64: false,
        exif: false,
      });
      if (!photo?.uri) throw new Error('empty');

      if (!faceModuleFailedRef.current) {
        try {
          const result = await runFaceCheck(photo.uri);
          if (!result) {
            faceModuleFailedRef.current = true;
          } else if (!isFaceOk(result.status)) {
            if (result.status === 'MULTIPLE_FACES') {
              setError(t('profile.faceRetakeMultiple'));
            } else {
              setError(t('profile.faceRetakeNoFace'));
            }
            await FileSystem.deleteAsync(photo.uri, { idempotent: true }).catch(() => {});
            return;
          }
        } catch {
          faceModuleFailedRef.current = true;
        }
      }

      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      await saveFromPhoto(photo);
    } catch {
      setError(t('profile.faceCaptureError'));
    } finally {
      setSaving(false);
    }
  }, [ready, saveFromPhoto, saving, t]);

  const probeFace = useCallback(async () => {
    if (
      !cameraRef.current ||
      !ready ||
      saving ||
      faceModuleFailedRef.current ||
      probingRef.current
    ) {
      return;
    }
    probingRef.current = true;
    let uri: string | undefined;
    try {
      const shot = await cameraRef.current.takePictureAsync({
        quality: 0.18,
        base64: false,
        exif: false,
      });
      uri = shot?.uri;
      if (!uri) return;
      let result: FaceCheckResult | null;
      try {
        result = await runFaceCheck(uri);
      } catch {
        faceModuleFailedRef.current = true;
        setFaceScanOn(false);
        stableRef.current = 0;
        return;
      }
      if (!result) {
        faceModuleFailedRef.current = true;
        setFaceScanOn(false);
        stableRef.current = 0;
        return;
      }
      if (isFaceOk(result.status)) {
        stableRef.current += 1;
        if (stableRef.current >= STABLE_FACES_TO_CONFIRM) {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          stableRef.current = 0;
        }
      } else {
        stableRef.current = 0;
      }
    } catch {
      stableRef.current = 0;
    } finally {
      if (uri) {
        void FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
      }
      probingRef.current = false;
    }
  }, [ready, saving]);

  useEffect(() => {
    if (!isFocused) stableRef.current = 0;
  }, [isFocused]);

  const probeRef = useRef(probeFace);
  probeRef.current = probeFace;

  useEffect(() => {
    if (!isFocused || !ready || !permission?.granted || !faceScanOn) {
      return;
    }
    const id = setInterval(() => {
      void probeRef.current();
    }, FACE_SCAN_INTERVAL_MS);
    return () => clearInterval(id);
  }, [isFocused, permission?.granted, faceScanOn, ready]);

  if (!permission) {
    return (
      <View style={styles.fullFallback}>
        <ActivityIndicator color={colors.accentBright} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.fullFallback} edges={['top', 'bottom']}>
        <Text style={styles.fallbackTitle}>{t('profile.facePermissionTitle')}</Text>
        <Text style={styles.fallbackText}>{t('profile.facePermissionBody')}</Text>
        <ActionButton label={t('profile.facePermissionButton')} onPress={() => void requestPermission()} />
        <ActionButton label={t('profile.passwordChangeClose')} onPress={() => navigation.goBack()} secondary />
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.screenRoot}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="front"
        mirror
        mode="picture"
        onCameraReady={() => setReady(true)}
        onMountError={() => setError(t('profile.faceCameraError'))}
      />
      <View style={[styles.cameraShade, styles.pointerNone]}>
        <View style={styles.oval} />
      </View>
      <SafeAreaView style={styles.cameraContent} edges={['top', 'bottom']}>
        <View style={styles.cameraTop}>
          <Text style={styles.cameraTitle}>{t(step.titleKey)}</Text>
          <Text style={styles.cameraBody}>{t(step.bodyKey)}</Text>
          <Text style={styles.cameraHint}>{t('profile.faceOvalHint')}</Text>
        </View>

        <View style={styles.middleRegion}>{error ? <Text style={styles.cameraError}>{error}</Text> : null}</View>

        <View style={styles.cameraActions}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}
          >
            <Text style={styles.cancelButtonText}>{t('profile.passwordChangeClose')}</Text>
          </Pressable>
          <Pressable
            onPress={manualCapture}
            disabled={!ready || saving}
            style={({ pressed }) => [
              styles.shutterOuter,
              (!ready || saving) && styles.disabled,
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.shutterInner} />
          </Pressable>
          <View style={styles.cancelButtonPlaceholder} />
        </View>
      </SafeAreaView>
    </View>
  );
}

function ActionButton({
  label,
  onPress,
  secondary,
}: {
  label: string;
  onPress: () => void;
  secondary?: boolean;
}) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.actionButton, secondary && styles.actionButtonSecondary, pressed && styles.pressed]}
    >
      <Text style={[styles.actionButtonText, secondary && styles.actionButtonTextSecondary]}>{label}</Text>
    </Pressable>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    screenRoot: {
      flex: 1,
      backgroundColor: '#000',
    },
    fullFallback: {
      flex: 1,
      minHeight: 360,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      gap: 14,
      backgroundColor: colors.bg,
    },
    fallbackTitle: {
      color: colors.text,
      fontSize: 20,
      fontWeight: '700',
      textAlign: 'center',
    },
    fallbackText: {
      color: colors.muted,
      fontSize: 14,
      lineHeight: 20,
      textAlign: 'center',
    },
    actionButton: {
      minWidth: 210,
      alignItems: 'center',
      borderRadius: 14,
      paddingVertical: 13,
      paddingHorizontal: 18,
      backgroundColor: colors.accent,
    },
    actionButtonSecondary: {
      backgroundColor: colors.cardElevated,
      borderWidth: 1,
      borderColor: colors.border,
    },
    actionButtonText: {
      color: colors.accentTextOnButton,
      fontSize: 15,
      fontWeight: '700',
    },
    actionButtonTextSecondary: {
      color: colors.text,
    },
    cameraShade: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'flex-start',
      paddingTop: 48,
      backgroundColor: 'rgba(0,0,0,0.18)',
    },
    pointerNone: { pointerEvents: 'none' },
    oval: {
      width: 238,
      height: 324,
      borderRadius: 140,
      borderWidth: 4,
      borderColor: colors.accentBright,
      backgroundColor: 'rgba(255,255,255,0.03)',
    },
    cameraContent: {
      flex: 1,
      justifyContent: 'space-between',
      padding: 18,
    },
    cameraTop: {
      borderRadius: 18,
      padding: 14,
      backgroundColor: 'rgba(0,0,0,0.48)',
      gap: 5,
    },
    cameraTitle: {
      color: '#fff',
      fontSize: 22,
      fontWeight: '800',
    },
    cameraBody: {
      color: '#fff',
      fontSize: 15,
      lineHeight: 20,
      fontWeight: '600',
    },
    cameraHint: {
      color: 'rgba(255,255,255,0.78)',
      fontSize: 13,
      lineHeight: 18,
    },
    middleRegion: {
      flex: 1,
      justifyContent: 'center',
    },
    cameraError: {
      color: colors.danger,
      textAlign: 'center',
      fontWeight: '700',
      backgroundColor: 'rgba(0,0,0,0.58)',
      borderRadius: 12,
      paddingVertical: 8,
      paddingHorizontal: 12,
    },
    cameraActions: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    cancelButton: {
      minWidth: 86,
      minHeight: 46,
      borderRadius: 14,
      paddingVertical: 12,
      paddingHorizontal: 14,
      justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.48)',
    },
    cancelButtonPlaceholder: {
      width: 86,
    },
    cancelButtonText: {
      color: '#fff',
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '700',
      textAlign: 'center',
    },
    shutterOuter: {
      width: 78,
      height: 78,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 39,
      borderWidth: 4,
      borderColor: '#fff',
      backgroundColor: 'rgba(255,255,255,0.15)',
    },
    shutterInner: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: '#fff',
    },
    disabled: {
      opacity: 0.55,
    },
    pressed: {
      opacity: 0.82,
    },
  });
}
