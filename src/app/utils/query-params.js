import EmberObject, { computed, get } from '@ember/object';
import rangeToNumbers from 'onezone-gui-plugin-ecrin/utils/range-to-numbers';

export default EmberObject.extend({
  /**
   * One of 'specificStudy', 'studyCharact', 'viaPubPaper'
   * @type {string}
   */
  mode: 'studyCharact',

  /**
   * Only for mode === 'specificStudy'
   * @type {string}
   */
  studyId: '',

  /**
   * Only for mode === 'studyCharact'
   * @type {string}
   */
  studyTitleContains: '',

  /**
   * Only for mode === 'studyCharact'
   * @type {string}
   */
  studyTopicsInclude: '',

  /**
   * @type {string}
   */
  typeFilter: Object.freeze([]),

  /**
   * @type {string}
   */
  accessTypeFilter: Object.freeze([]),

  /**
   * @type {string}
   */
  yearFilter: '',

  /**
   * @type {string}
   */
  publisherFilter: Object.freeze([]),
  
  /**
   * Only for mode === 'viaPubPaper'
   * @type {string}
   */
  doi: '',

  /**
   * Set by applyDoParams()
   * @type {boolean}
   */
  hasActiveDoParams: false,

  /**
   * Set by applyDoParams()
   * @type {Object}
   */
  activeDoParams: Object.freeze({}),

  /**
   * @type {Ember.ComputedProperty<Array<number|Object>>}
   */
  parsedYearFilter: computed('yearFilter', function parsedYearFilter() {
    return rangeToNumbers(this.get('yearFilter'));
  }),

  /**
   * @type {Ember.ComputedProperty<boolean>}
   */
  hasParams: computed(
    'mode',
    'studyId',
    'studyTitleContains',
    'studyTopicsInclude',
    // 'typeFilter',
    // 'accessTypeFilter',
    // 'parsedYearFilter',
    // 'publisherFilter',
    'doi',
    function hasParams() {
      const {
        mode,
        studyId,
        studyTitleContains,
        studyTopicsInclude,
        // typeFilter,
        // accessTypeFilter,
        // parsedYearFilter,
        // publisherFilter,
        doi,
      } = this.getProperties(
        'mode',
        'studyId',
        'studyTitleContains',
        'studyTopicsInclude',
        // 'typeFilter',
        // 'accessTypeFilter',
        // 'parsedYearFilter',
        // 'publisherFilter',
        'doi'
      );
      switch (mode) {
        case 'specificStudy':
          return !!studyId;
        case 'studyCharact':
          return !!studyTitleContains || !!studyTopicsInclude;
            // !!typeFilter.length || !!accessTypeFilter.length ||
            // !!parsedYearFilter.length || !!publisherFilter.length;
        case 'viaPubPaper':
          return !!doi;
      }
    }
  ),

  hasDoParams: computed(
    'typeFilter',
    'accessTypeFilter',
    'parsedYearFilter',
    'publisherFilter',
    function hasDoParams() {
      const {
        typeFilter,
        accessTypeFilter,
        parsedYearFilter,
        publisherFilter,
      } = this.getProperties(
        'typeFilter',
        'accessTypeFilter',
        'parsedYearFilter',
        'publisherFilter',
      );
      return !!typeFilter.length || !!accessTypeFilter.length ||
        !parsedYearFilter.length || !!publisherFilter.length;
    },
  ),

  /**
   * @type {Ember.ComputedProperty<Object>}
   */
  queryParams: computed(
    'mode',
    'studyId',
    'studyTitleContains',
    'studyTopicsInclude',
    'doi',
    function queryParams() {
      const {
        mode,
        studyId,
        doi,
      } = this.getProperties(
        'mode',
        'hasActiveDoParams',
        'activeDoParams',
        'studyId',
        'doi'
      );
      const params = {
        mode,
        studyId: null,
        studyTitleContains: null,
        studyTopicsInclude: null,
        doi: null,
      };
      switch (mode) {
        case 'specificStudy':
          if (studyId) {
            params.studyId = studyId;
          }
          break;
        case 'studyCharact':
          [
            'studyTitleContains',
            'studyTopicsInclude',
          ].forEach(filterName => {
            const filter = this.get(filterName);
            if (filter) {
              params[filterName] = filter;
            }
          });
          break;
        case 'viaPubPaper':
          if (doi) {
            params.doi = doi;
          }
          break;
      }
      return params;
    }
  ),

  doQueryParams: computed(
    'hasActiveDoParams',
    'activeDoParams',
    function doQueryParams() {
      const {
        hasActiveDoParams,
        activeDoParams,
      } = this.getProperties(
        'hasActiveDoParams',
        'activeDoParams',
      );
      const params = {
        typeFilter: null,
        accessTypeFilter: null,
        yearFilter: null,
        publisherFilter: null,
      };
      if (hasActiveDoParams) {
        const yearFilter = get(activeDoParams, 'yearFilter');
        if (yearFilter) {
          params['yearFilter'] = yearFilter;
        }
        [
          'typeFilter',
          'accessTypeFilter',
          'publisherFilter',
        ].forEach(filterName => {
          const filter = get(activeDoParams, filterName);
          if (filter && filter.length) {
            params[filterName] = JSON.stringify(filter.mapBy('id'));
          }
        });
      }
      return params;
    }
  ),

  applyDoParams() {
    let activeDoParams = {}, hasActiveDoParams = false;
    if (this.get('hasDoParams')) {
      [
        'typeFilter',
        'accessTypeFilter',
        'parsedYearFilter',
        'publisherFilter',
      ].forEach(filterName => {
        const filter = this.get(filterName);
        if (filter && filter.length) {
          activeDoParams[filterName] = filter;
        }
      });
      const yearFilter = this.get('yearFilter');
      if (yearFilter) {
        activeDoParams['yearFilter'] = yearFilter;
      }
      hasActiveDoParams = true;
    }
    this.setProperties({
      activeDoParams,
      hasActiveDoParams,
    });
  },

  /**
   * Clears query params
   * @returns {undefined}
   */
  clear() {
    this.setProperties({
      studyId: '',
      studyTitleContains: '',
      studyTopicsInclude: '',
      typeFilter: [],
      accessTypeFilter: [],
      yearFilter: '',
      publisherFilter: [],
      doi: '',
    });
  },
});
