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
import { or, raw } from 'ember-awesome-macros';

export default Service.extend({
  appProxy: service(),
  elasticsearch: service(),

  /**
   * @type {Object|undefined}
   */
  configuration: undefined,

  /**
   * @type {Ember.ComputedProperty<Array<Object>>}
   */
  studyIdTypeMapping: or('configuration.studyIdTypeMapping', raw([])),

  /**
   * @type {Ember.ComputedProperty<Array<Object>>}
   */
  studyTypeMapping: or('configuration.studyTypeMapping', raw([])),

  /**
   * @type {Ember.ComputedProperty<Array<Object>>}
   */
  objectTypeMapping: or('configuration.objectTypeMapping', raw([])),

  /**
   * @type {Ember.ComputedProperty<Array<Object>>}
   */
  accessTypeMapping: or('configuration.accessTypeMapping', raw([])),

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
    const appProxy = this.get('appProxy');
    return appProxy.configRequest()
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
    return elasticsearch.post('data_object', '_search', {
        size: 0,
        aggs: {
          publishers: {
            composite: {
              sources: [{
                name: {
                  terms: {
                    field: 'managing_organization.name.raw',
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
      })
      .then(publishersResult => {
        const publishers = get(
          publishersResult,
          'aggregations.publishers.buckets'
        ).mapBy('key').uniqBy('id');
        this.set('publisherMapping', publishers);
      });
  },
});
