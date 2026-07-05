//
// polybool - Boolean operations on polygons (union, intersection, etc)
// by Sean Connelly (@velipso), https://sean.fun
// Project Home: https://github.com/velipso/polybool
// SPDX-License-Identifier: 0BSD
//

import { Segment } from './Segment.js';
import { vecToBigNum } from './util.js';

/**
 * @import { Geometry } from './Geometry.js'
 * @import { Vec2 } from './types'
 */

/**
 * @typedef {{ kind: 'tValuePairs', tValuePairs: Vec2[] }} SegmentTValuePairs
 * @typedef {{ kind: 'tRangePairs', tStart: Vec2, tEnd: Vec2 }} SegmentTRangePairs
 * @typedef {{ above: boolean | undefined, below: boolean | undefined }} SegmentBoolFill
 * @typedef {{
 *   before: EventBool | undefined
 *   after: EventBool | undefined
 *   insert: (node: EventBool) => EventBool
 * }} ListBoolTransition
 */

export class SegmentBool {
	/** @type {Segment} */
	data;

	/** @type {SegmentBoolFill} */
	myFill;

	/** @type {SegmentBoolFill | undefined} */
	otherFill;

	/** @readonly @type {boolean} */
	closed;

	/**
	 * @param {Segment} data
	 * @param {SegmentBoolFill | undefined} fill
	 * @param {boolean} closed
	 */
	constructor(data, fill, closed) {
		this.data = data;
		this.myFill = {
			above: fill?.above,
			below: fill?.below,
		};
		this.closed = closed;
	}
}

export class EventBool {
	/** @type {boolean} */
	isStart;

	/** @type {Vec2} */
	p;

	/** @type {SegmentBool} */
	seg;

	/** @type {boolean} */
	primary;

	/** @type {EventBool} */
	// @ts-expect-error
	other;

	/** @type {EventBool | undefined} */
	status;

	/**
	 * @param {boolean} isStart
	 * @param {Vec2} p
	 * @param {SegmentBool} seg
	 * @param {boolean} primary
	 */
	constructor(isStart, p, seg, primary) {
		this.isStart = isStart;
		this.p = p;
		this.seg = seg;
		this.primary = primary;
	}
}

export class ListBool {
	/** @readonly @type {EventBool[]} */
	nodes = [];

	/**
	 * @param {EventBool} node
	 */
	remove(node) {
		const i = this.nodes.indexOf(node);

		if (i >= 0) {
			this.nodes.splice(i, 1);
		}
	}

	/**
	 * @param {EventBool} node
	 */
	getIndex(node) {
		return this.nodes.indexOf(node);
	}

	isEmpty() {
		return this.nodes.length <= 0;
	}

	getHead() {
		return this.nodes[0];
	}

	removeHead() {
		this.nodes.shift();
	}

	/**
	 * @param {EventBool} node
	 * @param {(node: EventBool) => number} check
	 */
	insertBefore(node, check) {
		this.findTransition(node, check).insert(node);
	}

	/**
	 * @param {EventBool} node
	 * @param {(node: EventBool) => number} check
	 * @returns {ListBoolTransition}
	 */
	findTransition(node, check) {
		// bisect to find the transition point
		/** @type {(a: EventBool, b: EventBool) => number} */
		const compare = (a, b) => check(b) - check(a);
		let i = 0;
		let high = this.nodes.length;

		while (i < high) {
			// eslint-disable-next-line no-bitwise
			const mid = (i + high) >> 1;

			if (compare(this.nodes[mid], node) > 0) {
				high = mid;
			} else {
				i = mid + 1;
			}
		}

		return {
			before: i > 0 ? this.nodes[i - 1] : undefined,
			after: this.nodes[i],
			insert: node => {
				this.nodes.splice(i, 0, node);

				return node;
			},
		};
	}
}

export class Intersecter {
	/** @private @readonly @type {boolean} */
	selfIntersection;

