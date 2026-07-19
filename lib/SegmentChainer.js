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
	/** @type {ISegsFill[]} */
	const chains = [];
	/** @type {Segment[][]} */
	const regions = [];

	for (const segb of segments) {
		let seg = segb.data;
		const fill = segb.myFill.above;
		const pt1 = seg.p0;
		const pt2 = seg.p1;

		/** @type {(segments: Segment[]) => Segment[]} */
		const reverseSegments = segments => segments.map(segment => segment.reverse()).reverse();

		/** @type {(index: number) => Segment[]} */
		const reverseChain = index => {
			const newChain = reverseSegments(chains[index].segs);

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
		/**
		 * @type {Array<{
		 *   index: number,
		 *   startMatch: 'head' | 'tail' | undefined
		 *   endMatch: 'head' | 'tail' | undefined
		 * }>}
		 */
		const matches = [];

		for (let i = 0; i < chains.length && matches.length < 2; i++) {
			const { segs: chain, fill: chainFill } = chains[i];
			const head = chain[0].p0;
			const tail = chain[chain.length - 1].p1;

			/** @type {'head' | 'tail' | undefined} */
			let startMatch;
			/** @type {'head' | 'tail' | undefined} */
			let endMatch;

			if (chainFill === fill) {
				if (geo.isEqualVec2(tail, pt1)) {
					startMatch = 'tail';
				}

				if (geo.isEqualVec2(head, pt2)) {
					endMatch = 'head';
				}
			} else {
				if (geo.isEqualVec2(tail, pt2)) {
					endMatch = 'tail';
				}

				if (geo.isEqualVec2(head, pt1)) {
					startMatch = 'head';
				}
			}

			if (startMatch == null && endMatch == null) {
				continue;
			}

			matches.push({ index: i, startMatch, endMatch });
		}

		if (matches.length === 0) {
			// we didn't match anything, so create a new chain
			const fill = !!segb.myFill.above;
			chains.push({ segs: [seg], fill });
		} else if (matches.length === 1) {
			const [{ index, startMatch, endMatch }] = matches;
			const { segs: chain, fill } = chains[index];

			if (startMatch === 'head' || endMatch === 'tail') {
				seg = seg.reverse();
			}

			if (startMatch === 'head' || endMatch === 'head') {
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

			let finalChain = chain;
			let segS = finalChain[0];
			let segE = finalChain[finalChain.length - 1];

			if (finalChain.length > 0 && startMatch != null && endMatch != null) {
				if (!fill) {
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
			const [firstMatch, secondMatch] = matches;

			if (firstMatch.startMatch != null && secondMatch.startMatch != null) {
				// Two existing chains meet at the segment start point. Only one should be chosen.
				// There are two options:
				// (1) Unmatch the chain that the segment touches at the other end, resulting in the chains
				//     being connected and the final polygon having a self-touch.
				// (2) Unmatch the chain that the segment does not touch at the other end, resulting in two
				//     simpler polygons. This also means we have to deal with finalizing the ring.
				// Option (1) is chosen.

				if (firstMatch.endMatch != null) {
					// The segment matches the first chain at the other end so remove the match at this end.
					firstMatch.startMatch = undefined;
				} else if (secondMatch.endMatch != null) {
					// The segment matchees the second chain at the other end so remove the match at
					secondMatch.startMatch = undefined;
				}
			} else if (firstMatch.endMatch != null && secondMatch.endMatch != null) {
				// Repeat the same check with the other end. Note they it shouldn't be possible for both
				// ends to be connected to both chains.

				if (firstMatch.startMatch != null) {
					firstMatch.endMatch = undefined;
				} else if (secondMatch.startMatch != null) {
					secondMatch.endMatch = undefined;
				}
			}

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

				chains[index1].segs = chain1.concat(chain2);
				chains.splice(index2, 1);
			};

			const F = firstMatch.index;
			const S = secondMatch.index;

			// reverse the shorter chain, if needed
			const reverseF = chains[F].segs.length < chains[S].segs.length;

			if (firstMatch.startMatch === 'head' || firstMatch.endMatch === 'head') {
				if (secondMatch.startMatch === 'head' || secondMatch.endMatch === 'head') {
					if (reverseF) {
						if (firstMatch.startMatch == null) {
							// <<<< F <<<< <-- >>>> S >>>>
							seg = seg.reverse();
						}

						// <<<< F <<<< --> >>>> S >>>>
						reverseChain(F);
						// >>>> F >>>> --> >>>> S >>>>
						appendChain(F, S);
					} else {
						if (firstMatch.startMatch != null) {
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
					if (firstMatch.startMatch != null) {
						// <<<< F <<<< --> >>>> S >>>>
						seg = seg.reverse();
					}

					// <<<< F <<<< <-- <<<< S <<<<   logically same as:
					// >>>> S >>>> --> >>>> F >>>>
					appendChain(S, F);
				}
			} else if (secondMatch.startMatch === 'head' || secondMatch.endMatch === 'head') {
				if (firstMatch.startMatch == null) {
					// >>>> F >>>> <-- >>>> S >>>>
					seg = seg.reverse();
				}

				// >>>> F >>>> --> >>>> S >>>>
				appendChain(F, S);
			} else if (reverseF) {
				if (firstMatch.startMatch != null) {
					// >>>> F >>>> --> <<<< S <<<<
					seg = seg.reverse();
				}

				// >>>> F >>>> <-- <<<< S <<<<
				reverseChain(F);
				// <<<< F <<<< <-- <<<< S <<<<   logically same as:
				// >>>> S >>>> --> >>>> F >>>>
				appendChain(S, F);
			} else {
				if (firstMatch.startMatch == null) {
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

	if (chains.length !== 0) {
		throw new Error('Open chains left');
	}

	return regions;
}
