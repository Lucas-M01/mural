import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
import { ActivityIndicator, Alert, Text, View } from 'react-native';
import Animated, { useAnimatedRef } from 'react-native-reanimated';
import Sortable from 'react-native-sortables';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, listsQuery, tasksQuery, type Task } from '../../src/api';
import { reorderPending } from '../../src/reorder-pending';
import { RequestError } from '../../src/request-error';
import { useTheme } from '../../src/theme';
import tokens from '../../src/tokens.json';
import {
  Button,
  Card,
  Checkbox,
  EmptyState,
  ErrorState,
  Input,
  ListColor,
  Palette,
} from '../../src/ui';

type ChecklistChange =
  | { action: 'create'; title: string }
  | { action: 'toggle'; id: string }
  | {
      action: 'reorder';
      tasks: Task[];
      positions: Pick<Task, 'id' | 'position'>[];
    };

const checklistErrors = {
  create: 'Não foi possível confirmar a criação da tarefa.',
  toggle: 'Não foi possível confirmar a marcação da tarefa.',
  reorder: 'Não foi possível confirmar a nova ordem.',
};

function TaskRow({
  item,
  disabled,
  onToggle,
  children,
}: {
  item: Task;
  disabled: boolean;
  onToggle: () => void;
  children?: ReactNode;
}) {
  return (
    <Card className="flex-row items-center">
      <Checkbox
        label={item.title}
        checked={item.isChecked}
        disabled={disabled}
        onPress={onToggle}
      >
        <View className="flex-1">
          <Text
            className={
              item.isChecked
                ? 'text-body text-completed line-through'
                : 'text-body text-ink'
            }
          >
            {item.title}
          </Text>
          {item.notes && item.notes !== item.title && (
            <Text
              className={
                item.isChecked
                  ? 'mt-xs text-caption text-completed'
                  : 'mt-xs text-caption text-muted'
              }
            >
              {item.notes}
            </Text>
          )}
        </View>
      </Checkbox>
      {children}
    </Card>
  );
}

