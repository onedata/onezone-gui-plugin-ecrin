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
import { computed } from '@ember/object';
import { reads } from '@ember/object/computed';
import { later } from '@ember/runloop';
import safeExec from 'onezone-gui-plugin-ecrin/utils/safe-method-execution';
import { Promise, resolve } from 'rsvp';

export default Service.extend({
  /**
   * @type {Window}
   */
  _window: window,

  /**
   * @type {Object}
   */
  appProxy: undefined,

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

  /**
   * @type {Ember.ComputedProperty<Promise>}
   */
  appProxyLoadingPromise: computed(function appProxyLoadingPromise() {
    return resolve();
  }),

  init() {
    this._super(...arguments);
    
    this.loadAppProxy();
    if (!this.get('appProxy')) {
      this.set('appProxyLoadingPromise', this.scheduleLoadAppProxy());
    }
  },

  /**
   * @returns {Object}
   */
  loadAppProxy() {
    return safeExec(
      this,
      () => this.set('appProxy', this.get('_window.frameElement.appProxy'))
    );
  },

  /**
   * @returns {Promise}
   */
  scheduleLoadAppProxy() {
    return new Promise(resolve => {
      later(this, () => {
        if (!this.loadAppProxy()) {
          this.scheduleLoadAppProxy().then(resolve);
        } else {
          resolve();
        }
      }, 20);
    });
  },
});
