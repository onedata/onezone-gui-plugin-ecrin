/**
 * A message to display in place of some resource cannot be loaded. 
 *
 * @module components/resource-load-error
 * @author Jakub Liput, Michał Borzęcki
 * @copyright (C) 2017-2019 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import Component from '@ember/component';

import { computed } from '@ember/object';
import getErrorDescription from 'onezone-gui-plugin-ecrin/utils/get-error-description';
import I18n from 'onezone-gui-plugin-ecrin/mixins/i18n';

export default Component.extend(I18n, {
  classNames: ['alert', 'alert-promise-error', 'resource-load-error'],
  classNameBindings: ['type', 'alertType'],

  /**
   * @override
   */
  i18nPrefix: 'components.resourceLoadError',

  /**
   * Action to invoke on alert panel close.
   * If not null - show a close button in alert panel.
   * @type {function|undefined}
   */
  onClose: undefined,

  /**
   * Error type
   * @type {string}
   */
  type: 'error',

  /**
   * Displayed error details generated from reason error object
   * @type {string}
   */
  _reasonDetails: computed('reason', function () {
    return getErrorDescription(this.get('reason'));
  }),

  /**
   * Alert type
   * @type {string}
   */
  alertType: computed('type', function () {
    return this.get('type') !== 'error' ? 'alert-warning' : 'alert-danger';
  }),

  /**
   * @type {Ember.ComputedProperty<string>}
   */
  defaultMessage: computed(function defaultMessage() {
    return this.t('defaultErrorMessage');
  }),

  /**
   * @type {Ember.ComputedProperty<boolean>}
   */
  showReasonPanel: computed('reason', 'type', function showReasonPanel() {
    const {
      reason,
      type,
    } = this.getProperties('reason', 'type');
    return reason && type !== 'forbidden';
  }),

  init() {
    this._super(...arguments);
    if (!this.get('message')) {
      this.set('message', this.get('defaultMessage'));
    }
  },

  actions: {
    toggleShowDetails() {
      this.toggleProperty('showDetails');
    },
    close() {
      this.get('onClose')();
    },
  },
});
