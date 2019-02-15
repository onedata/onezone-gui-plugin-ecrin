import Component from '@ember/component';
import { computed } from '@ember/object';
import { inject as service } from '@ember/service';
import I18n from 'onezone-gui-plugin-ecrin/mixins/i18n';

export default Component.extend(I18n, {
  classNames: ['page-header', 'row'],

  router: service(),

  /**
   * @override
   */
  i18nPrefix: 'components.pageHeader',

  /**
   * @type {Ember.ComputedProperty<boolean>}
   */
  isLogoVisible: computed('router.currentRouteName', function showLogo() {
    const currentRouteName = this.get('router.currentRouteName');
    return currentRouteName !== 'index';
  }),
});
