/**
 * Provides operations for persisting search results inside IndexedDB.
 * 
 * @module services/indexeddb-storage
 * @author Michał Borzęcki
 * @copyright (C) 2019 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import Service from '@ember/service';
import EmberObject, { computed, observer, get } from '@ember/object';
import { Promise, resolve, reject } from 'rsvp';
import { A } from '@ember/array';
import { next } from '@ember/runloop';
import I18n from 'onezone-gui-plugin-ecrin/mixins/i18n';

export default Service.extend(I18n, {
  /**
   * @override
   */
  i18nPrefix: 'services.indexeddbStorage',

  /**
   * @type {String}
   */
  dbName: 'EcrinPlugin',

  /**
   * @type {string}
   */
  resultsObjectStoreName: 'Results',

  /**
   * @type {number}
   */
  dbVersion: 1,

  /**
   * @type {IndexedDB}
   */
  indexedDB: computed(() =>
    window.indexedDB ||
    window.mozIndexedDB ||
    window.webkitIndexedDB ||
    window.msIndexedDB
  ),

  /**
   * @type {IDBDatabase}
   */
  dbInstance: null,

  /**
   * If not empty then database is opening at the moment.
   * @type {Promise}
   */
  openingDatabasePromise: null,

  /**
   * Connection to database is opened when this array is not empty.
   * @type {Ember.A<IndexedDbQuery>}
   */
  pendingQueries: computed(() => A()),

  /**
   * Closes connection to DB when there are no pending queries
   */
  closeDatabaseTrigger: observer(
    'pendingQueries.length',
    function closeDatabaseTrigger() {
      if (this.get('pendingQueries.length') === 0) {
        next(() => {
          // Double check in next runloop frame to avoid races with
          // consecutive queries
          if (this.get('pendingQueries.length') === 0) {
            this.closeDatabase();
          }
        });
      }
    }
  ),

  /**
   * @returns {Promise<IDBDatabase>}
   */
  openDatabase() {
    const {
      dbInstance,
      openingDatabasePromise,
      indexedDB,
      dbName,
      dbVersion,
      resultsObjectStoreName,
    } = this.getProperties(
      'dbInstance',
      'openingDatabasePromise',
      'indexedDB',
      'dbName',
      'dbVersion',
      'resultsObjectStoreName'
    );

    if (openingDatabasePromise) {
      return openingDatabasePromise;
    } else if (dbInstance) {
      return resolve(dbInstance);
    } else {
      const openingDatabasePromise = new Promise((resolveConnect, rejectConnect) => {
        // Creating object to ensure that the same promise will be referenced
        // across different scopes.
        const upgradeFinishedPromiseContainer = { promise: resolve() };

        const request = indexedDB.open(dbName, dbVersion);
        request.onsuccess = event => {
          next(() => {
            upgradeFinishedPromiseContainer.promise
              .then(() => resolveConnect(event));
          });
        };
        request.onerror = rejectConnect;
        request.onupgradeneeded = event => {
          const dbInstance = event.target.result;

          upgradeFinishedPromiseContainer.promise =
            new Promise(resolveUpgrade => {
              const objectStore = dbInstance
                .createObjectStore(resultsObjectStoreName, {
                  keyPath: 'id',
                  autoIncrement: true,
                });

              objectStore.transaction.oncomplete = resolveUpgrade;
            });
        };
      }).then(event =>
        this.set('dbInstance', event.target.result)
      ).catch(event => {
        console.error('Cannot open IndexedDB database:', event);
        return reject(this.t('openDatabaseError'));
      }).finally(() =>
        this.set('openingDatabasePromise', null)
      );

      return this.set('openingDatabasePromise', openingDatabasePromise);
    }
  },

  closeDatabase() {
    const dbInstance = this.get('dbInstance');

    if (dbInstance) {
      dbInstance.close();
      this.set('dbInstance', null);
    }
  },

  /**
   * Creates new query object and adds it to pendingQueries.
   * @param {Promise} queryPromise
   * @returns {undefined}
   */
  queueNewQuery(queryPromise) {
    const pendingQueries = this.get('pendingQueries');
    const indexedDbQuery = IndexedDbQuery.create({
      queryFinishedCallback: queryInstance =>
        pendingQueries.removeObject(queryInstance),
      queryPromise,
    });

    pendingQueries.pushObject(indexedDbQuery);
  },

  /**
   * @param {string} [transactionMode='readonly'] one of: readwrite, readonly
   * @returns {{ transaction: IDBTransaction, resultsObjectStore: IDBObjectStore }}
   */
  startTransaction(transactionMode) {
    return this.openDatabase()
      .then(dbInstance => {
        const resultsObjectStoreName = this.get('resultsObjectStoreName');
        const transaction =
          dbInstance.transaction(resultsObjectStoreName, transactionMode);
        const resultsObjectStore = transaction.objectStore(resultsObjectStoreName);
        return { transaction, resultsObjectStore };
      });
  },

  /**
   * Saves results in IndexedDB
   * @param {Object} results 
   * @returns {Promise}
   */
  saveResults(results) {
    const promise = this.startTransaction('readwrite')
      .then(({ transaction, resultsObjectStore }) => new Promise((resolve, reject) => {
        transaction.oncomplete = resolve;
        transaction.onerror = event => {
          console.error('Cannot save record to IndexedDB database:', event);
          reject(this.t('cannotSaveError'));
        };
        resultsObjectStore.add(results);
      }));

    this.queueNewQuery(promise);

    return promise;
  },

  loadResultsList() {
    const promise = this.startTransaction('readonly')
      .then(({ transaction, resultsObjectStore }) => new Promise((resolve, reject) => {
        const request = resultsObjectStore.getAll();

        transaction.oncomplete = () => resolve(request.result);
        transaction.onerror = event => {
          console.error('Cannot load records from IndexedDB database:', event);
          reject(this.t('cannotLoadError'));
        };
      }));

    this.queueNewQuery(promise);

    return promise;
  },

  removeResults(results) {
    const idToRemove = results && get(results, 'id');
    if (typeof idToRemove !== 'number') {
      return resolve();
    }

    const promise = this.startTransaction('readwrite')
      .then(({ transaction, resultsObjectStore }) => new Promise((resolve, reject) => {
        transaction.oncomplete = resolve;
        transaction.onerror = event => {
          console.error('Cannot remove record from IndexedDB database:', event);
          reject(this.t('cannotRemoveError'));
        };

        resultsObjectStore.delete(idToRemove);
      }));

    this.queueNewQuery(promise);

    return promise;
  },
});

/**
 * Util class used to populate pendingQueries array.
 */
const IndexedDbQuery = EmberObject.extend({
  /**
   * Called when queryPromise is settled
   * @virtual
   * @type {Function}
   * @param {IndexedDbQuery} queryInstance
   * @returns {any}
   */
  queryFinishedCallback: () => {},

  /**
   * Must not change after object init
   * @virtual
   * @type {Promise}
   */
  queryPromise: undefined,

  init() {
    this._super(...arguments);

    this.get('queryPromise')
      .finally(() => this.get('queryFinishedCallback')(this));
  },
});