	/** @private @readonly @type {Geometry} */
	geo;

	/** @private @readonly */
	events = new ListBool();

	/** @private @readonly */
	status = new ListBool();

	/**
	 * @param {boolean} selfIntersection
	 * @param {Geometry} geo
	 */
	constructor(selfIntersection, geo) {
		this.selfIntersection = selfIntersection;
		this.geo = geo;
	}

	/**
	 * @param {boolean} aStart
	 * @param {Vec2} a1
	 * @param {Vec2} a2
	 * @param {Segment} aSeg
	 * @param {boolean} bStart
	 * @param {Vec2} b1
	 * @param {Vec2} b2
	 * @param {Segment} bSeg
	 * @returns {number}
	 */
	compareEvents(aStart, a1, a2, aSeg, bStart, b1, b2, bSeg) {
		// compare the selected points first
		const comp = this.geo.compareVec2(a1, b1);

		if (comp !== 0) {
			return comp;
		}

		// the selected points are the same

		if (this.geo.isEqualVec2(a2, b2)) {
			// if the non-selected points are the same too...
			return 0; // then the segments are equal
		}

		if (aStart !== bStart) {
			// if one is a start and the other isn't...
			return aStart ? 1 : -1; // favor the one that isn't the start
		}

		return this.compareSegments(bSeg, aSeg);
	}

	/**
	 * @param {EventBool} ev
	 */
	addEvent(ev) {
		this.events.insertBefore(ev, here => {
			if (here === ev) {
				return 0;
			}

			return this.compareEvents(
				ev.isStart,
				ev.p,
				ev.other.p,
				ev.seg.data,
				here.isStart,
				here.p,
				here.other.p,
				here.seg.data,
			);
		});
	}

	/**
	 * @param {EventBool} ev
	 * @param {Vec2} p
	 * @returns {EventBool}
	 */
	divideEvent(ev, p) {
		const [left, right] = [
			new Segment(ev.seg.data.p0, p, this.geo),
			new Segment(p, ev.seg.data.p1, this.geo),
		];

		const ns = new SegmentBool(right, ev.seg.myFill, ev.seg.closed);

		// slides an end backwards
		//   (start)------------(end)    to:
		//   (start)---(end)
		this.events.remove(ev.other);
		ev.seg.data = left;
		ev.other.p = p;
		this.addEvent(ev.other);

		return this.addSegment(ns, ev.primary);
	}

	/**
	 * @param {SegmentBool} seg
	 * @param {boolean} primary
	 * @returns {EventBool}
	 */
	addSegment(seg, primary) {
		const evStart = new EventBool(true, seg.data.p0, seg, primary);
		const evEnd = new EventBool(false, seg.data.p1, seg, primary);
		evStart.other = evEnd;
		evEnd.other = evStart;
		this.addEvent(evStart);
		this.addEvent(evEnd);

		return evStart;
	}

	/**
	 * @param {Vec2} from
	 * @param {Vec2} to
	 * @param {boolean} primary
	 */
	addLine(from, to, primary) {
		const f = this.geo.compareVec2(from, to);

		if (f === 0) {
			// points are equal, so we have a zero-length segment
			return; // skip it
		}

		const seg = new SegmentBool(
			new Segment(f < 0 ? from : to, f < 0 ? to : from, this.geo),
			undefined,
			true,
		);
		this.addSegment(seg, primary);
	}

