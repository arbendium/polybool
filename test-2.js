/// / @ts-nocheck
import test from 'node:test';
import assert from 'node:assert';
/// eslint-disable-next-line import/no-relative-packages
// import { PolyBool } from './upstream/main/src/polybool.ts';
import { PolyBool } from './lib/polybool.js';
import { pointLabel, segLabel, setPointMap } from './lib/pointMap.js';

/**
 * @import { Vec2 } from './lib/types'
 */

test('1', () => {
	/** @type {Vec2[][]} */
	const poly = [[
		[0, 0], // A
		[1, 1], // B
		[1, 0], // C
	]];

	const labels = ['A', 'B', 'C'];

	setPointMap(Object.fromEntries(poly.flat().map(([x, y], i) => [`${x}:${y}`, labels[i]])));

	const polybool = new PolyBool();

	const result = polybool.union(
		{ regions: poly, inverted: false },
		{ regions: poly, inverted: false },
	).regions;

	assert.strictEqual(result.length, 1);
	assert.strictEqual(result[0].map(pointLabel).join(''), 'ACB');
});

test('2', () => {
	/** @type {Vec2[][]} */
	const poly = [[
		[0, 0], // A
		[0.5, 1], // B
		[1, 0], // C
	]];

	const labels = ['A', 'B', 'C'];

	setPointMap(Object.fromEntries(poly.flat().map(([x, y], i) => [`${x}:${y}`, labels[i]])));

	const polybool = new PolyBool();

	const result = polybool.union(
		{ regions: poly, inverted: false },
		{ regions: poly, inverted: false },
	).regions;

	assert.strictEqual(result.length, 1);
	assert.strictEqual(result[0].map(pointLabel).join(''), 'ACB');
});

test('3', () => {
	/** @type {Vec2[][]} */
	const poly = [[
		[3, 0], // A
		[0, 1], // B
		[2, 4], // C
		[2, 3], // D
		[1, 2], // E
		[1, 1], // F
		[3, 1], // G
	]];

	const labels = [
		'A',
		'B',
		'C',
		'D',
		'E',
		'F',
		'G',
	];

	setPointMap(Object.fromEntries(poly.flat().map(([x, y], i) => [`${x}:${y}`, labels[i]])));

	const polybool = new PolyBool();

	const result = polybool.union(
		{ regions: poly, inverted: false },
		{ regions: poly, inverted: false },
	).regions;

	assert.strictEqual(result.length, 1);
	assert.strictEqual(result[0].map(pointLabel).join(''), 'FEDCBAG');
});

test('3.5', () => {
	/** @type {Vec2[][]} */
	const poly = [[
		[3, 4 - 0], // A
		[0, 4 - 1], // B
		[2, 4 - 4], // C
		[2, 4 - 3], // D
		[1, 4 - 2], // E
		[1, 4 - 1], // F
		[3, 4 - 1], // G
	]];

	const labels = [
		'A',
		'B',
		'C',
		'D',
		'E',
		'F',
		'G',
	];

	setPointMap(Object.fromEntries(poly.flat().map(([x, y], i) => [`${x}:${y}`, labels[i]])));

	const polybool = new PolyBool();

	const result = polybool.union(
		{ regions: poly, inverted: false },
		{ regions: poly, inverted: false },
	).regions;

	assert.strictEqual(result.length, 1);
	assert.strictEqual(result[0].map(pointLabel).join(''), 'BCDEFGA');
});

test('4', () => {
	/** @type {Vec2[][]} */
	const poly = [[
		[587953.1269561613, 6480898.918962788],
		[587933.4319805515, 6480886.175155048],
		[587916.0540609013, 6480871.941811329],
		[587908.6063810413, 6480884.685619079],
		[587899.0071492412, 6480901.070514748],
		[587891.8904773812, 6480915.303858468],
		[587895.2005573112, 6480923.0825463105],
		[587895.3660613114, 6480927.385650227],
		[587885.4358215114, 6480940.791473961],
		[587881.1327175912, 6480950.556209769],
		[587891.0629573913, 6480958.334897611],
		[587932.438956571, 6480991.270192958],
		[588000.792107211, 6480949.066673801],
		[587966.5327798914, 6480914.47633848],
		[587970.0083638212, 6480909.842226578],
		[587977.1250356813, 6480900.408498759],
	]];

	const labels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P'];

	setPointMap(Object.fromEntries(poly.flat().map(([x, y], i) => [`${x}:${y}`, labels[i]])));

	const polybool = new PolyBool();

	const result = polybool.union(
		{ regions: poly, inverted: false },
		{ regions: poly, inverted: false },
	).regions;

	assert.strictEqual(result.length, 1);
	assert.strictEqual(result[0].map(pointLabel).join(''), 'LKJIHGFEDCBAPONM');
});

