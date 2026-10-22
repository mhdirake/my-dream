export function replaceUnansweredPrompts<T extends { id: number }>(
  shown: T[], answers: Record<number, string>, replacements: T[],
): T[] {
  const used = new Set(shown.map(prompt => prompt.id));
  const fresh = replacements.filter(prompt => {
    if (used.has(prompt.id)) return false;
    used.add(prompt.id);
    return true;
  });
  let next = 0;
  return shown.map(prompt => answers[prompt.id]?.trim() ? prompt : fresh[next++] ?? prompt);
}
