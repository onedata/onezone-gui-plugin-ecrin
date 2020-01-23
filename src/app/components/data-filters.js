import Component from '@ember/component';
import rangeToNumbers from 'onezone-gui-plugin-ecrin/utils/range-to-numbers';
import I18n from 'onezone-gui-plugin-ecrin/mixins/i18n';
import { inject as service } from '@ember/service';
import { computed, get } from '@ember/object';
import { reads } from '@ember/object/computed';
import { A } from '@ember/array';
import { array, raw } from 'ember-awesome-macros';
import _ from 'lodash';

const studyCategorizedFilters = [
  'type',
  'status',
  'genderEligibility',
  'phase',
  'interventionModel',
  'allocationType',
  'primaryPurpose',
  'masking',
  'observationalModel',
  'timePerspective',
  'biospecimensRetained',
];

const dataObjectCategorizedFilters = [
  'type',
  'accessType',
];

const filtersFields = {};
studyCategorizedFilters.forEach(filterName => {
  const upperFirstFilterName = _.upperFirst(filterName);
  filtersFields[`study${upperFirstFilterName}Filter`] =
    reads(`configuration.study${upperFirstFilterName}Mapping`);
});
dataObjectCategorizedFilters.forEach(filterName => {
  const upperFirstFilterName = _.upperFirst(filterName);
  filtersFields[`dataObject${upperFirstFilterName}Filter`] =
    reads(`configuration.dataObject${upperFirstFilterName}Mapping`);
});

export default Component.extend(I18n, filtersFields, {
  classNames: ['data-filters', 'clearfix'],

  configuration: service(),

  /**
   * @override
   */
  i18nPrefix: 'components.dataFilters',

  /**
   * True if application is in the middle of data fetching process
   * @virtual optional
   * @type {boolean}
   */
  isFetchingData: false,

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
  onFilterStudies: () => {},

  /**
   * @virtual
   * @type {Function}
   * @param {Object} filters
   * @returns {any}
   */
  onFilterDataObjects: () => {},

  /**
   * @type {study}
   */
  filtersModel: 'dataObject',

  dataObjectPublisherMapping: computed(
    'dataObjects.@each.managingOrganisation',
    function dataObjectPublisherMapping() {
      return this.get('dataObjects')
        .mapBy('managingOrganisation')
        .compact()
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
   * @type {string}
   */
  dataObjectYearFilter: '',

  /**
   * @type {Array<Object>}
   */
  dataObjectPublisherFilter: reads('dataObjectPublisherMapping'),

  /**
   * @type {ComputedProperty<boolean>}
   */
  hasInterventionalStudyTypeSelected: array.isAny(
    'studyTypeFilter',
    raw('isInterventional')
  ),

  /**
   * @type {ComputedProperty<boolean>}
   */
  hasObservationalStudyTypeSelected: array.isAny(
    'studyTypeFilter',
    raw('isObservational')
  ),

  actions: {
    filterStudies() {
      const filters = {};
      studyCategorizedFilters.forEach(filterName => {
        const mappingSize =
          this.get(`configuration.study${_.upperFirst(filterName)}Mapping.length`);
        if (mappingSize) {
          filters[filterName] = this.get(`study${_.upperFirst(filterName)}Filter`);
        }
      });

      this.get('onFilterStudies')(filters);
    },
    filterDataObjects() {
      const {
        onFilterDataObjects,
        dataObjectPublisherMapping,
        dataObjectYearFilter,
        dataObjectPublisherFilter,
      } = this.getProperties(
        'onFilterDataObjects',
        'dataObjectPublisherMapping',
        'dataObjectYearFilter',
        'dataObjectPublisherFilter'
      );

      const filters = {
        year: rangeToNumbers(dataObjectYearFilter),
      };

      dataObjectCategorizedFilters.forEach(filterName => {
        const mappingSize = this.get(
          `configuration.dataObject${_.upperFirst(filterName)}Mapping.length`
        );
        if (mappingSize) {
          filters[filterName] =
            this.get(`dataObject${_.upperFirst(filterName)}Filter`);
        }
      });

      if (dataObjectPublisherMapping && dataObjectPublisherMapping.length) {
        filters.publisher = dataObjectPublisherFilter.mapBy('id');
      }

      onFilterDataObjects(filters);
    },
  },
});
