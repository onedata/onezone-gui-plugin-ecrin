import Component from '@ember/component';
import I18n from 'onezone-gui-plugin-ecrin/mixins/i18n';

export default Component.extend(I18n, {
  /**
   * @override
   */
  i18nPrefix: 'components.contentQuery',
});
