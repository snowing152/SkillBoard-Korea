/**
 * Up to two initials for the avatar placeholder: first letter of the first two words ("Alina Petrova"
 * → "AP"), or the first letter of a single word. Counts code points, so Hangul and Cyrillic work
 * ("김민준" → "김", "Анна" → "А"); empty input gives "" and the avatar shows its icon.
 */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return words
    .slice(0, 2)
    .map((word) => Array.from(word)[0] ?? '')
    .join('')
    .toLocaleUpperCase();
}
