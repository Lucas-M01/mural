import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { Link } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import {
  api,
  listsQuery,
  profileQuery,
  tasksQuery,
  priorityLabels,
} from '../src/api';
import { Eyebrow, FocusScreen, Progress } from '../src/focus';
import { useTheme } from '../src/theme';
import { Card, Checkbox, EmptyState, ErrorState, ListColor } from '../src/ui';

const ranks = { HIGH: 0, MEDIUM: 1, LOW: 2 };

export default function Dashboard() {
  const lists = useQuery(listsQuery);
  const profile = useQuery(profileQuery);
  const client = useQueryClient();
  const { colors } = useTheme();
  const queries = useQueries({
    queries: (lists.data ?? []).map(({ id }) => tasksQuery(id)),
  });
  const tasks = (lists.data ?? []).flatMap((list, index) =>
    (queries[index]?.data ?? []).map((task) => ({ ...task, list })),
  );
  const ready =
    lists.isSuccess && queries.every((query) => query.data !== undefined);
  const error = lists.error ?? queries.find((query) => query.error)?.error;
  const completed = tasks.filter(({ isChecked }) => isChecked).length;
  const pending = tasks
    .filter(({ isChecked }) => !isChecked)
    .sort((a, b) => ranks[a.priority] - ranks[b.priority]);
  const percentage = tasks.length
    ? Math.round((100 * completed) / tasks.length)
    : 0;
  const toggle = useMutation({
    mutationFn: ({ id }: { id: string; listId: string }) => api.toggleTask(id),
    onSettled: (_, __, { listId }) =>
      client.invalidateQueries({ queryKey: tasksQuery(listId).queryKey }),
  });

  return (
    <FocusScreen
      active="/"
      action={
        <Link href={lists.data?.length ? '/new-task' : '/lists'} asChild>
          <Pressable className="min-h-tap justify-center rounded-control bg-brand px-lg">
            <Text className="font-bold text-on-brand">
              {lists.data?.length ? '+ Tarefa' : 'Ver listas'}
            </Text>
          </Pressable>
        </Link>
      }
    >
      <View className="gap-xs">
        <Text className="text-eyebrow font-semibold uppercase tracking-widest text-brand-ink">
          {new Intl.DateTimeFormat('pt-BR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          }).format(new Date())}
        </Text>
        <Text
          accessibilityRole="header"
          className="text-display font-bold text-ink"
        >
          {profile.data
            ? `Olá, ${profile.data.name.split(' ')[0]}`
            : 'Seu painel'}
        </Text>
      </View>
      {error && (
        <ErrorState
          error={error}
          message="Não foi possível carregar o painel."
          retry={{
            hasData: ready,
            refreshing:
              lists.isFetching || queries.some((query) => query.isFetching),
            onPress: () =>
              void client.invalidateQueries({ queryKey: listsQuery.queryKey }),
          }}
        />
      )}
      {!ready && !error && (
        <ActivityIndicator
          accessibilityLabel="Carregando painel"
          color={colors.brand}
        />
      )}
      {ready && (
        <Card className="gap-lg p-xl">
          <View className="flex-row items-center justify-between gap-md">
            <Text className="text-heading font-bold text-ink">
              Progresso geral
            </Text>
            <Text className="text-display font-bold text-brand-ink">
              {percentage}%
            </Text>
          </View>
          <Progress value={percentage} />
          <View className="flex-row gap-xl">
            <View>
              <Text className="text-caption text-muted">Concluídas</Text>
              <Text className="text-heading font-bold text-ink">
                {completed}
              </Text>
            </View>
            <View>
              <Text className="text-caption text-muted">Pendentes</Text>
              <Text className="text-heading font-bold text-ink">
                {pending.length}
              </Text>
            </View>
          </View>
        </Card>
      )}
      {!!lists.data?.length && (
        <View className="gap-md">
          <Eyebrow>Listas</Eyebrow>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-sm">
              {lists.data.map((list) => (
                <Link
                  key={list.id}
                  href={{ pathname: '/lists/[id]', params: { id: list.id } }}
                  asChild
                >
                  <Pressable className="min-h-tap flex-row items-center gap-sm rounded-control border border-outline bg-surface px-md">
                    <ListColor color={list.color} />
                    <Text className="font-semibold text-ink">{list.title}</Text>
                  </Pressable>
                </Link>
              ))}
            </View>
          </ScrollView>
        </View>
      )}
      {ready && (
        <View className="gap-md">
          <Eyebrow>Tarefas prioritárias</Eyebrow>
          {toggle.error && (
            <ErrorState
              error={toggle.error}
              message="Não foi possível atualizar a tarefa."
            />
          )}
          {!pending.length && (
            <EmptyState
              message={
                lists.data?.length
                  ? 'Nenhuma tarefa pendente.'
                  : 'Crie uma lista para adicionar tarefas.'
              }
            />
          )}
          {pending.slice(0, 5).map((task) => (
            <Card key={task.id} className="flex-row items-center pr-md">
              <Checkbox
                checked={false}
                disabled={toggle.isPending}
                label={`Concluir ${task.title}`}
                onPress={() =>
                  toggle.mutate({ id: task.id, listId: task.list.id })
                }
              >
                <View className="flex-1">
                  <Text className="text-body text-ink">{task.title}</Text>
                  <Text className="text-caption text-muted">
                    {task.list.title}
                  </Text>
                </View>
              </Checkbox>
              <Text
                className={`rounded-control px-sm py-xs text-eyebrow font-bold uppercase ${task.priority === 'HIGH' ? 'bg-danger-surface text-danger' : 'bg-brand-surface text-brand-ink'}`}
              >
                {priorityLabels[task.priority]}
              </Text>
            </Card>
          ))}
        </View>
      )}
    </FocusScreen>
  );
}
