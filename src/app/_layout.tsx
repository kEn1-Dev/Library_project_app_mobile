import React, { useEffect, useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator } from 'react-native';
import { ThemeProvider, DefaultTheme } from '@react-navigation/native';

export default function RootLayout() {
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        // Redirect to tabs if authenticated
        setTimeout(() => {
          router.replace('/(tabs)');
        }, 100);
      } else {
        // Redirect to login if not authenticated
        setTimeout(() => {
          router.replace('/(auth)/login');
        }, 100);
      }
    } catch (e) {
      console.error(e);
      router.replace('/(auth)/login');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' }}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return (
    <ThemeProvider value={DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </ThemeProvider>
  );
}
