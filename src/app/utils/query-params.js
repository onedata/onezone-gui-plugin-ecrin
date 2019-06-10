import EmberObject, { computed, get } from '@ember/object';
import rangeToNumbers from 'onezone-gui-plugin-ecrin/utils/range-to-numbers';

const findParamNames = [
  'mode',
  'studyIdType',
  'studyId',
  'studyTitleContains',
  'studyTopicsInclude',
  'studyTitleTopicOperator',
  'doi',
  'dataObjectTitle',
];

const filterParamNames = [
  'typeFilter',
  'accessTypeFilter',
  'yearFilter',
  'parsedYearFilter',
  'publisherFilter',
];

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
   * Set by applyFindParams()
   * @type {boolean}
   */
  hasActiveFindParams: false,

  /**
   * Set by applyFindParams()
   * @type {Object}
   */
  activeFindParams: Object.freeze({}),

  /**
   * Set by applyFilterParams()
   * @type {boolean}
   */
  hasActiveFilterParams: false,

  /**
   * Set by applyFilterParams()
   * @type {Object}
   */
  activeFilterParams: Object.freeze({}),

  /**
   * @type {Ember.ComputedProperty<Array<number|Object>>}
   */
  parsedYearFilter: computed('yearFilter', function parsedYearFilter() {
    return rangeToNumbers(this.get('yearFilter'));
  }),

  /**
   * @type {Ember.ComputedProperty<boolean>}
   */
  hasFindParams: computed(...findParamNames, function hasFindParams() {
    const {
      mode,
      studyIdType,
      studyId,
      studyTitleContains,
      studyTopicsInclude,
      doi,
      dataObjectTitle,
    } = this.getProperties(...findParamNames);
    switch (mode) {
      case 'specificStudy':
        return Boolean(studyIdType && studyId);
      case 'studyCharact':
        return Boolean(studyTitleContains || studyTopicsInclude);
      case 'viaPubPaper':
        return Boolean(doi || dataObjectTitle);
    }
  }),

  hasFilterParams: computed(...filterParamNames, function hasFilterParams() {
    const {
      typeFilter,
      accessTypeFilter,
      parsedYearFilter,
      publisherFilter,
    } = this.getProperties(...filterParamNames);
    return !!typeFilter.length || !!accessTypeFilter.length ||
      !!parsedYearFilter.length || !!publisherFilter.length;
  }),

  /**
   * @type {Ember.ComputedProperty<Object>}
   */
  findQueryParams: computed(...findParamNames, function findQueryParams() {
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
  }),

  filterQueryParams: computed(
    'hasActiveFilterParams',
    'activeFilterParams',
    function filterQueryParams() {
      const {
        hasActiveFilterParams,
        activeFilterParams,
      } = this.getProperties(
        'hasActiveFilterParams',
        'activeFilterParams',
      );
      const params = {
        typeFilter: null,
        accessTypeFilter: null,
        yearFilter: null,
        publisherFilter: null,
      };
      if (hasActiveFilterParams) {
        const yearFilter = get(activeFilterParams, 'yearFilter');
        if (yearFilter) {
          params['yearFilter'] = yearFilter;
        }
        [
          'typeFilter',
          'accessTypeFilter',
          'publisherFilter',
        ].forEach(filterName => {
          const filter = get(activeFilterParams, filterName);
          if (filter && filter.length) {
            params[filterName] = JSON.stringify(filter.mapBy('id'));
          }
        });
      }
      return params;
    }
  ),

  applyFindParams() {
    this.applyNamespacedParams('Find', findParamNames);
  },

  applyFilterParams() {
    this.applyNamespacedParams('Filter', filterParamNames);
  },

  applyNamespacedParams(paramNamespace, paramNames) {
    const activeParams = {};
    let hasActiveParams = false;
    if (this.get(`has${paramNamespace}Params`)) {
      paramNames.forEach(filterName => {
        const filter = this.get(filterName);
        if (filter && filter.length) {
          activeParams[filterName] = filter;
        }
      });
      hasActiveParams = true;
    }
    this.setProperties({
      [`active${paramNamespace}Params`]: activeParams,
      [`hasActive${paramNamespace}Params`]: hasActiveParams,
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
      const studyIdType = studyIdTypeMapping
        .filter(({ id }) => id == queryParams.studyIdType)[0];
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
    this.applyFindParams();
    this.applyFilterParams();
  },
});
