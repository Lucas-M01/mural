import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as SecureStore from 'expo-secure-store';

const storageKey = 'mural.session';
const listeners = new Set<() => void>();
let token: string | null = null;
let ending: Promise<void> | undefined;

export function getSession() {
  return token;
}

export function subscribeSession(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function setSession(value: string | null) {
  token = value;
  for (const listener of listeners) listener();
}

export async function restoreSession() {
  setSession(await SecureStore.getItemAsync(storageKey));
}

export async function saveSession(value: string) {
  await SecureStore.setItemAsync(storageKey, value);
  setSession(value);
}

export function endSession(expectedToken = token) {
  if (ending) return ending;
  if (expectedToken !== token || !token) return Promise.resolve();

  ending = (async () => {
    await SecureStore.deleteItemAsync(storageKey);
    try {
      await GoogleSignin.signOut();
    } catch {
      // The app session was already removed.
    }
    setSession(null);
  })().finally(() => {
    ending = undefined;
  });
  return ending;
}
