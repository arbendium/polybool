//
// polybool - Boolean operations on polygons (union, intersection, etc)
// by Sean Connelly (@velipso), https://sean.fun
// Project Home: https://github.com/velipso/polybool
// SPDX-License-Identifier: 0BSD
//

/**
 * @import { Geometry } from './Geometry.js'
 * @import { Vec2 } from './types'
 */

export class Segment {
	/** @readonly @type {Vec2} */
	p0;

	/** @readonly @type {Vec2} */
	p1;

	/** @readonly @type {Geometry} */
	geo;

	/**
	 * @param {Vec2} p0
	 * @param {Vec2} p1
	 * @param {Geometry} geo
	 */
	constructor(p0, p1, geo) {
		this.p0 = p0;
		this.p1 = p1;
		this.geo = geo;
	}

	/**
	 * @returns {Segment}
	 */
	reverse() {
		return new Segment(this.p1, this.p0, this.geo);
	}

	/**
	 * @param {Vec2} p
	 * @returns {boolean}
	 */
	pointOn(p) {
		return this.geo.isCollinear(p, this.p0, this.p1);
	}
}
