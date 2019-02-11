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
    return (method, url, body) => {
      return new Promise((resolve, reject) => {
        $.ajax({
          method,
          url: 'http://localhost:9200' + url,
          data: body,
        }).then(resolve, reject);
      });
    };
  }),

  // configRequest: reads('pluginResources.configRequest'),
  configRequest: computed(function () {
    return () => {
      return Promise.resolve({
        idFieldName: 'studyId',
        typeMapping: [
          { id: 't1', name: 'Type 1' },
          { id: 't2', name: 'Type 2' },
          { id: 't3', name: 'Type 3' },
          { id: 't4', name: 'Type 4' },
          { id: 't5', name: 'Type 5' },
          { id: 't6', name: 'Type 6' },
        ],
        accessTypeMapping: [
          { id: 'public', name: 'Public' },
          { id: 'private', name: 'Private' },
        ],
        publisherMapping: [
          { id: 'pub1', name: 'Publisher 1' },
          { id: 'pub2', name: 'Publisher 2' },
          { id: 'pub3', name: 'Publisher 3' },
          { id: 'pub4', name: 'Publisher 4' },
        ],
      });
    };
  }),
});
