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

const API_BASE_URL = 'http://187.127.45.180:3000';
const EMAIL_DOMAIN = '@UniShare.com';

export default function RegisterScreen() {
  const [nombre, setNombre] = useState('');
  const [correoPrefix, setCorreoPrefix] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [confirmContrasena, setConfirmContrasena] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleRegister = async () => {
    setError(null);
    setSuccess(false);

    if (!nombre.trim() || !correoPrefix.trim() || !contrasena || !confirmContrasena) {
      setError('Todos los campos son obligatorios.');
      return;
    }

    if (contrasena !== confirmContrasena) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    if (contrasena.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setLoading(true);
    const correo = `${correoPrefix.trim()}${EMAIL_DOMAIN}`;

    try {
      const response = await fetch(`${API_BASE_URL}/api/users/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          nombre: nombre.trim(),
          correo,
          contrasena,
          id_rol: 2 // 2 = Cliente
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Error al registrar el usuario.');
      }

      setSuccess(true);
      setTimeout(() => {
        router.replace('/(auth)/login');
      }, 1500);
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
          <Text style={styles.cardTitle}>Crear Cuenta</Text>
          <Text style={styles.cardDesc}>Regístrate para formar parte de la red de estudio de UniShare</Text>

          {error && (
            <View style={styles.errorAlert}>
              <Text style={styles.errorText}>⚠️ {error}</Text>
            </View>
          )}

          {success && (
            <View style={styles.successAlert}>
              <Text style={styles.successText}>✓ ¡Registro exitoso! Redireccionando al inicio de sesión...</Text>
            </View>
          )}

          {/* Name Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>NOMBRE COMPLETO</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Ej. Juan Pérez"
              placeholderTextColor="#94A3B8"
              value={nombre}
              onChangeText={setNombre}
              editable={!loading && !success}
            />
          </View>

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
                editable={!loading && !success}
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
              placeholder="Mínimo 6 caracteres"
              placeholderTextColor="#94A3B8"
              secureTextEntry
              value={contrasena}
              onChangeText={setContrasena}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading && !success}
            />
          </View>

          {/* Confirm Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>CONFIRMAR CONTRASEÑA</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Repite tu contraseña"
              placeholderTextColor="#94A3B8"
              secureTextEntry
              value={confirmContrasena}
              onChangeText={setConfirmContrasena}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading && !success}
            />
          </View>

          <TouchableOpacity 
            style={[styles.registerBtn, (loading || success) && styles.disabledBtn]} 
            onPress={handleRegister}
            disabled={loading || success}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.registerBtnText}>Registrarse</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footerArea}>
          <Text style={styles.footerText}>¿Ya tienes una cuenta? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
            <Text style={styles.loginLink}>Inicia sesión aquí</Text>
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
    marginBottom: 30,
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
  successAlert: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#D1FAE5',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  successText: {
    color: '#059669',
    fontSize: 12,
    fontWeight: '700',
  },
  inputGroup: {
    marginBottom: 16,
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
  registerBtn: {
    backgroundColor: '#EC4899',
    borderRadius: 100,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#EC4899',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  disabledBtn: {
    opacity: 0.8,
  },
  registerBtnText: {
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
  loginLink: {
    fontSize: 12,
    color: '#6366F1',
    fontWeight: '800',
  },
});
