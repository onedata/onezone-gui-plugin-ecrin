/**
 * Converts a string to an array of ranges. Passed string consists of number
 * and/or ranges, that are comma-separated. Range is indicated by a hyphen (-)
 * between two numbers. Examples:
 * '2000' -> [{start: 2000, end: 2000}]
 * '2000,2003' -> [{start: 2000, end: 2000}, {start: 2003, end: 2003}]
 * '2000-2003' -> [{start: 2000, end: 2003}]
 * '1992-1993,1995,1996-1997' -> [{start: 1992, end: 1993}, {start: 1995, end: 1995}, {start: 1996, end: 1997}]
 *
 * @module utils/range-to-numbers
 * @author Michał Borzęcki
 * @copyright (C) 2019 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

export default function rangeToNumbers(rangeString) {
  if (typeof rangeString !== 'string') {
    return [];
  }
  const parts = rangeString.split(',');
  const ranges = [];
  for (let part of parts) {
    if (part.includes('-')) {
      const partSections = part.split('-').map((n) => parseInt(n));
      if (partSections.length !== 2 ||
        isNaN(partSections[0]) ||
        isNaN(partSections[1]) ||
        partSections[0] > partSections[1]) {
        return [];
      } else {
        ranges.push({ start: partSections[0], end: partSections[1] });
      }
    } else {
      const num = parseInt(part);
      if (isNaN(num)) {
        return [];
      } else {
        ranges.push({ start: num, end: num });
      }
    }
  }
  return ranges;
}
