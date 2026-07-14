import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeFeature, normalizeCollection, filterEvents, buildBins, project, classifyMagnitude } from '../lib.mjs';

const feature = { id: 'x', properties: { mag: 5.2, place: 'South of Fiji', time: 1000, sig: 420, tsunami: 1, status: 'reviewed' }, geometry: { coordinates: [178, -22, 560] } };
const event = normalizeFeature(feature);

test('normalizes real USGS-shaped fields without inventing missing values', () => {
  assert.equal(event.magnitude, 5.2);
  assert.equal(event.depth, 560);
  assert.equal(event.felt, null);
  assert.equal(event.tsunami, true);
});

test('filters magnitude, depth, review, tsunami and text together', () => {
  const filters = { magnitude: 5, depth: 'deep', alert: 'all', review: 'reviewed', tsunami: true, search: 'fiji' };
  assert.deepEqual(filterEvents([event], filters), [event]);
  assert.deepEqual(filterEvents([event], { ...filters, search: 'japan' }), []);
});

test('builds deterministic time bins and projection', () => {
  assert.equal(buildBins([event], 0, 2000, 2)[1].count, 1);
  assert.deepEqual(project(0, 0), { x: 500, y: 250 });
  assert.equal(classifyMagnitude(7.1).level, 'major');
});

test('handles empty, partial and dense collections intentionally', () => {
  assert.deepEqual(normalizeCollection({ features: [] }), []);
  const partial = normalizeFeature({ id: 'partial', properties: { time: 10 }, geometry: { coordinates: [0, 0] } });
  assert.equal(partial.magnitude, null);
  const many = Array.from({ length: 5000 }, (_, index) => ({ ...event, id: String(index), time: index + 1 }));
  assert.equal(buildBins(many, 0, 5001, 48).reduce((sum, bin) => sum + bin.count, 0), 5000);
});

test('does not classify missing review status as automatic', () => {
  const filters = { magnitude: 0, depth: 'all', alert: 'all', review: 'automatic', tsunami: false, search: '' };
  assert.deepEqual(filterEvents([{ ...event, status: null }], filters), []);
});
