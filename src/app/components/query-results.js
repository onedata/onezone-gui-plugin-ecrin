/**
 * Renders a list of results (studies) obtained from elasticsearch
 * 
 * @module components/query-result
 * @author Michał Borzęcki
 * @copyright (C) 2019 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import Component from '@ember/component';
import { get, computed, observer } from '@ember/object';
import { reads } from '@ember/object/computed';
import I18n from 'onezone-gui-plugin-ecrin/mixins/i18n';
import safeExec from 'onezone-gui-plugin-ecrin/utils/safe-method-execution';
import { A } from '@ember/array';
import notImplementedIgnore from 'onezone-gui-plugin-ecrin/utils/not-implemented-ignore';
import notImplementedReject from 'onezone-gui-plugin-ecrin/utils/not-implemented-reject';
import pagedArray from 'ember-cli-pagination/computed/paged-array';

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
   * @virtual
   * @type {Array<Utils.Study>}
   */
  studies: computed(() => A()),

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
   * @param {Array<Util.Study>} studies
   * @returns {any}
   */
  removeStudies: notImplementedIgnore,

  /**
   * @type {boolean}
   */
  isSaveDialogOpened: false,

  /**
   * @type {boolean}
   */
  isLoadDialogOpened: false,

  /**
   * @type {number}
   */
  studiesPerPage: 10,

  /**
   * @type {PagedArray<Util.Study>}
   */
  pagedStudies: pagedArray('studies', {
    perPage: reads('parent.studiesPerPage'),
  }),

  studiesPerPageObserver: observer('studiesPerPage', function studiesPerPageObserver() {
    this.set('pagedStudies.page', 1);
  }),

  actions: {
    removeStudy(study) {
      const {
        removeStudies,
        expandedStudyId,
      } = this.getProperties('removeStudies', 'expandedStudyId');

      removeStudies([study]);
      if (expandedStudyId === get(study, 'id')) {
        this.set('expandedStudyId', null);
      }
    },
    removeAllStudies() {
      const {
        removeStudies,
        studies,
      } = this.getProperties('removeStudies', 'studies');

      removeStudies(studies.slice());
      this.set('expandedStudyId', null);
    },
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
  },
});
