//
// polybool - Boolean operations on polygons (union, intersection, etc)
// by Sean Connelly (@velipso), https://sean.fun
// Project Home: https://github.com/velipso/polybool
// SPDX-License-Identifier: 0BSD
//

import { Segment } from './Segment.js';

/**
 * @import { SegmentBool } from './Intersecter.js'
 * @import { Geometry } from './Geometry.js'
 */

//
// converts a list of segments into a list of regions, while also removing
// unnecessary verticies
//

/**
 * @param {Segment} seg1
 * @param {Segment} seg2
 * @param {Geometry} geo
 * @returns {Segment | undefined}
 */
function joinSegments(seg1, seg2, geo) {
	if (geo.isCollinear(seg1.p0, seg1.p1, seg2.p1)) {
		return new Segment(seg1.p0, seg2.p1, geo);
	}
}

/**
 * @param {SegmentBool[]} segments
 * @param {Geometry} geo
 * @returns {Segment[][]}
 */
export function SegmentChainer(segments, geo) {
	/** @type {Segment[][]} */
	const chains = [];
	/** @type {Segment[][]} */
	const regions = [];

	for (const segb of segments) {
		const seg = segb.myFill.above ? segb.data : segb.data.reverse();
		const pt1 = seg.p0;
		const pt2 = seg.p1;

		if (geo.isEqualVec2(pt1, pt2)) {
			console.warn(
				'PolyBool: Warning: Zero-length segment detected; your epsilon is '
					+ 'probably too small or too large',
			);
			continue;
		}

		// search for two chains that this segment matches
		/**
		 * @type {(
		 *   | {
		 *     index: number
		 *     startMatch: boolean | undefined
		 *     endMatch: boolean | undefined
		 *   }
		 *   | undefined
		 * )}
		 */
		let firstMatch;
		/** @type {typeof firstMatch} */
		let secondMatch;

		for (let i = 0; i < chains.length; i++) {
			const chain = chains[i];
			const head = chain[0].p0;
			const tail = chain[chain.length - 1].p1;

			const startMatch = geo.isEqualVec2(tail, pt1);
			const endMatch = geo.isEqualVec2(head, pt2);

			if (!startMatch && !endMatch) {
				continue;
			}

			if (firstMatch == null) {
				firstMatch = { index: i, startMatch, endMatch };
			} else {
				secondMatch = { index: i, startMatch, endMatch };
				break;
			}
		}

		if (firstMatch == null) {
			// we didn't match anything, so create a new chain
			chains.push([seg]);
		} else if (secondMatch == null) {
			const { index, startMatch, endMatch } = firstMatch;
			const chain = chains[index];

			if (endMatch) {
				const next = chain[0];
				const newSeg = joinSegments(seg, next, geo);

				if (newSeg != null) {
					chain[0] = newSeg;
				} else {
					chain.unshift(seg);
				}
			} else {
				const next = chain[chain.length - 1];
				const newSeg = joinSegments(next, seg, geo);

				if (newSeg != null) {
					chain[chain.length - 1] = newSeg;
				} else {
					chain.push(seg);
				}
			}

			if (chain.length > 0 && startMatch && endMatch) {
				const newStart = joinSegments(chain[chain.length - 1], chain[0], geo);

				if (newStart != null) {
					chain.pop();
					chain[0] = newStart;
				}

				// we have a closed chain!
				chains.splice(index, 1);
				regions.push(chain);
			}
		} else {
			// otherwise, we matched two chains, so we need to combine those chains together

			/**
			 * @param {number} index1
			 * @param {number} index2
			 * @returns {void}
			 */
			const appendChain = (index1, index2) => {
				// index1 gets index2 appended to it, and index2 is removed
				const chain1 = chains[index1];
				const chain2 = chains[index2];

				// simplify chain1's tail
				const next = chain1[chain1.length - 1];
				const newEnd = joinSegments(next, seg, geo);

				if (newEnd != null) {
					chain1[chain1.length - 1] = newEnd;
				} else {
					chain1.push(seg);
				}

				// simplify chain2's head
				const tail = chain1[chain1.length - 1];
				const head = chain2[0];
				const newJoin = joinSegments(tail, head, geo);

				if (newJoin != null) {
					chain2.shift();
					chain1[chain1.length - 1] = newJoin;
				}

				chains[index1] = chain1.concat(chain2);
				chains.splice(index2, 1);
			};

			// Note that it's possible for a segment to match the same chain at both ends if two polygons
			// (both filled or both unfilled) touch at the corner. In this case, exactly one of the
			// endpoints must match the other chain as well. There are two ways to handle that:
			//   1. Ignore the match of the other chain and close the chain that matches at both ends,
			//      resulting in the other chain becoming a separate polygon.
			//   2. Ignore the match of the chain that matches at both ends, resulting in the chains being
			//      joined together.
			// The second option is chosen because it's a little bit simpler and results in fewer number
			// of polygons.
			if (firstMatch.startMatch) {
				appendChain(firstMatch.index, secondMatch.index);
			} else {
				appendChain(secondMatch.index, firstMatch.index);
			}
		}
	}

	if (chains.length !== 0) {
		throw new Error('Open chains left');
	}

	return regions;
}
