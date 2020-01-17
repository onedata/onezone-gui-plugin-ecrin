import Component from '@ember/component';
import rangeToNumbers from 'onezone-gui-plugin-ecrin/utils/range-to-numbers';
import I18n from 'onezone-gui-plugin-ecrin/mixins/i18n';
import { inject as service } from '@ember/service';
import { computed, get } from '@ember/object';
import { reads } from '@ember/object/computed';
import { A } from '@ember/array';

export default Component.extend(I18n, {
  classNames: ['data-filters'],

  configuration: service(),

  /**
   * @override
   */
  i18nPrefix: 'components.dataFilters',

  /**
   * @virtual
   * @type {Array<Util.DataObject>}
   */
  dataObjects: computed(() => A()),

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

  publisherMapping: computed(
    'dataObjects.@each.managingOrganisation',
    function publisherMapping() {
      return this.get('dataObjects')
        .mapBy('managingOrganisation')
        .uniqBy('id')
        .map(publisher => {
          const publisherCopy = Object.assign({}, publisher);
          const name = get(publisher, 'name');
          if (typeof name === 'object' && name[0]) {
            publisherCopy.name = name[0];
          } else if (typeof name !== 'string') {
            publisherCopy.name = null;
          }
          return publisherCopy;
        })
        .rejectBy('name', null);
    }
  ),

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

  /**
   * @type {Array<Object>}
   */
  publisherFilter: reads('publisherMapping'),

  actions: {
    filterDataObjects() {
      const {
        onFilterDataObjects,
        typeMapping,
        accessTypeMapping,
        publisherMapping,
        typeFilter,
        accessTypeFilter,
        yearFilter,
        publisherFilter,
      } = this.getProperties(
        'onFilterDataObjects',
        'typeMapping',
        'accessTypeMapping',
        'publisherMapping',
        'typeFilter',
        'accessTypeFilter',
        'yearFilter',
        'publisherFilter'
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

      if (publisherMapping && publisherMapping.length) {
        filters.publisher = publisherFilter.mapBy('id');
      }

      onFilterDataObjects(filters);
    },
  },
});
