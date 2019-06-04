/**
 * Exposes Onezone application proxy API (available through
 * window.frameElement.appProxy)
 *
 * @module services/app-proxy
 * @author Michał Borzęcki
 * @copyright (C) 2019 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import Service from '@ember/service';
import { reads } from '@ember/object/computed';

export default Service.extend({
  /**
   * @type {Window}
   */
  _window: window,

  /**
   * @type {Ember.ComputedProperty<Object>}
   */
  appProxy: reads('_window.frameElement.appProxy'),

  /**
   * Elasticsearch request function.
   * @type {Ember.ComputedProperty<Function>}
   * @param {string} params.method one of `get`, `post`, `put`, `delete`
   * @param {string} params.indexName
   * @param {string} params.path path to resource (part of the url without index)
   * @param {string|undefined} params.body request body
   * @returns {Promise<any>} request result
   */
  dataRequest: reads('appProxy.dataRequest'),

  /**
   * Fetches injected GUI plugin configuration
   * @type {Ember.ComputedProperty<Function>}
   * @returns {Promise<Object>}
   */
  configRequest: reads('appProxy.configRequest'),
});
