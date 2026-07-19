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

	const labels = 'ABC';

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
	assert.strictEqual(result[0].map(pointLabel).join(''), 'BAC');
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

	const labels = 'ABCDEFG';
	setPointMap(Object.fromEntries(poly.flat().map(([x, y], i) => [`${x}:${y}`, labels[i]])));

	const polybool = new PolyBool();

	const result = polybool.union(
		{ regions: poly, inverted: false },
		{ regions: poly, inverted: false },
	).regions;

	assert.strictEqual(result.length, 1);
	assert.strictEqual(result[0].map(pointLabel).join(''), 'FEDCBAG');
});

test('4', () => {
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

	const labels = 'ABCDEFG';
	setPointMap(Object.fromEntries(poly.flat().map(([x, y], i) => [`${x}:${y}`, labels[i]])));

	const polybool = new PolyBool();

	const result = polybool.union(
		{ regions: poly, inverted: false },
		{ regions: poly, inverted: false },
	).regions;

	assert.strictEqual(result.length, 1);
	assert.strictEqual(result[0].map(pointLabel).join(''), 'BCDEFGA');
});

test('5', () => {
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

	const labels = 'ABCDEFGHIJKLMNOP';

	setPointMap(Object.fromEntries(poly.flat().map(([x, y], i) => [`${x}:${y}`, labels[i]])));

	const polybool = new PolyBool();

	const result = polybool.union(
		{ regions: poly, inverted: false },
		{ regions: poly, inverted: false },
	).regions;

	assert.strictEqual(result.length, 1);
	assert.strictEqual(result[0].map(pointLabel).join(''), 'LKJIHGFEDCBAPONM');
});

test('6', () => {
	/** @type {Vec2[][]} */
	const poly = [
		[
			[2.0357337203, 6488655.551446969], // A
			[12.41, 6488661.71], // B
			[13, 6488661.71], // C
			[10, 6488655.551446969], // D
		],
		[
			[12.41, 6488661.71], // B
			[1.4611051541, 6488655.210325929], // E
			[1.4611051541, 6488661.71], // F
		],
	];

	const labels = 'ABCDEFG';
	setPointMap(Object.fromEntries([...new Set(poly.flat().map(([x, y]) => `${x}:${y}`))].map((key, i) => [key, labels[i]])));
	toGeogebra(poly);

	const polybool = new PolyBool();

	const result = polybool.union(
		{ regions: poly, inverted: false },
		{ regions: poly, inverted: false },
	);

	assert.strictEqual(result.inverted, false);
	assert.strictEqual(result.regions.length, 1);
	assert.strictEqual(result.regions[0].map(pointLabel).join(''), 'FE[2.035733720992035, 6488655.551446969]AB[2.035733720992035, 6488655.551446969]DC');

	const normalizedRegion1 = polybool.segments({ regions: [poly[0]], inverted: false });
	const normalizedRegion2 = polybool.segments({ regions: [poly[1]], inverted: false });
	const combined = polybool.combine(normalizedRegion1, normalizedRegion2);

	assert.deepStrictEqual(normalizedRegion1.segments.map(seg => `${segLabel(seg.data)}   fill=${seg.myFill.above}/${seg.myFill.below}`), [
		'A -> D   fill=true/false',
		'A -> B   fill=false/true',
		'D -> C   fill=true/false',
		'B -> C   fill=false/true',
	]);
	assert.deepStrictEqual(normalizedRegion2.segments.map(seg => `${segLabel(seg.data)}   fill=${seg.myFill.above}/${seg.myFill.below}`), [
		'E -> F   fill=false/true',
		'E -> B   fill=true/false',
		'F -> B   fill=false/true',
	]);
	assert.deepStrictEqual(combined.segments.map(seg => `${segLabel(seg.data)}   myFill=${seg.myFill.above}/${seg.myFill.below}  otherFill=${seg.otherFill?.above}/${seg.otherFill?.below}`), [
		'E -> F   myFill=false/false  otherFill=false/true',
		'E -> [2.035733720992035, 6488655.551446969]   myFill=false/false  otherFill=true/false',
		'A -> [2.035733720992035, 6488655.551446969]   myFill=true/false  otherFill=true/true',
		'[2.035733720992035, 6488655.551446969] -> D   myFill=true/false  otherFill=false/false',
		'[2.035733720992035, 6488655.551446969] -> B   myFill=true/true  otherFill=true/false',
		'A -> B   myFill=false/true  otherFill=true/true',
		'F -> B   myFill=false/false  otherFill=false/true',
		'D -> C   myFill=true/false  otherFill=false/false',
		'B -> C   myFill=false/true  otherFill=false/false',
	]);

	const normalizedGeometry = polybool.polygon(polybool.selectUnion(combined));

	assert.strictEqual(normalizedGeometry.inverted, false);
	assert.strictEqual(normalizedGeometry.regions.length, 1);
	assert.strictEqual(normalizedGeometry.regions[0].map(pointLabel).join(''), 'FE[2.035733720992035, 6488655.551446969]DC');
});

