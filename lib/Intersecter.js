//
// polybool - Boolean operations on polygons (union, intersection, etc)
// by Sean Connelly (@velipso), https://sean.fun
// Project Home: https://github.com/velipso/polybool
// SPDX-License-Identifier: 0BSD
//

import Big from 'big.js';
import { Segment } from './Segment.js';
import { pointLabel, segLabel } from './pointMap.js';

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

	/**
	 * @param {Segment} data
	 * @param {SegmentBoolFill} [fill]
	 */
	constructor(data, fill) {
		this.data = data;
		this.myFill = {
			above: fill?.above,
			below: fill?.below,
		};
	}
}

export class EventBool {
	/** @readonly @type {boolean} */
	isStart;

	/** @type {Vec2} */
	p;

	/** @readonly @type {SegmentBool} */
	seg;

	/** @readonly @type {boolean} */
	primary;

	/** @readonly @type {EventBool} */
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
		this.findTransition(check).insert(node);
	}

	/**
	 * @param {(node: EventBool) => number} check
	 * @returns {ListBoolTransition}
	 */
	findTransition(check) {
		// bisect to find the transition point
		let i = 0;
		let high = this.nodes.length;

		while (i < high) {
			// eslint-disable-next-line no-bitwise
			const mid = (i + high) >> 1;

			if (check(this.nodes[mid]) < 0) {
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
	 * @param {EventBool} ev
	 */
	addEvent(ev) {
		this.events.insertBefore(ev, here => compareEvents(ev, here, this.geo));
	}

	/**
	 * @param {EventBool} ev
	 * @param {Vec2} p
	 * @returns {EventBool}
	 */
	divideEvent(ev, p) {
		// debugger;
		const [left, right] = [
			new Segment(ev.seg.data.p0, p, this.geo),
			new Segment(p, ev.seg.data.p1, this.geo),
		];

		const ns = new SegmentBool(right, ev.seg.myFill);

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
		// @ts-expect-error
		evStart.other = evEnd;
		// @ts-expect-error
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

		const seg = new SegmentBool(new Segment(f < 0 ? from : to, f < 0 ? to : from, this.geo));
		this.addSegment(seg, primary);
	}

	/**
	 * @param {EventBool} ev
	 * @returns {ListBoolTransition}
	 */
	statusFindSurrounding(ev) {
		return this.status.findTransition(here => {
			if (ev === here) {
				return 0;
			}

			return compareSegments(ev.seg.data, here.seg.data) || -1;
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

		if (axb.abs().lte(geo.epsilon)) {
			// lines are coincident or parallel
			if (!seg1.data.pointOn(seg2.data.p0)) {
				// they're not coincident, so they're parallel, with no intersections
				return;
			}

			const a1b1 = geo.compareVec2(seg1.data.p0, seg2.data.p0);
			const a1b2 = geo.compareVec2(seg1.data.p0, seg2.data.p1);
			const a2b2 = geo.compareVec2(seg1.data.p1, seg2.data.p1);

			if (a1b1 === 0) {
				if (a2b2 > 0) {
					//  (a1)----------(a2)
					//  (b1)---(b2)
					this.divideEvent(ev1, seg2.data.p1);
				} else if (a2b2 < 0) {
					//  (a1)---(a2)
					//  (b1)----------(b2)
					this.divideEvent(ev2, seg1.data.p1);
				}

				return ev2;
			}

			if (a1b1 > 0 && a1b2 < 0) {
				if (a2b2 > 0) {
					//         (a1)----------(a2)
					//  (b1)----------(b2)
					this.divideEvent(ev1, seg2.data.p1);
				} else if (a2b2 < 0) {
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

				/** @type {Vec2} */
				let p = [
					a0[0].plus(a1[0].minus(a0[0]).times(shitA).div(axb)).toNumber(),
					a0[1].plus(a1[1].minus(a0[1]).times(shitA).div(axb)).toNumber(),
				];

				if (geo.isEqualVec2(seg2.data.p0, p)) {
					p = seg2.data.p0;
				} else if (geo.isEqualVec2(seg2.data.p1, p)) {
					p = seg2.data.p1;
				} else if (geo.isEqualVec2(seg1.data.p0, p)) {
					p = seg1.data.p0;
				} else if (geo.isEqualVec2(seg1.data.p1, p)) {
					p = seg1.data.p1;
				}

				if (!geo.isEqualVec2(seg1.data.p0, p) && !geo.isEqualVec2(seg1.data.p1, p)) {
					this.divideEvent(ev1, p);
				}

				if (!geo.isEqualVec2(seg2.data.p0, p) && !geo.isEqualVec2(seg2.data.p1, p)) {
					this.divideEvent(ev2, p);
				}
			}
		}
	}

	calculate() {
		/** @type {SegmentBool[]} */
		const segments = [];

		while (!this.events.isEmpty()) {
			// console.log('Event queue:');

			// for (const event of this.events.nodes) {
			// 	console.log(`${pointLabel(event.p)} for ${segLabel(event.seg.data)}`);
			// }

			// console.log('Status:');

			// for (const event of this.status.nodes) {
			// 	console.log(`${pointLabel(event.p)} for ${segLabel(event.seg.data)}`);
			// }

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
						const toggle = ev.seg.myFill.below == null
							|| ev.seg.myFill.above !== ev.seg.myFill.below;

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
					const toggle = ev.seg.myFill.below == null || ev.seg.myFill.above !== ev.seg.myFill.below;

					ev.seg.myFill.below = below != null && below.seg.myFill.above;

					// since now we know if we're filled below us, we can calculate
					// whether we're filled above us by applying toggle to whatever is
					// below us
					ev.seg.myFill.above = toggle
						? !ev.seg.myFill.below
						: ev.seg.myFill.below;
				} else if (ev.seg.otherFill == null) {
					// now we fill in any missing transition information, since we are
					// all-knowing at this point

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

/** @type {WeakMap<Vec2, [Big, Big]>} */
const bigCache = new WeakMap();

/**
 * @param {Vec2} vec
 * @returns {[Big, Big]}
 */
function vecToBigNum(vec) {
	const existing = bigCache.get(vec);

	if (existing != null) {
		return existing;
	}

	/** @type {[Big, Big]} */
	const result = [new Big(vec[0]), new Big(vec[1])];

	bigCache.set(vec, result);

	return result;
}

/**
 * @param {EventBool} eventA
 * @param {EventBool} eventB
 * @param {Geometry} geo
 * @returns {number}
 */
export function compareEvents(eventA, eventB, geo) {
	if (eventA === eventB) {
		return 0;
	}

	const a1 = eventA.p;
	const a2 = eventA.other.p;
	const b1 = eventB.p;
	const b2 = eventB.other.p;

	// compare the selected points first
	const comp = geo.compareVec2(a1, b1);

	if (comp !== 0) {
		return comp;
	}

	// the selected points are the same

	if (geo.isEqualVec2(a2, b2)) {
		// if the non-selected points are the same too...
		return 0; // then the segments are equal
	}

	return +eventA.isStart - +eventB.isStart // favor the one that isn't the start
			|| compareSegments(eventB.seg.data, eventA.seg.data);
}

/**
 * @param {Segment} seg1
 * @param {Segment} seg2
 * @returns {number}
 */
export function compareSegments(seg1, seg2) {
	let a = seg1.p0;
	const b = seg2.p1;
	const c = seg2.p0;

	if (seg2.pointOn(a)) {
		// A intersects seg2 somehow (possibly sharing a start point, or maybe just splitting it)
		//
		//   AC - - - - D
		//      \
		//        \
		//          B
		//
		// so grab seg1's second point (D) instead
		a = seg1.p1;

		if (seg2.pointOn(a)) {
			return 0;
		}
	}

	// fallthrough to this calculation which determines if A is on one side or another of C-B

	const dbx = Big(b[0]).minus(a[0]);
	const dby = Big(b[1]).minus(a[1]);
	const dcx = Big(c[0]).minus(a[0]);
	const dcy = Big(c[1]).minus(a[1]);

	return dbx.times(dcy).minus(dby.times(dcx)).s;
}
