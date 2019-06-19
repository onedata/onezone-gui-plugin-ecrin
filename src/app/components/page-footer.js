/**
 * A component, which shows content footer
 * 
 * @module components/page-footer
 * @author Michał Borzęcki
 * @copyright (C) 2019 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import Component from '@ember/component';
import { computed } from '@ember/object';
import { inject as service } from '@ember/service';
import I18n from 'onezone-gui-plugin-ecrin/mixins/i18n';

export default Component.extend(I18n, {
  classNames: ['page-footer', 'panel'],
  classNameBindings: ['isVisible::hidden'],

  router: service(),

  /**
   * @override
   */
  i18nPrefix: 'components.pageFooter',

  /**
   * @type {Ember.ComputedProperty<boolean>}
   */
  isVisible: computed('router.currentRouteName', function isVisible() {
    const currentRouteName = this.get('router.currentRouteName');
    return currentRouteName !== 'index';
  }),
});
