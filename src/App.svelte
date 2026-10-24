<script lang="ts">
  import { onMount } from 'svelte';
  import {
    cloudProblem, countWords, defaultClouds, sizeOf, keywordsFrom, newCloud, normaliseClouds, peopleIn, personNote, termsOf, weightOf,
    COLOURS, DAY_CHOICES, KICK_STARTER, KIND_NAMES, PEOPLE_DAYS, type Cloud, type Word,
  } from './clouds';
  import { paletteFrom, type Palette } from './palette';
  import { onPrefsChange } from './prefs-live';

  // the presets as a new user can start from them
  const PRESET_LIST = defaultClouds();

  let plugin: any;
  let view = $state<'modal' | 'widget'>('modal');
  let palette = $state<Palette>(paletteFrom(undefined));
  let scale = $state(1);

  // the modal: the list of clouds, the choice of a starting point, or the editor of one cloud
  let clouds = $state<Cloud[]>([]);
  let loaded = $state(false);
  let screen = $state<'list' | 'choose' | 'edit'>('list');
  let draft = $state<Cloud | null>(null);
  let keywordsText = $state('');

  // the widget: the cloud its index points at, and the words counted for it
  const widgetIndex = new URLSearchParams(window.location.search).get('widgetindex');
  let widgetCloud = $state<Cloud | null>(null);
  let words = $state<Word[]>([]);
  let status = $state<'loading' | 'ready' | 'missing'>('loading');

  const largest = $derived(words[0]?.count ?? 0);
  const draftIsSaved = $derived(!!draft && clouds.some((c) => c.id === draft!.id));
  const draftProblem = $derived(draft ? cloudProblem({ ...draft, keywords: draft.kind === 'custom' ? keywordsFrom(keywordsText) : [] }) : null);

  const applyNomieValues = () => {
    if (!plugin?.prefs) return;
    palette = paletteFrom(plugin.prefs);
    scale = plugin.prefs.fontScale || 1;
  };

  const save = () => plugin?.storage.setItem('clouds', $state.snapshot(clouds));

  const ensureLoaded = async () => {
    if (loaded) return;
    await plugin.storage.init();
    const stored = plugin.storage.getItem('clouds');
    clouds = normaliseClouds(stored);
    if (!stored) await save();
    loaded = true;
  };

  // The words of a cloud over its days, the most counted first. A persons cloud counts the people in the notes.
  const countFor = async (cloud: Cloud): Promise<Word[]> => {
    const people = cloud.kind === 'persons' ? peopleIn((await plugin.searchNotes('', new Date(), PEOPLE_DAYS)) ?? []) : [];
    return countWords(termsOf(cloud, people), async (term) => ((await plugin.searchNotes(term, new Date(), cloud.days)) ?? []).length);
  };

  // The dashboard widget shows the cloud its index names. Without an index it shows the first cloud.
  const loadWidget = async () => {
    await ensureLoaded();
    widgetCloud = widgetIndex ? clouds.find((c) => c.id === widgetIndex) ?? null : clouds[0] ?? null;
    if (!widgetCloud) {
      status = 'missing';
      return;
    }
    status = 'loading';
    words = await countFor(widgetCloud);
    status = 'ready';
  };

  const openCloud = (cloud: Cloud) => {
    draft = structuredClone($state.snapshot(cloud)) as Cloud;
    keywordsText = cloud.keywords.join(', ');
    screen = 'edit';
  };

  const startNew = (base: Omit<Cloud, 'id'>) => {
    draft = newCloud(base, clouds);
    keywordsText = draft.keywords.join(', ');
    screen = 'edit';
  };

  const presetBase = (preset: Cloud): Omit<Cloud, 'id'> => {
    const { id, ...base } = preset;
    return base;
  };

  const saveDraft = async () => {
    if (!draft || draftProblem) return;
    const next: Cloud = { ...$state.snapshot(draft), keywords: draft.kind === 'custom' ? keywordsFrom(keywordsText) : [] };
    clouds = draftIsSaved ? clouds.map((c) => (c.id === next.id ? next : c)) : [...clouds, next];
    await save();
    draft = null;
    screen = 'list';
  };

  const deleteDraft = async () => {
    if (!draft) return;
    const gone = draft;
    const res = await plugin.confirm('Delete word cloud?', `"${gone.name}" is removed. A dashboard widget that shows it will say it is gone.`);
    if (!res?.value) return;
    clouds = clouds.filter((c) => c.id !== gone.id);
    await save();
    draft = null;
    screen = 'list';
  };

  // Tapping a person in the persons cloud starts a note about them
  const tapWord = (word: Word) => {
    if (widgetCloud?.kind === 'persons') plugin.openNoteEditor(personNote(word.text));
  };

  onMount(() => {
    plugin = new NomiePlugin({
      name: 'Nomie Word Cloud',
      emoji: '☁️',
      description: 'A word cloud from the words in your notes: emotions, virtues, the people you write about, or your own words. Shown on the dashboard.',
      uses: ['searchNotes', 'openNoteEditor', 'getStorageItem', 'setStorageItem', 'confirm'],
      version: '2.0',
      addToCaptureMenu: true,
      addToMoreMenu: true,
      addToWidgets: true,
    });
    onPrefsChange(plugin, () => applyNomieValues());
    plugin.onRegistered(async () => {
      applyNomieValues();
      await ensureLoaded();
    });
    plugin.onWidget(async () => {
      view = 'widget';
      applyNomieValues();
      await loadWidget();
    });
    plugin.onUIOpened(async () => {
      view = 'modal';
      applyNomieValues();
      await ensureLoaded();
      screen = 'list';
    });
  });
