import type { Task } from './api';

export function reorderPending(tasks: Task[], ids: string[]) {
  const pending = new Map(
    tasks.filter((task) => !task.isChecked).map((task) => [task.id, task]),
  );
  if (ids.length !== pending.size || new Set(ids).size !== ids.length) return;

  const ordered = ids.map((id) => pending.get(id));
  if (!ordered.every((task) => task !== undefined)) return;

  const slots = tasks.map((task) => task.position);
  const hasTies = new Set(slots).size !== slots.length;
  const positions: Pick<Task, 'id' | 'position'>[] = [];
  let pendingIndex = 0;
  const reordered = tasks.map((current, index) => {
    const task = current.isChecked ? current : ordered[pendingIndex++];
    const position = hasTies ? index : slots[index];
    if (task.position === position) return task;
    positions.push({ id: task.id, position });
    return { ...task, position };
  });

  if (positions.length) return { tasks: reordered, positions };
}
