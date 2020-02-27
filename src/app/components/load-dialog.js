/**
 * A modal for selecting saved results, which should be loaded. Also allows to
 * remove saved results.
 * 
 * @module components/load-dialog
 * @author Michał Borzęcki
 * @copyright (C) 2019 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import Component from '@ember/component';
import { observer, computed, get } from '@ember/object';
import { or } from 'ember-awesome-macros';
import I18n from 'onezone-gui-plugin-ecrin/mixins/i18n';
import safeExec from 'onezone-gui-plugin-ecrin/utils/safe-method-execution';
import notImplementedIgnore from 'onezone-gui-plugin-ecrin/utils/not-implemented-ignore';
import notImplementedReject from 'onezone-gui-plugin-ecrin/utils/not-implemented-reject';

export default Component.extend(I18n, {
  /**
   * @override
   */
  i18nPrefix: 'components.loadDialog',

  /**
   * @virtual
   * @type {boolean}
   */
  isOpened: false,

  /**
   * @type {string}
   */
  selectedResults: null,

  /**
   * @type {boolean}
   */
  isLoadingList: false,

  /**
   * @type {boolean}
   */
  isLoading: false,

  /**
   * @type {boolean}
   */
  isRemoving: false,

  /**
   * @type {string}
   */
  lastError: null,

  /**
   * @type {string}
   */
  filterString: '',

  /**
   * @virtual
   * @type {Function}
   * @returns {Promise<Array<Object>>}
   */
  onLoadList: notImplementedReject,

  /**
   * @virtual
   * @type {Function}
   * @param {Object} results
   * @returns {Promise}
   */
  onLoad: notImplementedReject,

  /**
   * @virtual
   * @type {Function}
   * @param {Object} results
   * @returns {Promise}
   */
  onRemove: notImplementedReject,

  /**
   * @virtual
   * @type {Function}
   * @returns {any}
   */
  onCancel: notImplementedIgnore,

  /**
   * @type {Array<Object>}
   */
  resultsList: computed(() => []),

  closeDisabled: or('isLoading', 'isRemoving'),

  filteredResultsList: computed(
    'resultsList.@each.name',
    'filterString',
    function filteredResultsList() {
      const {
        resultsList,
        filterString,
      } = this.getProperties('resultsList', 'filterString');
      const strippedFilter = filterString.trim().toLowerCase();

      return resultsList.filter(results =>
        get(results, 'name').toLowerCase().includes(strippedFilter)
      );
    }
  ),

  filteredResultsListObserver: observer(
    'filteredResultsList.[]',
    function filteredResultsListObserver() {
      const {
        filteredResultsList,
        selectedResults,
      } = this.getProperties(
        'filteredResultsList',
        'selectedResults'
      );

      if (selectedResults && !filteredResultsList.includes(selectedResults)) {
        this.set('selectedResults', null);
      }
    }
  ),

  isOpenedObserver: observer('isOpened', function isOpenedObserver() {
    if (this.get('isOpened')) {
      this.loadList();
    } else {
      this.setProperties({
        resultsList: [],
        selectedResults: null,
        isLoading: false,
        filterString: '',
        lastError: null,
      });
    }
  }),

  loadList() {
    const {
      isLoadingList,
      onLoadList,
    } = this.getProperties(
      'isLoadingList',
      'onLoadList'
    );

    if (!isLoadingList) {
      this.setProperties({
        resultsList: [],
        lastError: null,
        isLoadingList: true,
      });
      onLoadList()
        .then(resultsList => safeExec(this, () => this.set('resultsList', resultsList)))
        .catch(error => safeExec(this, () => this.set('lastError', error)))
        .finally(() => safeExec(this, () => this.set('isLoadingList', false)));
    }
  },

  actions: {
    load() {
      const {
        onLoad,
        selectedResults,
      } = this.getProperties('onLoad', 'selectedResults');

      this.setProperties({
        isLoading: true,
        lastError: null,
      });
      onLoad(selectedResults)
        .catch(error => safeExec(this, () => this.set('lastError', error)))
        .finally(() => safeExec(this, () => this.set('isLoading', false)));
    },
    remove(results) {
      const {
        onRemove,
        resultsList,
      } = this.getProperties('onRemove', 'resultsList');

      this.setProperties({
        isRemoving: true,
        lastError: null,
      });
      onRemove(results)
        .then(() => resultsList.removeObject(results))
        .catch(error => safeExec(this, () => this.set('lastError', error)))
        .finally(() => safeExec(this, () => this.set('isRemoving', false)));
    },
  },
});
