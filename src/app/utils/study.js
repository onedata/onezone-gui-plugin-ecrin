import EmberObject, { computed, observer, get } from '@ember/object';
import { reads } from '@ember/object/computed';
import { A } from '@ember/array';
import { and, or, raw, not, equal } from 'ember-awesome-macros';
import safeExec from 'onezone-gui-plugin-ecrin/utils/safe-method-execution';
import _ from 'lodash';

export default EmberObject.extend({
  /**
   * @virtual
   * @type {Array<Object>}
   */
  studyTypeMapping: undefined,

  /**
   * @virtual
   * @type {Array<Object>}
   */
  studyTopicTypeMapping: undefined,

  /**
   * @virtual
   * @type {Array<Object>}
   */
  studyGenderEligibilityMapping: undefined,

  /**
   * @virtual
   * @type {Array<Object>}
   */
  studyPhaseMapping: undefined,

  /**
   * @virtual
   * @type {Array<Object>}
   */
  studyInterventionModelMapping: undefined,

  /**
   * @virtual
   * @type {Array<Object>}
   */
  studyAllocationTypeMapping: undefined,

  /**
   * @virtual
   * @type {Array<Object>}
   */
  studyPrimaryPurposeMapping: undefined,

  /**
   * @virtual
   * @type {Array<Object>}
   */
  studyMaskingMapping: undefined,

  /**
   * @virtual
   * @type {Array<Object>}
   */
  studyObservationalModelMapping: undefined,

  /**
   * @virtual
   * @type {Array<Object>}
   */
  studyTimePerspectiveMapping: undefined,

  /**
   * @virtual
   * @type {Array<Object>}
   */
  studyBiospecimensRetainedMapping: undefined,

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
   * @type {ComputedProperty<number>}
   */
  index: reads('id'),

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
  title: reads('raw.display_title.title'),

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
   * @type {ComputedProperty<Ember.A<Util.DataObject>>}
   */
  dataObjects: reads('dataObjectsPromiseObject.content'),

  /**
   * @type {ComputedProperty<Object>}
   */
  type: reads('raw.study_type'),

  /**
   * @type {ComputedProperty<Object>}
   */
  status: reads('raw.study_status'),

  /**
   * @type {ComputedProperty<Array<Object>>}
   */
  studyTopics: or('raw.study_topics', []),

  /**
   * @type {ComputedProperty<Object>}
   */
  genderEligibility: topicTypeComputed('genderEligibility'),

  /**
   * @type {ComputedProperty<Object>}
   */
  phase: topicTypeComputed('phase'),

  /**
   * @type {ComputedProperty<Object>}
   */
  interventionModel: topicTypeComputed('interventionModel'),

  /**
   * @type {ComputedProperty<Object>}
   */
  allocationType: topicTypeComputed('allocationType'),

  /**
   * @type {ComputedProperty<Object>}
   */
  primaryPurpose: topicTypeComputed('primaryPurpose'),

  /**
   * @type {ComputedProperty<Object>}
   */
  masking: topicTypeComputed('masking'),

  /**
   * @type {ComputedProperty<Object>}
   */
  observationalModel: topicTypeComputed('observationalModel'),

  /**
   * @type {ComputedProperty<Object>}
   */
  timePerspective: topicTypeComputed('timePerspective'),

  /**
   * @type {ComputedProperty<Object>}
   */
  biospecimensRetained: topicTypeComputed('biospecimensRetained'),

  /**
   * @type {ComputedProperty<boolean>}
   */
  isInterventional: computed(
    'type.id',
    'studyTypeMapping.@each.isInterventional',
    function isInterventional() {
      const studyTypeId = this.get('type.id');
      const interventionalTypeId =
        this.get('studyTypeMapping').findBy('isInterventional', true);
      return interventionalTypeId !== undefined &&
        get(interventionalTypeId, 'id') === studyTypeId;
    }
  ),

  /**
   * @type {ComputedProperty<boolean>}
   */
  isObservational: computed(
    'type.id',
    'studyTypeMapping.@each.isInterventional',
    function isObservational() {
      const studyTypeId = this.get('type.id');
      const observationalTypeId =
        this.get('studyTypeMapping').findBy('isObservational', true);
      return observationalTypeId !== undefined &&
        get(observationalTypeId, 'id') === studyTypeId;
    }
  ),

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
});

function topicTypeComputed(topicTypeName) {
  return computed('studyTopics.[]', function () {
    const {
      studyTopicTypeMapping,
      studyTopics,
    } = this.getProperties('studyTopicTypeMapping', 'studyTopics');
    const specifiedTopicMapping =
      this.get(`study${_.upperFirst(topicTypeName)}Mapping`);
    const topicFromMapping = studyTopicTypeMapping
      .findBy(`is${_.upperFirst(topicTypeName)}TopicType`, true);
    if (topicFromMapping) {
      const topicTypeId = get(topicFromMapping, 'id');
      const topic = studyTopics
        .find(topic => get(topic, 'topic_source_type.id') === topicTypeId);
      return topic &&
        specifiedTopicMapping.findBy('name', get(topic, 'topic_value'));
    }
  });
}
