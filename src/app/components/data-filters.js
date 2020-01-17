import Component from '@ember/component';
import rangeToNumbers from 'onezone-gui-plugin-ecrin/utils/range-to-numbers';
import I18n from 'onezone-gui-plugin-ecrin/mixins/i18n';
import { inject as service } from '@ember/service';
import { reads } from '@ember/object/computed';

export default Component.extend(I18n, {
  classNames: ['data-filters'],

  configuration: service(),

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

  accessTypeMapping: reads('configuration.accessTypeMapping'),

  /**
   * @type {Array<Object>}
   */
  accessTypeFilter: reads('accessTypeMapping'),

  /**
   * @type {string}
   */
  yearFilter: '',

  actions: {
    filterDataObjects() {
      const {
        onFilterDataObjects,
        accessTypeMapping,
        accessTypeFilter,
        yearFilter,
      } = this.getProperties(
        'onFilterDataObjects',
        'accessTypeMapping',
        'accessTypeFilter',
        'yearFilter'
      );

      const filters = {
        year: rangeToNumbers(yearFilter),
      };

      if (accessTypeMapping && accessTypeMapping.length) {
        filters.accessType = accessTypeFilter;
      }

      onFilterDataObjects(filters);
    },
  },
});
