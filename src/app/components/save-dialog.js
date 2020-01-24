import Component from '@ember/component';
import { observer } from '@ember/object';
import I18n from 'onezone-gui-plugin-ecrin/mixins/i18n';
import safeExec from 'onezone-gui-plugin-ecrin/utils/safe-method-execution';

export default Component.extend(I18n, {
  /**
   * @override
   */
  i18nPrefix: 'components.saveDialog',

  /**
   * @virtual
   * @type {boolean}
   */
  isOpened: false,

  /**
   * @type {string}
   */
  resultsName: '',

  /**
   * @type {boolean}
   */
  isSaving: false,

  /**
   * @type {Function}
   * @param {string} resultsName
   * @returns {Promise}
   */
  onSave: () => {},

  /**
   * @type {Function}
   * @returns {any}
   */
  onCancel: () => {},

  isOpenedObserver: observer('isOpened', function isOpenedObserver() {
    this.setProperties({
      resultsName: '',
      isSaving: false,
    });
  }),

  actions: {
    save() {
      const {
        onSave,
        resultsName,
      } = this.getProperties('resultsName', 'onSave');
      onSave(resultsName)
        .finally(() => safeExec(this, () => this.set('isSaving', false)));
    },
  },
});
