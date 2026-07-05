import assert from 'node:assert';
import test, { describe } from 'node:test';
import { PolyBool } from './lib/polybool.js';

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
});
