import { describe, expect, it } from 'vitest';
import type { Task } from './api';
import { reorderPending } from './reorder-pending';

function task(id: string, position: number, isChecked = false): Task {
  return {
    id,
    position,
    isChecked,
    title: id,
    notes: null,
    priority: 'MEDIUM',
  };
}

describe('reorderPending', () => {
  const tasks = [task('a', 1), task('done', 4, true), task('b', 9)];

  it('reordena as pendentes preservando a posição da concluída', () => {
    const result = reorderPending(tasks, ['b', 'a']);
    expect(result?.tasks).toEqual([
      task('b', 1),
      task('done', 4, true),
      task('a', 9),
    ]);
    expect(result?.positions).toEqual([
      { id: 'b', position: 1 },
      { id: 'a', position: 9 },
    ]);
  });

  it('ignora a mesma ordem e resultados de arraste desatualizados', () => {
    for (const ids of [['a', 'b'], ['a'], ['a', 'a'], ['a', 'done']]) {
      expect(reorderPending(tasks, ids)).toBeUndefined();
    }
  });

  it('normaliza posições empatadas para preservar a nova ordem após recarregar', () => {
    const tied = [task('a', 0), task('done', 0, true), task('b', 0)];
    expect(reorderPending(tied, ['b', 'a'])?.tasks).toEqual([
      task('b', 0),
      task('done', 1, true),
      task('a', 2),
    ]);
  });
});