export default function ListScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const router = useRouter();
  const client = useQueryClient();
  const lists = useQuery(listsQuery);
  const list = lists.data?.find((item) => item.id === id);
  const query = tasksQuery(id);
  const tasks = useQuery(query);
  const pending = useMemo(
    () => tasks.data?.filter((task) => !task.isChecked) ?? [],
    [tasks.data],
  );
  const completed = tasks.data?.filter((task) => task.isChecked) ?? [];
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const [title, setTitle] = useState('');
  const [dragging, setDragging] = useState(false);

  const checklist = useMutation({
    mutationFn: (change: ChecklistChange) => {
      switch (change.action) {
        case 'create':
          return api.createTask(id, { title: change.title });
        case 'toggle':
          return api.toggleTask(change.id);
        case 'reorder':
          if (change.positions.length > 100) {
            throw new RequestError({ kind: 'reorder-limit' });
          }
          return api.reorderTasks(change.positions);
      }
    },
    onMutate: async (change) => {
      if (change.action === 'create') return;
      await client.cancelQueries({ queryKey: query.queryKey });
      const previous = client.getQueryData(query.queryKey);
      client.setQueryData(
        query.queryKey,
        change.action === 'reorder'
          ? change.tasks
          : previous?.map((task) =>
              task.id === change.id
                ? { ...task, isChecked: !task.isChecked }
                : task,
            ),
      );
      return previous;
    },
    onSuccess: (_, change) => {
      if (change.action === 'create') setTitle('');
      return client.invalidateQueries({ queryKey: query.queryKey });
    },
    onError: (_, change, previous) => {
      if (change.action !== 'create')
        client.setQueryData(query.queryKey, previous);
      void client.invalidateQueries({ queryKey: query.queryKey });
    },
  });

  const changeColor = useMutation({
    mutationFn: (color: string) => api.updateColor(id, color),
    onSuccess: (updated) => {
      client.setQueryData(listsQuery.queryKey, (current) =>
        current?.map((item) => (item.id === id ? updated : item)),
      );
    },
  });

  const removeList = useMutation({
    mutationFn: () => api.deleteList(id),
    onSuccess: async () => {
      const filter = { queryKey: listsQuery.queryKey, exact: true };
      await client.cancelQueries(filter);
      client.setQueryData(listsQuery.queryKey, (current) =>
        current?.filter((item) => item.id !== id),
      );
      void client.invalidateQueries(filter);
      router.dismissTo('/');
    },
  });

  const disabled = dragging || checklist.isPending || removeList.isPending;
  function confirmRemoval() {
    if (!list) return;
    Alert.alert(
      'Apagar lista?',
      `A lista “${list.title}” e todas as tarefas dela serão apagadas.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar lista',
          style: 'destructive',
          onPress: () => removeList.mutate(),
        },
      ],
    );
  }
  return (
    <SafeAreaView
      edges={['bottom', 'left', 'right']}
      className="flex-1 bg-canvas"
    >
      <Stack.Screen options={{ title: list?.title ?? 'Lista' }} />
      <Animated.ScrollView ref={scrollRef} keyboardShouldPersistTaps="handled">
        <View className="gap-lg p-xl">
          {lists.error && (
            <ErrorState
              error={lists.error}
              message="Não foi possível carregar os detalhes da lista."
              retry={{
                hasData: list !== undefined,
                refreshing: lists.isFetching,
                onPress: () => void lists.refetch(),
              }}
            />
          )}
          {list && (
            <Card className="gap-md p-lg">
              <View className="flex-row items-center gap-sm">
                <ListColor color={list.color} />
                <Text className="text-body font-semibold text-ink">
                  Cor da lista
                </Text>
              </View>
              <Palette
                value={list.color}
                disabled={changeColor.isPending || removeList.isPending}
                onChange={(color) =>
                  color !== list.color && changeColor.mutate(color)
                }
              />
              {changeColor.error && (
                <ErrorState
                  error={changeColor.error}
                  message="Não foi possível confirmar a mudança de cor."
                />
              )}
              <Button
                label={removeList.isPending ? 'Apagando…' : 'Apagar lista'}
                onPress={confirmRemoval}
                disabled={disabled || changeColor.isPending}
                busy={removeList.isPending}
                destructive
              />
              {removeList.error && (
                <ErrorState
                  error={removeList.error}
                  message="Não foi possível confirmar a exclusão da lista."
                />
              )}
            </Card>
          )}
          <Card className="gap-md p-lg">
            <Input
              accessibilityLabel="Nova tarefa"
              editable={!disabled && !!tasks.data}
              maxLength={200}
              onChangeText={setTitle}
              placeholder="Nova tarefa"
              value={title}
            />
            <Button
              label="Adicionar tarefa"
              disabled={disabled || !tasks.data || !title.trim()}
              onPress={() =>
                checklist.mutate({ action: 'create', title: title.trim() })
              }
            />
          </Card>
          {checklist.error && checklist.variables && (
            <ErrorState
              error={checklist.error}
              message={checklistErrors[checklist.variables.action]}
            />
          )}
          {tasks.isPending && (
            <ActivityIndicator
              accessibilityLabel="Carregando tarefas"
              color={colors.brand}
            />
          )}
          {tasks.error && (
            <ErrorState
              error={tasks.error}
              message="Não foi possível carregar as tarefas."
              retry={{
                hasData: tasks.data !== undefined,
                refreshing: tasks.isFetching,
                onPress: () => void tasks.refetch(),
              }}
            />
          )}
          {tasks.data && (
            <>
              <View className="gap-sm">
                <Text
                  accessibilityRole="header"
                  className="text-heading font-bold text-ink"
                >
                  A fazer · {pending.length}
                </Text>
                {pending.length === 0 ? (
                  <EmptyState
                    message={
                      completed.length
                        ? 'Tudo feito por aqui!'
                        : 'Esta lista ainda não tem tarefas.'
                    }
                  />
                ) : (
                  <>
                    {pending.length > 1 && (
                      <Text className="text-caption text-muted">
                        Segure a alça ☰ e arraste para reordenar.
                      </Text>
                    )}
                    <Sortable.Grid
                      columns={1}
                      customHandle
                      data={pending}
                      dragActivationDelay={180}
                      keyExtractor={(task) => task.id}
                      onDragStart={() => setDragging(true)}
                      onDragEnd={({ data, fromIndex, toIndex }) => {
                        setDragging(false);
                        if (fromIndex === toIndex) return;
                        const current = client.getQueryData(query.queryKey);
                        const change =
                          current &&
                          reorderPending(
                            current,
                            data.map((task) => task.id),
                          );
                        if (change)
                          checklist.mutate({ action: 'reorder', ...change });
                      }}
                      overDrag="vertical"
                      rowGap={tokens.spacing.sm}
                      scrollableRef={scrollRef}
                      sortEnabled={
                        !checklist.isPending &&
                        !removeList.isPending &&
                        pending.length > 1
                      }
                      renderItem={({ item }) => (
                        <TaskRow
                          item={item}
                          disabled={disabled}
                          onToggle={() =>
                            checklist.mutate({ action: 'toggle', id: item.id })
                          }
                        >
                          {pending.length > 1 && (
                            <Sortable.Handle>
                              <View className="min-h-tap min-w-tap items-center justify-center">
                                <Text className="text-heading text-brand-ink">
                                  ☰
                                </Text>
                              </View>
                            </Sortable.Handle>
                          )}
                        </TaskRow>
                      )}
                    />
                  </>
                )}
              </View>
              {completed.length > 0 && (
                <View className="gap-sm">
                  <Text
                    accessibilityRole="header"
                    className="text-heading font-bold text-completed"
                  >
                    Concluídas · {completed.length}
                  </Text>
                  {completed.map((item) => (
                    <TaskRow
                      key={item.id}
                      item={item}
                      disabled={disabled}
                      onToggle={() =>
                        checklist.mutate({ action: 'toggle', id: item.id })
                      }
                    />
                  ))}
                </View>
              )}
            </>
          )}
        </View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
}