test.only('5', () => {
	/** @type {Vec2[][]} */
	const poly = [
		[
			[9.0357337203, 6488655.551446969], // A
			[19.41, 6488661.71], // B
			[19.79, 6488661.45], // C
			[17, 6488651.777507303], // D
		],
		[
			[19.41, 6488661.71], // B
			[8.4611051541, 6488655.210325929], // E
			// [96.4023300858, 6488659.525609329], // F
			[0, 6488658.49831],
		],
	];

	const labelList = 'ABCDEFG';

	setPointMap(Object.fromEntries([...new Set(poly.flat().map(([x, y]) => `${x}:${y}`))].map((key, i) => [key, labelList[i]])));

	toGeogebra(poly);

	const polybool = new PolyBool();

	const result = polybool.union(
		{ regions: poly, inverted: false },
		{ regions: poly, inverted: false },
	).regions;

	toGeogebra(result);

	assert.strictEqual(result.length, 1);
	assert.strictEqual(result[0].map(pointLabel).join(''), 'BFE[9.035733720684842, 6488655.551446969]DC');

	/** @type {import('@arbendium/polybool').Segments} */
	let normalizedSegments = { segments: [], inverted: false };

	const normalizedRegion1 = polybool.segments({ regions: [poly[0]], inverted: false });
	const normalizedRegion2 = polybool.segments({ regions: [poly[1]], inverted: false });

	console.log('Combining');

	const combined = polybool.combine(normalizedRegion1, normalizedRegion2);

	assert.deepStrictEqual(normalizedRegion1.segments.map(seg => `${segLabel(seg.data)}   fill=${seg.myFill.above}/${seg.myFill.below}`), [
		'A -> D   fill=true/false',
		'A -> B   fill=false/true',
		'D -> C   fill=true/false',
		'B -> C   fill=false/true',
	]);
	assert.deepStrictEqual(normalizedRegion2.segments.map(seg => `${segLabel(seg.data)}   fill=${seg.myFill.above}/${seg.myFill.below}`), [
		'F -> E   fill=true/false',
		'E -> B   fill=true/false',
		'F -> B   fill=false/true',
	]);

	assert.deepStrictEqual(combined.segments.map(seg => `${segLabel(seg.data)}   myFill=${seg.myFill.above}/${seg.myFill.below}  otherFill=${seg.otherFill?.above}/${seg.otherFill?.below}`), [
		'F -> E   myFill=false/false  otherFill=true/false',
		'E -> [9.035733720684842, 6488655.551446969]   myFill=false/false  otherFill=true/false',
		'A -> [9.035733720684842, 6488655.551446969]   myFill=true/false  otherFill=false/false',
		'[9.035733720684842, 6488655.551446969] -> D   myFill=true/false  otherFill=false/false',
		'[9.035733720684842, 6488655.551446969] -> B   myFill=true/true  otherFill=true/false',
		'A -> B   myFill=false/true  otherFill=true/true',
		'F -> B   myFill=false/false  otherFill=false/true',
		'D -> C   myFill=true/false  otherFill=false/false',
		'B -> C   myFill=false/true  otherFill=false/false',
	]);

	normalizedSegments = polybool.selectUnion(combined);

	const normalizedGeometry = polybool.polygon(normalizedSegments);

	console.log(normalizedGeometry);

	assert.notStrictEqual(normalizedGeometry.regions.length, 0);
});

/**
 * @param {[number, number][][]} rings
 */
function toGeogebra(rings) {
	let i = 0;

	while (i < rings.length) {
		let ring = rings[i];

		// Remove duplicated last point if present
		if (
			ring.length > 1
        && ring[0][0] === ring[ring.length - 1][0]
        && ring[0][1] === ring[ring.length - 1][1]
		) {
			ring = ring.slice(0, -1);
		}

		const points = ring.map(p => [pointLabel(p), `(${p[0]},${p[1]})`]);

		console.log([
			...points.map(([label, p]) => `${label} = ${p}`),
			`Polygon(${points.map(([label]) => label).join(',')})`,
		].join('\n'));

		i++;
	}
}
