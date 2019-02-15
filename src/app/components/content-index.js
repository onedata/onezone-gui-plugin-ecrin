import Component from '@ember/component';
import I18n from 'onezone-gui-plugin-ecrin/mixins/i18n';

export default Component.extend(I18n, {
  classNames: ['content-index'],

  /**
   * @override
   */
  i18nPrefix: 'components.contentIndex',
});
