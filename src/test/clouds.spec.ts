import { describe, expect, it } from 'vitest';
import { cloudProblem, cloudHeight, countWords, defaultClouds, fittedLargest, wordPx, keywordsFrom, newCloud, normaliseClouds, peopleIn, personNote, termsOf, weightOf, KICK_STARTER, type Cloud } from '../clouds';
import emotions from '../data/emotions.json';
import virtues from '../data/virtues.json';

const custom = (over: Partial<Cloud> = {}): Cloud => ({ id: '4', kind: 'custom', name: 'Sport', description: '', emoji: '🏃', color: '#C47ADA', days: 30, keywords: ['running', 'tennis'], ...over });

describe('the presets', () => {
  it('start with three clouds with the ids of v1, so a dashboard widget still finds them', () => {
    const clouds = defaultClouds();
    expect(clouds.map((c) => [c.id, c.kind])).toEqual([
      ['1', 'emotions'],
      ['2', 'virtues'],
      ['3', 'persons'],
    ]);
  });

  it('count the emotion and virtue words of v1, each once', () => {
    expect(emotions.length).toBeGreaterThan(200);
    expect(new Set(emotions).size).toBe(emotions.length);
    expect(virtues).toContain('Gratitude');
  });

  it('a new cloud gets the next free id', () => {
    const clouds = defaultClouds();
    expect(newCloud(KICK_STARTER, clouds).id).toBe('4');
    expect(newCloud(KICK_STARTER, [custom({ id: '9' })]).id).toBe('10');
  });
});

describe('reading saved clouds', () => {
  it('no saved clouds gives the three presets', () => {
    expect(normaliseClouds(undefined)).toEqual(defaultClouds());
    expect(normaliseClouds([])).toEqual(defaultClouds());
  });

  it('keeps well formed clouds and fills in what is missing', () => {
    const [cloud] = normaliseClouds([{ id: '5', kind: 'custom', name: '  ', days: 45, color: 'red', keywords: [' a ', '', 3] }]);
    expect(cloud.name).toBe('Custom');
    expect(cloud.days).toBe(90);
    expect(cloud.color).toBe('#C47ADA');
    expect(cloud.keywords).toEqual(['a']);
  });

  it('leaves out a cloud without an id or a known kind', () => {
    expect(normaliseClouds([{ kind: 'custom' }, { id: '6', kind: 'nonsense' }])).toEqual([]);
  });
});

describe('the words', () => {
  it('splits typed words on commas, and drops empty words and repeats', () => {
    expect(keywordsFrom(' running, tennis ,, running,')).toEqual(['running', 'tennis']);
  });

  it('a custom cloud counts its own words, a preset counts its list', () => {
    expect(termsOf(custom())).toEqual(['running', 'tennis']);
    expect(termsOf(defaultClouds()[0])).toBe(emotions);
    expect(termsOf(defaultClouds()[2], ['Sam', 'Lee'])).toEqual(['Sam', 'Lee']);
  });

  it('counts only the words that appear, the most counted first', async () => {
    const counts: Record<string, number> = { running: 2, tennis: 0, swimming: 5 };
    const words = await countWords(['running', 'tennis', 'swimming'], async (term) => counts[term]);
    expect(words).toEqual([
      { text: 'swimming', count: 5 },
      { text: 'running', count: 2 },
    ]);
  });

  it('finds the people in notes, each once', () => {
    const notes = [{ elements: [{ type: 'person', id: 'Sam' }, { type: 'tracker', id: 'mood' }] }, { elements: [{ type: 'person', id: 'Sam' }, { type: 'person', id: 'Lee' }] }, {}];
    expect(peopleIn(notes)).toEqual(['Sam', 'Lee']);
  });

  it('a person opens a note with the name in lower case, ready to write about them', () => {
    expect(personNote('Sam')).toBe('@sam ');
  });
});

describe('the size of a word', () => {
  it('the largest word is the full weight, and nothing counted is no weight', () => {
    expect(weightOf(5, 5)).toBe(1);
    expect(weightOf(2, 5)).toBeCloseTo(0.4);
    expect(weightOf(0, 0)).toBe(0);
  });

  it('a larger weight is a larger word, and the least counted is 45% of the largest', () => {
    expect(wordPx(0, 40)).toBeCloseTo(18);
    expect(wordPx(0.5, 40)).toBeLessThan(wordPx(1, 40));
    expect(wordPx(1, 40)).toBe(40);
  });

  it('the cloud gets taller when the words wrap onto more lines', () => {
    const one = [{ text: 'alert', px: 20 }];
    const many = Array.from({ length: 30 }, () => ({ text: 'alert', px: 20 }));
    expect(cloudHeight(one, 300)).toBeLessThan(cloudHeight(many, 300));
  });

  it('a bigger frame gives bigger words, and more words give smaller words in the same frame', () => {
    const words = Array.from({ length: 8 }, (_, i) => ({ text: `word${i}`, count: 8 - i }));
    const many = Array.from({ length: 120 }, (_, i) => ({ text: `term${i}`, count: 120 - i }));
    expect(fittedLargest(words, 800, 300, 1)).toBeGreaterThan(fittedLargest(words, 340, 140, 1));
    expect(fittedLargest(words, 340, 140, 1)).toBeGreaterThan(fittedLargest(many, 340, 140, 1));
  });

  it('the text size of the app multiplies the words, and the smallest size is kept', () => {
    // a large frame, so the largest size (72px before the text size) is the limit and the text size shows
    const words = [{ text: 'alert', count: 3 }];
    expect(fittedLargest(words, 800, 400, 1.22)).toBeGreaterThan(fittedLargest(words, 800, 400, 1));
    expect(fittedLargest(words, 340, 140, 1)).toBeGreaterThanOrEqual(12);
  });
});

describe('saving a cloud', () => {
  it('a cloud needs a name and an emoji, because the dashboard settings list it by both', () => {
    expect(cloudProblem(custom({ emoji: ' ' }))).toBeTruthy();
    expect(normaliseClouds([{ id: '7', kind: 'emotions', emoji: '' }])[0].emoji).toBe('☁️');
  });

  it('a custom cloud needs a word', () => {
    expect(cloudProblem(custom({ name: ' ' }))).toBeTruthy();
    expect(cloudProblem(custom({ keywords: [] }))).toBeTruthy();
    expect(cloudProblem(custom())).toBeNull();
    expect(cloudProblem(defaultClouds()[0])).toBeNull();
  });
});
