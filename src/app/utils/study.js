import EmberObject, { computed, observer, get } from '@ember/object';
import { reads } from '@ember/object/computed';
import { A } from '@ember/array';
import { and, or, raw, not, equal } from 'ember-awesome-macros';
import safeExec from 'onezone-gui-plugin-ecrin/utils/safe-method-execution';

export default EmberObject.extend({
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
  description: reads('status.brief_description'),

  /**
   * @type {ComputedProperty<String>}
   */
  dataSharingStatement: reads('status.data_sharing_statement'),

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
   * @type {ComputedProperty<String>}
   */
  genderEligibility: computed('studyTopics.[]', function genderEligibility() {
    const studyTopics = this.get('studyTopics');
    const genderEligibilityTopic =
      studyTopics.find(topic => get(topic, 'topic_source_type.id') === 40);
    return genderEligibilityTopic && get(genderEligibilityTopic, 'topic_value');
  }),

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
