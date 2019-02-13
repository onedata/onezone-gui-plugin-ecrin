import { expect } from 'chai';
import { describe, it } from 'mocha';
import rangeToNumbers from 'onezone-gui-plugin-ecrin/utils/range-to-numbers';

describe('Unit | Utility | range to numbers', function () {
  it('interprets string with one number', function () {
    expect(rangeToNumbers('2000')).to.deep.equal([2000]);
  });

  it('interprets string with multiple numbers', function () {
    expect(rangeToNumbers('2000,1995,2005')).to.deep.equal([1995, 2000, 2005]);
  });

  it('interprets string with multiple ranges', function () {
    expect(rangeToNumbers('1998-1998,2000-2005'))
      .to.deep.equal([1998, 2000, 2001, 2002, 2003, 2004, 2005]);
  });

  it('interprets string with mixed ranges and numbers', function () {
    expect(rangeToNumbers('1998-1998,2000,1995-1996'))
      .to.deep.equal([1995, 1996, 1998, 2000]);
  });
});
