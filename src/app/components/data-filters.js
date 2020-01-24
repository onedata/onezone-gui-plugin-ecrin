import Component from '@ember/component';
import rangeToNumbers from 'onezone-gui-plugin-ecrin/utils/range-to-numbers';
import I18n from 'onezone-gui-plugin-ecrin/mixins/i18n';
import { inject as service } from '@ember/service';
import { observer, get } from '@ember/object';
import { reads } from '@ember/object/computed';
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

  dataObjectPublisherMapping: undefined,

  prevDataObjectPublisherMapping: undefined,

  /**
   * @type {string}
   */
  dataObjectYearFilter: '',

  /**
   * @type {Array<Object>}
   */
  dataObjectPublisherFilter: undefined,

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

  dataObjectPublisherMappingObserver: observer(
    'dataObjectPublisherMapping.[]',
    function dataObjectPublisherMappingObserver() {
      const {
        prevDataObjectPublisherMapping,
        dataObjectPublisherMapping,
        dataObjectPublisherFilter,
      } = this.getProperties(
        'prevDataObjectPublisherMapping',
        'dataObjectPublisherMapping',
        'dataObjectPublisherFilter'
      );

      const oldPublishersIds = prevDataObjectPublisherMapping.mapBy('id');
      const newPublishersIds = dataObjectPublisherMapping.mapBy('id');
      const newPublishers = _.difference(newPublishersIds, oldPublishersIds)
        .map(id => dataObjectPublisherMapping.findBy('id', id));
      const filterInNewMapping = dataObjectPublisherFilter
        .map(publisher =>
          dataObjectPublisherMapping.findBy('id', get(publisher, 'id'))
        )
        .compact()
        .addObjects(newPublishers);

      this.setProperties({
        prevDataObjectPublisherMapping: dataObjectPublisherMapping.slice(),
        dataObjectPublisherFilter: filterInNewMapping,
      });
    }
  ),

  init() {
    this._super(...arguments);

    const dataObjectPublisherMapping =
      (this.get('dataObjectPublisherMapping') || []).slice();
    this.setProperties({
      prevDataObjectPublisherMapping: dataObjectPublisherMapping,
      dataObjectPublisherFilter: dataObjectPublisherMapping,
    });
  },

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
        dataObjectYearFilter,
        dataObjectPublisherFilter,
      } = this.getProperties(
        'onFilterDataObjects',
        'dataObjectYearFilter',
        'dataObjectPublisherFilter'
      );

      const filters = {
        year: rangeToNumbers(dataObjectYearFilter),
        publisher: dataObjectPublisherFilter,
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

      onFilterDataObjects(filters);
    },
  },
});
