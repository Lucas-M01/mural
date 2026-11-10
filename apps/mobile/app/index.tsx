import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, listsQuery, tasksQuery } from '../src/api';
import { endSession } from '../src/session';
import { useTheme } from '../src/theme';
import tokens from '../src/tokens.json';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  ListColor,
  Palette,
} from '../src/ui';

export default function HomeScreen() {
  const { colors } = useTheme();
  const client = useQueryClient();
  const lists = useQuery(listsQuery);
  const logout = useMutation({ mutationFn: () => endSession() });
  const [title, setTitle] = useState('');
  const [color, setColor] = useState(tokens.listColors[0].value);
  const [note, setNote] = useState('');
  const [selectedList, setSelectedList] = useState<string>();
  const noteList =
    lists.data?.find(({ id }) => id === selectedList) ?? lists.data?.[0];

  const createList = useMutation({
    mutationFn: api.createList,
    onSuccess: async (list) => {
      setTitle('');
      setSelectedList(list.id);
      await client.invalidateQueries({
        queryKey: listsQuery.queryKey,
        exact: true,
      });
    },
  });

  const saveNote = useMutation({
    mutationFn: ({ listId, text }: { listId: string; text: string }) =>
      api.createTask(listId, {
        title: text.split('\n')[0].trim().slice(0, 200).trimEnd(),
        notes: text,
      }),
    onSuccess: async (_, { listId }) => {
      setNote('');
      await client.invalidateQueries({ queryKey: tasksQuery(listId).queryKey });
    },
  });

  return (
    <SafeAreaView className="flex-1 bg-canvas">
      <ScrollView keyboardShouldPersistTaps="handled">
        <View className="gap-xl p-xl">
          <View className="gap-xs rounded-card bg-brand-surface p-xl">
            <Text className="text-caption font-semibold uppercase text-brand-ink">
              Seu espaço de organização
            </Text>
            <Text
              accessibilityRole="header"
              className="text-display font-bold text-ink"
            >
              Mural
            </Text>
            <Text className="text-body text-muted">
              Notas e tarefas em um só lugar.
            </Text>
            <Button
              quiet
              label="Sair"
              disabled={logout.isPending}
              onPress={() => logout.mutate()}
            />
            {logout.isError && (
              <Text className="text-danger">
                Não foi possível sair. Tente novamente.
              </Text>
            )}
          </View>

          <Card className="gap-md p-lg">
            <Text
              accessibilityRole="header"
              className="text-heading font-bold text-ink"
            >
              Nota rápida
            </Text>
            <Input
              accessibilityLabel="Nota rápida"
              editable={!!noteList && !saveNote.isPending}
              maxLength={10000}
              multiline
              onChangeText={setNote}
              placeholder={
                noteList
                  ? 'Escreva uma nota…'
                  : 'Crie uma lista para salvar notas'
              }
              value={note}
            />
            {noteList && (
              <View className="gap-sm">
                <Text className="text-body text-muted">Salvar na lista</Text>
                <View className="flex-row flex-wrap gap-sm">
                  {lists.data?.map((list) => {
                    const selected = list.id === noteList.id;
                    return (
                      <Pressable
                        key={list.id}
                        accessibilityRole="radio"
                        accessibilityState={{
                          selected,
                          disabled: saveNote.isPending,
                        }}
                        onPress={() => setSelectedList(list.id)}
                        disabled={saveNote.isPending}
                        className={`min-h-tap min-w-tap max-w-full flex-row items-center gap-sm rounded-control border px-md py-sm ${selected ? 'border-brand-ink bg-subtle' : 'border-outline bg-surface'}`}
                      >
                        <ListColor color={list.color} />
                        <Text className="shrink text-caption text-ink">
                          {selected ? '✓ ' : ''}
                          {list.title}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}
            <Button
              label={saveNote.isPending ? 'Salvando…' : 'Salvar nota'}
              disabled={!noteList || !note.trim() || saveNote.isPending}
              onPress={() =>
                noteList &&
                saveNote.mutate({ listId: noteList.id, text: note.trim() })
              }
            />
            {saveNote.error && (
              <ErrorState
                error={saveNote.error}
                message="Não foi possível confirmar o salvamento da nota."
              />
            )}
          </Card>

          <View className="gap-md">
            <Text
              accessibilityRole="header"
              className="text-heading font-bold text-ink"
            >
              Minhas listas
            </Text>
            {lists.isPending && (
              <ActivityIndicator
                accessibilityLabel="Carregando listas"
                color={colors.brand}
              />
            )}
            {lists.error && (
              <ErrorState
                error={lists.error}
                message="Não foi possível carregar suas listas."
                retry={{
                  hasData: lists.data !== undefined,
                  refreshing: lists.isFetching,
                  onPress: () => void lists.refetch(),
                }}
              />
            )}
            {lists.data?.length === 0 && (
              <EmptyState message="Crie sua primeira lista abaixo." />
            )}
            {lists.data?.map((list) => (
              <Card key={list.id}>
                <Link
                  href={{ pathname: '/lists/[id]', params: { id: list.id } }}
                  asChild
                >
                  <Pressable
                    accessibilityRole="link"
                    className="min-h-row flex-row items-center gap-md rounded-card px-lg py-md active:bg-subtle"
                  >
                    <ListColor color={list.color} />
                    <Text className="shrink text-body font-semibold text-ink">
                      {list.title}
                    </Text>
                  </Pressable>
                </Link>
              </Card>
            ))}
          </View>

          <Card className="gap-md p-lg">
            <Text
              accessibilityRole="header"
              className="text-heading font-bold text-ink"
            >
              Nova lista
            </Text>
            <Input
              accessibilityLabel="Nome da lista"
              editable={!createList.isPending}
              maxLength={200}
              onChangeText={setTitle}
              placeholder="Nome da lista"
              value={title}
            />
            <Palette
              value={color}
              onChange={setColor}
              disabled={createList.isPending}
            />
            <Button
              label={createList.isPending ? 'Criando…' : 'Criar lista'}
              disabled={!title.trim() || createList.isPending}
              onPress={() => createList.mutate({ title: title.trim(), color })}
            />
            {createList.error && (
              <ErrorState
                error={createList.error}
                message="Não foi possível confirmar a criação da lista."
              />
            )}
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
