import EmberObject, { computed, get } from '@ember/object';
import { reads } from '@ember/object/computed';
import { array, raw } from 'ember-awesome-macros';
import isUrl from 'is-url';

export default EmberObject.extend({
  /**
   * @virtual
   * @type {Object}
   */
  objectTypeMapping: undefined,

  /**
   * @virtual
   * @type {Object}
   */
  accessTypeMapping: undefined,

  /**
   * Raw data-object object (value of _source field from Elasticsearch response)
   * @virtual
   * @type {Object}
   */
  raw: undefined,

  /**
   * @public
   * @type {boolean}
   */
  isExpanded: false,

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
  type: reads('raw.object_type'),

  /**
   * @type {ComputedProperty<String>}
   */
  typeName: computed('objectTypeMapping', 'type.name', function typeName() {
    const {
      objectTypeMapping,
      type,
    } = this.getProperties('objectTypeMapping', 'type');

    if (type) {
      const typeId = get(type, 'id');
      const typeFromMapping = (objectTypeMapping || []).findBy('id', typeId);
      return typeFromMapping ? get(typeFromMapping, 'name') : get(type, 'name');
    }
  }),

  /**
   * @type {ComputedProperty<Object>}
   */
  accessType: reads('raw.access_type'),

  /**
   * @type {ComputedProperty<string>}
   */
  accessTypeIndicator: computed(
    'accessTypeMapping',
    'accessType.id',
    function accessTypeIndicator() {
      const {
        accessTypeMapping,
        accessType,
      } = this.getProperties('accessTypeMapping', 'accessType');

      if (accessType) {
        const accessTypeId = get(accessType, 'id');
        const accessTypeFromMapping =
          (accessTypeMapping || []).findBy('id', accessTypeId);
        return accessTypeFromMapping ? get(accessTypeFromMapping, 'indicator') :
          'unknown';
      }
    }
  ),

  /**
   * @type {ComputedProperty<Object>}
   */
  managingOrganisation: reads('raw.managing_organisation'),
});
