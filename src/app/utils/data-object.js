/**
 * Represents a single data object received from Elasticsearch. Raw ES data object
 * is stored in `raw` field and used to create computed props with all data needed
 * for filtering and rendering
 *
 * @module utils/study
 * @author Michał Borzęcki
 * @copyright (C) 2019 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import EmberObject, { computed, get } from '@ember/object';
import { reads } from '@ember/object/computed';
import { bool } from 'ember-awesome-macros';
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
   * @type {ComputedProperty<number>}
   */
  id: reads('raw.id'),

  /**
   * @type {ComputedProperty<String>}
   */
  title: reads('raw.display_title'),

  /**
   * @type {ComputedProperty<number>}
   */
  year: reads('raw.publication_year'),

  /**
   * @type {ComputedProperty<Object>}
   */
  type: reads('raw.object_type'),

  /**
   * @type {ComputedProperty<Object>}
   */
  filterType: computed(
    'type.id',
    'configuration.{dataObjectFilterTypeMapping,dataObjectFilterTypeUnknownValue}',
    function filterType() {
      const typeId = this.get('type.id');
      const mapping = this.get('configuration.dataObjectFilterTypeMapping');
      const unknownValue = this.get('configuration.dataObjectFilterTypeUnknownValue');

      if (typeof typeId !== 'number') {
        return unknownValue;
      } else {
        const filterType = mapping
          .filterBy('objectTypeIds')
          .find(filterType => get(filterType, 'objectTypeIds').includes(typeId));
        return filterType || unknownValue;
      }
    }
  ),

  /**
   * @type {ComputedProperty<Object>}
   */
  accessType: categorizedValueComputed('access_type', 'dataObjectAccessType'),

  /**
   * @type {ComputedProperty<String>}
   */
  accessDetails: reads('raw.access_details'),

  /**
   * @type {ComputedProperty<String>}
   */
  accessDetailsUrl: reads('raw.access_details_url'),

  /**
   * @type {ComputedProperty<boolean>}
   */
  hasCorrectAccessDetailsUrl: computed(
    'accessDetailsUrl',
    function hasCorrectAccessDetailsUrl() {
      return isUrl(this.get('accessDetailsUrl'));
    }
  ),

  /**
   * @type {ComputedProperty<Object>}
   */
  managingOrganisation: reads('raw.managing_organisation'),

  /**
   * @type {ComputedProperty<boolean>}
   */
  isJournalArticle: bool('filterType.isJournalArticle'),

  /**
   * @type {ComputedProperty<Array<{ type: String, url: String, isUrlCorrect: boolean }>>}
   */
  urls: computed('raw.object_instances', 'isJournalArticle', function urls() {
    let objectInstances = (this.get('raw.object_instances') || [])
      .slice().filterBy('url');
    const isJournalArticle = this.get('isJournalArticle');
    const urlsCollection = [];

    if (isJournalArticle) {
      [{
        type: 'journalAbstract',
        id: 35,
      }, {
        type: 'journalArticle',
        id: 36,
      }].forEach(({ type, id }) => {
        let instance;
        do {
          instance = objectInstances.findBy('resource_type.id', id);
          if (instance) {
            urlsCollection.push({
              type,
              url: instance.url,
              isUrlCorrect: isUrl(instance.url),
            });
            objectInstances = objectInstances.without(instance);
          }
        } while (instance);
      });
    }
    objectInstances.filterBy('url').forEach(instance =>
      urlsCollection.push({
        type: 'unknown',
        url: instance.url,
        isUrlCorrect: isUrl(instance.url),
      })
    );

    return urlsCollection;
  }),

  isSupportingField() {
    // Data object has no fields that exclude each other (like study has), hence
    // always return true
    return true;
  },
});
