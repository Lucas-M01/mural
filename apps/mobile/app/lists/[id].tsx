import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { useAnimatedRef } from 'react-native-reanimated';
import Sortable from 'react-native-sortables';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, listsQuery, tasksQuery, type Task } from '../../src/api';
import { RequestError } from '../../src/request-error';
import { Button, ErrorMessage, Palette, QueryWarning } from '../../src/ui';

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
      className="flex-1 bg-[#FFF9E8]"
    >
      <Stack.Screen options={{ title: list?.title ?? 'Lista' }} />
      <Animated.ScrollView ref={scrollRef} keyboardShouldPersistTaps="handled">
        <View className="gap-4 p-5">
          {lists.error && (
            <QueryWarning
              error={lists.error}
              message="Não foi possível carregar os detalhes da lista."
              hasData={list !== undefined}
              refreshing={lists.isFetching}
              retry={() => void lists.refetch()}
            />
          )}
          {list && (
            <View
              className="gap-3 rounded-2xl border border-stone-300 p-4"
              style={{ backgroundColor: list.color }}
            >
              <Text className="text-base font-semibold text-stone-900">
                Cor da lista
              </Text>
              <Palette
                value={list.color}
                disabled={changeColor.isPending}
                onChange={(color) =>
                  color !== list.color && changeColor.mutate(color)
                }
              />
              {changeColor.error && (
                <ErrorMessage
                  error={changeColor.error}
                  message="Não foi possível confirmar a mudança de cor."
                />
              )}
            </View>
          )}
          <View className="gap-3 rounded-2xl bg-white p-4">
            <TextInput
              accessibilityLabel="Nova tarefa"
              className="min-h-11 rounded-xl border border-stone-300 px-3 text-base text-stone-900"
              editable={!disabled && !!tasks.data}
              maxLength={200}
              onChangeText={setTitle}
              placeholder="Nova tarefa"
              placeholderTextColor="#78716C"
              value={title}
            />
            <Button
              label="Adicionar tarefa"
              disabled={disabled || !tasks.data || !title.trim()}
              onPress={() =>
                checklist.mutate({ action: 'create', title: title.trim() })
              }
            />
          </View>
          {checklist.error && checklist.variables && (
            <ErrorMessage
              error={checklist.error}
              message={checklistErrors[checklist.variables.action]}
            />
          )}
          {tasks.isPending && (
            <ActivityIndicator accessibilityLabel="Carregando tarefas" />
          )}
          {tasks.error && (
            <QueryWarning
              error={tasks.error}
              message="Não foi possível carregar as tarefas."
              hasData={tasks.data !== undefined}
              refreshing={tasks.isFetching}

              retry={() => void tasks.refetch()}
            />
          )}
          {tasks.data?.length === 0 && (
            <Text className="text-stone-700">
              Esta lista ainda não tem tarefas.
            </Text>
          )}
          {tasks.data && tasks.data.length > 0 && (
            <>
              {tasks.data.length > 1 && (
                <Text className="text-stone-700">
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
                rowGap={8}
                scrollableRef={scrollRef}
                sortEnabled={!checklist.isPending && tasks.data.length > 1}
                renderItem={({ item }) => (
                  <View className="flex-row items-center rounded-xl border border-stone-200 bg-white">
                    <Pressable
                      accessibilityLabel={item.title}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: item.isChecked, disabled }}
                      className="min-h-14 flex-1 flex-row items-center gap-3 p-3"
                      disabled={disabled}
                      onPress={() =>
                        checklist.mutate({ action: 'toggle', id: item.id })
                      }
                    >
                      <View className="h-6 w-6 items-center justify-center rounded border border-stone-500">
                        {item.isChecked && (
                          <Text className="font-bold text-stone-900">✓</Text>
                        )}
                      </View>
                      <View className="flex-1">
                        <Text
                          className={
                            item.isChecked
                              ? 'text-base text-stone-600 line-through'
                              : 'text-base text-stone-900'
                          }
                        >
                          {item.title}
                        </Text>
                        {item.notes && item.notes !== item.title && (
                          <Text className="mt-1 text-stone-700">
                            {item.notes}
                          </Text>
                        )}
                      </View>
                    </Pressable>
                    <Sortable.Handle>
                      <View className="h-12 w-12 items-center justify-center">
                        <Text className="text-xl text-stone-600">☰</Text>
                      </View>
                    </Sortable.Handle>
                  </View>
                )}
              />
            </>
          )}
        </View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
}
