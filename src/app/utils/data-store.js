import EmberObject, { computed, observer, get, getProperties } from '@ember/object';
import {
  studyFiltersFromSaved,
  dataObjectFiltersFromSaved,
} from 'onezone-gui-plugin-ecrin/utils/data-filters-converters';
import _ from 'lodash';
import stringToRanges from 'onezone-gui-plugin-ecrin/utils/string-to-ranges';

export default EmberObject.extend({
  /**
   * @virtual
   * @type {Service.Configuration}
   */
  configuration: undefined,

  /**
   * @type {Array<Utils.Studies>}
   */
  studies: undefined,

  /**
   * @type {Object}
   */
  studyFilters: undefined,

  /**
   * @type {Object}
   */
  dataObjectFilters: undefined,

  /**
   * Used as a special publisher for data objects without specified publisher
   * @type {Object}
   */
  dataObjectPublisherUnknownValue: Object.freeze({
    id: -1,
    name: 'Not provided',
    useForUnknown: true,
  }),

  /**
   * @type {Array<Object>}
   * Previous value of dataObjectPublisherMapping
   */
  prevDataObjectPublisherMapping: undefined,

  /**
   * Studies with at least one data object selected
   * @type {ComputedProperty<Array<Utils.Study>>}
   */
  studiesWithDataObjectsSelected: computed(
    'studies',
    'filteredDataObjects',
    function studiesWithDataObjectsSelected() {
      const {
        studies,
        filteredDataObjects,
      } = this.getProperties('studies', 'filteredDataObjects');

      return studies.filter(study =>
        _.intersection(get(study, 'dataObjects') || [], filteredDataObjects).length
      );
    }
  ),

  /**
   * Finally filtered studies
   * @type {ComputedProperty<Array<Utils.Study>>}
   */
  filteredStudies: computed(
    'studiesWithDataObjectsSelected',
    'studyFilters',
    function filteredStudies() {
      const {
        studiesWithDataObjectsSelected,
        studyFilters,
      } = this.getProperties('studiesWithDataObjectsSelected', 'studyFilters');

      let filteredStudies = studiesWithDataObjectsSelected.slice();
      [
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
      ].forEach(fieldName => {
        filteredStudies = checkMatchOfCategorizedValue(
          filteredStudies,
          fieldName,
          get(studyFilters, fieldName)
        );
      });

      return filteredStudies;
    }
  ),

  /**
   * @type {ComputedProperty<Array<Utils.DataObject>>}
   */
  dataObjects: computed('studies.@each.dataObjects', function dataObjects() {
    return _.flatten((this.get('studies') || []).mapBy('dataObjects').compact())
      .uniqBy('id');
  }),

  /**
   * @type {ComputedProperty<Array<Utils.DataObject>>}
   */
  filteredDataObjects: computed(
    'dataObjects.[]',
    'dataObjectFilters',
    function filteredDataObjects() {
      const {
        dataObjects,
        dataObjectFilters,
        dataObjectPublisherMapping,
        dataObjectPublisherUnknownValue,
      } = this.getProperties(
        'dataObjects',
        'dataObjectFilters',
        'dataObjectPublisherMapping',
        'dataObjectPublisherUnknownValue'
      );

      let {
        year,
        publisher,
      } = getProperties(dataObjectFilters, 'year', 'publisher');
      year = stringToRanges(year);

      let filteredDataObjects = dataObjects.slice();
      [
        'filterType',
        'accessType',
      ].forEach(fieldName => {
        filteredDataObjects = checkMatchOfCategorizedValue(
          filteredDataObjects,
          fieldName,
          get(dataObjectFilters, fieldName)
        );
      });
      if (year && year.length) {
        filteredDataObjects = filteredDataObjects.filter(dataObject => {
          const doYear = get(dataObject, 'year');
          if (doYear) {
            return year.any(range => doYear >= range.start && doYear <= range
              .end);
          } else {
            return false;
          }
        });
      }
      if (publisher) {
        const allowUnknownValue = publisher.isAny('useForUnknown');
        const knownIds = dataObjectPublisherMapping
          .mapBy('id')
          .without(get(dataObjectPublisherUnknownValue, 'id'));
        filteredDataObjects = filteredDataObjects.filter(dataObject => {
          const doPublisherId = get(dataObject, 'managingOrganisation.id');
          return publisher.isAny('id', doPublisherId) ||
            (allowUnknownValue && !knownIds.includes(doPublisherId));
        });
      }

      return filteredDataObjects;
    }
  ),

  /**
   * @type {ComputedProperty<Array<Object>>}
   */
  dataObjectPublisherMapping: computed(
    'dataObjects.@each.managingOrganisation',
    'dataObjectPublisherUnknownValue',
    function dataObjectPublisherMapping() {
      const {
        dataObjects,
        dataObjectPublisherUnknownValue,
      } = this.getProperties(
        'dataObjects',
        'dataObjectPublisherUnknownValue'
      );
      return dataObjects
        .mapBy('managingOrganisation')
        .compact()
        .uniqBy('id')
        .map(publisher => {
          const publisherCopy = Object.assign({}, publisher);
          const name = get(publisher, 'name');
          // Sometimes publisher name is an array of strings
          if (name && typeof name === 'object' && name[0]) {
            publisherCopy.name = name[0];
          } else if (typeof name !== 'string') {
            publisherCopy.name = null;
          }
          return publisherCopy;
        })
        .rejectBy('name', null)
        .concat([dataObjectPublisherUnknownValue]);
    }
  ),

  dataObjectPublisherMappingObserver: observer(
    'dataObjectPublisherMapping.[]',
    function dataObjectPublisherMappingObserver() {
      const {
        prevDataObjectPublisherMapping,
        dataObjectPublisherMapping,
        dataObjectFilters,
      } = this.getProperties(
        'prevDataObjectPublisherMapping',
        'dataObjectPublisherMapping',
        'dataObjectFilters'
      );

      const oldPublishersIds = prevDataObjectPublisherMapping.mapBy('id');
      const newPublishersIds = dataObjectPublisherMapping.mapBy('id');
      const addedPublishers = _.difference(newPublishersIds, oldPublishersIds)
        .map(id => dataObjectPublisherMapping.findBy('id', id));
      const filterInNewMapping = dataObjectFilters.publisher
        .map(publisher =>
          dataObjectPublisherMapping.findBy('id', get(publisher, 'id'))
        )
        .compact()
        .addObjects(addedPublishers);

      this.set('prevDataObjectPublisherMapping', dataObjectPublisherMapping.slice());
      this.set(
        'dataObjectFilters',
        Object.assign({}, dataObjectFilters, { publisher: filterInNewMapping })
      );
    }
  ),

  init() {
    this._super(...arguments);

    const {
      studies,
      studyFilters,
      dataObjectFilters,
      dataObjectPublisherMapping,
    } = this.getProperties(
      'studies',
      'studyFilters',
      'dataObjectFilters',
      'dataObjectPublisherMapping'
    );

    this.setProperties({
      studies: studies || [],
      prevDataObjectPublisherMapping: (dataObjectPublisherMapping || []).slice(),
    });

    if (!studyFilters) {
      this.resetStudyFilters();
    }
    if (!dataObjectFilters) {
      this.resetDataObjectFilters();
    }
  },

  resetStudyFilters() {
    this.set('studyFilters', studyFiltersFromSaved(null, this.get('configuration')));
  },

  resetDataObjectFilters() {
    const {
      configuration,
      dataObjectPublisherMapping,
    } = this.getProperties('configuration', 'dataObjectPublisherMapping');

    this.set(
      'dataObjectFilters',
      dataObjectFiltersFromSaved(null, configuration, dataObjectPublisherMapping)
    );
  },

  removeStudies(studiesToRemove) {
    const {
      studies,
      dataObjects,
    } = this.getProperties('studies', 'dataObjects');

    studiesToRemove = studiesToRemove.slice();
    studies.removeObjects(studiesToRemove);

    const dataObjectsOfRemovedStudies = _.uniq(_.flatten(
      studiesToRemove.mapBy('dataObjects').compact()
    ));
    const usedDataObjectIds = _.flatten(studies.mapBy('dataObjectsIds'));
    const dataObjectsToRemove = dataObjectsOfRemovedStudies.filter(dataObject => {
      const doId = get(dataObject, 'id');
      return !usedDataObjectIds.includes(doId);
    });
    dataObjects.removeObjects(dataObjectsToRemove);
  },
});

function checkMatchOfCategorizedValue(records, fieldName, filter) {
  return records.filter(record =>
    !record.isSupportingField(fieldName) ||
    !filter || filter.includes(get(record, fieldName))
  );
}