	/**
	 * @param {Segment} seg1
	 * @param {Segment} seg2
	 * @returns {number}
	 */
	// eslint-disable-next-line class-methods-use-this
	compareSegments(seg1, seg2) {
		// TODO:
		//  This is where some of the curve instability comes from... we need to reliably sort
		//  segments, but this is surprisingly hard when it comes to curves.
		//
		//  The easy case is something like:
		//
		//             C   A - - - D
		//               \
		//                 \
		//                   B
		//  A is clearly above line C-B, which is easily calculated... however, once curves are
		//  introduced, it's not so obvious without using some heuristic which will fail at times.
		//
		let A = seg1.p0;
		const B = seg2.p1;
		const C = seg2.p0;

		if (seg2.pointOn(A)) {
			// A intersects seg2 somehow (possibly sharing a start point, or maybe just splitting it)
			//
			//   AC - - - - D
			//      \
			//        \
			//          B
			//
			// so grab seg1's second point (D) instead
			A = seg1.p1;

			if (seg2.pointOn(A)) {
				return 0;
			}
		}

		// fallthrough to this calculation which determines if A is on one side or another of C-B
		const [Ax, Ay] = A;
		const [Bx, By] = B;
		const [Cx, Cy] = C;

		return Math.sign((Bx - Ax) * (Cy - Ay) - (By - Ay) * (Cx - Ax));
	}

	/**
	 * @param {EventBool} ev
	 * @returns {ListBoolTransition}
	 */
	statusFindSurrounding(ev) {
		return this.status.findTransition(ev, here => {
			if (ev === here) {
				return 0;
			}

			const c = this.compareSegments(ev.seg.data, here.seg.data);

			return c === 0 ? -1 : c;
		});
	}

	/**
	 * @param {EventBool} ev1
	 * @param {EventBool} ev2
	 * @returns {EventBool | undefined}
	 */
	checkIntersection(ev1, ev2) {
		// returns the segment equal to ev1, or undefined if nothing equal
		const seg1 = ev1.seg;
		const seg2 = ev2.seg;

		const { geo } = seg1.data;
		const a0 = vecToBigNum(seg1.data.p0);
		const a1 = vecToBigNum(seg1.data.p1);
		const b0 = vecToBigNum(seg2.data.p0);
		const b1 = vecToBigNum(seg2.data.p1);

		const adx = a1[0].minus(a0[0]);
		const ady = a1[1].minus(a0[1]);
		const bdx = b1[0].minus(b0[0]);
		const bdy = b1[1].minus(b0[1]);

		const axb = adx.times(bdy).minus(ady.times(bdx));

		if (geo.snap0(axb.toNumber()) === 0) {
			// lines are coincident or parallel
			if (!seg1.data.pointOn(seg2.data.p0)) {
				// they're not coincident, so they're parallel, with no intersections
				return;
			}

			// otherwise, segments are on top of each other somehow (aka coincident)
			const [aMin, aMax] = projectSegmentOntoSegment(seg1.data, seg2.data);
			const tAMin = geo.snap01(aMin);
			const tAMax = geo.snap01(aMax);

			if (tAMax < 0 || tAMin > 1) {
				return;
			}

			const [bMin, bMax] = projectSegmentOntoSegment(seg2.data, seg1.data);
			const tBMin = geo.snap01(bMin);
			const tBMax = geo.snap01(bMax);

			if (tBMax < 0 || tBMin > 1) {
				return;
			}

			if (
				(tAMin === 1 && tAMax >= 1 && tBMin <= 0 && tBMax === 0)
				|| (tAMin <= 0 && tAMax === 0 && tBMin === 1 && tBMax >= 1)
			) {
				return; // segments touch at endpoints... no intersection
			}

			if (tAMin <= 0 && tBMin <= 0) {
				if (tAMax < 1) {
					//  (a1)----------(a2)
					//  (b1)---(b2)
					this.divideEvent(ev1, seg2.data.p1);
				} else if (tBMax < 1) {
					//  (a1)---(a2)
					//  (b1)----------(b2)
					this.divideEvent(ev2, seg1.data.p1);
				}

				return ev2;
			}

			if (tBMin > 0 && tBMin < 1) {
				if (tAMax < 1) {
					//         (a1)----------(a2)
					//  (b1)----------(b2)
					this.divideEvent(ev1, seg2.data.p1);
				} else if (tBMax < 1) {
					//         (a1)---(a2)
					//  (b1)-----------------(b2)
					this.divideEvent(ev2, seg1.data.p1);
				}

				//         (a1)---(a2)
				//  (b1)----------(b2)
				this.divideEvent(ev2, seg1.data.p0);
			}
		} else {
			// otherwise, not coincident, so they intersect somewhere
			const dx = a0[0].minus(b0[0]);
			const dy = a0[1].minus(b0[1]);

			const shitA = bdx.times(dy).minus(bdy.times(dx));
			const shitB = adx.times(dy).minus(ady.times(dx));

			/** @type {(x: Big) => boolean} */
			const inRangeInclusive = axb.gt(0)
				? x => x.gte(0) && x.lte(axb)
				: x => x.lte(0) && x.gte(axb);

			if (inRangeInclusive(shitA) && inRangeInclusive(shitB)) {
				// process a single intersection

				const tA = shitA.div(axb).toNumber();

				/** @type {Vec2} */
				let p = [
					seg1.data.p0[0] + (seg1.data.p1[0] - seg1.data.p0[0]) * tA,
					seg1.data.p0[1] + (seg1.data.p1[1] - seg1.data.p0[1]) * tA,
				];

				if (this.geo.isEqualVec2(seg2.data.p0, p)) {
					p = seg2.data.p0;
				} else if (this.geo.isEqualVec2(seg2.data.p1, p)) {
					p = seg2.data.p1;
				} else if (this.geo.isEqualVec2(seg1.data.p0, p)) {
					p = seg1.data.p0;
				} else if (this.geo.isEqualVec2(seg1.data.p1, p)) {
					p = seg1.data.p1;
				}

				if (!this.geo.isEqualVec2(seg1.data.p0, p) && !this.geo.isEqualVec2(seg1.data.p1, p)) {
					this.divideEvent(ev1, p);
				}

				if (!this.geo.isEqualVec2(seg2.data.p0, p) && !this.geo.isEqualVec2(seg2.data.p1, p)) {
					this.divideEvent(ev2, p);
				}
			}
		}
	}

