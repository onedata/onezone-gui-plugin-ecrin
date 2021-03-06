/**
 * Simplified pagination component from ember-cli-pagination
 * 
 * @module components/pagination-selector
 * @author Michał Borzęcki
 * @copyright (C) 2020 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import Component from '@ember/component';
import I18n from 'onezone-gui-plugin-ecrin/mixins/i18n';

export default Component.extend(I18n, {
  classNames: ['pagination-selector'],

  /**
   * @override
   */
  i18nPrefix: 'components.paginationSelector',

  /**
   * @virtual
   * @type {PagedArray}
   */
  pagedContent: undefined,

  /**
   * @virtual optional
   * One of: auto, below, above
   * @type {String}
   */
  perPageDropdownVerticalPosition: 'auto',
});
