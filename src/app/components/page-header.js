/**
 * A component, which shows content header with optional logo.
 * 
 * @module components/page-header
 * @author Michał Borzęcki
 * @copyright (C) 2019 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import Component from '@ember/component';
import I18n from 'onezone-gui-plugin-ecrin/mixins/i18n';

export default Component.extend(I18n, {
  classNames: ['page-header'],

  /**
   * @override
   */
  i18nPrefix: 'components.pageHeader',
});
