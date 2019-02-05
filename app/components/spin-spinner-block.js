/**
 * A container with spin-spinner.
 * 
 * Facilitates positioning and setting size of spinner.
 * 
 * @module components/spin-spinner-block
 * @author Jakub Liput
 * @copyright (C) 2017-2019 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import Component from '@ember/component';
import { computed } from '@ember/object';

const PREDEF_SIZES = {
  xxs: 0.12,
  xs: 0.2,
  sm: 0.4,
  md: 0.8,
  lg: 1.2,
};

export default Component.extend({
  classNames: ['spin-spinner-block', 'spinner-container'],
  classNameBindings: ['sizeClass'],

  sizeClass: 'lg',

  spinnerScale: computed('sizeClass', function () {
    return PREDEF_SIZES[this.get('sizeClass')];
  }),
});
