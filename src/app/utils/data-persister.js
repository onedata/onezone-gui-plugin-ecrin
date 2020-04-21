/**
 * Is responsible for persistence layer of the application.
 *
 * @module utils/data-persister
 * @author Michał Borzęcki
 * @copyright (C) 2020 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

/**
 * @typedef {Object} PersistedResults
 * @property {String} name
 * @property {number} timestamp
 * @property {Array<number>} studies array of study ids
 * @property {Object} studyFilters dump of study filters state
 * @property {Object} dataObjectFilters dump of data object filters state
 * @property {Object} studySearchParams dump of latest study search params
 */

import EmberObject, { get, getProperties, setProperties } from '@ember/object';
import {
  studyFiltersToSave,
  studyFiltersFromSaved,
  dataObjectFiltersToSave,
  dataObjectFiltersFromSaved,
} from 'onezone-gui-plugin-ecrin/utils/data-filters-converters';
import StudySearchParams from 'onezone-gui-plugin-ecrin/utils/study-search-params';
import safeExec from 'onezone-gui-plugin-ecrin/utils/safe-method-execution';

export default EmberObject.extend({
  /**
   * @virtual
   * @type {Service.IndexeddbStorage}
   */
  indexeddbStorage: undefined,

  /**
   * @virtual
   * @type {Service.Configuration}
   */
  configuration: undefined,

  /**
   * @virtual
   * @type {Utils.DataFetcher}
   */
  dataFetcher: undefined,

  /**
   * @virtual
   * @type {Utils.DataStore}
   */
  dataStore: undefined,

  /**
   * @returns {Promise<Array<PersistedResults>>}
   */
  getResultsList() {
    return this.get('indexeddbStorage').loadResultsList();
  },

  /**
   * @param {PersistedResults} results
   * @returns {Promise}
   */
  removeResults(results) {
    return this.get('indexeddbStorage').removeResults(results);
  },

  /**
   * @param {String} name 
   * @param {Utils.StudySearchParams} studySearchParams 
   * @returns {Promise}
   */
  saveResults(name, studySearchParams) {
    const {
      indexeddbStorage,
      dataStore,
    } = this.getProperties(
      'indexeddbStorage',
      'dataStore'
    );
    const {
      studies,
      studyFilters,
      dataObjectFilters,
    } = getProperties(dataStore, 'studies', 'studyFilters', 'dataObjectFilters');
    const resultsToSave = {
      name,
      timestamp: Math.floor(Date.now() / 1000),
      studies: studies.mapBy('id'),
      studyFilters: studyFiltersToSave(studyFilters),
      dataObjectFilters: dataObjectFiltersToSave(dataObjectFilters),
      studySearchParams: studySearchParams.dumpValues(),
    };

    return indexeddbStorage.saveResults(resultsToSave);
  },

  /**
   * @param {PersistedResults} results 
   * @param {StudySearchParams} targetStudySearchParams
   * @returns {Promise}
   */
  loadResults(results, targetStudySearchParams) {
    const {
      configuration,
      dataStore,
      dataFetcher,
    } = this.getProperties('configuration', 'dataStore', 'dataFetcher');

    if (results.studySearchParams) {
      targetStudySearchParams.loadDumpedValues(
        results.studySearchParams,
        get(configuration, 'studyIdTypeMapping')
      );
    }

    dataStore.removeAllStudies();
    dataStore.resetStudyFilters();
    dataStore.resetDataObjectFilters();
    return dataFetcher.searchStudies(StudySearchParams.create({
        mode: 'viaInternalId',
        internalStudyIds: get(results, 'studies'),
      }))
      .then(() => safeExec(this, () => {
        const {
          studyFilters: savedStudyFilters,
          dataObjectFilters: savedDataObjectFilters,
        } = results;
        const dataObjectPublisherMapping =
          get(dataStore, 'dataObjectPublisherMapping');
        const studyFilters = studyFiltersFromSaved(
          savedStudyFilters,
          configuration
        );
        const dataObjectFilters = dataObjectFiltersFromSaved(
          savedDataObjectFilters,
          configuration,
          dataObjectPublisherMapping
        );

        setProperties(dataStore, {
          studyFilters,
          dataObjectFilters,
        });
      }));
  },
});
