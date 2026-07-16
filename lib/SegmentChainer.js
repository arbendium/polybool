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

/**
 * @typedef {{ segs: Segment[], fill: boolean }} ISegsFill
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
	if (seg1 !== seg2 && geo.isCollinear(seg1.p0, seg1.p1, seg2.p1)) {
		return new Segment(seg1.p0, seg2.p1, geo);
	}
}

/**
 * @param {SegmentBool[]} segments
 * @param {Geometry} geo
 * @returns {Segment[][]}
 */
export function SegmentChainer(segments, geo) {
	/** @type {ISegsFill[]} */
	const chains = [];
	/** @type {Segment[][]} */
	const regions = [];

	for (const segb of segments) {
		let seg = segb.data;
		const pt1 = seg.p0;
		const pt2 = seg.p1;

		/** @type {(index: number) => Segment[]} */
		const reverseChain = index => {
			/** @type {Segment[]} */
			const newChain = [];

			for (const seg of chains[index].segs) {
				newChain.unshift(seg.reverse());
			}

			chains[index] = {
				segs: newChain,
				fill: !chains[index].fill,
			};

			return newChain;
		};

		if (geo.isEqualVec2(pt1, pt2)) {
			console.warn(
				'PolyBool: Warning: Zero-length segment detected; your epsilon is '
				+ 'probably too small or too large',
			);
			continue;
		}

		// search for two chains that this segment matches
		const firstMatch = {
			index: 0,
			matchesHead: false,
			matchesPt1: false,
		};
		const secondMatch = {
			index: 0,
			matchesHead: false,
			matchesPt1: false,
		};
		/** @type {typeof firstMatch | undefined} */
		let nextMatch = firstMatch;

		for (let i = 0; i < chains.length; i++) {
			const chain = chains[i].segs;
			const head = chain[0].p0;
			const tail = chain[chain.length - 1].p1;

			let matchesHead;
			let matchesPt1;

			if (geo.isEqualVec2(head, pt1)) {
				matchesHead = true;
				matchesPt1 = true;
			} else if (geo.isEqualVec2(head, pt2)) {
				matchesHead = true;
				matchesPt1 = false;
			} else if (geo.isEqualVec2(tail, pt1)) {
				matchesHead = false;
				matchesPt1 = true;
			} else if (geo.isEqualVec2(tail, pt2)) {
				matchesHead = false;
				matchesPt1 = false;
			} else {
				continue;
			}

			if (nextMatch != null) {
				nextMatch.index = i;
				nextMatch.matchesHead = matchesHead;
				nextMatch.matchesPt1 = matchesPt1;
			}

			if (nextMatch !== firstMatch) {
				nextMatch = undefined;

				break;
			}

			nextMatch = secondMatch;
		}

		if (nextMatch === firstMatch) {
			// we didn't match anything, so create a new chain
			const fill = !!segb.myFill.above;
			chains.push({ segs: [seg], fill });
		} else if (nextMatch === secondMatch) {
			// we matched a single chain
			const { index } = firstMatch;

			// add the other point to the apporpriate end
			const { segs: chain, fill } = chains[index];

			if (firstMatch.matchesHead) {
				if (firstMatch.matchesPt1) {
					seg = seg.reverse();
					chain.unshift(seg);
				} else {
					chain.unshift(seg);
				}
			} else if (firstMatch.matchesPt1) {
				chain.push(seg);
			} else {
				seg = seg.reverse();
				chain.push(seg);
			}

			// simplify chain
			if (firstMatch.matchesHead) {
				const next = chain[1];
				const newSeg = joinSegments(seg, next, geo);

				if (newSeg != null) {
					chain.shift();
					chain[0] = newSeg;
				}
			} else {
				const next = chain[chain.length - 2];
				const newSeg = joinSegments(next, seg, geo);

				if (newSeg != null) {
					chain.pop();
					chain[chain.length - 1] = newSeg;
				}
			}

			let finalChain = chain;
			let segS = finalChain[0];
			let segE = finalChain[finalChain.length - 1];

			if (
				finalChain.length > 0
					&& geo.isEqualVec2(segS.p0, segE.p1)
			) {
				// see if chain is clockwise
				let winding = 0;
				let last = finalChain[0].p0;

				for (const seg of finalChain) {
					const here = seg.p1;
					winding += here[1] * last[0] - here[0] * last[1];
					last = here;
				}

				// this assumes Cartesian coordinates (Y is positive going up)
				const isClockwise = winding < 0;

				if (isClockwise === fill) {
					finalChain = reverseChain(index);
					[segS] = finalChain;
					segE = finalChain[finalChain.length - 1];
				}

				const newStart = joinSegments(segE, segS, geo);

				if (newStart != null) {
					finalChain.pop();
					finalChain[0] = newStart;
				}

				// we have a closed chain!
				chains.splice(index, 1);
				regions.push(finalChain);
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
				const { segs: chain1 } = chains[index1];
				const { segs: chain2 } = chains[index2];

				// add seg to chain1's tail
				chain1.push(seg);

				// simplify chain1's tail
				const next = chain1[chain1.length - 2];
				const newEnd = joinSegments(next, seg, geo);

				if (newEnd != null) {
					chain1.pop();
					chain1[chain1.length - 1] = newEnd;
				}

				// simplify chain2's head
				const tail = chain1[chain1.length - 1];
				const head = chain2[0];
				const newJoin = joinSegments(tail, head, geo);

				if (newJoin != null) {
					chain2.shift();
					chain1[chain1.length - 1] = newJoin;
				}

				chains[index1].segs = chain1.concat(chain2);
				chains.splice(index2, 1);
			};

			const F = firstMatch.index;
			const S = secondMatch.index;

			// reverse the shorter chain, if needed
			const reverseF = chains[F].segs.length < chains[S].segs.length;

			if (firstMatch.matchesHead) {
				if (secondMatch.matchesHead) {
					if (reverseF) {
						if (!firstMatch.matchesPt1) {
							// <<<< F <<<< <-- >>>> S >>>>
							seg = seg.reverse();
						}

						// <<<< F <<<< --> >>>> S >>>>
						reverseChain(F);
						// >>>> F >>>> --> >>>> S >>>>
						appendChain(F, S);
					} else {
						if (firstMatch.matchesPt1) {
							// <<<< F <<<< --> >>>> S >>>>
							seg = seg.reverse();
						}

						// <<<< F <<<< <-- >>>> S >>>>
						reverseChain(S);
						// <<<< F <<<< <-- <<<< S <<<<   logically same as:
						// >>>> S >>>> --> >>>> F >>>>
						appendChain(S, F);
					}
				} else {
					if (firstMatch.matchesPt1) {
						// <<<< F <<<< --> >>>> S >>>>
						seg = seg.reverse();
					}

					// <<<< F <<<< <-- <<<< S <<<<   logically same as:
					// >>>> S >>>> --> >>>> F >>>>
					appendChain(S, F);
				}
			} else if (secondMatch.matchesHead) {
				if (!firstMatch.matchesPt1) {
					// >>>> F >>>> <-- >>>> S >>>>
					seg = seg.reverse();
				}

				// >>>> F >>>> --> >>>> S >>>>
				appendChain(F, S);
			} else if (reverseF) {
				if (firstMatch.matchesPt1) {
					// >>>> F >>>> --> <<<< S <<<<
					seg = seg.reverse();
				}

				// >>>> F >>>> <-- <<<< S <<<<
				reverseChain(F);
				// <<<< F <<<< <-- <<<< S <<<<   logically same as:
				// >>>> S >>>> --> >>>> F >>>>
				appendChain(S, F);
			} else {
				if (!firstMatch.matchesPt1) {
					// >>>> F >>>> <-- <<<< S <<<<
					seg = seg.reverse();
				}

				// >>>> F >>>> --> <<<< S <<<<
				reverseChain(S);
				// >>>> F >>>> --> >>>> S >>>>
				appendChain(F, S);
			}
		}
	}

	return regions;
}
