/**
 * Study and data objects filters.
 *
 * @module components/data-filters
 * @author Michał Borzęcki
 * @copyright (C) 2020 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import Component from '@ember/component';
import I18n from 'onezone-gui-plugin-ecrin/mixins/i18n';
import { inject as service } from '@ember/service';
import { observer } from '@ember/object';
import { reads } from '@ember/object/computed';
import { array, raw } from 'ember-awesome-macros';
import _ from 'lodash';
import notImplementedIgnore from 'onezone-gui-plugin-ecrin/utils/not-implemented-ignore';
import {
  studyCategorizedFilters,
  dataObjectCategorizedFilters,
} from 'onezone-gui-plugin-ecrin/utils/data-filters-converters';

const filtersFields = {};
studyCategorizedFilters.forEach(filterName => {
  const upperFirstFilterName = _.upperFirst(filterName);
  filtersFields[`study${upperFirstFilterName}Filter`] =
    reads(`configuration.study${upperFirstFilterName}Mapping`);
});
dataObjectCategorizedFilters.forEach(filterName => {
  const upperFirstFilterName = _.upperFirst(filterName);
  filtersFields[`dataObject${upperFirstFilterName}Filter`] =
    reads(`configuration.dataObject${upperFirstFilterName}Mapping`);
});

const helpContentComponents = {
  dataObjectFilterType: 'filters-help/data-object-filter-type',
};

export default Component.extend(I18n, filtersFields, {
  classNames: ['data-filters', 'clearfix'],

  configuration: service(),

  /**
   * @override
   */
  i18nPrefix: 'components.dataFilters',

  /**
   * True if application is in the middle of data fetching process
   * @virtual optional
   * @type {boolean}
   */
  isFetchingData: false,

  /**
   * @virtual
   * @type {Function}
   * @param {Object} filters
   * @returns {any}
   */
  onFilterStudies: notImplementedIgnore,

  /**
   * @virtual
   * @type {Function}
   * @param {Object} filters
   * @returns {any}
   */
  onFilterDataObjects: notImplementedIgnore,

  /**
   * @virtual
   * @type {Function}
   * @returns {any}
   */
  onResetStudyFilters: notImplementedIgnore,

  /**
   * @virtual
   * @type {Function}
   * @returns {any}
   */
  onResetDataObjectFilters: notImplementedIgnore,

  /**
   * @virtual
   * @type {Array<Object>}
   */
  dataObjectPublisherMapping: undefined,

  /**
   * @virtual
   * @type {Object}
   */
  studyFilters: undefined,

  /**
   * @virtual
   * @type {Object}
   */
  dataObjectFilters: undefined,

  /**
   * @type {String}
   */
  filtersModel: 'study',

  /**
   * @type {string}
   */
  dataObjectYearFilter: '',

  /**
   * @type {Array<Object>}
   */
  dataObjectPublisherFilter: undefined,

  /**
   * @type {String}
   */
  visibleHelp: undefined,

  /**
   * @type {String}
   */
  visibleHelpContentComponent: undefined,

  /**
   * @type {ComputedProperty<boolean>}
   */
  hasInterventionalStudyTypeSelected: array.isAny(
    'studyFilters.type',
    raw('isInterventional')
  ),

  /**
   * @type {ComputedProperty<boolean>}
   */
  hasObservationalStudyTypeSelected: array.isAny(
    'studyFilters.type',
    raw('isObservational')
  ),

  visibleHelpObserver: observer('visibleHelp', function visibleHelpObserver() {
    const visibleHelp = this.get('visibleHelp');

    if (visibleHelp) {
      this.set('visibleHelpContentComponent', helpContentComponents[visibleHelp]);
    }
  }),

  actions: {
    studyFiltersChanged(filterName, value) {
      const {
        studyFilters,
        onFilterStudies,
      } = this.getProperties('studyFilters', 'onFilterStudies');

      onFilterStudies(Object.assign({}, studyFilters, {
        [filterName]: value,
      }));
    },
    dataObjectFiltersChanged(filterName, value) {
      const {
        dataObjectFilters,
        onFilterDataObjects,
      } = this.getProperties('dataObjectFilters', 'onFilterDataObjects');

      onFilterDataObjects(Object.assign({}, dataObjectFilters, {
        [filterName]: value,
      }));
    },
  },
});
