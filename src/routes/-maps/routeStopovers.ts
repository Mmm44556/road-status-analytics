/** 依拖曳前後索引重新排列途經點。 */
export function moveStopoverToIndex<T>(
  items: T[],
  fromIndex: number,
  toIndex: number,
): T[] {
  const isInvalidIndex =
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= items.length ||
    toIndex >= items.length;
  if (isInvalidIndex || fromIndex === toIndex) return items;
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

/** 讓鍵盤與觸控使用者一次上移或下移一個途經點。 */
export function moveStopover<T extends { id: string }>(
  items: T[],
  activeId: string,
  offset: -1 | 1,
): T[] {
  const fromIndex = items.findIndex(({ id }) => id === activeId);
  const toIndex = fromIndex + offset;
  if (fromIndex < 0 || toIndex < 0 || toIndex >= items.length) return items;
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}
