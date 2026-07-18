import assert from 'node:assert';
import test, { describe } from 'node:test';
import polybool, { PolyBool } from './lib/polybool.js';

/**
 * @import { Vec2 } from './lib/types'
 */

describe('overlapping segments', () => {
	test('completely overlapping', () => {
		const polybool = new PolyBool(0);

		const poly1 = {
			regions: [
				/** @type {Vec2[]} */([
					[-1, -1],
					[-1, 1],
					[1, 1],
				]),
			],
			inverted: false,
		};

		const poly2 = {
			regions: [
				/** @type {Vec2[]} */([
					[1, 1],
					[1, -1],
					[-1, -1],
				]),
			],
			inverted: false,
		};

		const poly = polybool.union(poly1, poly2);

		assert.deepStrictEqual(poly, {
			regions: [[
				[1, 1],
				[1, -1],
				[-1, -1],
				[-1, 1],
			]],
			inverted: false,
		});
	});

	test('partially overlapping', () => {
		const polybool = new PolyBool(0);

		const poly1 = {
			regions: [
				/** @type {Vec2[]} */([
					[-2, -2],
					[-2, 1],
					[1, 1],
				]),
			],
			inverted: false,
		};

		const poly2 = {
			regions: [
				/** @type {Vec2[]} */([
					[2, 2],
					[2, -1],
					[-1, -1],
				]),
			],
			inverted: false,
		};

		const poly = polybool.union(poly1, poly2);

		assert.deepStrictEqual(poly, {
			regions: [[
				[2, 2],
				[2, -1],
				[-1, -1],
				[-2, -2],
				[-2, 1],
				[1, 1],
			]],
			inverted: false,
		});
	});

	test('first completely overlapping second', () => {
		const polybool = new PolyBool(0);

		const poly1 = {
			regions: [
				/** @type {Vec2[]} */([
					[-1, -1],
					[-1, 1],
					[1, 1],
				]),
			],
			inverted: false,
		};

		const poly2 = {
			regions: [
				/** @type {Vec2[]} */([
					[2, 2],
					[2, -1],
					[-1, -1],
				]),
			],
			inverted: false,
		};

		const poly = polybool.union(poly1, poly2);

		assert.deepStrictEqual(poly, {
			regions: [[
				[2, 2],
				[2, -1],
				[-1, -1],
				[-1, 1],
				[1, 1],
			]],
			inverted: false,
		});
	});
});

describe('handedness', () => {
	test('1', () => {
		/** @type {Vec2[][]} */
		const poly = [[
			[0, 0],
			[1, 0],
			[1, 1],
			[0, 1],
		]];

		const polybool = new PolyBool(0);

		const result = polybool.normalize(poly);

		assert.deepStrictEqual(result, [[
			[1, 1],
			[1, 0],
			[0, 0],
			[0, 1],
		]]);
	});
	test('2', () => {
		/** @type {Vec2[][]} */
		const poly = [[
			[0, 0],
			[0, 1],
			[1, 1],
			[1, 0],
		]];

		const polybool = new PolyBool(0);

		const result = polybool.normalize(poly);

		assert.deepStrictEqual(result, [[
			[1, 1],
			[1, 0],
			[0, 0],
			[0, 1],
		]]);
	});
	test('3', () => {
		/** @type {Vec2[][]} */
		const poly = [[
			[631629, 6536870], // A
			[631566, 6537091], // B
			[631565, 6537096], // C
			[631561, 6537107], // D
			[631591, 6537141], // E
			[631597, 6537125], // F
			[631598, 6537121], // G
			[631678, 6536894], // H
		]];

		const polybool = new PolyBool(0);

		const result = polybool.normalize(poly);

		assert.deepStrictEqual(result, [[
			[631629, 6536870],
			[631566, 6537091],
			[631565, 6537096],
			[631561, 6537107],
			[631591, 6537141],
			[631597, 6537125],
			[631598, 6537121],
			[631678, 6536894],
		]]);
	});
});

