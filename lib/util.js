import Big from 'big.js';

/**
 * @import { Vec2 } from './types'
 */

/** @type {WeakMap<Vec2, [Big, Big]>} */
const bigCache = new WeakMap();

/**
 * @param {Vec2} vec
 * @returns {[Big, Big]}
 */
export function vecToBigNum(vec) {
	const existing = bigCache.get(vec);

	if (existing != null) {
		return existing;
	}

	/** @type {[Big, Big]} */
	const result = [new Big(vec[0]), new Big(vec[1])];

	bigCache.set(vec, result);

	return result;
}
