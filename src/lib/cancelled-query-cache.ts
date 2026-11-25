type IdentifiedRecord = { id: string };

export function replaceItemById<T extends IdentifiedRecord>(
  current: T[] | undefined,
  replacement: T,
): T[] | undefined {
  return current?.map((item) => item.id === replacement.id ? replacement : item);
}

export function replacePagedItemById<
  T extends IdentifiedRecord,
  TPage extends { data: T[] },
>(
  current: TPage | undefined,
  replacement: T,
): TPage | undefined {
  if (!current) return current;
  return { ...current, data: replaceItemById(current.data, replacement) ?? current.data };
}
