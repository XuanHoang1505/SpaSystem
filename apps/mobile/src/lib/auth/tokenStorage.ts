import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/** The refresh token is the only credential kept on the device (never AsyncStorage on native). */
export const REFRESH_TOKEN_KEY = 'spa.refresh_token';

export const readRefreshToken = async (): Promise<string | null> => {
  if (Platform.OS === 'web') {
    try {
      return typeof localStorage !== 'undefined' ? localStorage.getItem(REFRESH_TOKEN_KEY) : null;
    } catch {
      return null;
    }
  }
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
};

export const saveRefreshToken = async (token: string): Promise<void> => {
  if (Platform.OS === 'web') {
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem(REFRESH_TOKEN_KEY, token);
    } catch {
      // ignore
    }
    return;
  }
  return SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
};

export const clearRefreshToken = async (): Promise<void> => {
  if (Platform.OS === 'web') {
    try {
      if (typeof localStorage !== 'undefined') localStorage.removeItem(REFRESH_TOKEN_KEY);
    } catch {
      // ignore
    }
    return;
  }
  return SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
};
