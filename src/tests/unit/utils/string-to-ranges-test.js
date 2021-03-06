import { expect } from 'chai';
import { describe, it } from 'mocha';
import stringToRanges from 'onezone-gui-plugin-ecrin/utils/string-to-ranges';

describe('Unit | Utility | string to ranges', function () {
  it('interprets string with one number', function () {
    expect(stringToRanges('2000')).to.deep.equal([{ start: 2000, end: 2000 }]);
  });

  it('interprets string with multiple numbers', function () {
    expect(stringToRanges('2000,1995'))
      .to.have.deep.members([
        { start: 2000, end: 2000 },
        { start: 1995, end: 1995 },
      ]);
  });

  it('interprets string with multiple ranges', function () {
    expect(stringToRanges('1998-1998,2000-2005'))
      .to.have.deep.members([
        { start: 1998, end: 1998 },
        { start: 2000, end: 2005 },
      ]);
  });

  it('interprets string with mixed ranges and numbers', function () {
    expect(stringToRanges('1998-1998,2000,1995-1996'))
      .to.have.deep.members([
        { start: 1998, end: 1998 },
        { start: 2000, end: 2000 },
        { start: 1995, end: 1996 },
      ]);
  });

  it('interprets string with ">" range', function () {
    expect(stringToRanges('>1998'))
      .to.have.deep.members([{ start: 1999 }]);
  });

  it('interprets string with "<" range', function () {
    expect(stringToRanges('<1998'))
      .to.have.deep.members([{ end: 1997 }]);
  });
});
