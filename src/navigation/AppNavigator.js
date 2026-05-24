import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { View, ActivityIndicator } from 'react-native';
import AppAlert from '../components/AppAlert';

import useAuthStore from '../store/authStore';
import AdminNavigator    from './AdminNavigator';
import MechanicNavigator from './MechanicNavigator';

const LoginScreen          = require('../screens/auth/LoginScreen').default;
const RegisterScreen       = require('../screens/auth/RegisterScreen').default;
const ForgotPasswordScreen = require('../screens/auth/ForgotPasswordScreen').default;

const Stack = createStackNavigator();

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login"          component={LoginScreen} />
      <Stack.Screen name="Register"       component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const { token, currentMode, hydrated, hydrate } = useAuthStore();

  useEffect(() => {
    hydrate();
  }, []);

  if (!hydrated) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#E85D04" />
      </View>
    );
  }

  return (
    <>
      <NavigationContainer>
        {!token ? (
          <AuthStack />
        ) : currentMode === 'admin' ? (
          <AdminNavigator />
        ) : (
          <MechanicNavigator />
        )}
      </NavigationContainer>
      <AppAlert />
    </>
  );
}
