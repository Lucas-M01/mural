import '../global.css';

import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { logRequestError, retryRead } from '../src/request-error';

const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: logRequestError }),
  mutationCache: new MutationCache({ onError: logRequestError }),
  defaultOptions: {
    queries: { retry: retryRead, networkMode: 'always' },
    mutations: { retry: false, networkMode: 'always' },
  },
});

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: '#FFF9E8' },
            headerTintColor: '#292524',
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
        </Stack>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
