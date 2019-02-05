/**
 * Creates a simple checkbox control with custom styles.
 *
 * @module components/one-checkbox.js
 * @author Michał Borzęcki
 * @copyright (C) 2017-2019 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import OneCheckboxBase from 'onezone-gui-plugin-ecrin/components/one-checkbox-base';

export default OneCheckboxBase.extend({
  classNames: ['one-checkbox'],
  classNameBindings: ['checked'],
});
