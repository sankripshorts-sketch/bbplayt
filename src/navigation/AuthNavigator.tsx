import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from '../features/auth/LoginScreen';
import { RegisterScreen } from '../features/auth/RegisterScreen';
import { RegisterVerifyScreen } from '../features/auth/RegisterVerifyScreen';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  RegisterVerify: {
    memberId: string;
    privateKey: string;
    phone: string;
    memberAccount: string;
  };
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#141824' },
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="RegisterVerify" component={RegisterVerifyScreen} />
    </Stack.Navigator>
  );
}
