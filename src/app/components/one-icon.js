/**
 * Inserts a icon from oneicons font.
 * Typical usage: ``{{one-icon icon='home'}}``
 * @module components/one-icon
 * @author Jakub Liput, Michał Borzęcki
 * @copyright (C) 2016-2019 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import Component from '@ember/component';
import { observer, computed } from '@ember/object';

export default Component.extend({
  tagName: 'span',
  classNames: ['one-icon', 'oneicon'],
  classNameBindings: ['iconClass'],

  /**
   * Icon name (from oneicons font, without `oneicon-` prefix)
   * To inject.
   * @type {string}
   */
  icon: 'checkbox-x',

  /**
   * Icon color
   * @type {string}
   */
  color: '',

  addClass: '',

  iconClass: computed('icon', function () {
    return `oneicon-${this.get('icon')}`;
  }),

  stylesObserver: observer('color', function () {
    this._applyStyles();
  }),

  didInsertElement() {
    this._super(...arguments);
    this._applyStyles();
  },

  _applyStyles() {
    let color = this.get('color');
    this.$().css({
      color,
    });
  },
});
