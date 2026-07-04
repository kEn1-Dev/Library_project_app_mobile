import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator, 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView,
  StatusBar
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://187.127.45.180:3000';
const EMAIL_DOMAIN = '@UniShare.com';

export default function LoginScreen() {
  const [correoPrefix, setCorreoPrefix] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async () => {
    setError(null);
    if (!correoPrefix.trim() || !contrasena) {
      setError('Todos los campos son obligatorios.');
      return;
    }

    setLoading(true);
    const correo = `${correoPrefix.trim()}${EMAIL_DOMAIN}`;

    try {
      const response = await fetch(`${API_BASE_URL}/api/users/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ correo, contrasena })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Credenciales incorrectas.');
      }

      // Persist session
      await AsyncStorage.setItem('token', data.token);
      await AsyncStorage.setItem('user', JSON.stringify(data.user));

      // Redirect to tabs
      router.replace('/(tabs)');
    } catch (err: any) {
      setError(err.message || 'Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.headerArea}>
          <Text style={styles.logoText}>UniShare</Text>
          <Text style={styles.logoSubtitle}>ACADEMIC FORUM</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Iniciar Sesión</Text>
          <Text style={styles.cardDesc}>Ingresa tus credenciales para acceder a la biblioteca digital</Text>

          {error && (
            <View style={styles.errorAlert}>
              <Text style={styles.errorText}>⚠️ {error}</Text>
            </View>
          )}

          {/* Email Prefix Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>CORREO ELECTRÓNICO</Text>
            <View style={styles.emailWrapper}>
              <TextInput
                style={styles.emailInput}
                placeholder="nombre.usuario"
                placeholderTextColor="#94A3B8"
                value={correoPrefix}
                onChangeText={setCorreoPrefix}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
              <View style={styles.domainBadge}>
                <Text style={styles.domainText}>{EMAIL_DOMAIN}</Text>
              </View>
            </View>
          </View>

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>CONTRASEÑA</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Ingresa tu contraseña"
              placeholderTextColor="#94A3B8"
              secureTextEntry
              value={contrasena}
              onChangeText={setContrasena}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
          </View>

          <TouchableOpacity 
            style={[styles.loginBtn, loading && styles.disabledBtn]} 
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.loginBtnText}>Entrar a la biblioteca</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footerArea}>
          <Text style={styles.footerText}>¿No tienes una cuenta? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
            <Text style={styles.registerLink}>Regístrate aquí</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  headerArea: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoText: {
    fontSize: 36,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -1,
  },
  logoSubtitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#94A3B8',
    letterSpacing: 4,
    marginTop: 6,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 8,
  },
  cardDesc: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    lineHeight: 18,
    marginBottom: 24,
  },
  errorAlert: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '700',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '600',
  },
  emailWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    overflow: 'hidden',
  },
  emailInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '600',
  },
  domainBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignSelf: 'stretch',
    borderLeftWidth: 1,
    borderLeftColor: '#E2E8F0',
  },
  domainText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#64748B',
  },
  loginBtn: {
    backgroundColor: '#6366F1',
    borderRadius: 100,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  disabledBtn: {
    opacity: 0.8,
  },
  loginBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  footerArea: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
  },
  footerText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  registerLink: {
    fontSize: 12,
    color: '#EC4899',
    fontWeight: '800',
  },
});
