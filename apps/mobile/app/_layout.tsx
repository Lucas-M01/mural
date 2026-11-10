import '../global.css';

import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { logRequestError, retryRead } from '../src/request-error';
import { useTheme } from '../src/theme';

const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: logRequestError }),
  mutationCache: new MutationCache({ onError: logRequestError }),
  defaultOptions: {
    queries: { retry: retryRead, networkMode: 'always' },
    mutations: { retry: false, networkMode: 'always' },
  },
});

export default function RootLayout() {
  const { colors, dark } = useTheme();
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
          <Stack.Screen name="index" options={{ headerShown: false }} />
        </Stack>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
