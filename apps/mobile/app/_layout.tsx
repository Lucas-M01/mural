import '../global.css';

import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { ActivityIndicator, StatusBar, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { logRequestError, retryRead } from '../src/request-error';
import { getSession, restoreSession, subscribeSession } from '../src/session';
import { Button } from '../src/ui';
import { useTheme } from '../src/theme';

function createQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({ onError: logRequestError }),
    mutationCache: new MutationCache({ onError: logRequestError }),
    defaultOptions: {
      queries: { retry: retryRead, networkMode: 'always' },
      mutations: { retry: false, networkMode: 'always' },
    },
  });
}

export default function RootLayout() {
  const { colors, dark } = useTheme();
  const token = useSyncExternalStore(subscribeSession, getSession);
  // Each session gets an isolated query and mutation cache.
  const queryClient = useMemo(() => createQueryClient(), [token]);
  const [loading, setLoading] = useState(true);
  const [storageError, setStorageError] = useState(false);

  function restore() {
    setLoading(true);
    setStorageError(false);
    void restoreSession()
      .catch(() => setStorageError(true))
      .finally(() => setLoading(false));
  }

  useEffect(restore, []);
  useEffect(() => () => queryClient.clear(), [queryClient]);

  if (loading || storageError) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas">
        {loading ? (
          <ActivityIndicator color={colors.brand} />
        ) : (
          <Button label="Tentar carregar sessão novamente" onPress={restore} />
        )}
      </View>
    );
  }
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} />
      <QueryClientProvider client={queryClient}>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.canvas },
            headerTintColor: colors.ink,
            contentStyle: { backgroundColor: colors.canvas },
          }}
        >
          <Stack.Protected guard={token !== null}>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="lists/[id]" />
          </Stack.Protected>
          <Stack.Protected guard={token === null}>
            <Stack.Screen name="login" options={{ headerShown: false }} />
          </Stack.Protected>
        </Stack>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
