import Component from '@ember/component';
import { inject as service } from '@ember/service';
import I18n from 'onezone-gui-plugin-ecrin/mixins/i18n';

export default Component.extend(I18n, {
  classNames: ['content-index'],

  router: service(),

  /**
   * @override
   */
  i18nPrefix: 'components.contentIndex',

  actions: {
    find() {
      this.get('router').transitionTo('query');
    },
  },
});
