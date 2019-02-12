import Service, { inject as service } from '@ember/service';

export default Service.extend({
  onezoneGuiResources: service(),

  /**
   * Performs request to Elasticsearch.
   * @param {string} method one of `get`, `post`, `put`, `delete`
   * @param {string} url url (without host)
   * @param {Object|undefined} body request body
   * @returns {Promise<any>} request result
   */
  request(method, url, body) {
    const esRequest = this.get('onezoneGuiResources.esRequest');
    return esRequest(method, url, JSON.stringify(body));
  },

  /**
   * Makes a GET request
   * @param {string} url
   * @returns {Promise<any>}
   */
  fetch(url) {
    return this.request('get', url);
  },

  /**
   * Makes a GET request
   * @param {string} url
   * @param {any} body
   * @returns {Promise<any>}
   */
  post(url, body) {
    return this.request('post', url, body);
  },

  /**
   * Makes a GET request
   * @param {string} url
   * @param {any} body
   * @returns {Promise<any>}
   */
  put(url, body) {
    return this.request('put', url, body);
  },

  /**
   * Makes a DELETE request
   * @param {string} url
   * @returns {Promise<any>}
   */
  delete(url) {
    return this.request('delete', url);
  },
});
