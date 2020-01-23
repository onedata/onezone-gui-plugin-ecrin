import Component from '@ember/component';
import { computed, observer, get } from '@ember/object';
import I18n from 'onezone-gui-plugin-ecrin/mixins/i18n';
import { A } from '@ember/array';
import { equal } from 'ember-awesome-macros';

export default Component.extend(I18n, {
  classNames: ['checkbox-filter'],

  /**
   * @override
   */
  i18nPrefix: 'components.checkboxFilter',

  /**
   * @virtual
   * @type {ComputedProperty<Array<{ name: string }>>}
   */
  items: computed(() => A()),

  /**
   * @type {ComputedProperty<Array<{ name: string }>>}
   */
  filteredItems: computed(
    'items.@each.name',
    'itemsFilter',
    function filteredItems() {
      const {
        items,
        itemsFilter,
      } = this.getProperties('items', 'itemsFilter');

      const processedItemsFilter = itemsFilter.trim().toLowerCase();
      return items.filter(item =>
        get(item, 'name').toLowerCase().indexOf(processedItemsFilter) !== -1
      );
    }
  ),

  /**
   * @virtual
   * @type {ComputedProperty<Array<{ name: string }>>}
   */
  selectedItems: computed(() => A()),

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
  onChange: () => {},

  /**
   * @type {String}
   */
  itemsFilter: '',

  /**
   * @type {ComputedProperty<boolean>}
   */
  areAllItemsSelected: equal('selectedItems.length', 'filteredItems.length'),

  itemsObserver: observer('items', function itemsObserver() {
    const {
      onChange,
      items,
      selectedItems,
    } = this.getProperties('onChange', 'items', 'selectedItems');

    const newSelectedItems = selectedItems.filter(item => items.includes(item));
    if (get(newSelectedItems, 'length') !== get(selectedItems, 'length')) {
      onChange(newSelectedItems);
    }
  }),

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
          newSelectedItems = selectedItems.concat([item]);
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
