import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AuthResult, login, register } from '../services/auth';
import { ThemeColors, lightColors } from '../theme/colors';
import { useLanguage } from '../theme/LanguageContext';
import { useTheme } from '../theme/ThemeContext';

type AuthMode = 'login' | 'register';

type AuthScreenProps = {
  onAuthSuccess: (result: AuthResult) => void;
};

type PasswordInputProps = {
  editable: boolean;
  isVisible: boolean;
  onChangeText: (value: string) => void;
  onToggleVisible: () => void;
  placeholder: string;
  textContentType: 'password' | 'newPassword';
  value: string;
};

function PasswordInput({
  editable,
  isVisible,
  onChangeText,
  onToggleVisible,
  placeholder,
  textContentType,
  value,
}: PasswordInputProps) {
  const theme = useTheme();
  const { t } = useLanguage();
  const colors = theme.colors;
  styles = createStyles(colors);

  return (
    <View style={styles.passwordField}>
      <TextInput
        editable={editable}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        secureTextEntry={!isVisible}
        style={styles.passwordInput}
        textContentType={textContentType}
        value={value}
      />
      <Pressable
        accessibilityLabel={isVisible ? t('passwordHide') : t('passwordShow')}
        accessibilityRole="button"
        disabled={!editable}
        onPress={onToggleVisible}
        style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
      >
        <Ionicons
          color={colors.muted}
          name={isVisible ? 'eye-off-outline' : 'eye-outline'}
          size={22}
        />
      </Pressable>
    </View>
  );
}

export function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const theme = useTheme();
  const { t } = useLanguage();
  const colors = theme.colors;
  styles = createStyles(colors);
  const [mode, setMode] = useState<AuthMode>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isRegister = mode === 'register';

  const handleSubmit = async () => {
    setError('');

    if (isRegister && fullName.trim().length < 2) {
      setError(t('unnamed'));
      return;
    }

    if (!email.trim() || password.length < 8) {
      setError(t('emailPasswordRequired'));
      return;
    }

    if (isRegister && password !== confirmPassword) {
      setError(t('passwordsMismatch'));
      return;
    }

    setIsSubmitting(true);

    try {
      const result = isRegister
        ? await register({
            fullName: fullName.trim(),
            email: email.trim(),
            password,
          })
        : await login({
            email: email.trim(),
            password,
          });

      onAuthSuccess(result);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t('error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleMode = () => {
    setError('');
    setPassword('');
    setConfirmPassword('');
    setIsPasswordVisible(false);
    setIsConfirmPasswordVisible(false);
    setMode((current) => (current === 'login' ? 'register' : 'login'));
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.screen}
    >
      <View style={styles.header}>
        <Text style={styles.brand}>AIQala</Text>
        <Text style={styles.title}>{isRegister ? t('createAccount') : t('loginTitle')}</Text>
      </View>

      <View style={styles.form}>
        {isRegister && (
          <TextInput
            autoCapitalize="words"
            editable={!isSubmitting}
            onChangeText={setFullName}
            placeholder={t('fullName')}
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={fullName}
          />
        )}

        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isSubmitting}
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder="Email"
          placeholderTextColor={colors.muted}
          style={styles.input}
          textContentType="emailAddress"
          value={email}
        />

        <PasswordInput
          editable={!isSubmitting}
          isVisible={isPasswordVisible}
          onChangeText={setPassword}
          onToggleVisible={() => setIsPasswordVisible((current) => !current)}
          placeholder={t('password')}
          textContentType={isRegister ? 'newPassword' : 'password'}
          value={password}
        />

        {isRegister && (
          <PasswordInput
            editable={!isSubmitting}
            isVisible={isConfirmPasswordVisible}
            onChangeText={setConfirmPassword}
            onToggleVisible={() => setIsConfirmPasswordVisible((current) => !current)}
            placeholder={t('passwordRepeat')}
            textContentType="newPassword"
            value={confirmPassword}
          />
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          accessibilityRole="button"
          disabled={isSubmitting}
          onPress={handleSubmit}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.pressed,
            isSubmitting && styles.disabledButton,
          ]}
        >
          {isSubmitting ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.primaryButtonText}>{isRegister ? t('register') : t('login')}</Text>
          )}
        </Pressable>

        <Pressable
          accessibilityRole="button"
          disabled={isSubmitting}
          onPress={toggleMode}
          style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
        >
          <Text style={styles.secondaryButtonText}>
            {isRegister ? t('alreadyAccount') : t('noAccount')}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  header: {
    gap: 10,
    marginBottom: 34,
  },
  brand: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '900',
  },
  title: {
    color: colors.text,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '900',
    letterSpacing: 0,
  },
  form: {
    gap: 14,
  },
  input: {
    minHeight: 56,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: 16,
    paddingHorizontal: 18,
  },
  passwordField: {
    minHeight: 56,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 18,
    paddingRight: 6,
  },
  passwordInput: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    paddingVertical: 0,
  },
  iconButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    color: '#c62828',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  primaryButton: {
    minHeight: 58,
    borderRadius: 29,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 17,
    fontWeight: '800',
  },
  secondaryButton: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.72,
  },
  disabledButton: {
    opacity: 0.7,
  },
});

let styles = createStyles(lightColors);
