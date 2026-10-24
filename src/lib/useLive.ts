import { useLiveQuery } from 'dexie-react-hooks';

const remembered = new Map<string, unknown>();

/**
 * Like Dexie's useLiveQuery (data that updates itself when the database changes), but remembers the last result.
 * Reading the database takes a moment, so without this every screen showed blank for a split second each time you
 * opened it. Now a screen you've seen before appears straight away and quietly refreshes.
 */
export function useLive<T>(key: string, query: () => Promise<T> | T, deps: unknown[] = []): T | undefined {
  const result = useLiveQuery(query, deps);
  const fullKey = key + JSON.stringify(deps);
  if (result !== undefined) remembered.set(fullKey, result);
  return result ?? (remembered.get(fullKey) as T | undefined);
}
