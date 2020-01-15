/**
 * Represents both active and modified query params describing finding and
 * filtering conditions.
 * 
 * Find params are related to studies (or data objects in searching via
 * published paper), filter params are related to data objects inside studies.
 *
 * @module utils/query-params
 * @author Michał Borzęcki
 * @copyright (C) 2019 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import EmberObject, { computed, get } from '@ember/object';
import rangeToNumbers from 'onezone-gui-plugin-ecrin/utils/range-to-numbers';

const filterParamNames = [
  'typeFilter',
  'accessTypeFilter',
  'yearFilter',
  'parsedYearFilter',
  'publisherFilter',
];

export default EmberObject.extend({
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

  /**
   * @returns {undefined}
   */
  applyFilterParams() {
    this.applyNamespacedParams('Filter', filterParamNames);
  },

  /**
   * @param {string} paramNamespace
   * @param {Array<string>} paramNames
   * @param {Array<string>} [paramNamesWithoutCheck=[]]
   * @returns {undefined}
   */
  applyNamespacedParams(paramNamespace, paramNames, paramNamesWithoutCheck = []) {
    const activeParams = {};
    let hasActiveParams = false;
    if (this.get(`has${paramNamespace}Params`)) {
      paramNames.forEach(filterName => {
        const filter = this.get(filterName);
        if (filter) {
          activeParams[filterName] = filter;
        }
      });
      hasActiveParams = true;
    }
    paramNamesWithoutCheck.forEach(filterName => {
      const filter = this.get(filterName);
      if (filter) {
        activeParams[filterName] = filter;
      }
    });
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
      typeFilter: [],
      accessTypeFilter: [],
      yearFilter: '',
      publisherFilter: [],
    });
  },

  /**
   * Assigns values from passed raw query params object to local fields
   * @param {Object} queryParams 
   * @param {services.Configuration} configuration 
   * @returns {undefined}
   */
  consumeQueryParams(queryParams, configuration) {
    [
      'yearFilter',
    ].forEach(filterName => {
      if (queryParams[filterName]) {
        this.set(filterName, queryParams[filterName]);
      }
    });

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
    this.applyFilterParams();
  },
});
