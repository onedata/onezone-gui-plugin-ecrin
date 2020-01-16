import EmberObject, { computed } from '@ember/object';
import { reads } from '@ember/object/computed';
import { A } from '@ember/array';
import { and, or, raw, not, equal } from 'ember-awesome-macros';

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
  description: reads('raw.study_status.brief_description'),

  /**
   * @type {ComputedProperty<String>}
   */
  dataSharingStatement: reads('raw.study_status.data_sharing_statement'),

  /**
   * @type {ComputedProperty<Array<number>>}
   */
  dataObjectsIds: or('raw.linked_data_objects', raw([])),

  /**
   * @type {ComputedProperty<Ember.A<Util.DataObject>>}
   */
  dataObjects: reads('dataObjectsPromiseObject.content'),

  /**
   * @type {ComputedProperty<boolean>}
   */
  hasAllElementsExpanded: and(
    or(not('description'), 'isDescriptionExpanded'),
    or(not('dataSharingStatement'), 'isDataSharingStatementExpanded'),
    equal('expandedDataObjects.length', or('dataObjects.length', raw(0))),
  ),

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
