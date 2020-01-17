import Component from '@ember/component';
import rangeToNumbers from 'onezone-gui-plugin-ecrin/utils/range-to-numbers';
import I18n from 'onezone-gui-plugin-ecrin/mixins/i18n';

export default Component.extend(I18n, {
  classNames: ['data-filters'],

  /**
   * @override
   */
  i18nPrefix: 'components.dataFilters',

  /**
   * @virtual
   * @type {Function}
   * @param {Object} filters
   * @returns {any}
   */
  onFilterDataObjects: () => {},

  /**
   * @type {string}
   */
  yearFilter: '',

  actions: {
    filterDataObjects() {
      const {
        onFilterDataObjects,
        yearFilter,
      } = this.getProperties('onFilterDataObjects', 'yearFilter');

      const filters = {
        year: rangeToNumbers(yearFilter),
      };

      onFilterDataObjects(filters);
    },
  },
});
