/**
 * Represents a single study object received from Elasticsearch. Raw ES study object
 * is stored in `raw` field and used to create computed props with all data needed
 * for filtering and rendering
 *
 * @module utils/study
 * @author Michał Borzęcki
 * @copyright (C) 2019 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import EmberObject, { computed, observer, get } from '@ember/object';
import { reads } from '@ember/object/computed';
import { A } from '@ember/array';
import { and, or, raw, not, equal } from 'ember-awesome-macros';
import safeExec from 'onezone-gui-plugin-ecrin/utils/safe-method-execution';
import _ from 'lodash';
import categorizedValueComputed from 'onezone-gui-plugin-ecrin/utils/categorized-value-computed';

// Study topics which makes sense only when study is interventional
const interventionalOnlyStudyTopicTypes = [
  'phase',
  'interventionModel',
  'allocationType',
  'primaryPurpose',
  'masking',
];

// Like above, but for observational studies
const observationalOnlyStudyTopicTypes = [
  'observationalModel',
  'timePerspective',
  'biospecimensRetained',
];

// Topics which possible values are enumerated (in configuration). Raw value should be
// casted to one of predefined values
const categorizedTopicTypes = [
  ...interventionalOnlyStudyTopicTypes,
  ...observationalOnlyStudyTopicTypes,
];

const topicFields = {};
categorizedTopicTypes.forEach(topicField => {
  topicFields[topicField] = topicTypeComputed(topicField);
});

export default EmberObject.extend(topicFields, {
  /**
   * @virtual
   * @type {Ember.Service}
   */
  configuration: undefined,

  /**
   * @virtual
   * @type {Array<Object>}
   */
  studyTypeMapping: reads('configuration.studyTypeMapping'),

  /**
   * @virtual
   * @type {Array<Object>}
   */
  studyTopicTypeMapping: reads('configuration.studyTopicTypeMapping'),

  /**
   * Raw study object (value of _source field from Elasticsearch response)
   * @virtual
   * @type {Object}
   */
  raw: undefined,

  /**
   * @public
   * @type {ComputedProperty<number>}
   */
  id: reads('raw.id'),

  /**
   * @public
   * @type {boolean}
   */
  isRecordExpanded: false,

  /**
   * @public
   * @type {boolean}
   */
  isDescriptionExpanded: false,

  /**
   * @public
   * @type {boolean}
   */
  isDataSharingStatementExpanded: false,

  /**
   * Promise object which is not resolved until data objects
   * (specfied by field dataObjectsIdsToFetch) are fetched
   * @virtual
   * @type {PromiseObject<Array<Util.DataObject>>}
   */
  dataObjectsPromiseObject: undefined,

  /**
   * @type {ComputedProperty<Ember.A<Util.DataObject>>}
   */
  expandedDataObjects: computed(() => A()),

  /**
   * @type {ComputedProperty<Ember.A<Util.DataObject>>}
   */
  selectedDataObjects: computed(() => A()),

  /**
   * @type {ComputedProperty<String>}
   */
  title: reads('raw.display_title.title_text'),

  /**
   * @type {ComputedProperty<String>}
   */
  description: reads('raw.brief_description'),

  /**
   * @type {ComputedProperty<String>}
   */
  dataSharingStatement: reads('raw.data_sharing_statement'),

  /**
   * @type {ComputedProperty<Array<number>>}
   */
  dataObjectsIds: or('raw.linked_data_objects', raw([])),

  /**
   * Used to narrow list of data objects allowed to be loaded for this study
   * @type {ComputedProperty<Array<number>>}
   */
  dataObjectsIdsToFetch: reads('dataObjectsIds'),

  /**
   * @type {ComputedProperty<Ember.A<Util.DataObject>>}
   */
  dataObjects: reads('dataObjectsPromiseObject.content'),

  /**
   * @type {ComputedProperty<Object>}
   */
  type: categorizedValueComputed('study_type', 'studyType'),

  /**
   * @type {ComputedProperty<Object>}
   */
  status: categorizedValueComputed('study_status', 'studyStatus'),

  /**
   * @type {ComputedProperty<Object>}
   */
  genderEligibility: categorizedValueComputed(
    'study_gender_elig',
    'studyGenderEligibility'
  ),

  /**
   * @type {ComputedProperty<Array<Object>>}
   */
  studyFeatures: or('raw.study_features', []),

  /**
   * @type {ComputedProperty<boolean>}
   */
  isInterventional: computedIsStudyOfType('interventional'),

  /**
   * @type {ComputedProperty<boolean>}
   */
  isObservational: computedIsStudyOfType('observational'),

  /**
   * @type {ComputedProperty<boolean>}
   */
  hasAllElementsExpanded: and(
    or(not('description'), 'isDescriptionExpanded'),
    or(not('dataSharingStatement'), 'isDataSharingStatementExpanded'),
    equal('expandedDataObjects.length', or('dataObjects.length', raw(0))),
  ),

  dataObjectsPromiseObjectObserver: observer(
    'dataObjectsPromiseObject',
    function dataObjectsPromiseObjectObserver() {
      const dataObjectsPromiseObject = this.get('dataObjectsPromiseObject');
      if (dataObjectsPromiseObject) {
        dataObjectsPromiseObject.then(dataObjects => safeExec(this, () => {
          this.collapseAll();
          const selectedDataObjects = this.get('selectedDataObjects');
          selectedDataObjects.clear();
          selectedDataObjects.addObjects(dataObjects);
        }));
      }
    }
  ),

  init() {
    this._super(...arguments);

    this.dataObjectsPromiseObjectObserver();
  },

  expandAll() {
    const {
      expandedDataObjects,
      dataObjects,
    } = this.getProperties('expandedDataObjects', 'dataObjects');

    this.setProperties({
      isDescriptionExpanded: true,
      isDataSharingStatementExpanded: true,
    });
    expandedDataObjects.addObjects(dataObjects || []);
  },

  collapseAll() {
    this.setProperties({
      isDescriptionExpanded: false,
      isDataSharingStatementExpanded: false,
    });
    this.get('expandedDataObjects').clear();
  },

  isSupportingField(fieldName) {
    if (interventionalOnlyStudyTopicTypes.includes(fieldName)) {
      return this.get('isInterventional');
    } else if (observationalOnlyStudyTopicTypes.includes(fieldName)) {
      return this.get('isObservational');
    } else {
      return true;
    }
  },
});

