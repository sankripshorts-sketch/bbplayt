import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Text } from '../../components/DinText';
import { TextInput } from '../../components/DinTextInput';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { bookingFlowApi } from '../../api/endpoints';
import { ApiError } from '../../api/client';
import {
  ERR_PASSWORD_CHANGE_UNCONFIRMED,
  changeMemberPassword,
  loadMemberProfile,
  saveMemberProfile,
  type EditableMemberFields,
  type LoadedMemberProfile,
} from '../../api/memberProfileApi';
import { useAuth } from '../../auth/AuthContext';
import { useLocale } from '../../i18n/LocaleContext';
import type { ColorPalette } from '../../theme/palettes';
import { useThemeColors } from '../../theme';
import { queryKeys } from '../../query/queryKeys';
import {
  birthdayToIso,
  formatBirthdayInput,
  formatRuPhoneInput,
  isValidEmailWithRealDomain,
  isValidRuMobile,
  normalizePhoneForApi,
  validateBirthdayDdMmYyyy,
} from '../auth/inputFormatters';
import { formatPublicErrorMessage } from '../../utils/publicText';

type FullscreenResult =
  | { kind: 'profileSaved' }
  | { kind: 'passwordChanged' }
  | { kind: 'error'; title: string; detail: string };

function isWrongOldPasswordMessage(msgLower: string): boolean {
  return (
    msgLower.includes('old password') ||
    msgLower.includes('wrong password') ||
    msgLower.includes('incorrect password') ||
    msgLower.includes('invalid password') ||
    msgLower.includes('password mismatch') ||
    msgLower.includes('does not match') ||
    (msgLower.includes('неверн') && msgLower.includes('парол')) ||
    msgLower.includes('не совпада') ||
    (msgLower.includes('текущ') && msgLower.includes('парол'))
  );
}

/** Полноэкранное редактирование профиля (из настроек). */
export function EditProfileScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <KeyboardAvoidingView
      style={styles.screenFlex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <SafeAreaView style={styles.screenRoot} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.screenScroll} keyboardShouldPersistTaps="handled">
          <EditProfileSection />
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

