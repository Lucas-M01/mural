import { useMutation, useQuery } from '@tanstack/react-query';
import { ActivityIndicator, Image, Text, View } from 'react-native';
import { profileQuery } from '../src/api';
import { Eyebrow, FocusScreen } from '../src/focus';
import { endSession } from '../src/session';
import { useTheme } from '../src/theme';
import { Button, Card, ErrorState } from '../src/ui';

export default function ProfileScreen() {
  const profile = useQuery(profileQuery);
  const logout = useMutation({ mutationFn: () => endSession() });
  const { colors } = useTheme();

  return (
    <FocusScreen active="/profile">
      {profile.isPending && (
        <ActivityIndicator
          accessibilityLabel="Carregando perfil"
          color={colors.brand}
        />
      )}
      {profile.error && (
        <ErrorState
          error={profile.error}
          message="Não foi possível carregar seu perfil."
          retry={{
            hasData: !!profile.data,
            refreshing: profile.isFetching,
            onPress: () => void profile.refetch(),
          }}
        />
      )}
      {profile.data && (
        <View className="items-center gap-sm py-xl">
          <View className="h-20 w-20 items-center justify-center overflow-hidden rounded-pill border-2 border-brand bg-brand-surface">
            {profile.data.avatarUrl ? (
              <Image
                source={{ uri: profile.data.avatarUrl }}
                className="h-full w-full"
              />
            ) : (
              <Text className="text-display font-bold text-brand-ink">
                {profile.data.name.slice(0, 1).toUpperCase()}
              </Text>
            )}
          </View>
          <Text
            accessibilityRole="header"
            className="text-display text-center font-bold text-ink"
          >
            {profile.data.name}
          </Text>
          <Text className="text-caption text-muted">{profile.data.email}</Text>
        </View>
      )}
      <Eyebrow>Conta</Eyebrow>
      <Card className="gap-md p-xl">
        <Text className="text-body text-ink">Sessão do Google</Text>
        <Button
          destructive
          label={logout.isPending ? 'Saindo…' : 'Sair'}
          disabled={logout.isPending}
          onPress={() => logout.mutate()}
        />
        {logout.error && (
          <ErrorState error={logout.error} message="Não foi possível sair." />
        )}
      </Card>
    </FocusScreen>
  );
}