test('7', () => {
	/** @type {Vec2[][]} */
	const poly = [
		[
			[2, 4], // A
			[6, 4], // B
			[5, 2], // C
		],
		[
			[0, 0], // D
			[2, 4], // A
			[6, 0], // E
		],
	];

	const labels = 'ABCDE';
	setPointMap(Object.fromEntries([...new Set(poly.flat().map(([x, y]) => `${x}:${y}`))].map((key, i) => [key, labels[i]])));
	toGeogebra(poly);

	const polybool = new PolyBool();

	const normalizedGeometry = polybool.union(
		{ regions: [poly[0]], inverted: false },
		{ regions: [poly[1]], inverted: false },
	);

	assert.strictEqual(normalizedGeometry.inverted, false);
	assert.strictEqual(normalizedGeometry.regions.length, 1);
	assert.strictEqual(normalizedGeometry.regions[0].map(pointLabel).join(''), 'ADEACB');
});

test('8', () => {
	/** @type {Vec2[][]} */
	const poly = [[
		[625803.07, 6497216.08], // A
		[625694.68, 6497146.62], // B
		[625744.21, 6497132.16], // C
		[625736.0738600261, 6497134.535299496], // D
		[625778.5867819233, 6497091.1383181475], // E
	]];

	const labels = 'ABCDE';
	setPointMap(Object.fromEntries([...new Set(poly.flat().map(([x, y]) => `${x}:${y}`))].map((key, i) => [key, labels[i]])));
	toGeogebra(poly);

	const polybool = new PolyBool(2 ** -10);

	const normalizedRegions = polybool.normalize(poly);

	assert.strictEqual(normalizedRegions[0].map(pointLabel).join(''), 'BDEA');
	assert.strictEqual(normalizedRegions.map(region => region.map(pointLabel).join('')).join(','), 'BDEA');
});

test('9', () => {
	/** @type {Vec2[][]} */
	const poly = [[
		[623027.4021508485, 6556705.085067615], // A
		[623027.4021509635, 6556705.085067808], // B
		[623027.4021507857, 6556705.085069574], // C
	]];

	const labels = 'ABC';
	setPointMap(Object.fromEntries([...new Set(poly.flat().map(([x, y]) => `${x}:${y}`))].map((key, i) => [key, labels[i]])));
	toGeogebra(poly);

	const polybool = new PolyBool(2 ** -10);

	const normalizedRegions = polybool.normalize(poly);

	assert.strictEqual(normalizedRegions.length, 0);
});

test('10', () => {
	/** @type {Vec2[][]} */
	const poly = [[
		[0, 0], // A
		[0, 2], // B
		[6.461105154128745, 5.210325929], // C
		[0.75, 1.82], // D
		[7.03573372028768, 5.551446969], // E
		[8, 0], // F
	]];

	const labels = 'ABCDEF';
	setPointMap(Object.fromEntries([...new Set(poly.flat().map(([x, y]) => `${x}:${y}`))].map((key, i) => [key, labels[i]])));
	toGeogebra(poly);

	const polybool = new PolyBool(2 ** -10);

	const segments = polybool.segments({ regions: poly, inverted: false });

	assert.deepStrictEqual(segments.segments.map(({ data, myFill }) => `${segLabel(data)}  fill=${myFill.above}/${myFill.below}`), [
		'A -> B  fill=false/true',
		'D -> C  fill=true/true',
		'B -> C  fill=false/true',
		'C -> E  fill=false/true',
		'A -> F  fill=true/false',
		'E -> F  fill=false/true',
	]);

	const normalizedRegions = polybool.normalize(poly);

	assert.strictEqual(normalizedRegions.map(region => region.map(pointLabel).join('')).join(','), 'ECBAF');
});

test.skip('11', () => {
	/** @type {Vec2[][]} */
	const poly = [[
		[652307.36, 6500592.72], // A
		[652311.94, 6500561.67], // B
		[652340, 6500540], // C
		[652309.9703942318, 6500575.022895], // D
	]];

	const labels = 'ABCD';
	setPointMap(Object.fromEntries([...new Set(poly.flat().map(([x, y]) => `${x}:${y}`))].map((key, i) => [key, labels[i]])));
	toGeogebra(poly);

	const polybool = new PolyBool(0);

	const segments = polybool.segments({ regions: [poly[0]], inverted: false });

	assert.deepStrictEqual(segments.segments.map(seg => `${segLabel(seg.data)}   fill=${seg.myFill.above}/${seg.myFill.below}`), [
		// 'A -> D   fill=true/false',
		// 'A -> D   fill=false/true',
		'D -> B   fill=true/false',
		'B -> C   fill=true/false',
		'D -> C   fill=false/true',
	]);
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

/**
 * @param {[number, number][]} vertices
 * @returns {number}
 */
function polygonArea(vertices) {
	let a = 0;

	for (let i = 0, l = vertices.length; i < l; i++) {
		const v0 = vertices[i];
		const v1 = vertices[i === l - 1 ? 0 : i + 1];

		a += v0[0] * v1[1];
		a -= v1[0] * v0[1];
	}

	return a / 2;
}
