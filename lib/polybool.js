//
// polybool - Boolean operations on polygons (union, intersection, etc)
// by Sean Connelly (@velipso), https://sean.fun
// Project Home: https://github.com/velipso/polybool
// SPDX-License-Identifier: 0BSD
//
/* eslint-disable class-methods-use-this */

import { Geometry } from './Geometry.js';
import { Intersecter, SegmentBool } from './Intersecter.js';
import { SegmentChainer } from './SegmentChainer.js';
import * as SegmentSelector from './SegmentSelector.js';

export * from './Segment.js';
export * from './Intersecter.js';
export * from './SegmentSelector.js';
export * from './SegmentChainer.js';

/**
 * @import { Vec2 } from './types'
 */

/**
 * @typedef {{ regions: Vec2[][], inverted: boolean }} Polygon
 * @typedef {{ segments: SegmentBool[], inverted: boolean }} Segments
 * @typedef {{ segments: SegmentBool[], inverted1: boolean, inverted2: boolean }} CombinedSegments
 */

export class PolyBool {
	/** @private @readonly @type {Geometry} */
	geo;

	/**
	 * @param {number} [epsilon]
	 */
	constructor(epsilon) {
		this.geo = new Geometry(epsilon);
	}

	/**
	 * @param {Vec2[][]} regions
	 * @returns {SegmentBool[]}
	 */
	_segments(regions) {
		const selfIntersect = new Intersecter(true, this.geo);
		let pathState;

		for (const region of regions) {
			const lastPoint = region[region.length - 1];

			pathState = {
				start: lastPoint,
				current: lastPoint,
			};

			for (const point of region) {
				selfIntersect.addLine(pathState.current, point, true);
				pathState.current = point;
			}
		}

		return selfIntersect.calculate();
	}

	/**
	 * @param {Polygon} poly
	 * @returns {Segments}
	 */
	segments(poly) {
		return {
			segments: this._segments(poly.regions),
			inverted: poly.inverted,
		};
	}

	/**
	 * @param {SegmentBool[]} segments1
	 * @param {SegmentBool[]} segments2
	 * @returns {SegmentBool[]}
	 */
	_combine(segments1, segments2) {
		const int = new Intersecter(false, this.geo);

		for (const seg of segments1) {
			int.addSegment(new SegmentBool(seg.data, seg.myFill, seg.closed), true);
		}

		for (const seg of segments2) {
			int.addSegment(new SegmentBool(seg.data, seg.myFill, seg.closed), false);
		}

		return int.calculate();
	}

	/**
	 * @param {Segments} segments1
	 * @param {Segments} segments2
	 * @returns {CombinedSegments}
	 */
	combine(segments1, segments2) {
		return {
			segments: this._combine(segments1.segments, segments2.segments),
			inverted1: segments1.inverted,
			inverted2: segments2.inverted,
		};
	}

	/**
	 * @param {CombinedSegments} combined
	 * @returns {Segments}
	 */
	selectUnion(combined) {
		return {
			// eslint-disable-next-line no-nested-ternary
			segments: combined.inverted1
				? combined.inverted2
					? SegmentSelector.intersect(combined.segments)
					: SegmentSelector.difference(combined.segments)
				: combined.inverted2
					? SegmentSelector.differenceRev(combined.segments)
					: SegmentSelector.union(combined.segments),
			inverted: combined.inverted1 || combined.inverted2,
		};
	}

	/**
	 * @param {CombinedSegments} combined
	 * @returns {Segments}
	 */
	selectIntersect(combined) {
		return {
			// eslint-disable-next-line no-nested-ternary
			segments: combined.inverted1
				? combined.inverted2
					? SegmentSelector.union(combined.segments)
					: SegmentSelector.differenceRev(combined.segments)
				: combined.inverted2
					? SegmentSelector.difference(combined.segments)
					: SegmentSelector.intersect(combined.segments),
			inverted: combined.inverted1 && combined.inverted2,
		};
	}

