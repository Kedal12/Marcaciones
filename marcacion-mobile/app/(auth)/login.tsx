// app/(auth)/login.tsx
import { login } from '@/src/api/auth';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Campos requeridos', 'Ingresa tu correo y contraseña.');
      return;
    }

    setLoading(true);
    try {
      console.log('Haciendo login...');

      // Llama al servicio de login (guarda el token dentro de login())
      const data = await login(email.trim(), password);
      console.log('LOGIN OK', data);

      // Si quieres dejar el alert de éxito mientras pruebas, descomenta esto:
      // Alert.alert(
      //   'Login correcto',
      //   `Token recibido (primeros 10 chars): ${data.token.substring(0, 10)}...`
      // );

      // Navegar a la pantalla principal (tabs → index.tsx → ruta "/")
      router.replace('/');
    } catch (err: any) {
      console.log(
        'LOGIN ERROR',
        JSON.stringify(
          {
            message: err.message,
            status: err.response?.status,
            data: err.response?.data,
          },
          null,
          2
        )
      );

      const apiMessage =
        typeof err.response?.data === 'string'
          ? err.response?.data
          : err.response?.data?.message;

      Alert.alert(
        'Error al iniciar sesión',
        apiMessage ||
          err.message ||
          'No se pudo contactar al servidor. Verifica tu conexión y que la API esté encendida.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Iniciar sesión</Text>

      <TextInput
        style={styles.input}
        placeholder="Correo electrónico"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />

      <TextInput
        style={styles.input}
        placeholder="Contraseña"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity
        style={styles.button}
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Entrar</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 24,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
