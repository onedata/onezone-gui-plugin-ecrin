/**
 * Shows active filters summary
 *
 * @module components/filters-summary
 * @author Michał Borzęcki
 * @copyright (C) 2020 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

/**
 * @typedef {Object} FilterStateBadge
 * @property {String} modelName one of: study, dataObject
 * @property {String} filterName
 * @property {String} state filter state (content differs between filters)
 */

import Component from '@ember/component';
import { computed } from '@ember/object';
import { union } from '@ember/object/computed';
import _ from 'lodash';
import I18n from 'onezone-gui-plugin-ecrin/mixins/i18n';

const studyFiltersOrder = [
  'type',
  'status',
  'genderEligibility',
  'phase',
  'interventionModel',
  'allocationType',
  'primaryPurpose',
  'masking',
  'observationalModel',
  'timePerspective',
  'biospecimensRetained',
];

const dataObjectFiltersOrder = [
  'type',
  'accessType',
  'year',
  'publisher',
];

export default Component.extend(I18n, {
  classNames: ['filters-summary'],

  /**
   * @override
   */
  i18nPrefix: 'components.filtersSummary',

  /**
   * @virtual
   * @type {Object}
   */
  activeStudyFilters: undefined,

  /**
   * @virtual
   * @type {Object}
   */
  activeDataObjectFilters: undefined,

  /**
   * @virtual
   * @type {Object}
   */
  cleanStudyFilters: undefined,

  /**
   * @virtual
   * @type {Object}
   */
  cleanDataObjectFilters: undefined,

  /**
   * @type {ComputedProperty<Array<FilterStateBadge>>}
   */
  studyBadges: computed(
    'activeStudyFilters',
    'cleanStudyFilters',
    function studyBadges() {
      return studyFiltersOrder
        .map(filterName => this.createBadgeForCategorizedFilter('study', filterName))
        .compact();
    }
  ),

  /**
   * @type {ComputedProperty<Array<FilterStateBadge>>}
   */
  dataObjectBadges: computed(
    'activeDataObjectFilters',
    'cleanDataObjectFilters',
    function dataObjectBadges() {
      const modelName = 'dataObject';
      return dataObjectFiltersOrder
        .map(filterName => {
          if (filterName === 'year') {
            const activeYearFilter = this.get('activeDataObjectFilters.year');
            if ((activeYearFilter || '').trim().length > 0) {
              return {
                modelName,
                filterName,
              };
            }
          } else {
            return this.createBadgeForCategorizedFilter(modelName, filterName);
          }
        })
        .compact();
    }
  ),

  /**
   * @type {ComputedProperty<Array<FilterStateBadge>>}
   */
  badges: union('studyBadges', 'dataObjectBadges'),

  /**
   * @param {String} modelName
   * @param {String} filterName
   * @returns {FilterStateBadge|null}
   */
  createBadgeForCategorizedFilter(modelName, filterName) {
    const activeSelectedCount =
      this.get(`active${_.upperFirst(modelName)}Filters.${filterName}.length`);
    const cleanSelectedCount =
      this.get(`clean${_.upperFirst(modelName)}Filters.${filterName}.length`);
    if (activeSelectedCount < cleanSelectedCount) {
      return {
        modelName,
        filterName,
        state: `${activeSelectedCount}/${cleanSelectedCount}`,
      };
    } else {
      return null;
    }
  },
});
