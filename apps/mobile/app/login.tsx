import {
  GoogleSignin,
  GoogleSigninButton,
  isSuccessResponse,
} from '@react-native-google-signin/google-signin';
import { useMutation } from '@tanstack/react-query';
import { Platform, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '../src/api';
import { friendlyError } from '../src/request-error';
import { saveSession } from '../src/session';

const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const configured = !!webClientId && (Platform.OS !== 'ios' || !!iosClientId);

if (configured) {
  GoogleSignin.configure({
    webClientId,
    ...(iosClientId && { iosClientId }),
    offlineAccess: true,
    scopes: ['https://www.googleapis.com/auth/calendar.events'],
  });
}

export default function LoginScreen() {
  const login = useMutation({
    mutationFn: async () => {
      if (Platform.OS === 'android') {
        await GoogleSignin.hasPlayServices({
          showPlayServicesUpdateDialog: true,
        });
      }
      const result = await GoogleSignin.signIn();
      if (!isSuccessResponse(result)) return;
      const code = result.data.serverAuthCode;
      if (!code) throw new Error('Código de autorização indisponível.');
      await saveSession(await api.signIn(code));
    },
  });

  return (
    <SafeAreaView className="flex-1 items-center justify-center gap-md bg-canvas p-xl">
      <Text
        accessibilityRole="header"
        className="text-display font-bold text-ink"
      >
        Mural
      </Text>
      <Text className="text-center text-body text-muted">
        Entre com o Google para acessar suas listas.
      </Text>
      {configured ? (
        <GoogleSigninButton
          accessibilityLabel="Entrar com o Google"
          disabled={login.isPending}
          onPress={() => login.mutate()}
          size={GoogleSigninButton.Size.Wide}
        />
      ) : (
        <Text className="text-center text-danger">
          Configure os IDs OAuth do Google no ambiente do app.
        </Text>
      )}
      {login.isError && (
        <Text accessibilityRole="alert" className="text-center text-danger">
          {friendlyError(login.error)}
        </Text>
      )}
    </SafeAreaView>
  );
}
