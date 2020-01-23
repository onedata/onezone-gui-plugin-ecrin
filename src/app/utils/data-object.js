import EmberObject, { computed } from '@ember/object';
import { reads } from '@ember/object/computed';
import { array, raw } from 'ember-awesome-macros';
import isUrl from 'is-url';
import categorizedValueComputed from 'onezone-gui-plugin-ecrin/utils/categorized-value-computed';

export default EmberObject.extend({
  /**
   * Raw data-object object (value of _source field from Elasticsearch response)
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
   * @type {ComputedProperty<String>}
   */
  title: reads('raw.display_title'),

  /**
   * @type {ComputedProperty<String>}
   */
  url: array.objectAt(
    array.compact(
      array.mapBy('raw.object_instances', raw('url'))
    ),
    raw(0)
  ),

  /**
   * @type {ComputedProperty<boolean>}
   */
  hasCorrectUrl: computed('url', function hasCorrectUrl() {
    return isUrl(this.get('url'));
  }),

  /**
   * @type {ComputedProperty<number>}
   */
  year: reads('raw.publication_year'),

  /**
   * @type {ComputedProperty<Object>}
   */
  type: categorizedValueComputed('object_type', 'dataObjectType'),

  /**
   * @type {ComputedProperty<Object>}
   */
  accessType: categorizedValueComputed('access_type', 'dataObjectAccessType'),

  /**
   * @type {ComputedProperty<Object>}
   */
  managingOrganisation: reads('raw.managing_organisation'),

  isSupportingField() {
    return true;
  },
});
