/**
 * A component, which shows whole layout of query parameters and results
 * 
 * @module components/content-index
 * @author Michał Borzęcki
 * @copyright (C) 2019 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import Component from '@ember/component';
import { reads } from '@ember/object/computed';
import I18n from 'onezone-gui-plugin-ecrin/mixins/i18n';
import { inject as service } from '@ember/service';
import { get } from '@ember/object';
import StudySearchParams from 'onezone-gui-plugin-ecrin/utils/study-search-params';
import DataStore from 'onezone-gui-plugin-ecrin/utils/data-store';
import DataFetcher from 'onezone-gui-plugin-ecrin/utils/data-fetcher';
import DataPersister from 'onezone-gui-plugin-ecrin/utils/data-persister';

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
  studySearchParams: undefined,

  /**
   * @type {Utils.DataStore}
   */
  dataStore: undefined,

  /**
   * @type {Utils.DataFetcher}
   */
  dataFetcher: undefined,

  /**
   * @type {Utils.DataPersister}
   */
  dataPersister: undefined,

  /**
   * @type {ComputedProperty<boolean>}
   */
  isFetchingData: reads('dataFetcher.fetchDataPromiseObject.isPending'),

  init() {
    this._super(...arguments);

    const {
      configuration,
      elasticsearch,
      indexeddbStorage,
    } = this.getProperties('configuration', 'elasticsearch', 'indexeddbStorage');

    const dataStore = DataStore.create({ configuration });
    const dataFetcher = DataFetcher.create({
      configuration,
      elasticsearch,
      dataStore,
    });
    const dataPersister = DataPersister.create({
      configuration,
      indexeddbStorage,
      dataStore,
      dataFetcher,
    });
    this.setProperties({
      studySearchParams: StudySearchParams.create({
        studyIdType: get(configuration, 'studyIdTypeMapping')[0],
      }),
      dataStore,
      dataFetcher,
      dataPersister,
    });
  },

  actions: {
    parameterChanged(fieldName, newValue) {
      this.set(`studySearchParams.${fieldName}`, newValue);
    },
    find(withStacking = false) {
      const {
        dataFetcher,
        studySearchParams,
      } = this.getProperties('dataFetcher', 'studySearchParams');

      dataFetcher.searchStudies(studySearchParams, withStacking);
    },
    removeStudy(study) {
      this.get('dataStore').removeStudies([study]);
    },
    removeAllStudies() {
      this.get('dataStore').removeAllStudies();
    },
    resetStudyFilters() {
      this.get('dataStore').resetStudyFilters();
    },
    resetDataObjectFilters() {
      this.get('dataStore').resetDataObjectFilters();
    },
    saveResults(name) {
      const {
        dataPersister,
        studySearchParams,
      } = this.getProperties(
        'dataPersister',
        'studySearchParams'
      );
      return dataPersister.saveResults(name, studySearchParams);
    },
    loadSavedResultsList() {
      return this.get('dataPersister').getResultsList();
    },
    loadSavedResults(results) {
      const {
        studySearchParams,
        dataPersister,
      } = this.getProperties('studySearchParams', 'dataPersister');
      return dataPersister.loadResults(results, studySearchParams);
    },
    removeSavedResults(results) {
      return this.get('dataPersister').removeResults(results);
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
