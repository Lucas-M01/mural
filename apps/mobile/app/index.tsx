import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, listsQuery, tasksQuery } from '../src/api';
import { Button, ErrorMessage, Palette, QueryWarning } from '../src/ui';

export default function HomeScreen() {
  const client = useQueryClient();
  const lists = useQuery(listsQuery);
  const [title, setTitle] = useState('');
  const [color, setColor] = useState('#FFFFFF');
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
    <SafeAreaView className="flex-1 bg-[#FFF9E8]">
      <ScrollView keyboardShouldPersistTaps="handled">
        <View className="gap-5 p-5">
          <View>
            <Text
              accessibilityRole="header"
              className="text-4xl font-bold text-stone-900"
            >
              Mural
            </Text>
            <Text className="mt-1 text-base text-stone-700">
              Notas e tarefas
            </Text>
          </View>

          <View className="gap-3 rounded-2xl bg-white p-4">
            <Text
              accessibilityRole="header"
              className="text-xl font-bold text-stone-900"
            >
              Nota rápida
            </Text>
            <TextInput
              accessibilityLabel="Nota rápida"
              className="min-h-20 rounded-xl border border-stone-300 px-3 py-2 text-base text-stone-900"
              editable={!!noteList && !saveNote.isPending}
              maxLength={10000}
              multiline
              onChangeText={setNote}
              placeholder={
                noteList
                  ? 'Escreva uma nota…'
                  : 'Crie uma lista para salvar notas'
              }
              placeholderTextColor="#78716C"
              textAlignVertical="top"
              value={note}
            />
            {noteList && (
              <View className="gap-2">
                <Text className="text-stone-700">Salvar na lista</Text>
                <View className="flex-row flex-wrap gap-2">
                  {lists.data?.map((list) => {
                    const selected = list.id === noteList.id;
                    return (
                      <Pressable
                        key={list.id}
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                        onPress={() => setSelectedList(list.id)}
                        disabled={saveNote.isPending}
                        className="min-h-11 justify-center rounded-xl border border-stone-300 px-3"
                        style={{ backgroundColor: list.color }}
                      >
                        <Text className="text-stone-900">
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
              <ErrorMessage
                error={saveNote.error}
                message="Não foi possível confirmar o salvamento da nota."
              />
            )}
          </View>

          <View className="gap-3">
            <Text
              accessibilityRole="header"
              className="text-xl font-bold text-stone-900"
            >
              Minhas listas
            </Text>
            {lists.isPending && (
              <ActivityIndicator accessibilityLabel="Carregando listas" />
            )}
            {lists.error && (
              <QueryWarning
                error={lists.error}
                message="Não foi possível carregar suas listas."
                hasData={lists.data !== undefined}
                refreshing={lists.isFetching}
                retry={() => void lists.refetch()}
              />
            )}
            {lists.data?.length === 0 && (
              <Text className="text-stone-700">
                Crie sua primeira lista abaixo.
              </Text>
            )}
            {lists.data?.map((list) => (
              <Link
                key={list.id}
                href={{ pathname: '/lists/[id]', params: { id: list.id } }}
                asChild
              >
                <Pressable
                  accessibilityRole="link"
                  className="min-h-14 justify-center rounded-xl border border-stone-300 px-4 py-3"
                  style={{ backgroundColor: list.color }}
                >
                  <Text className="text-lg font-semibold text-stone-900">
                    {list.title}
                  </Text>
                </Pressable>
              </Link>
            ))}
          </View>

          <View className="gap-3 rounded-2xl bg-white p-4">
            <Text
              accessibilityRole="header"
              className="text-xl font-bold text-stone-900"
            >
              Nova lista
            </Text>
            <TextInput
              accessibilityLabel="Nome da lista"
              className="min-h-11 rounded-xl border border-stone-300 px-3 text-base text-stone-900"
              editable={!createList.isPending}
              maxLength={200}
              onChangeText={setTitle}
              placeholder="Nome da lista"
              placeholderTextColor="#78716C"
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
              <ErrorMessage
                error={createList.error}
                message="Não foi possível confirmar a criação da lista."
              />
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
