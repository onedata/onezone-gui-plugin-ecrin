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
import I18n from 'onezone-gui-plugin-ecrin/mixins/i18n';
import safeExec from 'onezone-gui-plugin-ecrin/utils/safe-method-execution';

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
  filter: '',

  /**
   * @virtual
   * @type {Function}
   * @returns {Promise<Array<Object>>}
   */
  onLoadList: () => {},

  /**
   * @virtual
   * @type {Function}
   * @param {Object} results
   * @returns {Promise}
   */
  onLoad: () => {},

  /**
   * @virtual
   * @type {Function}
   * @param {Object} results
   * @returns {Promise}
   */
  onRemove: () => {},

  /**
   * @virtual
   * @type {Function}
   * @returns {any}
   */
  onCancel: () => {},

  /**
   * @type {Array<Object>}
   */
  resultsList: computed(() => []),

  filteredResultsList: computed(
    'resultsList.@each.name',
    'filter',
    function filteredResultsList() {
      const {
        resultsList,
        filter,
      } = this.getProperties('resultsList', 'filter');
      const strippedFilter = filter.trim().toLowerCase();

      return resultsList.filter(results =>
        get(results, 'name').toLowerCase().indexOf(strippedFilter) !== -1
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
    this.setProperties({
      resultsList: [],
      selectedResults: null,
      isLoading: false,
      filter: '',
      lastError: null,
    });

    if (this.get('isOpened')) {
      this.loadList();
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
      } = this.getProperties('selectedResults', 'onLoad');

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
      } = this.getProperties('resultsList', 'onRemove');

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
