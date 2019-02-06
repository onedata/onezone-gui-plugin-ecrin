import Service from '@ember/service';
import { reads } from '@ember/object/computed';
import { computed } from '@ember/object';
import $ from 'jquery';
import { Promise } from 'rsvp';

export default Service.extend({
  /**
   * @type {Window}
   */
  _window: window,

  /**
   * @type {Ember.ComputedProperty<Object>}
   */
  globalResources: reads('_window.onezoneGuiResources'),

  /**
   * Onezone data dedicated for this plugin.
   * @type {Ember.ComputedProperty<Object>}
   */
  pluginResources: reads('globalResources.dataDiscovery'),

  /**
   * Elasticsearch request function.
   * @type {Ember.ComputedProperty<Function>}
   * @param {string} method one of `get`, `post`, `put`, `delete`
   * @param {string} url url (without host)
   * @param {Object} headers request headers
   * @param {string|undefined} body request body
   * @returns {Promise<any>} request result
   */
  // esRequest: reads('pluginResources.esRequest'),
  esRequest: computed(function () {
    return (method, url, headers, body) => {
      return new Promise((resolve, reject) => {
        $.ajax({
          method,
          url: 'http://localhost:9200' + url,
          data: body,
          headers,
        }).then(resolve, reject);
      });
    };
  }),
});
