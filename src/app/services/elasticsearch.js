/**
 * Exposes REST methods of Elasticsearch
 *
 * @module services/elasticsearch
 * @author Michał Borzęcki
 * @copyright (C) 2019 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import Service, { inject as service } from '@ember/service';

export default Service.extend({
  onezoneGuiResources: service(),

  /**
   * Performs request to Elasticsearch.
   * @param {string} method one of `get`, `post`, `put`, `delete`
   * @param {string} indexName
   * @param {string} path url (without host)
   * @param {Object|undefined} body request body
   * @returns {Promise<any>} request result
   */
  request(method, indexName, path, body) {
    const esRequest = this.get('onezoneGuiResources.esRequest');
    return esRequest({
      method,
      indexName,
      path,
      body: JSON.stringify(body),
    });
  },

  /**
   * Makes a GET request
   * @param {string} indexName
   * @param {string} path
   * @returns {Promise<any>}
   */
  fetch(indexName, path) {
    return this.request('get', indexName, path);
  },

  /**
   * Makes a POST request
   * @param {string} indexName
   * @param {string} path
   * @param {any} body
   * @returns {Promise<any>}
   */
  post(indexName, path, body) {
    return this.request('post', indexName, path, body);
  },
});
