import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { bookingFlowApi, cafesApi } from '../../api/endpoints';
import { ApiError } from '../../api/client';
import { createMember, type RegistrationBody } from '../../api/registrationApi';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';
import { colors } from '../../theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

function normalizePhone(raw: string): string {
  const d = raw.replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('8') && d.length === 11) return `+7${d.slice(1)}`;
  if (d.startsWith('7') && d.length === 11) return `+${d}`;
  if (d.startsWith('9') && d.length === 10) return `+7${d}`;
  return d.startsWith('+') ? raw.trim() : `+${d}`;
}

/** dd.mm.yyyy → yyyy-mm-dd */
function birthdayToIso(raw: string): string | null {
  const m = raw.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!m) return null;
  const dd = m[1].padStart(2, '0');
  const mm = m[2].padStart(2, '0');
  const yyyy = m[3];
  return `${yyyy}-${mm}-${dd}`;
}

export function RegisterScreen({ navigation }: Props) {
  const cafesListQ = useQuery({
    queryKey: ['cafes'],
    queryFn: () => cafesApi.list(),
  });
  const icafeMemberQ = useQuery({
    queryKey: ['icafe-id-for-member'],
    queryFn: () => bookingFlowApi.icafeIdForMember(),
  });

  const cafes = cafesListQ.data ?? [];
  const defaultCafeId = useMemo(() => {
    const fromApi = icafeMemberQ.data?.icafe_id;
    if (fromApi && /^\d+$/.test(fromApi)) return Number(fromApi);
    return cafes[0]?.icafe_id ?? null;
  }, [icafeMemberQ.data, cafes]);

  const [cafeId, setCafeId] = useState<number | null>(null);
  const effectiveCafeId = cafeId ?? defaultCafeId;

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
    if (!effectiveCafeId) {
      setError('Нет клуба: загрузите список или задайте iCafe ID вручную на сервере.');
      return;
    }
    const iso = birthdayToIso(birthday);
    if (!iso) {
      setError('Дата рождения: формат ДД.ММ.ГГГГ');
      return;
    }
    const ph = normalizePhone(phone);
    if (ph.length < 11) {
      setError('Укажите телефон (10–11 цифр)');
      return;
    }
    if (!account.trim() || !password || password.length < 4) {
      setError('Логин и пароль (мин. 4 символа)');
      return;
    }
    const body: RegistrationBody = {
      member_account: account.trim(),
      member_first_name: firstName.trim() || '—',
      member_last_name: lastName.trim() || '—',
      member_email: email.trim() || `${account.trim()}@placeholder.local`,
      member_birthday: iso,
      member_phone: ph,
      member_password: password,
      member_confirm: password,
    };
    setLoading(true);
    try {
      const { memberId, privateKey } = await createMember(effectiveCafeId, body);
      navigation.navigate('RegisterVerify', {
        memberId,
        privateKey,
        phone: ph,
        memberAccount: body.member_account,
      });
    } catch (e) {
      const msg =
        e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Ошибка регистрации';
      setError(msg);
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
          <Text style={styles.title}>Регистрация</Text>
          <Text style={styles.sub}>
            Клуб для создания аккаунта:{' '}
            {icafeMemberQ.data?.icafe_id
              ? `API /icafe-id-for-member → ${icafeMemberQ.data.icafe_id}`
              : 'из списка клубов'}
          </Text>

          <Text style={styles.label}>Клуб (iCafe)</Text>
          {cafesListQ.isLoading ? (
            <ActivityIndicator color={colors.accent} />
          ) : (
            <View style={styles.chips}>
              {cafes.map((c) => (
                <Pressable
                  key={c.icafe_id}
                  onPress={() => setCafeId(c.icafe_id)}
                  style={[
                    styles.chip,
                    (effectiveCafeId === c.icafe_id) && styles.chipOn,
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      (effectiveCafeId === c.icafe_id) && styles.chipTextOn,
                    ]}
                    numberOfLines={2}
                  >
                    {c.address}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          <Field label="Логин (ник)" value={account} onChangeText={setAccount} />
          <Field label="Имя" value={firstName} onChangeText={setFirstName} />
          <Field label="Фамилия" value={lastName} onChangeText={setLastName} />
          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Field
            label="Дата рождения (ДД.ММ.ГГГГ)"
            value={birthday}
            onChangeText={setBirthday}
            placeholder="01.01.2000"
          />
          <Field label="Телефон" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <Field label="Пароль" value={password} onChangeText={setPassword} secureTextEntry />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            onPress={onSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Создать аккаунт</Text>
            )}
          </Pressable>

          <Pressable onPress={() => navigation.goBack()} style={styles.link}>
            <Text style={styles.linkText}>Уже есть аккаунт — войти</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none';
  placeholder?: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
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
  linkText: { color: colors.accent, fontSize: 16 },
});
