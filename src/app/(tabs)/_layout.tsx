import React from 'react';
import { Tabs } from 'expo-router';
import { Text } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{
      headerShown: true,
      tabBarActiveTintColor: '#6366F1',
      tabBarInactiveTintColor: '#94A3B8',
      tabBarStyle: {
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        height: 60,
        paddingBottom: 8,
        paddingTop: 8,
      },
      tabBarLabelStyle: {
        fontSize: 10,
        fontWeight: 'bold',
      },
      headerStyle: {
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
        shadowColor: 'transparent',
        elevation: 0,
      },
      headerTitleStyle: {
        fontWeight: '900',
        color: '#0F172A',
        fontSize: 18,
      }
    }}>
      <Tabs.Screen 
        name="index" 
        options={{
          title: 'Biblioteca',
          headerTitle: 'Biblioteca Digital',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>📖</Text>
        }}
      />
      <Tabs.Screen 
        name="subir" 
        options={{
          title: 'Subir',
          headerTitle: 'Compartir Recurso',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>➕</Text>
        }}
      />
      <Tabs.Screen 
        name="perfil" 
        options={{
          title: 'Mi Espacio',
          headerTitle: 'Mi Historial y Aportes',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>👤</Text>
        }}
      />
    </Tabs>
  );
}
