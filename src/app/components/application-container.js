/**
 * Container component for a whole application.
 * 
 * @module components/application-container
 * @author Michał Borzęcki
 * @copyright (C) 2020 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import Component from '@ember/component';
import { inject as service } from '@ember/service';
import { equal } from '@ember/object/computed';
import I18n from 'onezone-gui-plugin-ecrin/mixins/i18n';

export default Component.extend(I18n, {
  classNames: ['container-fluid'],
  elementId: 'application-container',

  router: service(),

  /**
   * @override
   */
  i18nPrefix: 'components.applicationContainer',

  /**
   * @type {ComputedProperty<boolean>}
   */
  isOnMainPage: equal('router.currentRouteName', 'index'),
});
