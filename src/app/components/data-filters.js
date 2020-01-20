import Component from '@ember/component';
import rangeToNumbers from 'onezone-gui-plugin-ecrin/utils/range-to-numbers';
import I18n from 'onezone-gui-plugin-ecrin/mixins/i18n';
import { inject as service } from '@ember/service';
import { computed, get } from '@ember/object';
import { reads } from '@ember/object/computed';
import { A } from '@ember/array';
import { array, raw } from 'ember-awesome-macros';
import _ from 'lodash';

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

  studyTypeMapping: reads('configuration.studyTypeMapping'),

  studyStatusMapping: reads('configuration.studyStatusMapping'),

  studyGenderEligibilityMapping: computed(
    'configuration.studyGenderEligibilityValues.[]',
    function studyGenderEligibilityMapping() {
      const studyGenderEligibilityValues =
        this.get('configuration.studyGenderEligibilityValues');
      return studyGenderEligibilityValues
        .map(gender => ({ name: gender }))
        .concat([{ name: 'Unknown' }]);
    }
  ),

  studyPhaseMapping: reads('configuration.studyPhaseMapping'),

  studyInterventionModelMapping: reads('configuration.studyInterventionModelMapping'),

  studyAllocationTypeMapping: reads('configuration.studyAllocationTypeMapping'),

  studyPrimaryPurposeMapping: reads('configuration.studyPrimaryPurposeMapping'),

  studyMaskingMapping: reads('configuration.studyMaskingMapping'),

  objectTypeMapping: computed(
    'configuration.objectTypeMapping.@each.{name,class}',
    function objectTypeMapping() {
      const mappingsBase = this.get('configuration.objectTypeMapping');
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
  studyTypeFilter: reads('studyTypeMapping'),

  /**
   * @type {Array<Object>}
   */
  studyStatusFilter: reads('studyStatusMapping'),

  /**
   * @type {Array<Object>}
   */
  studyGenderEligibilityFilter: reads('studyGenderEligibilityMapping'),

  /**
   * @type {Array<Object>}
   */
  studyPhaseFilter: reads('studyPhaseMapping'),

  /**
   * @type {Array<Object>}
   */
  studyInterventionModelFilter: reads('studyInterventionModelMapping'),

  /**
   * @type {Array<Object>}
   */
  studyAllocationTypeFilter: reads('studyAllocationTypeMapping'),

  /**
   * @type {Array<Object>}
   */
  studyPrimaryPurposeFilter: reads('studyPrimaryPurposeMapping'),

  /**
   * @type {Array<Object>}
   */
  studyMaskingFilter: reads('studyMaskingMapping'),

  /**
   * @type {Array<Object>}
   */
  objectTypeFilter: reads('objectTypeMapping'),

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
      const {
        onFilterStudies,
        studyGenderEligibilityFilter,
      } = this.getProperties(
        'onFilterStudies',
        'studyGenderEligibilityFilter',
      );

      const filters = {
        genderEligibility: studyGenderEligibilityFilter.mapBy('name'),
      };

      [
        'type',
        'status',
        'phase',
        'interventionModel',
        'allocationType',
        'primaryPurpose',
        'masking',
      ].forEach(filterName => {
        const mapping = this.get(`study${_.upperFirst(filterName)}Mapping`);
        const filter = this.get(`study${_.upperFirst(filterName)}Filter`);
        if (mapping && mapping.length) {
          filters[filterName] = filter.mapBy('id');
        }
      });

      onFilterStudies(filters);
    },
    filterDataObjects() {
      const {
        onFilterDataObjects,
        objectTypeMapping,
        accessTypeMapping,
        publisherMapping,
        objectTypeFilter,
        accessTypeFilter,
        yearFilter,
        publisherFilter,
      } = this.getProperties(
        'onFilterDataObjects',
        'objectTypeMapping',
        'accessTypeMapping',
        'publisherMapping',
        'objectTypeFilter',
        'accessTypeFilter',
        'yearFilter',
        'publisherFilter'
      );

      const filters = {
        year: rangeToNumbers(yearFilter),
      };

      if (objectTypeMapping && objectTypeMapping.length) {
        filters.type = objectTypeFilter.mapBy('id');
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