/**
 * Creates computed property which takes value of specified topic type and
 * casts it to predefined topic values (performs categorization).
 * @param {String} topicTypeName
 * @returns {ComputedProperty<Object>}
 */
function topicTypeComputed(topicTypeName) {
  return computed('studyFeatures.[]', function () {
    const {
      studyTopicTypeMapping,
      studyFeatures,
    } = this.getProperties('studyTopicTypeMapping', 'studyFeatures');
    const topicFromMapping = studyTopicTypeMapping
      .findBy(`is${_.upperFirst(topicTypeName)}TopicType`, true);
    if (topicFromMapping) {
      const topicTypeId = get(topicFromMapping, 'id');
      const topic = studyFeatures
        .find(topic => get(topic, 'feature_type.id') === topicTypeId);
      const specifiedTopicMapping =
        this.get(`configuration.study${_.upperFirst(topicTypeName)}Mapping`);
      const unknownValue =
        this.get(`configuration.study${_.upperFirst(topicTypeName)}UnknownValue`);
      return topic &&
        specifiedTopicMapping.findBy('id', get(topic, 'feature_value.id')) ||
        unknownValue;
    }
  });
}

/**
 * Creates computed property which checks whether study type fits to passed type
 * name. To work properly needs an according flag set on study type in configuration
 * (like isInterventional or isObservational).
 * @param {String} typeName
 * @returns {ComputedProperty<boolean>}
 */
function computedIsStudyOfType(typeName) {
  const typeFlag = `is${_.upperFirst(typeName)}`;
  return computed('type', `studyTypeMapping.@each.${typeFlag}`, function () {
    const {
      type,
      studyTypeMapping,
    } = this.getProperties('type', 'studyTypeMapping');
    const typeFromMapping = studyTypeMapping.findBy(typeFlag, true);
    return type !== undefined && type === typeFromMapping;
  });
}
