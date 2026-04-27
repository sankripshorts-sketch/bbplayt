import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

export type FaceCapturePose = 'lookUp' | 'center' | 'lookDown';

export type FaceCapture = {
  pose: FaceCapturePose;
  uri: string;
  width: number;
  height: number;
  capturedAt: number;
};

export type FaceEnrollment = {
  version: 1;
  updatedAt: number;
  /** Минимум `center` (одно фото). Старые записи могут содержать lookUp + lookDown. */
  captures: Partial<Record<FaceCapturePose, FaceCapture>>;
};

const STORAGE_KEY_PREFIX = 'bbplay.faceEnrollment.v1';
const FACE_DIR = `${FileSystem.documentDirectory ?? ''}face-enrollment`;

function storageKey(profileKey: string): string {
  return `${STORAGE_KEY_PREFIX}.${profileKey}`;
}

export function faceProfileKey(memberId: number | string | null | undefined): string {
  const key = String(memberId ?? '').trim();
  return key || 'anonymous';
}

export function isCompleteFaceEnrollment(value: FaceEnrollment | null): value is FaceEnrollment {
  const cap = value?.captures;
  if (!cap?.center?.uri) return false;
  const up = cap.lookUp?.uri;
  const down = cap.lookDown?.uri;
  if (up && down) return true;
  if (!up && !down) return true;
  return false;
}

export async function loadFaceEnrollment(profileKey: string): Promise<FaceEnrollment | null> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(profileKey));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<FaceEnrollment>;
    if (parsed.version !== 1 || !parsed.captures || !isCompleteFaceEnrollment(parsed as FaceEnrollment)) {
      return null;
    }
    return parsed as FaceEnrollment;
  } catch {
    return null;
  }
}

export async function saveFaceEnrollment(profileKey: string, captures: FaceEnrollment['captures']): Promise<FaceEnrollment> {
  const next: FaceEnrollment = {
    version: 1,
    updatedAt: Date.now(),
    captures,
  };
  await AsyncStorage.setItem(storageKey(profileKey), JSON.stringify(next));
  return next;
}

export async function clearFaceEnrollment(profileKey: string): Promise<void> {
  const current = await loadFaceEnrollment(profileKey);
  await AsyncStorage.removeItem(storageKey(profileKey));
  if (!current) return;
  await Promise.all(
    Object.values(current.captures).map((capture) =>
      FileSystem.deleteAsync(capture.uri, { idempotent: true }).catch(() => {}),
    ),
  );
}

export async function persistFaceCapturePhoto(
  profileKey: string,
  pose: FaceCapturePose,
  photo: Pick<FaceCapture, 'uri' | 'width' | 'height'>,
): Promise<FaceCapture> {
  const capturedAt = Date.now();
  if (!FileSystem.documentDirectory) {
    return { pose, uri: photo.uri, width: photo.width, height: photo.height, capturedAt };
  }
  const dir = `${FACE_DIR}/${profileKey}`;
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  const destination = `${dir}/${pose}-${capturedAt}.jpg`;
  await FileSystem.copyAsync({ from: photo.uri, to: destination });
  return { pose, uri: destination, width: photo.width, height: photo.height, capturedAt };
}