	calculate() {
		/** @type {SegmentBool[]} */
		const segments = [];

		while (!this.events.isEmpty()) {
			const ev = this.events.getHead();

			if (ev.isStart) {
				const surrounding = this.statusFindSurrounding(ev);
				const above = surrounding.before;
				const below = surrounding.after;

				const eve = (
					above != null
						? this.checkIntersection(ev, above)
						: undefined
				)
					?? (
						below != null
							? this.checkIntersection(ev, below)
							: undefined
					);

				if (eve != null) {
					// ev and eve are equal
					// we'll keep eve and throw away ev

					// merge ev.seg's fill information into eve.seg

					if (this.selfIntersection) {
						/** @type {boolean} */
						let toggle; // are we a toggling edge?

						if (ev.seg.myFill.below == null) {
							toggle = ev.seg.closed;
						} else {
							toggle = ev.seg.myFill.above !== ev.seg.myFill.below;
						}

						// merge two segments that belong to the same polygon
						// think of this as sandwiching two segments together, where
						// `eve.seg` is the bottom -- this will cause the above fill flag to
						// toggle
						if (toggle) {
							eve.seg.myFill.above = !eve.seg.myFill.above;
						}
					} else {
						// merge two segments that belong to different polygons
						// each segment has distinct knowledge, so no special logic is
						// needed
						// note that this can only happen once per segment in this phase,
						// because we are guaranteed that all self-intersections are gone
						eve.seg.otherFill = ev.seg.myFill;
					}

					this.events.remove(ev.other);
					this.events.remove(ev);
				}

				if (this.events.getHead() !== ev) {
					// something was inserted before us in the event queue, so loop back
					// around and process it before continuing
					continue;
				}

				//
				// calculate fill flags
				//
				if (this.selfIntersection) {
					/** @type {boolean} */
					let toggle; // are we a toggling edge?

					if (ev.seg.myFill.below == null) {
						// if we are new then we toggle if we're part of a closed path
						toggle = ev.seg.closed;
					} else {
						// we are a segment that has previous knowledge from a division
						// calculate toggle
						toggle = ev.seg.myFill.above !== ev.seg.myFill.below;
					}

					// next, calculate whether we are filled below us
					if (!below) {
						// if nothing is below us, then we're not filled
						ev.seg.myFill.below = false;
					} else {
						// otherwise, we know the answer -- it's the same if whatever is
						// below us is filled above it
						ev.seg.myFill.below = below.seg.myFill.above;
					}

					// since now we know if we're filled below us, we can calculate
					// whether we're filled above us by applying toggle to whatever is
					// below us
					ev.seg.myFill.above = toggle
						? !ev.seg.myFill.below
						: ev.seg.myFill.below;
				} else {
					// now we fill in any missing transition information, since we are
					// all-knowing at this point

					// eslint-disable-next-line no-lonely-if
					if (ev.seg.otherFill == null) {
						// if we don't have other information, then we need to figure out if
						// we're inside the other polygon
						/** @type {boolean | undefined} */
						let inside;

						if (!below) {
							// if nothing is below us, then we're not filled
							inside = false;
						} else {
							// otherwise, something is below us
							// so copy the below segment's other polygon's above
							// eslint-disable-next-line no-lonely-if
							if (ev.primary === below.primary) {
								if (below.seg.otherFill == null) {
									throw new Error(
										'PolyBool: Unexpected state of otherFill (null)',
									);
								}

								inside = below.seg.otherFill.above;
							} else {
								inside = below.seg.myFill.above;
							}
						}

						ev.seg.otherFill = {
							above: inside,
							below: inside,
						};
					}
				}

				// insert the status and remember it for later removal
				ev.other.status = surrounding.insert(ev);
			} else {
				// end
				const st = ev.status;

				if (st == null) {
					throw new Error(
						'PolyBool: Zero-length segment detected; your epsilon is '
						+ 'probably too small or too large',
					);
				}

				// removing the status will create two new adjacent edges, so we'll need
				// to check for those
				const i = this.status.getIndex(st);

				if (i > 0 && i < this.status.nodes.length - 1) {
					const before = this.status.nodes[i - 1];
					const after = this.status.nodes[i + 1];
					this.checkIntersection(before, after);
				}

				// remove the status
				this.status.remove(st);

				// if we've reached this point, we've calculated everything there is to
				// know, so save the segment for reporting
				if (!ev.primary) {
					// make sure `seg.myFill` actually points to the primary polygon
					// though
					if (!ev.seg.otherFill) {
						throw new Error('PolyBool: Unexpected state of otherFill (null)');
					}

					const s = ev.seg.myFill;
					ev.seg.myFill = ev.seg.otherFill;
					ev.seg.otherFill = s;
				}

				segments.push(ev.seg);
			}

			// remove the event and continue
			this.events.removeHead();
		}

		return segments;
	}
}

/**
 * @param {Segment} baseSegment
 * @param {Segment} otherSegment
 * @returns {[number, number]}
 */
function projectSegmentOntoSegment(baseSegment, otherSegment) {
	const dx = baseSegment.p1[0] - baseSegment.p0[0];
	const dy = baseSegment.p1[1] - baseSegment.p0[1];
	const dist = dx * dx + dy * dy;

	const p0dot = (otherSegment.p0[0] - baseSegment.p0[0]) * dx
		+ (otherSegment.p0[1] - baseSegment.p0[1]) * dy;

	const p1dot = (otherSegment.p1[0] - baseSegment.p0[0]) * dx
		+ (otherSegment.p1[1] - baseSegment.p0[1]) * dy;

	return [
		Math.min(p0dot, p1dot) / dist,
		Math.max(p0dot, p1dot) / dist,
	];
}
