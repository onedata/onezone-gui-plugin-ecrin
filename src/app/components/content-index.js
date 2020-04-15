/**
 * A component, which shows whole layout of query parameters and results
 * 
 * @module components/content-index
 * @author Michał Borzęcki
 * @copyright (C) 2019 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import Component from '@ember/component';
import {
  computed,
  get,
  getProperties,
  setProperties,
} from '@ember/object';
import { reads } from '@ember/object/computed';
import I18n from 'onezone-gui-plugin-ecrin/mixins/i18n';
import { inject as service } from '@ember/service';
import StudySearchParams from 'onezone-gui-plugin-ecrin/utils/study-search-params';
import {
  studyFiltersToSave,
  studyFiltersFromSaved,
  dataObjectFiltersToSave,
  dataObjectFiltersFromSaved,
} from 'onezone-gui-plugin-ecrin/utils/data-filters-converters';
import safeExec from 'onezone-gui-plugin-ecrin/utils/safe-method-execution';
import DataStore from 'onezone-gui-plugin-ecrin/utils/data-store';
import DataFetcher from 'onezone-gui-plugin-ecrin/utils/data-fetcher';

export default Component.extend(I18n, {
  classNames: ['content-index', 'content'],

  elasticsearch: service(),
  configuration: service(),
  indexeddbStorage: service(),
  pdfGenerator: service(),

  /**
   * @override
   */
  i18nPrefix: 'components.contentIndex',

  /**
   * @type {StudySearchParams}
   */
  studySearchParams: computed(() => StudySearchParams.create()),

  /**
   * @type {Utils.DataStore}
   */
  dataStore: undefined,

  /**
   * @type {ComputedProperty<boolean>}
   */
  isFetchingData: reads('dataFetcher.fetchDataPromiseObject.isPending'),

  init() {
    this._super(...arguments);

    const {
      configuration,
      elasticsearch,
    } = this.getProperties('configuration', 'elasticsearch');

    const dataStore = DataStore.create({ configuration });
    const dataFetcher = DataFetcher.create({
      configuration,
      elasticsearch,
      dataStore,
    });
    this.setProperties({
      dataStore,
      dataFetcher,
    });
  },

  loadStudiesFromSavedResults(results) {
    return this.get('dataFetcher').searchStudies(StudySearchParams.create({
      mode: 'viaInternalId',
      internalStudyIds: get(results, 'studies'),
    }));
  },

  actions: {
    parameterChanged(fieldName, newValue) {
      this.set(`studySearchParams.${fieldName}`, newValue);
    },
    find() {
      const {
        dataFetcher,
        studySearchParams,
      } = this.getProperties('dataFetcher', 'studySearchParams');
      dataFetcher.searchStudies(studySearchParams);
    },
    removeStudy(study) {
      this.get('dataStore').removeStudies([study]);
    },
    removeAllStudies() {
      const dataStore = this.get('dataStore');
      dataStore.removeStudies(get(dataStore, 'studies'));
    },
    resetStudyFilters() {
      this.get('dataStore').resetStudyFilters();
    },
    resetDataObjectFilters() {
      this.get('dataStore').resetDataObjectFilters();
    },
    saveResults(name) {
      const {
        indexeddbStorage,
        dataStore,
        studySearchParams,
      } = this.getProperties(
        'indexeddbStorage',
        'dataStore',
        'studySearchParams'
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
    loadSavedResultsList() {
      return this.get('indexeddbStorage').loadResultsList();
    },
    loadSavedResults(results) {
      const {
        configuration,
        studySearchParams,
        dataStore,
      } = this.getProperties('configuration', 'studySearchParams', 'dataStore');
      if (results.studySearchParams) {
        studySearchParams.loadDumpedValues(
          results.studySearchParams,
          get(configuration, 'studyIdTypeMapping')
        );
      }

      dataStore.removeStudies(get(dataStore, 'studies'));
      dataStore.resetStudyFilters();
      dataStore.resetDataObjectFilters();
      return this.loadStudiesFromSavedResults(results)
        .then(() => safeExec(this, () => {
          const {
            studyFilters: savedStudyFilters,
            dataObjectFilters: savedDataObjectFilters,
          } = results;
          const dataObjectPublisherMapping =
            get(dataStore, 'dataObjectPublisherMapping');
          const dataObjectFilters = dataObjectFiltersFromSaved(
            savedDataObjectFilters,
            configuration,
            dataObjectPublisherMapping
          );

          setProperties(dataStore, {
            studyFilters: studyFiltersFromSaved(
              savedStudyFilters,
              configuration
            ),
            dataObjectFilters,
          });
        }));
    },
    removeSavedResults(results) {
      return this.get('indexeddbStorage').removeResults(results);
    },
    exportResultsToPdf() {
      const {
        pdfGenerator,
        dataStore,
      } = this.getProperties('pdfGenerator', 'dataStore');

      return pdfGenerator.generatePdfFromResults(dataStore);
    },
  },
});
