/**
 * A modal for providing a name needed to save results and triggering save process.
 * 
 * @module components/save-dialog
 * @author Michał Borzęcki
 * @copyright (C) 2019 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import Component from '@ember/component';
import { observer } from '@ember/object';
import I18n from 'onezone-gui-plugin-ecrin/mixins/i18n';
import safeExec from 'onezone-gui-plugin-ecrin/utils/safe-method-execution';
import $ from 'jquery';
import notImplementedIgnore from 'onezone-gui-plugin-ecrin/utils/not-implemented-ignore';
import notImplementedReject from 'onezone-gui-plugin-ecrin/utils/not-implemented-reject';

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
   * @type {string}
   */
  lastSaveError: null,

  /**
   * @type {Function}
   * @param {string} resultsName
   * @returns {Promise}
   */
  onSave: notImplementedReject,

  /**
   * @type {Function}
   * @returns {any}
   */
  onCancel: notImplementedIgnore,

  isOpenedObserver: observer('isOpened', function isOpenedObserver() {
    this.setProperties({
      resultsName: '',
      isSaving: false,
      lastSaveError: null,
    });
  }),

  actions: {
    shown() {
      $('#save-name-input').focus();
    },
    save() {
      const {
        onSave,
        resultsName,
      } = this.getProperties('resultsName', 'onSave');

      this.setProperties({
        isSaving: true,
        lastSaveError: null,
      });
      onSave(resultsName)
        .catch(error => safeExec(this, () => this.set('lastSaveError', error)))
        .finally(() => safeExec(this, () => this.set('isSaving', false)));
    },
  },
});
