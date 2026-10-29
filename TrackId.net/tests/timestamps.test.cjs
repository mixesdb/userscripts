const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../script.user.js'), 'utf8');
const globalSource = fs.readFileSync(path.join(__dirname, '../../shared/global.js'), 'utf8');
let legacyDuration = '';
const context = vm.createContext({
    $: () => ({ closest: () => ({ next: () => ({ text: () => legacyDuration }) }) })
});
vm.runInContext(globalSource.slice(globalSource.indexOf('function durToSec('), globalSource.indexOf('// convertHMS()')), context);
vm.runInContext(source.slice(source.indexOf('function tidTimestamp('), source.indexOf('/*\n * Tracklist table')), context);
const { tidTimestamp, tidRowTimes, tidGapText, tidTotalDuration } = context;
function row(fields) {
    return { querySelector: selector => {
        for (const [field, textContent] of Object.entries(fields)) {
            if (selector.includes('.' + field + ', ')) return { textContent };
        }
        return null;
    } };
}
const ranges = ['0:07:37 – 0:08:56', '0:10:45 – 0:13:51', '0:13:51 – 0:17:07',
    '0:24:18 – 0:24:32', '0:25:33 – 0:26:51', '0:26:53 – 0:27:10',
    '0:33:53 – 0:36:13', '0:36:15 – 0:39:51', '0:50:19 – 0:51:49'];
test('all nine observed page ranges preserve starts and ends', () => {
    for (const time of ranges) {
        const actual = tidRowTimes(row({ time }));
        assert.equal(actual.start, time.split(' – ')[0]);
        assert.equal(actual.end, time.split(' – ')[1]);
    }
});
test('legacy cells, alternate separators, single starts, and invalid times', () => {
    assert.equal(tidRowTimes(row({ startTime: '1:02:03', endTime: '1:05:00' })).end, '1:05:00');
    for (const separator of ['-', '–', '—']) {
        assert.equal(tidRowTimes(row({ time: ` 07:37 ${separator} 08:56 ` })).end, '0:08:56');
    }
    assert.equal(tidRowTimes(row({ time: '07:37' })).start, '0:07:37');
    assert.equal(tidRowTimes(row({ time: '07:37' })).end, '');
    for (const text of ['', 'unknown', '0:99:00', '1:00:99']) assert.equal(tidTimestamp(text), '');
    assert.equal(tidRowTimes(null).start, '');
});
test('observed gaps include intermediate and trailing unknowns', () => {
    const rows = ranges.map(time => tidRowTimes(row({ time })));
    assert.equal(tidGapText(rows[0], rows[1], '', false), '\n[0:08:56] ?');
    assert.equal(tidGapText(rows[1], rows[2], '', false), '');
    assert.equal(tidGapText(rows[2], rows[3], '', false), '\n[0:17:07] ?\n...');
    assert.equal(tidGapText(rows[8], {}, '1:00:39', true), '\n[0:51:49] ?\n...');
});
test('gap thresholds, overlaps, reversed and missing ranges', () => {
    const times = { start: '0:00:00', end: '0:01:00' };
    for (const [next, expected] of [['0:01:30', ''], ['0:01:31', '\n[0:01:00] ?'],
        ['0:04:00', '\n[0:01:00] ?'], ['0:04:01', '\n[0:01:00] ?\n...'], ['0:00:59', '']]) {
        assert.equal(tidGapText(times, { start: next }, '', false), expected);
    }
    assert.equal(tidGapText(times, {}, '0:02:10', true), '');
    assert.equal(tidGapText(times, {}, '0:02:11', true), '\n[0:01:00] ?');
    assert.equal(tidGapText(times, {}, '0:05:00', true), '\n[0:01:00] ?');
    assert.equal(tidGapText(times, {}, '0:05:01', true), '\n[0:01:00] ?\n...');
    assert.equal(tidGapText(times, {}, '', false), '');
    assert.equal(tidGapText(times, {}, '', true), '');
    assert.equal(tidGapText({ start: '0:02:00', end: '0:01:00' }, {}, '', false), '\n...');
    assert.equal(tidGapText({ start: '', end: '0:01:00' }, { start: '0:10:00' }, '', false), '');
});
test('duration comes from channel metadata, with legacy and missing fallbacks', () => {
    const root = { querySelectorAll: () => [{ parentElement: { children: [
        { tagName: 'A', textContent: '12:34' }, { tagName: 'IMG', textContent: '' },
        { tagName: 'SPAN', textContent: '·' }, { tagName: 'SPAN', textContent: '1:00:39' }
    ] } }] };
    assert.equal(tidTotalDuration(root), '1:00:39');
    legacyDuration = ' 2:03:04 ';
    assert.equal(tidTotalDuration({ querySelectorAll: () => [] }), '2:03:04');
    legacyDuration = '';
    assert.equal(tidTotalDuration({ querySelectorAll: () => [] }), '');
});
test('upstream adaptive gap thresholds are preserved', () => {
    const times = { start: '0:00:00', end: '0:01:00' };
    assert.equal(tidGapText(times, { start: '0:04:00' }, '', false, 30, 120), '\n[0:01:00] ?\n...');
    assert.equal(tidGapText(times, { start: '0:04:00' }, '', false, 30, 300), '\n[0:01:00] ?');
});
test('dependency metadata uses maintained upstream paths', () => {
    const requires = source.match(/^\/\/ @require\s+\S+/gm);
    assert.equal(requires.length, 15);
    assert.ok(requires.every(line => !line.includes('/includes/') && !line.includes('cdn.rawgit.com')));
    assert.ok(requires.some(line => line.includes('/shared/tracklist_importer/merge_core.js')));
});
