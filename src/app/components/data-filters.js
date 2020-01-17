import Component from '@ember/component';
import rangeToNumbers from 'onezone-gui-plugin-ecrin/utils/range-to-numbers';
import I18n from 'onezone-gui-plugin-ecrin/mixins/i18n';
import { inject as service } from '@ember/service';
import { computed, get } from '@ember/object';
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

  typeMapping: computed(
    'configuration.typeMapping.@each.{name,class}',
    function typeMapping() {
      const mappingsBase = this.get('configuration.typeMapping');
      return mappingsBase.map(type => Object.assign({}, type, {
        name: `${get(type, 'name')} [${get(type, 'class')}]`,
      }));
    }
  ),

  accessTypeMapping: reads('configuration.accessTypeMapping'),

  /**
   * @type {Array<Object>}
   */
  typeFilter: reads('typeMapping'),

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
        typeMapping,
        accessTypeMapping,
        typeFilter,
        accessTypeFilter,
        yearFilter,
      } = this.getProperties(
        'onFilterDataObjects',
        'typeMapping',
        'accessTypeMapping',
        'typeFilter',
        'accessTypeFilter',
        'yearFilter'
      );

      const filters = {
        year: rangeToNumbers(yearFilter),
      };

      if (typeMapping && typeMapping.length) {
        filters.type = typeFilter.mapBy('id');
      }

      if (accessTypeMapping && accessTypeMapping.length) {
        filters.accessType = accessTypeFilter.mapBy('id');
      }

      onFilterDataObjects(filters);
    },
  },
});
