/**
 * A filter which allows to select multiple options using checkboxes.
 *
 * @module components/checkbox-filter
 * @author Michał Borzęcki
 * @copyright (C) 2020 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import Component from '@ember/component';
import { computed, get } from '@ember/object';
import I18n from 'onezone-gui-plugin-ecrin/mixins/i18n';
import { A } from '@ember/array';
import { equal } from 'ember-awesome-macros';
import notImplementedIgnore from 'onezone-gui-plugin-ecrin/utils/not-implemented-ignore';

export default Component.extend(I18n, {
  classNames: ['checkbox-filter'],

  /**
   * @override
   */
  i18nPrefix: 'components.checkboxFilter',

  /**
   * @virtual optional
   * @type {boolean}
   */
  disabled: false,

  /**
   * @virtual
   * @type {Function}
   * @param {Array<Object>} selectedItems
   * @returns {any}
   */
  onChange: notImplementedIgnore,

  /**
   * Filter string for filtering by item name
   * @type {String}
   */
  itemsFilter: '',

  /**
   * @virtual
   * @type {ComputedProperty<Array<{ name: string }>>}
   */
  items: computed(() => A()),

  /**
   * @virtual
   * @type {ComputedProperty<Array<{ name: string }>>}
   */
  selectedItems: computed(() => A()),

  /**
   * @type {Function}
   * @param {Object} item
   * @param {string} filter
   * @returns {boolean}
   */
  matcher: computed(() => {
    return (item, filter) =>
      get(item, 'name').toLowerCase().includes(filter.trim().toLowerCase());
  }),

  /**
   * @type {ComputedProperty<Array<{ name: string }>>}
   */
  filteredItems: computed(
    'items.@each.name',
    'itemsFilter',
    'matcher',
    function filteredItems() {
      const {
        items,
        itemsFilter,
        matcher,
      } = this.getProperties('items', 'itemsFilter', 'matcher');

      return items.filter(item => matcher(item, itemsFilter));
    }
  ),

  /**
   * @type {ComputedProperty<boolean>}
   */
  areAllItemsSelected: equal('selectedItems.length', 'filteredItems.length'),

  actions: {
    toggleItem(item) {
      if (!this.get('disabled')) {
        const {
          selectedItems,
          onChange,
        } = this.getProperties('selectedItems', 'onChange');

        let newSelectedItems;
        if (selectedItems.includes(item)) {
          newSelectedItems = selectedItems.without(item);
        } else {
          newSelectedItems = [...selectedItems, item];
        }

        onChange(newSelectedItems);
      }
    },
    toggleAllItems() {
      if (!this.get('disabled')) {
        const {
          onChange,
          filteredItems,
          areAllItemsSelected,
        } = this.getProperties('filteredItems', 'onChange', 'areAllItemsSelected');

        if (areAllItemsSelected) {
          onChange([]);
        } else {
          onChange(filteredItems.slice(0));
        }
      }
    },
  },
});
