/**
 * Fixes bug in bs-collapse.
 * 
 * @module components/bs-collapse
 * @author Michał Borzęcki
 * @copyright (C) 2019 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import BsCollapse from 'ember-bootstrap/components/bs-collapse';

export default BsCollapse.extend({
  /**
   * @override
   */
  setCollapseSize(size) {
    let oldCollapseSize;
    if (size !== undefined) {
      oldCollapseSize = this.get('collapseSize');
      this.set('collapseSize', size);
    }
    const result = this._super(...arguments);
    if (size !== undefined) {
      this.set('collapseSize', oldCollapseSize);
    }
    return result;
  },
});
