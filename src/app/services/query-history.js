/**
 * A service, which allows to manage queries history stored in IndexedDB
 *
 * @module services/qyery-history
 * @author Michał Borzęcki
 * @copyright (C) 2019 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import Service from '@ember/service';
import { computed, get, set } from '@ember/object';
import { promise } from 'ember-awesome-macros';
/* global Dexie */

export default Service.extend({
  /**
   * @type {Ember.ComputedProperty<Array<Object>>}
   */
  queriesCache: promise.object(computed('database', function queriesCache() {
    const database = this.get('database');
    return database.queries
      .orderBy('id')
      .reverse()
      .toArray();
  })),

  /**
   * @type {Ember.ComputedProperty<Dexie>}
   */
  database: computed(function database() {
    const db = new Dexie('PluginEcrinQueryHistory');
    db.version(1).stores({
      queries: '++id,name,timestamp',
    });
    return db;
  }),

  /**
   * @returns {PromiseObject<Array<Object>>}
   */
  getQueries() {
    return this.get('queriesCache');
  },

  /**
   * @param {Object} query
   * @returns {Promise<Object>}
   */
  addQuery(query) {
    const database = this.get('database');
    return database.queries.add(query).then(id => {
      const queriesCache = this.get('queriesCache');
      const queries = get(queriesCache, 'content');

      const savedQuery = Object.assign({ id }, query);
      queries.push(savedQuery);
      set(queriesCache, 'content', queries.sortBy('id'));

      return savedQuery;
    });
  },

  /**
   * @param {Object} query
   * @returns {Promise<undefined>}
   */
  deleteQuery(query) {
    const database = this.get('database');
    const queryId = get(query, 'id');
    database.queries.delete(queryId).then(() => {
      const queriesCache = this.get('queriesCache');
      const queries = get(queriesCache, 'content');

      set(queriesCache, 'content', queries.rejectBy('id', queryId));
    });
  },
});