describe('normalize', () => {
	const poly = /** @type {Vec2[][]} */([[
		[4.533858799999997, 0],
		[2.474388921413123, 19.696512143235665],
		[2.474388952146768, 19.696511174660188],
		[0, 2.172040200000012],
	]]);

	test('increased tolerance', () => {
		const polybool = new PolyBool(0.00000001);

		const result = polybool.normalize(poly);

		assert.deepStrictEqual(result, [[
			[4.533858799999997, 0],
			[0, 2.172040200000012],
			[2.474388952146768, 19.696511174660188],
			[2.474388921413123, 19.696512143235665],
		]]);
	});

	test('zero tolerance', () => {
		const polybool = new PolyBool(0);

		const result = polybool.normalize(poly);

		assert.deepStrictEqual(result, [[
			[4.533858799999997, 0],
			[0, 2.172040200000012],
			[2.474388952146768, 19.696511174660188],
			[2.474388921413123, 19.696512143235665],
		]]);
	});

	test('splitting', () => {
		const poly = /** @type {Vec2[][]} */([
			[
				[625803.07, 6497216.08], // E
				[625778.5867819233, 6497091.1383181475], // D
				[625736.0738600261, 6497134.535299496], // C
				[625744.21, 6497132.16], // B
				[625694.68, 6497146.62], // A
				[625803.07, 6497216.08], // E
			],
		]);

		const polybool = new PolyBool(2 ** -31);
		// const polybool = new PolyBool();
		const result = polybool.normalize(poly);

		assert.deepStrictEqual(result, [[
			[625694.68, 6497146.62],
			[625736.0738600261, 6497134.535299496],
			[625778.5867819233, 6497091.1383181475],
			[625803.07, 6497216.08],
		]]);
	});

	test('something', () => {
		const poly = /** @type {Vec2[][]} */([
			[
				[652409.0357337203, 6488655.551446969],
				[652419.41, 6488661.71],
				[652419.79, 6488661.45],
				[652438.31, 6488646.63],
				[652499.48, 6488584.59],
				[652498.76, 6488583.95],
				[652497.7975219408, 6488583.096578901],
				[652462.2689703457, 6488612.955759259],
				[652416.2961262726, 6488651.777507303],
				[652409.0357337203, 6488655.551446969],
			],
			[
				[652334.8038546685, 6488730.518645474],
				[652336.07, 6488729.61],
				[652366.08, 6488697.75],
				[652419.41, 6488661.71],
				[652408.4611051541, 6488655.210325929],
				[652396.4023300858, 6488659.525609329],
				[652391.731841356, 6488663.354804251],
				[652370.1222304833, 6488689.337948801],
				[652359.0453885747, 6488696.427214444],
				[652341.676324969, 6488710.290957959],
				[652334.5798993404, 6488724.805999141],
				[652319.6335432413, 6488740.8605312435],
				[652321.62, 6488739.98],
				[652334.8038546685, 6488730.518645474],
			],
		]);

		const polybool = new PolyBool(0);
		// const polybool = new PolyBool();
		const result = polybool.normalize(poly);

		assert.deepStrictEqual(result, [
			[
				[652409.0357337203, 6488655.551446969],
				[652419.41, 6488661.71],
				[652419.79, 6488661.45],
				[652438.31, 6488646.63],
				[652499.48, 6488584.59],
				[652498.76, 6488583.95],
				[652497.7975219408, 6488583.096578901],
				[652462.2689703457, 6488612.955759259],
				[652416.2961262726, 6488651.777507303],
				[652409.0357337203, 6488655.551446969],
			],
			[
				[652334.8038546685, 6488730.518645474],
				[652336.07, 6488729.61],
				[652366.08, 6488697.75],
				[652419.41, 6488661.71],
				[652408.4611051541, 6488655.210325929],
				[652396.4023300858, 6488659.525609329],
				[652391.731841356, 6488663.354804251],
				[652370.1222304833, 6488689.337948801],
				[652359.0453885747, 6488696.427214444],
				[652341.676324969, 6488710.290957959],
				[652334.5798993404, 6488724.805999141],
				[652319.6335432413, 6488740.8605312435],
				[652321.62, 6488739.98],
				[652334.8038546685, 6488730.518645474],
			],
		]);
	});
});
