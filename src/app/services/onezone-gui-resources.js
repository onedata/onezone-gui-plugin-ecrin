import Service from '@ember/service';
import { reads } from '@ember/object/computed';
// import { computed } from '@ember/object';
// import $ from 'jquery';
// import { Promise } from 'rsvp';

export default Service.extend({
  /**
   * @type {Window}
   */
  _window: window,

  /**
   * @type {Ember.ComputedProperty<Object>}
   */
  globalResources: reads('_window.parent.onezoneGuiResources'),

  /**
   * Onezone data dedicated for this plugin.
   * @type {Ember.ComputedProperty<Object>}
   */
  pluginResources: reads('globalResources.dataDiscovery'),

  /**
   * Elasticsearch request function.
   * @type {Ember.ComputedProperty<Function>}
   * @param {string} method one of `get`, `post`, `put`, `delete`
   * @param {string} path path to resource (part of the url)
   * @param {string|undefined} body request body
   * @returns {Promise<any>} request result
   */
  esRequest: reads('pluginResources.esRequest'),
  // esRequest: computed(function () {
  //   return (method, url, body) => {
  //     return new Promise((resolve, reject) => {
  //       $.ajax({
  //         method,
  //         url: 'http://localhost:9200' + url,
  //         data: body,
  //         contentType: 'application/json; charset=UTF-8',
  //       }).then(resolve, reject);
  //     });
  //   };
  // }),

  configRequest: reads('pluginResources.configRequest'),
  // configRequest: computed(function () {
  //   return () => {
  //     return Promise.resolve({
  //       typeMapping: [
  //         { id: 'type0', name: 'Type 0' },
  //         { id: 'type1', name: 'Type 1' },
  //         { id: 'type2', name: 'Type 2' },
  //         { id: 'type3', name: 'Type 3' },
  //         { id: 'type4', name: 'Type 4' },
  //         { id: 'type5', name: 'Type 5' },
  //       ],
  //       accessTypeMapping: [
  //         { id: 0, name: 'Public' },
  //         { id: 1, name: 'Private' },
  //       ],
  //       publisherMapping: [
  //         { id: 'publisher0', name: 'Publisher 0' },
  //         { id: 'publisher1', name: 'Publisher 1' },
  //         { id: 'publisher2', name: 'Publisher 2' },
  //         { id: 'publisher3', name: 'Publisher 3' },
  //       ],
  //     });
  //   };
  // }),
});
