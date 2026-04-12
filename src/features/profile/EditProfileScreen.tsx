import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { bookingFlowApi } from '../../api/endpoints';
import { ApiError } from '../../api/client';
import {
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
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [oldPwdVisible, setOldPwdVisible] = useState(false);
  const [newPwdVisible, setNewPwdVisible] = useState(false);

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
    const d = profileQ.data;
    if (!d) return;
    setFirstName(d.member_first_name);
    setLastName(d.member_last_name);
    setEmail(d.member_email);
    setPhone(formatRuPhoneInput(d.member_phone));
    setBirthday(d.member_birthday_display ? formatBirthdayInput(d.member_birthday_display) : '');
  }, [profileQ.data]);

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
    onSuccess: async () => {
      setOldPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setShowPasswordChange(false);
      await logout();
      Alert.alert(t('verify.alertTitle'), t('profile.passwordChangeSuccess'));
    },
    onError: (e: unknown) => {
      let msg =
        e instanceof ApiError ? e.message : e instanceof Error ? e.message : t('profile.passwordChangeError');
      const low = msg.toLowerCase();
      if (low.includes('api not allowed') || low.includes('not allowed')) {
        msg = t('profile.insightApiNotAllowed');
      } else if (isWrongOldPasswordMessage(low)) {
        msg = t('profile.passwordChangeWrongOld');
      }
      Alert.alert(t('profile.passwordChangeError'), msg);
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
      Alert.alert(t('profile.saveProfileSuccess'));
    },
    onError: (e: unknown) => {
      let msg =
        e instanceof ApiError ? e.message : e instanceof Error ? e.message : t('profile.saveProfileError');
      const low = msg.toLowerCase();
      if (low.includes('api not allowed') || low.includes('not allowed')) {
        msg = t('profile.insightApiNotAllowed');
      }
      Alert.alert(t('profile.saveProfileError'), msg);
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
      Alert.alert(t('verify.alertTitle'), t('profile.passwordChangeOldRequired'));
      return;
    }
    if (!newPassword || newPassword.length < 4) {
      Alert.alert(t('verify.alertTitle'), t('profile.passwordChangeNewInvalid'));
      return;
    }
    if (newPassword !== confirmNewPassword) {
      Alert.alert(t('verify.alertTitle'), t('profile.passwordChangeMismatch'));
      return;
    }
    changePwdMut.mutate();
  }, [changePwdMut, confirmNewPassword, newPassword, oldPassword, t]);

  const onPasswordChangeCancel = useCallback(() => {
    setShowPasswordChange(false);
    setOldPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
  }, []);

  if (!user?.memberId) {
    return null;
  }

  if (icafeQ.isLoading || (icafeQ.isSuccess && profileQ.isLoading)) {
    return (
      <View style={styles.embeddedBlock}>
        <ActivityIndicator color={colors.accent} size="large" />
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
    <View style={styles.embeddedForm}>
        <Text style={styles.label}>{t('profile.fieldLogin')}</Text>
        <TextInput
          style={[styles.input, styles.inputReadOnly]}
          value={user.memberAccount ?? ''}
          editable={false}
          selectTextOnFocus={false}
        />
        <Text style={styles.hintMuted}>{t('profile.fieldLoginHint')}</Text>

        <Text style={styles.label}>{t('profile.passwordSection')}</Text>
        {!showPasswordChange ? (
          <Pressable
            style={[styles.secondaryBtn, saveMut.isPending && styles.secondaryBtnDisabled]}
            onPress={() => setShowPasswordChange(true)}
            disabled={saveMut.isPending}
          >
            <Text style={styles.secondaryBtnText}>{t('profile.passwordChangeButton')}</Text>
          </Pressable>
        ) : (
          <>
            <Text style={styles.passwordHint}>{t('profile.passwordChangeHint')}</Text>

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

            <Text style={styles.label}>{t('profile.fieldConfirmNewPassword')}</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={styles.inputFlex}
                value={confirmNewPassword}
                onChangeText={setConfirmNewPassword}
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
                <ActivityIndicator color={colors.accent} size="small" />
              ) : (
                <Text style={styles.secondaryBtnText}>{t('profile.passwordChangeButton')}</Text>
              )}
            </Pressable>

            <Pressable
              style={styles.passwordChangeCancel}
              onPress={onPasswordChangeCancel}
              disabled={changePwdMut.isPending}
            >
              <Text style={styles.passwordChangeCancelText}>{t('profile.passwordChangeClose')}</Text>
            </Pressable>
          </>
        )}

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
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
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
    embeddedForm: { marginBottom: 8 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: colors.bg },
    err: { color: colors.danger, textAlign: 'center', marginBottom: 16 },
    retry: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, backgroundColor: colors.accent },
    retryText: { color: colors.accentTextOnButton, fontWeight: '700' },
    label: { color: colors.muted, fontSize: 13, marginBottom: 6, marginTop: 12 },
    hintMuted: { color: colors.mutedDark, fontSize: 12, marginTop: 6 },
    passwordHint: { color: colors.muted, fontSize: 14, marginBottom: 10, lineHeight: 20 },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
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
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 16,
      color: colors.text,
    },
    eyeBtn: { padding: 10, justifyContent: 'center', alignItems: 'center' },
    eyeBtnPressed: { opacity: 0.7 },
    secondaryBtn: {
      marginTop: 4,
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      backgroundColor: colors.card,
    },
    secondaryBtnDisabled: { opacity: 0.6 },
    secondaryBtnText: { color: colors.accent, fontWeight: '700', fontSize: 15 },
    passwordChangeCancel: {
      marginTop: 10,
      paddingVertical: 10,
      alignItems: 'center',
    },
    passwordChangeCancelText: { color: colors.muted, fontSize: 15 },
    saveBtn: {
      marginTop: 28,
      backgroundColor: colors.accent,
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center',
    },
    saveBtnDisabled: { opacity: 0.7 },
    saveBtnText: { color: colors.accentTextOnButton, fontWeight: '700', fontSize: 16 },
  });
}
