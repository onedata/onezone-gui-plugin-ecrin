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
   * @param {string} resultsName
   * @returns {Promise}
   */
  onLoad: () => {},

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
  },
});
