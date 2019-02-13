/**
 * Converts a string to an array of numbers. Passed string consists of number
 * and/or ranges, that are comma-separated. Range is indicated by a hyphen (-)
 * between two numbers. Examples:
 * '2000' -> [2000]
 * '2000,2003' -> [2000, 2003]
 * '2000-2003' -> [2000, 2001, 2002, 2003]
 * '1992-1993,1995,1996-1997' -> [1992, 1993, 1995, 1996, 1997]
 *
 * @module utils/range-to-numbers
 * @author Michał Borzęcki
 * @copyright (C) 2019 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

export default function rangeToNumbers(rangeString) {
  const parts = rangeString.split(',');
  const numbers = new Set();
  for (let part of parts) {
    if (part.includes('-')) {
      const partSections = part.split('-').map((n) => parseInt(n));
      if (partSections.length !== 2 ||
        isNaN(partSections[0]) ||
        isNaN(partSections[1]) ||
        partSections[0] > partSections[1]) {
        return;
      }
      for (let num = partSections[0]; num <= partSections[1]; num++) {
        numbers.add(num);
      }
    } else {
      const num = parseInt(part);
      if (isNaN(num)) {
        return;
      }
      numbers.add(num);
    }
  }
  return Array.from(numbers).sort((a,b) => a - b);
}
