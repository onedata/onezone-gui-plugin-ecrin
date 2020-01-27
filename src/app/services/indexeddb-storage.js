import Service from '@ember/service';
import EmberObject, { computed, observer } from '@ember/object';
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
  dbName: 'EcrinPluginDb',

  /**
   * @type {string}
   */
  resultsObjectStoreName: 'results',

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
   * @type {Promise}
   */
  openingDatabasePromise: null,

  /**
   * @type {Ember.A}
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
    } = this.getProperties(
      'dbInstance',
      'openingDatabasePromise'
    );

    if (openingDatabasePromise) {
      return openingDatabasePromise;
    } else if (dbInstance) {
      return resolve(dbInstance);
    } else {
      // eslint-disable-next-line promise/param-names
      const openingDatabasePromise = new Promise((resolveConnect, rejectConnect) => {
        const {
          indexedDB,
          dbName,
          dbVersion,
          resultsObjectStoreName,
        } = this.getProperties(
          'indexedDB',
          'dbName',
          'dbVersion',
          'resultsObjectStoreName'
        );
        const request = indexedDB.open(dbName, dbVersion);
        const upgradeFinishedPromiseContainer = {
          promise: resolve(),
        };
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
            // eslint-disable-next-line promise/param-names
            new Promise(resolveUpgrade => {
              const objectStore = dbInstance
                .createObjectStore(resultsObjectStoreName, {
                  keyPath: 'id',
                  autoIncrement: true,
                });

              objectStore.transaction.oncomplete = resolveUpgrade;
            });
        };
      }).then(event => {
        const dbInstance = event.target.result;
        return this.set('dbInstance', dbInstance);
      }).catch(event => {
        console.error('Cannot open IndexedDB database:', event);
        return reject(this.t('openDatabaseError'));
      }).finally(() => {
        this.set('openingDatabasePromise', null);
      });
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
      taskFinishedCallback: queryInstance =>
        pendingQueries.removeObject(queryInstance),
      promise: queryPromise,
    });

    pendingQueries.pushObject(indexedDbQuery);
  },

  /**
   * Saves results in IndexedDB
   * @param {Object} results 
   * @returns {Promise}
   */
  saveResults(results) {
    const promise = this.openDatabase()
      .then(dbInstance => new Promise((resolve, reject) => {
        const resultsObjectStoreName = this.get('resultsObjectStoreName');
        const transaction =
          dbInstance.transaction(resultsObjectStoreName, 'readwrite');
        transaction.oncomplete = resolve;
        transaction.onerror = event => {
          console.error('Cannot save record to IndexedDB database:', event);
          reject(this.t('cannotSaveError'));
        };

        const objectStore = transaction.objectStore(resultsObjectStoreName);
        objectStore.add(results);
      }));

    this.queueNewQuery(promise);

    return promise;
  },

  loadResultsList() {
    const promise = this.openDatabase()
      .then(dbInstance => new Promise((resolve, reject) => {
        const resultsObjectStoreName = this.get('resultsObjectStoreName');
        const transaction =
          dbInstance.transaction(resultsObjectStoreName, 'readonly');
        const objectStore = transaction.objectStore(resultsObjectStoreName);
        const request = objectStore.getAll();

        transaction.oncomplete = () => resolve(request.result);
        transaction.onerror = event => {
          console.error('Cannot load records from IndexedDB database:', event);
          reject(this.t('cannotLoadError'));
        };
      }));

    this.queueNewQuery(promise);

    return promise;
  },
});

const IndexedDbQuery = EmberObject.extend({
  /**
   * @virtual
   * @type {Function}
   * @param {IndexedDbQuery} queryInstance
   * @returns {any}
   */
  taskFinishedCallback: () => {},

  /**
   * @virtual
   * @type {Promise}
   */
  promise: undefined,

  init() {
    this._super(...arguments);

    this.get('promise')
      .finally(() => this.get('taskFinishedCallback')(this));
  },
});