</script>

<div class="card" class:widget={view === 'widget'} style="--page: {palette.page}; --card: {palette.card}; --card-inner: {palette.cardInner}; --text: {palette.text}; --muted: {palette.textSecondary}; --line: {palette.separator}; --fill: {palette.fill}; --tint: {palette.tint}; --on-tint: {palette.onTint}; --tint-soft: {palette.tintSoft}; --danger: {palette.danger}; --scale: {scale};">
  {#if view === 'widget'}
    <div class="head">
      <span>{widgetCloud?.emoji ?? '☁️'}</span>
      <span class="title">{widgetCloud?.name ?? 'Word cloud'}</span>
      {#if widgetCloud}<span class="meta">Last {widgetCloud.days} days</span>{/if}
    </div>
    {#if status === 'missing'}
      <p class="muted">This widget points at a word cloud that is gone. Pick another one in the widget settings.</p>
    {:else if status === 'loading'}
      <p class="muted">Counting words…</p>
    {:else if words.length === 0}
      <p class="muted">No words in the last {widgetCloud?.days} days yet.</p>
    {:else if widgetCloud}
      <ul class="cloud">
        {#each words as word (word.text)}
          {@const weight = weightOf(word.count, largest)}
          <li>
            <button
              class="word"
              class:tap={widgetCloud.kind === 'persons'}
              style="font-size: clamp(9px, calc({sizeOf(weight)} * 1cqmin * var(--scale)), 36px); font-weight: {weight > 0.6 ? 700 : 500}; color: color-mix(in srgb, {widgetCloud.color} {Math.round(45 + 55 * weight)}%, var(--text));"
              onclick={() => tapWord(word)}
            >{word.text}</button>
          </li>
        {/each}
      </ul>
    {/if}
  {:else}
    {#if screen === 'list'}
      <h1>Word clouds</h1>
      <p class="muted">The words in your notes, as clouds on your dashboard.</p>

      <section class="panel">
        {#each clouds as cloud (cloud.id)}
          <button class="row" onclick={() => openCloud(cloud)}>
            <span class="badge" style="background: {cloud.color}">{cloud.emoji}</span>
            <span class="text">
              <span class="title">{cloud.name}</span>
              <span class="muted">{cloud.description || KIND_NAMES[cloud.kind]}</span>
            </span>
            <span class="muted">{cloud.days} d</span>
          </button>
        {:else}
          <p class="muted pad">No word clouds yet. Add one to show on your dashboard.</p>
        {/each}
      </section>
      <button class="primary" onclick={() => (screen = 'choose')}>New word cloud</button>
    {:else if screen === 'choose'}
      <button class="link" onclick={() => (screen = 'list')}>‹ Back</button>
      <h1>New word cloud</h1>
      <p class="muted">Start from one of these, or from your own words.</p>
      <div class="chips">
        {#each PRESET_LIST as preset (preset.id)}
          <button onclick={() => startNew(presetBase(preset))}>{preset.emoji} {preset.name}</button>
        {/each}
        <button onclick={() => startNew({ kind: 'custom', name: '', description: '', emoji: '☁️', color: COLOURS[0], days: 90, keywords: [] })}>✏️ Your own words</button>
        <button onclick={() => startNew(KICK_STARTER)}>{KICK_STARTER.emoji} {KICK_STARTER.name}</button>
      </div>
    {:else if draft}
      <button class="link" onclick={() => (screen = 'list')}>‹ Back</button>
      <h1>{draftIsSaved ? draft.name || 'Word cloud' : 'New word cloud'}</h1>

      <section class="panel">
        <label class="field">
          <span class="muted">Name</span>
          <input class="input" bind:value={draft.name} placeholder="My word cloud" />
        </label>
        <label class="field">
          <span class="muted">Description</span>
          <input class="input" bind:value={draft.description} placeholder="What the words are about" />
        </label>
        <label class="field">
          <span class="muted">Emoji</span>
          <input class="input emoji" bind:value={draft.emoji} maxlength="4" />
        </label>
      </section>

      {#if draft.kind === 'custom'}
        <h2>Words</h2>
        <section class="panel">
          <textarea class="input" rows="4" bind:value={keywordsText} placeholder="running, tennis, swimming"></textarea>
          <p class="muted hint">Separate the words with commas. Each one is counted in your notes.</p>
        </section>
      {:else}
        <p class="muted">{KIND_NAMES[draft.kind]} is a list the plugin knows. Only the name, colour and days can change.</p>
      {/if}

      <h2>Colour</h2>
      <section class="panel swatches">
        {#each COLOURS as c (c)}
          <button class="swatch" class:picked={draft.color === c} style="background: {c}" aria-label="Use this colour" onclick={() => (draft!.color = c)}></button>
        {/each}
      </section>

      <h2>Counted over</h2>
      <div class="chips">
        {#each DAY_CHOICES as d (d)}
          <button class:active={draft.days === d} onclick={() => (draft!.days = d)}>{d} days</button>
        {/each}
      </div>

      {#if draftProblem}<p class="problem">{draftProblem}</p>{/if}
      <button class="primary" onclick={saveDraft} disabled={!!draftProblem}>Save</button>
      {#if draftIsSaved}<button class="danger" onclick={deleteDraft}>Delete word cloud</button>{/if}
    {/if}
  {/if}
</div>

<style>
  .card { box-sizing: border-box; min-height: 100vh; padding: 16px; background: var(--page); color: var(--text); font-size: calc(16px * var(--scale)); line-height: 1.4; }
  /* the words are sized against the smaller side of the widget, so a large widget shows large words */
  .card.widget { container-type: size; min-height: 0; height: 100vh; padding: 12px; font-size: calc(14px * var(--scale)); display: flex; flex-direction: column; }
  h1 { margin: 0; font-size: calc(26px * var(--scale)); font-weight: 700; }
  h2 { margin: 20px 0 6px; font-size: calc(13px * var(--scale)); font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.04em; }
  .muted { margin: 4px 0; color: var(--muted); }
  .hint { font-size: calc(13px * var(--scale)); }
  .pad { padding: 12px 0; }
  .panel { padding: 8px 16px; border-radius: 16px; background: var(--card); margin: 12px 0; }
  .row { display: flex; align-items: center; gap: 12px; width: 100%; padding: 12px 0; border: 0; border-top: 1px solid var(--line); background: transparent; color: inherit; font: inherit; text-align: left; cursor: pointer; }
  .row:first-child { border-top: 0; }
  .text { display: flex; flex: 1; flex-direction: column; min-width: 0; }
  .title { font-weight: 600; }
  .badge { display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0; }
  .head { display: flex; align-items: center; gap: 8px; }
  .meta { margin-left: auto; color: var(--muted); }
  .link { border: 0; background: transparent; color: var(--tint); font: inherit; padding: 0; cursor: pointer; }
  .field { display: flex; flex-direction: column; gap: 4px; padding: 8px 0; }
  .input { box-sizing: border-box; width: 100%; padding: 10px 12px; border: 0; border-radius: 12px; background: var(--card-inner, var(--fill)); color: var(--text); font: inherit; }
  .emoji { width: 90px; }
  .swatches { display: flex; flex-wrap: wrap; gap: 10px; padding: 12px 16px; }
  .swatch { width: 28px; height: 28px; border: 0; border-radius: 50%; cursor: pointer; }
  .swatch.picked { outline: 2px solid var(--text); outline-offset: 2px; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
  .chips button { padding: 8px 12px; border: 0; border-radius: 10px; background: var(--fill); color: var(--text); font: inherit; cursor: pointer; }
  .chips button.active { background: var(--tint-soft); color: var(--tint); font-weight: 600; }
  .primary { display: block; width: 100%; margin-top: 16px; padding: 12px; border: 0; border-radius: 12px; background: var(--tint); color: var(--on-tint); font: inherit; font-weight: 600; cursor: pointer; }
  .primary:disabled { opacity: 0.4; }
  .danger { display: block; width: 100%; margin-top: 10px; padding: 12px; border: 0; border-radius: 12px; background: transparent; color: var(--danger); font: inherit; cursor: pointer; }
  .problem { margin: 12px 0 0; color: var(--danger); }
  /* the cloud: words sized by how often they were counted, in the colour of the cloud. The most counted come first, at the top. */
  .cloud { display: flex; flex: 1; flex-wrap: wrap; align-content: flex-start; justify-content: center; gap: 0 8px; margin: 8px 0 0; padding: 0; list-style: none; min-height: 0; overflow: hidden; }
  .word { padding: 2px 4px; border: 0; border-radius: 8px; background: transparent; font: inherit; line-height: 1.2; cursor: default; }
  .word.tap { cursor: pointer; }
  .word.tap:hover { background: var(--tint-soft); }
</style>
