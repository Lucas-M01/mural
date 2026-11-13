import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  api,
  listsQuery,
  priorityLabels,
  tasksQuery,
  type Priority,
} from '../src/api';
import { Eyebrow } from '../src/focus';
import { useTheme } from '../src/theme';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  ListColor,
} from '../src/ui';

const priorities: Priority[] = ['HIGH', 'MEDIUM', 'LOW'];

export default function NewTaskScreen() {
  const router = useRouter();
  const lists = useQuery(listsQuery);
  const client = useQueryClient();
  const { colors } = useTheme();
  const [listId, setListId] = useState<string>();
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [priority, setPriority] = useState<Priority>('MEDIUM');
  const selected =
    lists.data?.find(({ id }) => id === listId) ?? lists.data?.[0];
  const save = useMutation({
    mutationFn: (id: string) =>
      api.createTask(id, {
        title: title.trim(),
        notes: notes.trim() || undefined,
        priority,
      }),
    onSuccess: async (_, id) => {
      await client.invalidateQueries({ queryKey: tasksQuery(id).queryKey });
      if (router.canGoBack()) router.back();
      else router.replace('/');
    },
  });

  return (
    <SafeAreaView edges={['bottom']} className="flex-1 bg-canvas">
      <ScrollView keyboardShouldPersistTaps="handled">
        <View className="gap-xl p-xl">
          <Input
            accessibilityLabel="Título da tarefa"
            placeholder="O que precisa ser feito?"
            value={title}
            onChangeText={setTitle}
            maxLength={200}
            editable={!save.isPending}
          />
          <Input
            accessibilityLabel="Descrição"
            placeholder="Adicione uma descrição…"
            value={notes}
            onChangeText={setNotes}
            maxLength={10000}
            multiline
            editable={!save.isPending}
          />
          <Card className="gap-md p-lg">
            <Eyebrow>Prioridade</Eyebrow>
            <View className="flex-row gap-sm">
              {priorities.map((value) => (
                <Pressable
                  key={value}
                  accessibilityRole="radio"
                  accessibilityState={{
                    selected: priority === value,
                    disabled: save.isPending,
                  }}
                  disabled={save.isPending}
                  onPress={() => setPriority(value)}
                  className={`min-h-row flex-1 items-center justify-center rounded-control border ${priority === value ? 'border-brand bg-brand-surface' : 'border-outline bg-subtle'}`}
                >
                  <Text className="text-caption font-bold text-ink">
                    {priorityLabels[value]}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Card>
          <Card className="gap-md p-lg">
            <Eyebrow>Lista</Eyebrow>
            {lists.isPending && <ActivityIndicator color={colors.brand} />}
            {lists.error && (
              <ErrorState
                error={lists.error}
                message="Não foi possível carregar as listas."
                retry={{
                  hasData: !!lists.data,
                  refreshing: lists.isFetching,
                  onPress: () => void lists.refetch(),
                }}
              />
            )}
            {lists.data?.length === 0 && (
              <EmptyState message="Crie uma lista antes de adicionar uma tarefa." />
            )}
            <View className="flex-row flex-wrap gap-sm">
              {lists.data?.map((list) => (
                <Pressable
                  key={list.id}
                  accessibilityRole="radio"
                  accessibilityState={{
                    selected: selected?.id === list.id,
                    disabled: save.isPending,
                  }}
                  disabled={save.isPending}
                  onPress={() => setListId(list.id)}
                  className={`min-h-tap max-w-full flex-row items-center gap-sm rounded-pill border px-md ${selected?.id === list.id ? 'border-brand bg-brand-surface' : 'border-outline bg-subtle'}`}
                >
                  <ListColor color={list.color} />
                  <Text className="shrink text-ink">{list.title}</Text>
                </Pressable>
              ))}
            </View>
          </Card>
          <Button
            label={save.isPending ? 'Criando…' : 'Criar tarefa'}
            disabled={!title.trim() || !selected || save.isPending}
            onPress={() => selected && save.mutate(selected.id)}
          />
          {save.error && (
            <ErrorState
              error={save.error}
              message="Não foi possível criar a tarefa."
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