/** Форма редактирования профиля для встраивания (например, в экран настроек). */
export function EditProfileSection() {
  const { user, patchUser, logout } = useAuth();
  const { t } = useLocale();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const qc = useQueryClient();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [birthday, setBirthday] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [oldPwdVisible, setOldPwdVisible] = useState(false);
  const [newPwdVisible, setNewPwdVisible] = useState(false);
  const [fullscreenResult, setFullscreenResult] = useState<FullscreenResult | null>(null);
  /** Не перезаписывать поля при refetch — иначе сбрасывается фокус и клавиатура. */
  const hydratedMemberKeyRef = useRef<string | null>(null);

  const closeFullscreen = useCallback(() => setFullscreenResult(null), []);

  const icafeQ = useQuery({
    queryKey: queryKeys.icafeIdForMember(),
    queryFn: () => bookingFlowApi.icafeIdForMember(),
  });

  const profileQ = useQuery({
    queryKey: ['edit-profile', user?.memberId],
    queryFn: async (): Promise<LoadedMemberProfile> => {
      const cid = Number(String(icafeQ.data!.icafe_id).trim());
      if (!Number.isFinite(cid) || !user?.memberId || !user.memberAccount) {
        throw new Error('no');
      }
      return loadMemberProfile({
        cafeId: cid,
        memberId: user.memberId,
        memberAccount: user.memberAccount,
      });
    },
    enabled: !!user?.memberId && !!user.memberAccount && icafeQ.isSuccess,
  });

  useEffect(() => {
    const mid = user?.memberId;
    if (!mid) {
      hydratedMemberKeyRef.current = null;
      return;
    }
    const d = profileQ.data;
    if (!d) return;
    const key = String(mid);
    if (hydratedMemberKeyRef.current === key) return;
    hydratedMemberKeyRef.current = key;
    setFirstName(d.member_first_name);
    setLastName(d.member_last_name);
    setEmail(d.member_email);
    setPhone(formatRuPhoneInput(d.member_phone));
    setBirthday(d.member_birthday_display ? formatBirthdayInput(d.member_birthday_display) : '');
  }, [profileQ.data, user?.memberId]);

  const changePwdMut = useMutation({
    mutationFn: async () => {
      const cid = Number(String(icafeQ.data?.icafe_id ?? '').trim());
      if (!user?.memberId || !user.memberAccount?.trim() || !Number.isFinite(cid)) {
        throw new Error(t('profile.loadProfileError'));
      }
      await changeMemberPassword(cid, {
        memberId: user.memberId,
        memberAccount: user.memberAccount,
        oldPassword,
        newPassword,
      });
    },
    onSuccess: () => {
      setOldPassword('');
      setNewPassword('');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setFullscreenResult({ kind: 'passwordChanged' });
    },
    onError: (e: unknown) => {
      const raw = e instanceof ApiError ? e.message : e instanceof Error ? e.message : '';
      let msg = formatPublicErrorMessage(e, t, 'profile.passwordChangeError');
      if (e instanceof ApiError && e.message === ERR_PASSWORD_CHANGE_UNCONFIRMED) {
        msg = t('profile.passwordChangeUnconfirmed');
      }
      const low = raw.toLowerCase();
      if (low.includes('api not allowed')) {
        msg = t('profile.passwordChangeApiBlocked');
      } else if (isWrongOldPasswordMessage(low)) {
        msg = t('profile.passwordChangeWrongOld');
      }
      setFullscreenResult({ kind: 'error', title: t('profile.passwordChangeError'), detail: msg });
    },
  });

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!user?.memberId) throw new Error(t('profile.loadProfileError'));
      const cid = Number(String(icafeQ.data?.icafe_id ?? '').trim());
      if (!Number.isFinite(cid)) throw new Error(t('profile.loadProfileError'));
      if (!isValidEmailWithRealDomain(email)) {
        throw new Error(t('register.errorEmail'));
      }
      if (!isValidRuMobile(phone)) {
        throw new Error(t('register.errorPhone'));
      }
      const bd = validateBirthdayDdMmYyyy(birthday);
      if (bd === 'format' || bd === 'invalid') {
        throw new Error(t('register.errorBirthday'));
      }
      const iso = birthdayToIso(birthday);
      if (!iso) throw new Error(t('register.errorBirthday'));
      const fields: EditableMemberFields = {
        member_first_name: firstName,
        member_last_name: lastName,
        member_email: email.trim(),
        member_phone: normalizePhoneForApi(phone),
        member_birthday_display: birthday,
      };
      const preserve = profileQ.data;
      if (!preserve) {
        throw new Error(t('profile.loadProfileError'));
      }
      await saveMemberProfile(cid, user.memberId, { ...fields, member_birthday_iso: iso }, preserve);
      await patchUser({
        displayName: `${firstName.trim()} ${lastName.trim()}`.trim() || user.memberAccount,
        rawPatch: {
          member_first_name: firstName.trim(),
          member_last_name: lastName.trim(),
          member_email: email.trim(),
          member_phone: normalizePhoneForApi(phone),
          member_birthday: iso,
        },
      });
      await qc.invalidateQueries({ queryKey: queryKeys.icafeIdForMember() });
      await qc.invalidateQueries({ queryKey: ['edit-profile', user.memberId] });
    },
    onSuccess: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setFullscreenResult({ kind: 'profileSaved' });
    },
    onError: (e: unknown) => {
      const raw = e instanceof ApiError ? e.message : e instanceof Error ? e.message : '';
      let msg = formatPublicErrorMessage(e, t, 'profile.saveProfileError');
      const low = raw.toLowerCase();
      if (low.includes('api not allowed')) {
        msg = t('profile.saveProfileApiBlocked');
      }
      setFullscreenResult({ kind: 'error', title: t('profile.saveProfileError'), detail: msg });
    },
  });

  const onBirthdayChange = useCallback((x: string) => {
    setBirthday(formatBirthdayInput(x));
  }, []);

  const onPhoneChange = useCallback((x: string) => {
    setPhone(formatRuPhoneInput(x));
  }, []);

  const onChangePasswordPress = useCallback(() => {
    if (!oldPassword) {
      setFullscreenResult({
        kind: 'error',
        title: t('verify.alertTitle'),
        detail: t('profile.passwordChangeOldRequired'),
      });
      return;
    }
    if (!newPassword || newPassword.length < 4) {
      setFullscreenResult({
        kind: 'error',
        title: t('verify.alertTitle'),
        detail: t('profile.passwordChangeNewInvalid'),
      });
      return;
    }
    changePwdMut.mutate();
  }, [changePwdMut, newPassword, oldPassword, t]);

  if (!user?.memberId) {
    return null;
  }

  if (icafeQ.isLoading || (icafeQ.isSuccess && profileQ.isLoading)) {
    return (
      <View style={styles.embeddedBlock}>
        <ActivityIndicator color={colors.accentBright} size="large" />
      </View>
    );
  }

  if (icafeQ.isError) {
    return (
      <View style={styles.embeddedBlock}>
        <Text style={styles.err}>{t('profile.loadProfileError')}</Text>
        <Pressable style={styles.retry} onPress={() => void icafeQ.refetch()}>
          <Text style={styles.retryText}>{t('booking.retry')}</Text>
        </Pressable>
      </View>
    );
  }

  if (profileQ.isError) {
    return (
      <View style={styles.embeddedBlock}>
        <Text style={styles.err}>{t('profile.loadProfileError')}</Text>
        <Pressable style={styles.retry} onPress={() => profileQ.refetch()}>
          <Text style={styles.retryText}>{t('booking.retry')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <>
      <Modal
        visible={fullscreenResult !== null}
        animationType="fade"
        transparent
        presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : undefined}
        onRequestClose={closeFullscreen}
      >
        <View style={styles.resultOverlay}>
          <View style={styles.resultCard}>
            {fullscreenResult?.kind === 'profileSaved' ? (
              <>
                <Text style={styles.resultTitle}>{t('profile.saveProfileSuccessTitle')}</Text>
                <Text style={styles.resultDescr}>{t('profile.saveProfileSuccess')}</Text>
                <Pressable style={styles.resultBtn} onPress={closeFullscreen}>
                  <Text style={styles.resultBtnText}>{t('booking.successOk')}</Text>
                </Pressable>
              </>
            ) : fullscreenResult?.kind === 'passwordChanged' ? (
              <>
                <Text style={styles.resultTitle}>{t('profile.passwordChangeSuccessTitle')}</Text>
                <Text style={styles.resultDescr}>{t('profile.passwordChangeSuccessBody')}</Text>
                <Pressable
                  style={styles.resultBtnSecondary}
                  onPress={() => {
                    closeFullscreen();
                    void logout();
                  }}
                >
                  <Text style={styles.resultBtnSecondaryText}>{t('profile.passwordChangeExit')}</Text>
                </Pressable>
                <Pressable style={styles.resultBtn} onPress={closeFullscreen}>
                  <Text style={styles.resultBtnText}>{t('profile.passwordChangeContinueSession')}</Text>
                </Pressable>
              </>
            ) : fullscreenResult?.kind === 'error' ? (
              <>
                <Text style={styles.resultTitle}>{fullscreenResult.title}</Text>
                <Text style={styles.resultDescr}>{fullscreenResult.detail}</Text>
                <Pressable style={styles.resultBtn} onPress={closeFullscreen}>
                  <Text style={styles.resultBtnText}>{t('booking.successOk')}</Text>
                </Pressable>
              </>
            ) : null}
          </View>
        </View>
      </Modal>

      <View style={styles.embeddedForm}>
        <Text style={styles.sectionHeading}>{t('profile.fieldLogin')}</Text>
        <View style={styles.loginDisplay}>
          <Text style={styles.loginDisplayText} selectable={false}>
            {user.memberAccount ?? ''}
          </Text>
        </View>

        <View style={styles.sectionGap} />

        <Text style={styles.sectionHeading}>{t('profile.sectionPassword')}</Text>

        <Text style={styles.label}>{t('profile.fieldOldPassword')}</Text>
        <View style={styles.passwordRow}>
          <TextInput
            style={styles.inputFlex}
            value={oldPassword}
            onChangeText={setOldPassword}
            secureTextEntry={!oldPwdVisible}
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="password"
            placeholderTextColor={colors.muted}
          />
          <Pressable
            style={({ pressed }) => [styles.eyeBtn, pressed && styles.eyeBtnPressed]}
            onPress={() => setOldPwdVisible((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={oldPwdVisible ? t('login.hidePassword') : t('login.showPassword')}
          >
            <MaterialCommunityIcons
              name={oldPwdVisible ? 'eye-off-outline' : 'eye-outline'}
              size={24}
              color={colors.muted}
            />
          </Pressable>
        </View>

        <Text style={styles.label}>{t('profile.fieldNewPassword')}</Text>
        <View style={styles.passwordRow}>
          <TextInput
            style={styles.inputFlex}
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry={!newPwdVisible}
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="newPassword"
            placeholderTextColor={colors.muted}
          />
          <Pressable
            style={({ pressed }) => [styles.eyeBtn, pressed && styles.eyeBtnPressed]}
            onPress={() => setNewPwdVisible((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={newPwdVisible ? t('login.hidePassword') : t('login.showPassword')}
          >
            <MaterialCommunityIcons
              name={newPwdVisible ? 'eye-off-outline' : 'eye-outline'}
              size={24}
              color={colors.muted}
            />
          </Pressable>
        </View>

        <Pressable
          style={[
            styles.secondaryBtn,
            (changePwdMut.isPending || saveMut.isPending) && styles.secondaryBtnDisabled,
          ]}
          onPress={onChangePasswordPress}
          disabled={changePwdMut.isPending || saveMut.isPending}
        >
          {changePwdMut.isPending ? (
            <ActivityIndicator color={colors.accentBright} size="small" />
          ) : (
            <Text style={styles.secondaryBtnText}>{t('profile.passwordChangeButton')}</Text>
          )}
        </Pressable>

        <View style={styles.sectionGapLarge} />

        <Text style={styles.sectionHeading}>{t('profile.sectionProfileData')}</Text>

        <Text style={styles.label}>{t('profile.fieldFirstName')}</Text>
        <TextInput
          style={styles.input}
          value={firstName}
          onChangeText={setFirstName}
          autoCapitalize="words"
        />
        <Text style={styles.label}>{t('profile.fieldLastName')}</Text>
        <TextInput
          style={styles.input}
          value={lastName}
          onChangeText={setLastName}
          autoCapitalize="words"
        />
        <Text style={styles.label}>{t('profile.fieldEmail')}</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <Text style={styles.label}>{t('profile.fieldPhone')}</Text>
        <TextInput style={styles.input} value={phone} onChangeText={onPhoneChange} keyboardType="phone-pad" />
        <Text style={styles.label}>{t('profile.fieldBirthday')}</Text>
        <TextInput
          style={styles.input}
          value={birthday}
          onChangeText={onBirthdayChange}
          placeholder={t('register.placeholderBirthday')}
          keyboardType="numbers-and-punctuation"
        />

        <Pressable
          style={[styles.saveBtn, (saveMut.isPending || changePwdMut.isPending) && styles.saveBtnDisabled]}
          onPress={() => saveMut.mutate()}
          disabled={saveMut.isPending || changePwdMut.isPending}
        >
          {saveMut.isPending ? (
            <ActivityIndicator color={colors.accentTextOnButton} />
          ) : (
            <Text style={styles.saveBtnText}>{t('profile.saveProfile')}</Text>
          )}
        </Pressable>
      </View>
    </>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    screenFlex: { flex: 1 },
    screenRoot: { flex: 1, backgroundColor: colors.bg },
    screenScroll: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 8 },
    embeddedBlock: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 28,
      paddingHorizontal: 16,
      marginBottom: 20,
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    embeddedForm: { marginBottom: 4 },
    /** Как `booking.successOverlay` / `successCard` — полноэкранный итог. */
    resultOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.95)',
      justifyContent: 'center',
      padding: 24,
    },
    resultCard: { alignItems: 'center' },
    resultTitle: {
      color: colors.text,
      fontSize: 26,
      fontWeight: '700',
      textAlign: 'center',
      lineHeight: 34,
    },
    resultDescr: {
      color: colors.muted,
      fontSize: 18,
      textAlign: 'center',
      marginTop: 24,
      lineHeight: 26,
    },
    resultBtnSecondary: {
      marginTop: 20,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      minWidth: 220,
      alignItems: 'center',
    },
    resultBtnSecondaryText: { color: colors.accentBright, fontWeight: '600', fontSize: 16 },
    resultBtn: {
      marginTop: 16,
      backgroundColor: colors.success,
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 48,
      minWidth: 220,
      alignItems: 'center',
    },
    resultBtnText: { color: colors.accentTextOnButton, fontWeight: '700', fontSize: 18 },
    sectionHeading: {
      fontSize: 13,
      fontWeight: '700',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: colors.accentBright,
      marginBottom: 4,
      marginTop: 0,
    },
    sectionGap: { height: 8 },
    sectionGapLarge: { height: 10 },
    loginDisplay: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: colors.zoneBg,
    },
    loginDisplayText: {
      fontSize: 16,
      color: colors.muted,
    },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: colors.bg },
    err: { color: colors.danger, textAlign: 'center', marginBottom: 16 },
    retry: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, backgroundColor: colors.accent },
    retryText: { color: colors.accentTextOnButton, fontWeight: '700' },
    /** Между полями: marginTop + одна строка подписи (~18) + marginBottom — как между двумя полями пароля. */
    label: { color: colors.muted, fontSize: 13, marginBottom: 3, marginTop: 6, lineHeight: 17 },
    hintMuted: { color: colors.mutedDark, fontSize: 12, marginTop: 6 },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 8,
      fontSize: 16,
      color: colors.text,
      backgroundColor: colors.card,
    },
    inputReadOnly: {
      backgroundColor: colors.zoneBg,
      color: colors.muted,
    },
    passwordRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingRight: 4,
    },
    inputFlex: {
      flex: 1,
      paddingHorizontal: 12,
      paddingVertical: 8,
      fontSize: 16,
      color: colors.text,
    },
    eyeBtn: { padding: 6, justifyContent: 'center', alignItems: 'center' },
    eyeBtnPressed: { opacity: 0.7 },
    secondaryBtn: {
      /** Как расстояние между двумя полями пароля: label.marginTop + lineHeight + label.marginBottom */
      marginTop: 6 + 17 + 3,
      paddingVertical: 9,
      paddingHorizontal: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      backgroundColor: colors.card,
    },
    secondaryBtnDisabled: { opacity: 0.6 },
    secondaryBtnText: { color: colors.accentBright, fontWeight: '700', fontSize: 15 },
    saveBtn: {
      marginTop: 8,
      backgroundColor: colors.accent,
      paddingVertical: 11,
      borderRadius: 12,
      alignItems: 'center',
    },
    saveBtnDisabled: { opacity: 0.7 },
    saveBtnText: { color: colors.accentTextOnButton, fontWeight: '700', fontSize: 16 },
  });
}
