import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const scriptPath = new URL('../MixesDB_Userscripts_Helper/script.user.js', import.meta.url);
const scriptSource = fs.readFileSync(scriptPath, 'utf8');

function extractFunction(name) {
  const start = scriptSource.indexOf(`function ${name}(`);
  if (start === -1) {
    throw new Error(`Could not find function ${name}`);
  }

  let depth = 0;
  let end = -1;
  let seenBrace = false;

  for (let i = start; i < scriptSource.length; i += 1) {
    const char = scriptSource[i];
    if (char === '{') {
      depth += 1;
      seenBrace = true;
    } else if (char === '}') {
      depth -= 1;
      if (seenBrace && depth === 0) {
        end = i + 1;
        break;
      }
    }
  }

  if (end === -1) {
    throw new Error(`Could not parse function ${name}`);
  }

  return scriptSource.slice(start, end);
}

function loadFunctions(names, overrides = {}) {
  const context = {
    apiUrl_mw: 'https://www.mixesdb.com/w/api.php',
    encodeURIComponent,
    mdbTrackidBatchMaxQueryLength: 1800,
    mdbTrackidBatchMaxUrlsPerRequest: 25,
    removeParametersFromUrl(url) {
      return url.replace(/\?.*$/, '');
    },
    $: {
      each(collection, callback) {
        if (Array.isArray(collection)) {
          collection.forEach((value, index) => callback(index, value));
          return;
        }

        Object.keys(collection).forEach((key) => callback(key, collection[key]));
      },
    },
    ...overrides,
  };

  vm.createContext(context);
  for (const name of names) {
    vm.runInContext(extractFunction(name), context);
  }
  return context;
}

test('normalizeTrackIdPlayerUrl keeps explorer batch URLs aligned with existing single-check normalization', () => {
  const { normalizeTrackIdPlayerUrl } = loadFunctions(['normalizeTrackIdPlayerUrl']);

  assert.equal(
    normalizeTrackIdPlayerUrl('SoundCloud', 'https://soundcloud.com/artist/mix?si=abc123'),
    'https://soundcloud.com/artist/mix'
  );
  assert.equal(
    normalizeTrackIdPlayerUrl('YouTube', 'https://www.youtu.be/example123'),
    'https://youtu.be/example123'
  );
  assert.equal(
    normalizeTrackIdPlayerUrl('hearthis-at', 'https://hearthis.audio/artist/show?utm_source=test'),
    'https://hearthis.at/artist/show'
  );
});

test('chunkTrackIdBatchPlayerUrls respects both URL-count and query-length limits', () => {
  const countLimitedContext = loadFunctions(
    ['buildTrackIdBatchQueryValue', 'chunkTrackIdBatchPlayerUrls'],
    {
      mdbTrackidBatchMaxUrlsPerRequest: 2,
      mdbTrackidBatchMaxQueryLength: 9999,
    }
  );

  const countLimitedPlan = countLimitedContext.chunkTrackIdBatchPlayerUrls([
    'https://e.co/a',
    'https://e.co/b',
    'https://e.co/c',
  ]);

  const normalizedChunks = JSON.parse(JSON.stringify(countLimitedPlan.chunks));

  assert.deepEqual(
    normalizedChunks,
    [
      ['https://e.co/a', 'https://e.co/b'],
      ['https://e.co/c'],
    ]
  );

  const lengthLimitedContext = loadFunctions(
    ['buildTrackIdBatchQueryValue', 'chunkTrackIdBatchPlayerUrls'],
    {
      mdbTrackidBatchMaxUrlsPerRequest: 25,
      mdbTrackidBatchMaxQueryLength: 90,
    }
  );

  const lengthLimitedPlan = lengthLimitedContext.chunkTrackIdBatchPlayerUrls([
    'https://example.com/this-url-is-deliberately-too-long-for-the-query-limit',
  ]);

  assert.deepEqual(Array.from(lengthLimitedPlan.chunks), []);
  assert.deepEqual(
    Array.from(lengthLimitedPlan.oversizedUrls),
    ['https://example.com/this-url-is-deliberately-too-long-for-the-query-limit']
  );
});

test('groupExplorerTrackIdEntriesByUrl dedupes repeated player URLs before request dispatch', () => {
  const { groupExplorerTrackIdEntriesByUrl } = loadFunctions(['groupExplorerTrackIdEntriesByUrl']);

  const grouped = groupExplorerTrackIdEntriesByUrl([
    { playerUrl: 'https://example.com/a', id: 'row-1' },
    { playerUrl: 'https://example.com/a', id: 'row-2' },
    { playerUrl: 'https://example.com/b', id: 'row-3' },
  ]);

  assert.deepEqual(Object.keys(grouped).sort(), ['https://example.com/a', 'https://example.com/b']);
  assert.deepEqual(
    Array.from(grouped['https://example.com/a'], (entry) => entry.id),
    ['row-1', 'row-2']
  );
});

test('indexTrackIdBatchResultsByUrl maps both requested and sanitized URLs to the shared batch result', () => {
  const { indexTrackIdBatchResultsByUrl } = loadFunctions(['indexTrackIdBatchResultsByUrl']);

  const result = {
    requestedurl: 'https://example.com/raw?utm_source=abc',
    sanitizedurl: 'https://example.com/raw',
    mixesdbtrackid: [{ trackidurl: 'https://trackid.net/a' }],
  };

  const index = indexTrackIdBatchResultsByUrl([result]);

  assert.equal(index['https://example.com/raw?utm_source=abc'], result);
  assert.equal(index['https://example.com/raw'], result);
});