	/**
	 * @param {CombinedSegments} combined
	 * @returns {Segments}
	 */
	selectDifference(combined) {
		return {
			// eslint-disable-next-line no-nested-ternary
			segments: combined.inverted1
				? combined.inverted2
					? SegmentSelector.differenceRev(combined.segments)
					: SegmentSelector.union(combined.segments)
				: combined.inverted2
					? SegmentSelector.intersect(combined.segments)
					: SegmentSelector.difference(combined.segments),
			inverted: combined.inverted1 && !combined.inverted2,
		};
	}

	/**
	 * @param {CombinedSegments} combined
	 * @returns {Segments}
	 */
	selectDifferenceRev(combined) {
		return {
			// eslint-disable-next-line no-nested-ternary
			segments: combined.inverted1
				? combined.inverted2
					? SegmentSelector.difference(combined.segments)
					: SegmentSelector.intersect(combined.segments)
				: combined.inverted2
					? SegmentSelector.union(combined.segments)
					: SegmentSelector.differenceRev(combined.segments),
			inverted: !combined.inverted1 && combined.inverted2,
		};
	}

	/**
	 * @param {CombinedSegments} combined
	 * @returns {Segments}
	 */
	selectXor(combined) {
		return {
			segments: SegmentSelector.xor(combined.segments),
			inverted: combined.inverted1 !== combined.inverted2,
		};
	}

	/**
	 * @param {SegmentBool[]} segments
	 * @returns {Vec2[][]}
	 */
	_polygon(segments) {
		return SegmentChainer(segments, this.geo)
			.filter(region => region.length > 0)
			.map(region => region.map(({ p1 }) => p1));
	}

	/**
	 * @param {Segments} segments
	 * @returns {Polygon}
	 */
	polygon(segments) {
		return {
			regions: this._polygon(segments.segments),
			inverted: segments.inverted,
		};
	}

	/**
	 * @param {Vec2[][]} regions
	 * @returns {Vec2[][]}
	 */
	normalize(regions) {
		const segments = this._segments(regions).filter(seg => {
			const above = seg.myFill.above && !seg.myFill.below;
			const below = seg.myFill.below && !seg.myFill.above;

			return seg.closed ? above !== below : (!seg.myFill.above || !seg.myFill.below);
		});

		return this._polygon(segments);
	}

	/**
	 * @param {Polygon} poly1
	 * @param {Polygon} poly2
	 * @returns {Polygon}
	 */
	union(poly1, poly2) {
		const seg1 = this.segments(poly1);
		const seg2 = this.segments(poly2);
		const comb = this.combine(seg1, seg2);
		const seg3 = this.selectUnion(comb);

		return this.polygon(seg3);
	}

	/**
	 * @param {Polygon} poly1
	 * @param {Polygon} poly2
	 * @returns {Polygon}
	 */
	intersect(poly1, poly2) {
		const seg1 = this.segments(poly1);
		const seg2 = this.segments(poly2);
		const comb = this.combine(seg1, seg2);
		const seg3 = this.selectIntersect(comb);

		return this.polygon(seg3);
	}

	/**
	 * @param {Polygon} poly1
	 * @param {Polygon} poly2
	 * @returns {Polygon}
	 */
	difference(poly1, poly2) {
		const seg1 = this.segments(poly1);
		const seg2 = this.segments(poly2);
		const comb = this.combine(seg1, seg2);
		const seg3 = this.selectDifference(comb);

		return this.polygon(seg3);
	}

	/**
	 * @param {Polygon} poly1
	 * @param {Polygon} poly2
	 * @returns {Polygon}
	 */
	differenceRev(poly1, poly2) {
		const seg1 = this.segments(poly1);
		const seg2 = this.segments(poly2);
		const comb = this.combine(seg1, seg2);
		const seg3 = this.selectDifferenceRev(comb);

		return this.polygon(seg3);
	}

	/**
	 * @param {Polygon} poly1
	 * @param {Polygon} poly2
	 * @returns {Polygon}
	 */
	xor(poly1, poly2) {
		const seg1 = this.segments(poly1);
		const seg2 = this.segments(poly2);
		const comb = this.combine(seg1, seg2);
		const seg3 = this.selectXor(comb);

		return this.polygon(seg3);
	}
}

const polybool = new PolyBool();

export default polybool;
