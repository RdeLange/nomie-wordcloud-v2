// The word clouds: the presets, how a cloud counts its words, and how big each word is drawn.
// The screens only show what this module works out.
import emotions from './data/emotions.json';
import virtues from './data/virtues.json';

export type Kind = 'emotions' | 'virtues' | 'persons' | 'custom';

export type Cloud = {
  // the id is what a dashboard widget points at (its widget index), so presets keep the ids of v1: 1, 2 and 3
  id: string;
  kind: Kind;
  name: string;
  description: string;
  emoji: string;
  // the colour of the words
  color: string;
  // how many days of notes the words are counted in
  days: number;
  // the words of a custom cloud
  keywords: string[];
};

export type Word = { text: string; count: number };

export const DAY_CHOICES = [10, 20, 30, 60, 90];
export const KIND_NAMES: Record<Kind, string> = { emotions: 'Emotions', virtues: 'Virtues', persons: 'Persons', custom: 'Custom' };
export const COLOURS = ['#C47ADA', '#FF2D55', '#FF9500', '#34C759', '#00C7BE', '#007AFF', '#5856D6', '#AF52DE', '#A2845E', '#8E8E93', '#FF3B30', '#30B0C7'];
// the people in notes are looked up over this many days, as in v1
export const PEOPLE_DAYS = 90;

const KINDS: Kind[] = ['emotions', 'virtues', 'persons', 'custom'];
const TERMS: Record<'emotions' | 'virtues', string[]> = { emotions, virtues };

const PRESETS: Array<Omit<Cloud, 'id'>> = [
  { kind: 'emotions', name: 'Emotions', description: 'The words for feelings in your notes', emoji: '🥴', color: '#C47ADA', days: 90, keywords: [] },
  { kind: 'virtues', name: 'Virtues', description: 'The virtues you write about', emoji: '✋', color: '#C47ADA', days: 90, keywords: [] },
  { kind: 'persons', name: 'Persons', description: 'The people in your notes. Tap a name to write a note about them', emoji: '👨‍👩‍👧‍👦', color: '#C47ADA', days: 90, keywords: [] },
];

// The starter a new user can pick, as in v1
export const KICK_STARTER: Omit<Cloud, 'id'> = { kind: 'custom', name: 'Kick Starter', description: 'A simple word cloud to start with', emoji: '𓇬', color: '#C47ADA', days: 90, keywords: ['Nomie', 'Wordcloud'] };

// The three clouds a new user starts with
export const defaultClouds = (): Cloud[] => PRESETS.map((preset, i) => ({ ...preset, id: String(i + 1) }));

// A new cloud of a kind, not yet saved, with the next free id
export const newCloud = (base: Omit<Cloud, 'id'>, clouds: Cloud[]): Cloud => ({ ...base, id: nextId(clouds), keywords: [...base.keywords] });

export const nextId = (clouds: Cloud[]): string => String(Math.max(0, ...clouds.map((c) => Number(c.id) || 0)) + 1);

const isColour = (value: unknown): value is string => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);

// Reads the saved clouds. Anything that is not well formed is left out; no clouds at all gives the three presets.
export const normaliseClouds = (saved: unknown): Cloud[] => {
  if (!Array.isArray(saved) || saved.length === 0) return defaultClouds();
  return saved.flatMap((c: any): Cloud[] => {
    if (!c || typeof c.id !== 'string' || !KINDS.includes(c.kind)) return [];
    const kind = c.kind as Kind;
    return [
      {
        id: c.id,
        kind,
        name: String(c.name ?? '').trim() || KIND_NAMES[kind],
        description: String(c.description ?? ''),
        emoji: String(c.emoji ?? '').trim() || '☁️',
        color: isColour(c.color) ? c.color : COLOURS[0],
        days: DAY_CHOICES.includes(Number(c.days)) ? Number(c.days) : 90,
        keywords: Array.isArray(c.keywords) ? c.keywords.filter((k: unknown): k is string => typeof k === 'string' && k.trim() !== '').map((k: string) => k.trim()) : [],
      },
    ];
  });
};

// The words typed in the editor, comma separated. Empty words and repeats are dropped.
export const keywordsFrom = (text: string): string[] => [...new Set(text.split(',').map((k) => k.trim()).filter((k) => k !== ''))];

// The first thing wrong with a cloud, or null when it can be saved
export const cloudProblem = (cloud: Cloud): string | null => {
  if (!cloud.name.trim()) return 'Give the word cloud a name.';
  // the widget settings of the dashboard need a name and an emoji for every cloud
  if (!cloud.emoji.trim()) return 'Choose an emoji for the word cloud.';
  if (cloud.kind === 'custom' && cloud.keywords.length === 0) return 'Add at least one word.';
  return null;
};

// The people named in notes, each once
export const peopleIn = (notes: Array<{ elements?: Array<{ type: string; id: string }> }>): string[] => [
  ...new Set(notes.flatMap((note) => (note.elements ?? []).filter((e) => e.type === 'person').map((e) => e.id))),
];

// The words a cloud counts: its presets, its own words, or the people in the notes
export const termsOf = (cloud: Cloud, people: string[] = []): string[] => {
  if (cloud.kind === 'persons') return people;
  if (cloud.kind === 'custom') return cloud.keywords;
  return TERMS[cloud.kind];
};

// Counts each word over the cloud's days. Words that are not in the notes are left out; the most counted come first.
export const countWords = async (terms: string[], countOf: (term: string) => Promise<number>): Promise<Word[]> => {
  const words: Word[] = [];
  for (const text of terms) {
    const count = await countOf(text);
    if (count > 0) words.push({ text, count });
  }
  return words.sort((a, b) => b.count - a.count || a.text.localeCompare(b.text));
};

// How much of the largest word a word is, from 0 to 1
export const weightOf = (count: number, largest: number): number => (largest > 0 ? count / largest : 0);

// The size of a word, in the smaller side of the widget (the widget scales its text to that side)
export const sizeOf = (weight: number): number => 8 + 10 * weight;

// Tapping a person's name starts a note about them, as in v1
export const personNote = (name: string): string => `@${name.toLowerCase()} `;
