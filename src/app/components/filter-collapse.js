/**
 * A container for filter control, which adds collapse ability to it.
 *
 * @module components/filter-collapse
 * @author Michał Borzęcki
 * @copyright (C) 2020 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import Component from '@ember/component';

export default Component.extend({
  classNames: ['filter-collapse', 'form-group'],

  /**
   * @virtual optional
   * @type {string}
   */
  label: undefined,

  /**
   * @type {boolean}
   */
  isExpanded: false,
});
