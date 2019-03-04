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
   * @param {string} path url (without host)
   * @param {Object|undefined} body request body
   * @returns {Promise<any>} request result
   */
  request(method, path, body) {
    const esRequest = this.get('onezoneGuiResources.esRequest');
    return esRequest(method, path, JSON.stringify(body));
  },

  /**
   * Makes a GET request
   * @param {string} path
   * @returns {Promise<any>}
   */
  fetch(path) {
    return this.request('get', path);
  },

  /**
   * Makes a POST request
   * @param {string} path
   * @param {any} body
   * @returns {Promise<any>}
   */
  post(path, body) {
    return this.request('post', path, body);
  },
});
