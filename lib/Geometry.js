//
// polybool - Boolean operations on polygons (union, intersection, etc)
// by Sean Connelly (@velipso), https://sean.fun
// Project Home: https://github.com/velipso/polybool
// SPDX-License-Identifier: 0BSD
//

/**
 * @import { Vec2 } from './types'
 */

export class Geometry {
	/** @private @readonly @type {number} */
	epsilon;

	constructor(epsilon = 2 ** -34) {
		this.epsilon = epsilon;
	}

	/**
	 * @param {number} v
	 * @returns {number}
	 */
	snap0(v) {
		if (Math.abs(v) <= this.epsilon) {
			return 0;
		}

		return v;
	}

	/**
	 * @param {number} v
	 * @returns {number}
	 */
	snap01(v) {
		if (Math.abs(v) <= this.epsilon) {
			return 0;
		}

		if (Math.abs(1 - v) <= this.epsilon) {
			return 1;
		}

		return v;
	}

	/**
	 * @param {Vec2} p1
	 * @param {Vec2} p2
	 * @param {Vec2} p3
	 * @returns {boolean}
	 */
	isCollinear(p1, p2, p3) {
		// does pt1->pt2->pt3 make a straight line?
		// essentially this is just checking to see if
		//   slope(pt1->pt2) === slope(pt2->pt3)
		// if slopes are equal, then they must be collinear, because they share pt2
		const dx1 = p1[0] - p2[0];
		const dy1 = p1[1] - p2[1];
		const dx2 = p2[0] - p3[0];
		const dy2 = p2[1] - p3[1];

		return Math.abs(dx1 * dy2 - dx2 * dy1) <= this.epsilon;
	}

	/**
	 * @param {Vec2} a
	 * @param {Vec2} b
	 * @returns {boolean}
	 */
	isEqualVec2(a, b) {
		return a === b || (
			Math.abs(a[0] - b[0]) <= this.epsilon
			&& Math.abs(a[1] - b[1]) <= this.epsilon
		);
	}

	/**
	 * @param {Vec2} a
	 * @param {Vec2} b
	 * @returns {-1 | 0 | 1}
	 */
	compareVec2(a, b) {
		// returns -1 if a is smaller, 1 if b is smaller, 0 if equal
		if (Math.abs(b[0] - a[0]) <= this.epsilon) {
			// eslint-disable-next-line no-nested-ternary
			return Math.abs(b[1] - a[1]) <= this.epsilon ? 0 : a[1] < b[1] ? -1 : 1;
		}

		return a[0] < b[0] ? -1 : 1;
	}
}
