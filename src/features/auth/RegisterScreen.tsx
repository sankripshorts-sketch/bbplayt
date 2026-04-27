import React, { useMemo, useState } from 'react';
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
import { Text } from '../../components/DinText';
import { TextInput } from '../../components/DinTextInput';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { bookingFlowApi, cafesApi } from '../../api/endpoints';
import { createMember, type RegistrationBody } from '../../api/registrationApi';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';
import { useLocale } from '../../i18n/LocaleContext';
import type { ColorPalette } from '../../theme/palettes';
import { useTheme, useThemeColors } from '../../theme';
import { queryKeys } from '../../query/queryKeys';
import { formatPublicErrorMessage } from '../../utils/publicText';
import { ClubDataLoader } from '../ui/ClubDataLoader';
import {
  birthdayToIso,
  dateToBirthdayDisplay,
  formatBirthdayInput,
  formatRuPhoneInput,
  isValidEmailWithRealDomain,
  isValidRuMobile,
  normalizePhoneForApi,
  parseBirthdayToDate,
  validateBirthdayDdMmYyyy,
} from './inputFormatters';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;
const BOTTOM_EDGE_BLEED_PX = 128;

export function RegisterScreen({ navigation }: Props) {
  const { t } = useLocale();
  const { theme } = useTheme();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const cafesListQ = useQuery({
    queryKey: queryKeys.cafes(),
    queryFn: () => cafesApi.list(),
    staleTime: 10 * 60 * 1000,
  });
  const icafeMemberQ = useQuery({
    queryKey: queryKeys.icafeIdForMember(),
    queryFn: () => bookingFlowApi.icafeIdForMember(),
    staleTime: 10 * 60 * 1000,
  });

  const cafes = cafesListQ.data ?? [];
  const defaultCafeId = useMemo(() => {
    const fromApi = icafeMemberQ.data?.icafe_id;
    if (fromApi && /^\d+$/.test(fromApi)) return Number(fromApi);
    return cafes[0]?.icafe_id ?? null;
  }, [icafeMemberQ.data, cafes]);

  const [cafeId, setCafeId] = useState<number | null>(null);

  const [account, setAccount] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [birthday, setBirthday] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setError(null);
    const submitCafeId = cafeId ?? defaultCafeId;
    if (submitCafeId == null) {
      setError(t('register.errorNoClub'));
      return;
    }
    const bd = validateBirthdayDdMmYyyy(birthday);
    if (bd === 'format') {
      setError(t('register.errorBirthday'));
      return;
    }
    if (bd === 'invalid') {
      setError(t('register.errorBirthdayInvalid'));
      return;
    }
    const iso = birthdayToIso(birthday);
    if (!iso) {
      setError(t('register.errorBirthday'));
      return;
    }
    if (!isValidEmailWithRealDomain(email)) {
      setError(t('register.errorEmail'));
      return;
    }
    const ph = normalizePhoneForApi(phone);
    if (!isValidRuMobile(phone)) {
      setError(t('register.errorPhone'));
      return;
    }
    if (!account.trim() || !password || password.length < 4) {
      setError(t('register.errorCredentials'));
      return;
    }
    const body: RegistrationBody = {
      member_account: account.trim(),
      member_first_name: firstName.trim() || '—',
      member_last_name: lastName.trim() || '—',
      member_email: email.trim(),
      member_birthday: iso,
      member_phone: ph,
      member_password: password,
      member_confirm: password,
    };
    setLoading(true);
    try {
      const { memberId, privateKey } = await createMember(submitCafeId, body);
      navigation.navigate('RegisterVerify', {
        memberId,
        privateKey,
        phone: ph,
        memberAccount: body.member_account,
      });
    } catch (e) {
      setError(formatPublicErrorMessage(e, t, 'register.errorGeneric'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>{t('register.title')}</Text>
          <Text style={styles.sub}>{t('register.subClub')}</Text>

          <Text style={styles.label}>{t('register.clubLabel')}</Text>
          {cafesListQ.isLoading ? (
            <ClubDataLoader message={t('common.loader.captionClub')} compact minHeight={120} />
          ) : (
            <View style={styles.chips}>
              <Pressable
                onPress={() => setCafeId(null)}
                style={[styles.chip, cafeId === null && styles.chipOn]}
              >
                <Text style={[styles.chipText, cafeId === null && styles.chipTextOn]}>
                  {t('register.clubNone')}
                </Text>
              </Pressable>
              {cafes.map((c) => (
                <Pressable
                  key={c.icafe_id}
                  onPress={() => setCafeId(c.icafe_id)}
                  style={[styles.chip, cafeId === c.icafe_id && styles.chipOn]}
                >
                  <Text
                    style={[styles.chipText, cafeId === c.icafe_id && styles.chipTextOn]}
                    numberOfLines={2}
                  >
                    {c.address}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          <Field
            label={t('register.fieldAccount')}
            value={account}
            onChangeText={setAccount}
            colors={colors}
            styles={styles}
          />
          <Field
            label={t('register.fieldFirstName')}
            value={firstName}
            onChangeText={setFirstName}
            colors={colors}
            styles={styles}
          />
          <Field
            label={t('register.fieldLastName')}
            value={lastName}
            onChangeText={setLastName}
            colors={colors}
            styles={styles}
          />
          <Field
            label={t('register.fieldEmail')}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            colors={colors}
            styles={styles}
          />
          <BirthdayField
            label={t('register.fieldBirthday')}
            value={birthday}
            onChangeText={setBirthday}
            placeholder={t('register.placeholderBirthday')}
            pickerCloseLabel={t('register.birthdayPickerClose')}
            pickerOpenLabel={t('register.birthdayPickerOpen')}
            themeVariant={theme === 'dark' ? 'dark' : 'light'}
            colors={colors}
            styles={styles}
          />
          <PhoneField
            label={t('register.fieldPhone')}
            value={phone}
            onChangeText={setPhone}
            placeholder={t('register.placeholderPhone')}
            colors={colors}
            styles={styles}
          />
          <Field
            label={t('register.fieldPassword')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            passwordToggleLabels={{ show: t('register.showPassword'), hide: t('register.hidePassword') }}
            colors={colors}
            styles={styles}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            onPress={onSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>{t('register.submit')}</Text>
            )}
          </Pressable>

          <Pressable onPress={() => navigation.goBack()} style={styles.link}>
            <Text style={styles.linkText}>{t('register.haveAccount')}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function PhoneField({
  label,
  value,
  onChangeText,
  placeholder,
  colors,
  styles,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  colors: ColorPalette;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={(t) => onChangeText(formatRuPhoneInput(t))}
        placeholderTextColor={colors.muted}
        keyboardType="phone-pad"
        placeholder={placeholder}
        accessibilityLabel={label}
      />
    </View>
  );
}

function BirthdayField({
  label,
  value,
  onChangeText,
  placeholder,
  pickerOpenLabel,
  pickerCloseLabel,
  themeVariant,
  colors,
  styles,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  pickerOpenLabel: string;
  pickerCloseLabel: string;
  themeVariant: 'light' | 'dark';
  colors: ColorPalette;
  styles: ReturnType<typeof createStyles>;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerValue = useMemo(() => parseBirthdayToDate(value), [value]);

  const onAndroidChange = (event: DateTimePickerEvent, date?: Date) => {
    setPickerOpen(false);
    if (event.type === 'dismissed' || !date) return;
    onChangeText(dateToBirthdayDisplay(date));
  };

  const onIosChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (date) onChangeText(dateToBirthdayDisplay(date));
  };

  const showNativePicker = Platform.OS !== 'web';

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.inputFlexBirthday}
          value={value}
          onChangeText={(t) => onChangeText(formatBirthdayInput(t))}
          placeholderTextColor={colors.muted}
          keyboardType="number-pad"
          placeholder={placeholder}
          accessibilityLabel={label}
        />
        {showNativePicker ? (
          <Pressable
            style={({ pressed }) => [styles.calendarBtn, pressed && styles.eyeBtnPressed]}
            onPress={() => setPickerOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={pickerOpenLabel}
          >
            <MaterialCommunityIcons name="calendar-month-outline" size={24} color={colors.accentBright} />
          </Pressable>
        ) : null}
      </View>

      {pickerOpen && Platform.OS === 'android' ? (
        <DateTimePicker
          value={pickerValue}
          mode="date"
          display="calendar"
          onChange={onAndroidChange}
          maximumDate={new Date()}
          minimumDate={new Date(1900, 0, 1)}
        />
      ) : null}

      {pickerOpen && Platform.OS === 'ios' ? (
        <Modal
          transparent
          animationType="fade"
          visible={pickerOpen}
          onRequestClose={() => setPickerOpen(false)}
          presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : undefined}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setPickerOpen(false)}>
            <Pressable style={[styles.modalSheet, { backgroundColor: colors.card }]} onPress={(e) => e.stopPropagation()}>
              <DateTimePicker
                value={pickerValue}
                mode="date"
                display="spinner"
                onChange={onIosChange}
                maximumDate={new Date()}
                minimumDate={new Date(1900, 0, 1)}
                locale="ru_RU"
                themeVariant={themeVariant}
              />
              <Pressable
                style={[styles.pickerCloseBtn, { borderColor: colors.border }]}
                onPress={() => setPickerOpen(false)}
              >
                <Text style={[styles.pickerCloseText, { color: colors.accentBright }]}>{pickerCloseLabel}</Text>
              </Pressable>
              <View style={[styles.bottomEdgeSpacer, styles.pointerNone]} />
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  secureTextEntry,
  passwordToggleLabels,
  keyboardType,
  autoCapitalize,
  placeholder,
  colors,
  styles,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  secureTextEntry?: boolean;
  passwordToggleLabels?: { show: string; hide: string };
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none';
  placeholder?: string;
  colors: ColorPalette;
  styles: ReturnType<typeof createStyles>;
}) {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const showToggle = !!secureTextEntry && !!passwordToggleLabels;

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {showToggle ? (
        <View style={styles.passwordRow}>
          <TextInput
            style={styles.inputFlex}
            value={value}
            onChangeText={onChangeText}
            placeholderTextColor={colors.muted}
            secureTextEntry={!passwordVisible}
            keyboardType={keyboardType}
            autoCapitalize={autoCapitalize ?? 'sentences'}
            placeholder={placeholder}
            accessibilityLabel={label}
          />
          <Pressable
            style={({ pressed }) => [styles.eyeBtn, pressed && styles.eyeBtnPressed]}
            onPress={() => setPasswordVisible((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={
              passwordVisible ? passwordToggleLabels.hide : passwordToggleLabels.show
            }
          >
            <MaterialCommunityIcons
              name={passwordVisible ? 'eye-off-outline' : 'eye-outline'}
              size={24}
              color={colors.muted}
            />
          </Pressable>
        </View>
      ) : (
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholderTextColor={colors.muted}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize ?? 'sentences'}
          placeholder={placeholder}
        />
      )}
    </View>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    flex: { flex: 1 },
    scroll: { paddingHorizontal: 20, paddingBottom: 40 },
    title: { fontSize: 26, fontWeight: '700', color: colors.text, marginBottom: 8 },
    sub: { color: colors.muted, fontSize: 13, marginBottom: 16, lineHeight: 18 },
    field: { marginBottom: 10 },
    label: { color: colors.muted, fontSize: 13, marginBottom: 6 },
    input: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 16,
      color: colors.text,
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
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
    chip: {
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 12,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      maxWidth: '100%',
    },
    chipOn: { borderColor: colors.accent, backgroundColor: colors.accentDim },
    chipText: { color: colors.muted, fontSize: 12 },
    chipTextOn: { color: '#fff' },
    error: { color: colors.danger, marginTop: 8, marginBottom: 8 },
    button: {
      backgroundColor: colors.accent,
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: 12,
    },
    buttonPressed: { opacity: 0.88 },
    buttonText: { color: '#fff', fontSize: 17, fontWeight: '600' },
    link: { marginTop: 20, alignItems: 'center' },
    linkText: { color: colors.accentBright, fontSize: 16 },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
    },
    inputFlexBirthday: {
      flex: 1,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 16,
      color: colors.text,
    },
    calendarBtn: { padding: 10, justifyContent: 'center', alignItems: 'center' },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    modalSheet: {
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      paddingBottom: 8,
      marginBottom: -BOTTOM_EDGE_BLEED_PX,
      overflow: 'hidden',
    },
    bottomEdgeSpacer: { height: BOTTOM_EDGE_BLEED_PX },
    pointerNone: { pointerEvents: 'none' },
    pickerCloseBtn: {
      alignItems: 'center',
      paddingVertical: 14,
      borderTopWidth: StyleSheet.hairlineWidth,
    },
    pickerCloseText: { fontSize: 17, fontWeight: '600' },
  });
}
