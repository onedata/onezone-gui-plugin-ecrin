/**
 * A component used internally by query-result component, that shows
 * one record of query results (one study).
 * 
 * @module components/query-reslts/result
 * @author Michał Borzęcki
 * @copyright (C) 2019 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import Component from '@ember/component';
import { observer, get } from '@ember/object';
import { reads } from '@ember/object/computed';
import { inject as service } from '@ember/service';
import I18n from 'onezone-gui-plugin-ecrin/mixins/i18n';

export default Component.extend(I18n, {
  classNames: ['query-results-result'],

  elasticsearch: service(),
  configuration: service(),

  /**
   * @override
   */
  i18nPrefix: 'components.queryResults.result',

  /**
   * @virtual
   * @type {Object}
   */
  study: undefined,

  /**
   * @virtual
   * @type {Utils.QueryParams}
   */
  queryParams: undefined,

  /**
   * @virtual
   * @type {BsAccordion.Item}
   */
  item: undefined,

  /**
   * @virtual
   * @type {boolean}
   */
  isExpanded: false,

  /**
   * @virtual
   * @type {Function}
   * @returns {Promise}
   */
  loadDataObjects: () => {},

  /**
   * @virtual
   * @type {Function}
   * @returns {any}
   */
  remove: () => {},

  /**
   * @type {ComputedProperty<string>}
   */
  studyDescription: reads('study.study_status.brief_description'),

  /**
   * @type {ComputedProperty<string>}
   */
  studyDataSharingStatement: reads('study.study_status.data_sharing_statement'),

  /**
   * @type {Ember.ComputedProperty<Array<Object>>}
   */
  typeMapping: reads('configuration.typeMapping'),

  /**
   * @type {Ember.ComputedProperty<Array<Object>>}
   */
  accessTypeMapping: reads('configuration.accessTypeMapping'),

  /**
   * @type {Ember.ComputedProperty<Array<Object>>}
   */
  publisherMapping: reads('configuration.publisherMapping'),

  /**
   * @type {Ember.ComputedProperty<Object>}
   */
  filterParams: reads('queryParams.activeFilterParams'),

  isExpandedObserver: observer(
    'isExpanded',
    function isExpandedObserver() {
      const {
        isExpanded,
        loadDataObjects,
      } = this.getProperties('isExpanded', 'loadDataObjects');
      if (isExpanded) {
        loadDataObjects();
      }
    }
  ),
  init() {
    this._super(...arguments);

    this.isExpandedObserver();
  },

  actions: {
    toggleDataObjectExpansion(dataObject) {
      const expandedDataObjects = this.get('study.expandedDataObjects');
      if (expandedDataObjects.includes(dataObject)) {
        expandedDataObjects.removeObject(dataObject);
      } else {
        expandedDataObjects.addObject(dataObject);
      }
    },
    toggleAllElementsExpansion() {
      const study = this.get('study');
      if (get(study, 'hasAllElementsExpanded')) {
        study.collapseAll();
      } else {
        study.expandAll();
      }
    },
    toggleDataObjectSelection(dataObject) {
      const selectedDataObjects = this.get('study.selectedDataObjects');
      if (selectedDataObjects.includes(dataObject)) {
        selectedDataObjects.removeObject(dataObject);
      } else {
        selectedDataObjects.addObject(dataObject);
      }
    },
  },
});
