/**
 * Exposes configuration of this application
 *
 * @module services/configuration
 * @author Michał Borzęcki
 * @copyright (C) 2019 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import Service, { inject as service } from '@ember/service';
import safeExec from 'onezone-gui-plugin-ecrin/utils/safe-method-execution';
import { get } from '@ember/object';
import { reads } from '@ember/object/computed';
import { Promise } from 'rsvp';

export default Service.extend({
  onezoneGuiResources: service(),
  elasticsearch: service(),

  /**
   * @type {Object|undefined}
   */
  configuration: undefined,

  /**
   * @type {Ember.ComputedProperty<Array<Object>>}
   */
  studyIdTypeMapping: reads('configuration.studyIdTypeMapping'),

  /**
   * @type {Ember.ComputedProperty<Array<Object>>}
   */
  typeMapping: reads('configuration.typeMapping'),

  /**
   * @type {Ember.ComputedProperty<Array<Object>>}
   */
  accessTypeMapping: reads('configuration.accessTypeMapping'),

  /**
   * @type {Ember.ComputedProperty<Array<Object>>}
   * Set by reloadAvailableEsValues()
   */
  publisherMapping: undefined,

  /**
   * (Re)loads configuration object
   * @returns {Promise}
   */
  reloadConfiguration() {
    const onezoneGuiResources = this.get('onezoneGuiResources');
    return onezoneGuiResources.configRequest()
      .then(config => safeExec(this, () => {
        this.set('configuration', config);
      }))
      .catch(() => safeExec(this, () => {
        this.set('configuration', undefined);
      }));
  },

  /**
   * (Re)loads available values stored in elasticsearch
   * @returns {Promise}
   */
  reloadAvailableEsValues() {
    const elasticsearch = this.get('elasticsearch');
    const fetchPublishers = elasticsearch.post('data_object', '_search', {
      size: 0,
      aggs: {
        publishers: {
          composite: {
            sources: [{
              name: {
                terms: {
                  field : 'managing_organization.name',
                },
              },
            }, {
              id: {
                terms: {
                  field: 'managing_organization.id',
                },
              },
            }],
            size: 9999,
          },
        },
      },
    });
    return Promise.all([
      fetchPublishers,
    ]).then(([publishersResult]) => {
      const publishers = get(
        publishersResult,
        'aggregations.publishers.buckets'
      ).mapBy('key').uniqBy('id');
      this.set('publisherMapping', publishers);
    });
  },
});
