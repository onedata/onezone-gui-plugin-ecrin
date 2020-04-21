/**
 * Is responsible for showing one data object record in study.
 * 
 * @module components/query-results/data-object-record
 * @author Michał Borzęcki
 * @copyright (C) 2020 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import Component from '@ember/component';
import I18n from 'onezone-gui-plugin-ecrin/mixins/i18n';
import notImplementedIgnore from 'onezone-gui-plugin-ecrin/utils/not-implemented-ignore';
import { computed } from '@ember/object';
import { reads } from '@ember/object/computed';
import { or } from 'ember-awesome-macros';
import { debounce } from '@ember/runloop';

export default Component.extend(I18n, {
  classNames: ['data-object-record'],

  /**
   * @type {Window}
   */
  _window: window,

  /**
   * @override
   */
  i18nPrefix: 'components.queryResults.dataObjectRecord',

  /**
   * @virtual optional
   */
  dataObject: undefined,

  /**
   * @virtual
   * @type {boolean}
   */
  isExpanded: false,

  /**
   * @type {Function}
   * @returns {any}
   */
  toggleExpansion: notImplementedIgnore,

  /**
   * @type {ComputedProperty<String>}
   */
  typeName: reads('dataObject.type.name'),

  /**
   * @type {ComputedProperty<number>}
   */
  year: or('dataObject.year', '‐'),

  /**
   * @type {ComputedProperty<String>}
   */
  accessTypeIndicator: reads('dataObject.accessType.indicator'),

  /**
   * @type {ComputedProperty<String>}
   */
  accessTypeName: reads('dataObject.accessType.name'),

  /**
   * @type {ComputedProperty<Function>}
   */
  windowResizeHandler: computed(function windowResizeHandler() {
    return () => debounce(this, 'recalculateIsExpandable', 200);
  }),

  didInsertElement() {
    this._super(...arguments);

    const {
      windowResizeHandler,
      _window,
    } = this.getProperties(
      'windowResizeHandler',
      '_window'
    );

    _window.addEventListener('resize', windowResizeHandler);
    this.recalculateIsExpandable();
  },

  willDestroyElement() {
    try {
      const {
        windowResizeHandler,
        _window,
      } = this.getProperties(
        'windowResizeHandler',
        '_window'
      );

      _window.removeEventListener('resize', windowResizeHandler);
    } finally {
      this._super(...arguments);
    }
  },

  recalculateIsExpandable() {
    const $overflowContainer = this.$('.data-object-overflow-container');
    this.set('isExpandable', $overflowContainer[0].scrollHeight > 44);
  },
});
