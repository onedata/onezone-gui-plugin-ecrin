import EmberObject, { computed, get } from '@ember/object';
import rangeToNumbers from 'onezone-gui-plugin-ecrin/utils/range-to-numbers';

export default EmberObject.extend({
  /**
   * One of 'specificStudy', 'studyCharact', 'viaPubPaper'
   * @type {string}
   */
  mode: 'studyCharact',

  /**
   * @type {string}
   */
  studyIdType: undefined,

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
   * Only for mode === 'studyCharact'
   * @type {string}
   */
  studyTitleTopicOperator: computed({
    get() {
      return 'and';
    },
    set(key, value) {
      return ['and', 'or'].includes(value) ? value : 'and';
    },
  }),

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
   * Only for mode === 'viaPubPaper'
   * @type {string}
   */
  dataObjectTitle: '',

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
    'studyIdType',
    'studyId',
    'studyTitleContains',
    'studyTopicsInclude',
    // 'typeFilter',
    // 'accessTypeFilter',
    // 'parsedYearFilter',
    // 'publisherFilter',
    'doi',
    'dataObjectTitle',
    function hasParams() {
      const {
        mode,
        studyIdType,
        studyId,
        studyTitleContains,
        studyTopicsInclude,
        doi,
        dataObjectTitle,
      } = this.getProperties(
        'mode',
        'studyIdType',
        'studyId',
        'studyTitleContains',
        'studyTopicsInclude',
        'doi',
        'dataObjectTitle'
      );
      switch (mode) {
        case 'specificStudy':
          return !!studyIdType && !!studyId;
        case 'studyCharact':
          return !!studyTitleContains || !!studyTopicsInclude;
        case 'viaPubPaper':
          return !!doi || !!dataObjectTitle;
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
        !!parsedYearFilter.length || !!publisherFilter.length;
    },
  ),

  /**
   * @type {Ember.ComputedProperty<Object>}
   */
  queryParams: computed(
    'mode',
    'studyIdType',
    'studyId',
    'studyTitleContains',
    'studyTopicsInclude',
    'studyTitleTopicOperator',
    'doi',
    'dataObjectTitle',
    function queryParams() {
      const {
        mode,
        studyIdType,
        studyId,
        doi,
        dataObjectTitle,
      } = this.getProperties(
        'mode',
        'studyIdType',
        'studyId',
        'doi',
        'dataObjectTitle'
      );
      const params = {
        mode,
        studyId: null,
        studyTitleContains: null,
        studyTopicsInclude: null,
        doi: null,
        dataObjectTitle: null,
      };
      switch (mode) {
        case 'specificStudy':
          if (studyIdType) {
            params.studyIdType = get(studyIdType, 'id');
          }
          if (studyId) {
            params.studyId = studyId;
          }
          break;
        case 'studyCharact':
          [
            'studyTitleContains',
            'studyTopicsInclude',
            'studyTitleTopicOperator',
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
          } else if (dataObjectTitle) {
            params.dataObjectTitle = dataObjectTitle;
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
      dataObjectTitle: '',
    });
  },

  consumeQueryParams(queryParams, configuration) {
    [
      'mode',
      'studyId',
      'studyTitleContains',
      'studyTopicsInclude',
      'studyTitleTopicOperator',
      'yearFilter',
      'doi',
      'dataObjectTitle',
    ].forEach(filterName => {
      if (queryParams[filterName]) {
        this.set(filterName, queryParams[filterName]);
      }
    });

    if (queryParams.studyIdType) {
      const studyIdTypeMapping = get(configuration, 'studyIdTypeMapping');
      const studyIdType = studyIdTypeMapping.filter(({ id }) => id == queryParams.studyIdType)[0];
      if (studyIdType) {
        this.set('studyIdType', studyIdType);
      }
    }

    [
      ['typeFilter', 'typeMapping'],
      ['accessTypeFilter', 'accessTypeMapping'],
      ['publisherFilter', 'publisherMapping'],
    ].forEach(([filterName, mappingName]) => {
      let filters = queryParams[filterName];
      try {
        filters = JSON.parse(queryParams[filterName]);
      } catch (e) {
        filters = [];
      }
      if (filters && filters.length) {
        const mapping = get(configuration, mappingName);
        filters = filters
          .reduce((arr, filterId) => {
            const filter = mapping.findBy('id', filterId);
            if (filter) {
              arr.push(filter);
            }
            return arr;
          }, []);
        this.set(filterName, filters);
      }
    });
    this.applyDoParams();
  },
});
