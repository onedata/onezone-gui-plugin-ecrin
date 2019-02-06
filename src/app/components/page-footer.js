import Component from '@ember/component';
import I18n from 'onezone-gui-plugin-ecrin/mixins/i18n';

export default Component.extend(I18n, {
  classNames: ['page-footer', 'panel'],

  /**
   * @override
   */
  i18nPrefix: 'components.pageFooter',
});
