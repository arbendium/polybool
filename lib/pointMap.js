/**
 * @import { Segment } from './Segment.js'
 * @import { Vec2 } from './types'
 */

/** @type {Record<string, string>} */
let pointMap = {};

/**
 * @param {Record<string, string>} map
 */
export function setPointMap(map) {
	pointMap = map;
}

/**
 * @param {Vec2} p
 * @returns {string}
 */
export function pointLabel(p) {
	return pointMap[`${p[0]}:${p[1]}`] ?? `[${p[0]}, ${p[1]}]`;
}

/**
 * @param {Segment} seg
 * @returns {string}
 */
export function segLabel(seg) {
	return `${pointLabel(seg.p0)} -> ${pointLabel(seg.p1)}`;
}
