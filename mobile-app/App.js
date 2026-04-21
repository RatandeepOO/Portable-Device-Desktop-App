import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import AlertDetailScreen from './src/screens/AlertDetailScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import { useAuthStore } from './src/store/authStore';

const Stack = createNativeStackNavigator();

export default function App() {
  const { token } = useAuthStore();

  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#FFFFFF' },
          headerTintColor: '#0066CC',
          headerTitleStyle: { fontWeight: '600' },
          headerShadowVisible: false,
        }}
      >
        {token ? (
          <>
            <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Emergency Response' }} />
            <Stack.Screen name="AlertDetail" component={AlertDetailScreen} options={{ title: 'Alert Details' }} />
            <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}