import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import Animated, { useAnimatedRef } from 'react-native-reanimated';
import Sortable from 'react-native-sortables';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, listsQuery, tasksQuery, type Task } from '../../src/api';
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

function reorderChange(tasks: Task[]): ChecklistChange {
  const slots = tasks.map((task) => task.position).sort((a, b) => a - b);
  const hasTies = new Set(slots).size !== slots.length;
  const positions: Pick<Task, 'id' | 'position'>[] = [];
  const reordered = tasks.map((task, index) => {
    const position = hasTies ? index : slots[index];
    if (task.position === position) return task;
    positions.push({ id: task.id, position });
    return { ...task, position };
  });
  return { action: 'reorder', tasks: reordered, positions };
}

export default function ListScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const client = useQueryClient();
  const lists = useQuery(listsQuery);
  const list = lists.data?.find((item) => item.id === id);
  const query = tasksQuery(id);
  const tasks = useQuery(query);
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
      if (change.action !== 'reorder') return;
      await client.cancelQueries({ queryKey: query.queryKey });
      const previous = client.getQueryData(query.queryKey);
      client.setQueryData(query.queryKey, change.tasks);
      return previous;
    },
    onSuccess: (_, change) => {
      if (change.action === 'create') setTitle('');
      return client.invalidateQueries({ queryKey: query.queryKey });
    },
    onError: (_, change, previous) => {
      if (change.action === 'reorder')
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

  const disabled = dragging || checklist.isPending;
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
                disabled={changeColor.isPending}
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
          {tasks.data?.length === 0 && (
            <EmptyState message="Esta lista ainda não tem tarefas." />
          )}
          {tasks.data && tasks.data.length > 0 && (
            <>
              {tasks.data.length > 1 && (
                <Text className="text-body text-muted">
                  Segure a alça ☰ e arraste para reordenar.
                </Text>
              )}
              <Sortable.Grid
                columns={1}
                customHandle
                data={tasks.data}
                dragActivationDelay={180}
                keyExtractor={(task) => task.id}
                onDragStart={() => setDragging(true)}
                onDragEnd={({ data, fromIndex, toIndex }) => {
                  setDragging(false);
                  if (fromIndex !== toIndex)
                    checklist.mutate(reorderChange(data));
                }}
                overDrag="vertical"
                rowGap={tokens.spacing.sm}
                scrollableRef={scrollRef}
                sortEnabled={!checklist.isPending && tasks.data.length > 1}
                renderItem={({ item }) => (
                  <Card className="flex-row items-center">
                    <Checkbox
                      label={item.title}
                      checked={item.isChecked}
                      disabled={disabled}
                      onPress={() =>
                        checklist.mutate({ action: 'toggle', id: item.id })
                      }
                    >
                      <View className="flex-1">
                        <Text
                          className={
                            item.isChecked
                              ? 'text-body text-muted line-through'
                              : 'text-body text-ink'
                          }
                        >
                          {item.title}
                        </Text>
                        {item.notes && item.notes !== item.title && (
                          <Text className="mt-xs text-caption text-muted">
                            {item.notes}
                          </Text>
                        )}
                      </View>
                    </Checkbox>
                    <Sortable.Handle>
                      <View className="min-h-tap min-w-tap items-center justify-center">
                        <Text className="text-heading text-muted">☰</Text>
                      </View>
                    </Sortable.Handle>
                  </Card>
                )}
              />
            </>
          )}
        </View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
}
