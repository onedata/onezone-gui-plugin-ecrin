/**
 * Renders a list of results (studies) obtained from elasticsearch
 *
 * @module components/query-result
 * @author Michał Borzęcki
 * @copyright (C) 2019 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import Component from '@ember/component';
import { getProperties, observer } from '@ember/object';
import { reads } from '@ember/object/computed';
import I18n from 'onezone-gui-plugin-ecrin/mixins/i18n';
import safeExec from 'onezone-gui-plugin-ecrin/utils/safe-method-execution';
import notImplementedIgnore from 'onezone-gui-plugin-ecrin/utils/not-implemented-ignore';
import notImplementedReject from 'onezone-gui-plugin-ecrin/utils/not-implemented-reject';
import pagedArray from 'ember-cli-pagination/computed/paged-array';
import { later } from '@ember/runloop';

export default Component.extend(I18n, {
  classNames: ['query-results'],

  /**
   * @override
   */
  i18nPrefix: 'components.queryResults',

  /**
   * True if application is in the middle of data fetching process
   * @virtual optional
   * @type {boolean}
   */
  isFetchingData: false,

  /**
   * Number of studies which fulfilled the latest search parameters. May be larger
   * than the total number of studies in dataStore due to the limit of studies fetched per
   * single query.
   * @virtual
   * @type {number}
   */
  latestSearchFittingStudiesCount: 0,

  /**
   * @virtual
   * @type {Utils.DataStore}
   */
  dataStore: undefined,

  /**
   * @type {Function}
   * @param {Utils.Study} relationOriginStudy
   * @param {Object} relatedStudy
   * @returns {Promise}
   */
  addRelatedStudyToResults: notImplementedReject,

  /**
   * @virtual
   * @type {Function}
   * @returns {Promise<any>}
   */
  saveResults: notImplementedReject,

  /**
   * @virtual
   * @type {Function}
   * @param {Object} results
   * @returns {Promise<any>}
   */
  loadSavedResults: notImplementedReject,

  /**
   * @virtual
   * @type {Function}
   * @returns {Promise<Array<Object>>}
   */
  loadSavedResultsList: notImplementedReject,

  /**
   * @virtual
   * @type {Function}
   * @param {Object} results
   * @returns {Promise<any>}
   */
  removeSavedResults: notImplementedReject,

  /**
   * @virtual
   * @type {Function}
   * @returns {Promise<any>}
   */
  exportResultsToPdf: notImplementedReject,

  /**
   * @virtual
   * @type {Function}
   * @param {Util.Study} study
   * @returns {any}
   */
  removeStudy: notImplementedIgnore,

  /**
   * @virtual
   * @type {Function}
   * @returns {any}
   */
  removeAllStudies: notImplementedIgnore,

  /**
   * @type {boolean}
   */
  isSaveDialogOpened: false,

  /**
   * @type {boolean}
   */
  isLoadDialogOpened: false,

  /**
   * @type {boolean}
   */
  isExportingToPdf: false,

  /**
   * @type {ComputedProperty<number>}
   */
  allStudiesCount: reads('dataStore.studies.length'),

  /**
   * @type {ComputedProperty<boolean>}
   */
  isStudiesLimitReached: reads('dataStore.isStudiesLimitReached'),

  /**
   * @type {ComputedProperty<Array<Utils.Study>>}
   */
  studies: reads('dataStore.filteredStudies'),

  /**
   * @type {ComputedProperty<Set<number>>}
   */
  fetchedStudiesIds: reads('dataStore.studiesIds'),

  /**
   * @type {ComputedProperty<Array<DataObject>>}
   */
  selectedDataObjects: reads('dataStore.filteredDataObjects'),

  /**
   * @type {PagedArray<Util.Study>}
   */
  pagedStudies: pagedArray('studies', {
    perPage: 10,
  }),

  studiesPerPageObserver: observer(
    'pagedStudies.perPage',
    function studiesPerPageObserver() {
      this.set('pagedStudies.page', 1);
    }
  ),

  studiesNumberObserver: observer('studies.length', function studiesNumberObserver() {
    const {
      page,
      totalPages,
    } = getProperties(this.get('pagedStudies'), 'page', 'totalPages');

    if (totalPages < page) {
      this.set('pagedStudies.page', totalPages || 1);
    }
  }),

  actions: {
    loadSavedResults(results) {
      return this.get('loadSavedResults')(results)
        .then(() => safeExec(this, () => {
          this.set('isLoadDialogOpened', false);
        }));
    },
    saveResults(name) {
      return this.get('saveResults')(name)
        .then(() => safeExec(this, () => {
          this.set('isSaveDialogOpened', false);
        }));
    },
    exportResultsToPdf() {
      this.set('isExportingToPdf', true);
      // PDF generation is so CPU-heavy that sometimes browser does not rerender view
      // immediately and new isExportingToPdf value is not visible. Hence usage of later().
      later(this, () => {
        this.get('exportResultsToPdf')()
          .finally(() => safeExec(this, () => this.set('isExportingToPdf', false)));
      }, 100);
    },
  },
});
