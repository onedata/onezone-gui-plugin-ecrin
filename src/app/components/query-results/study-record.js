/**
 * A component used internally by query-result component, that shows
 * one record of query results (one study).
 * 
 * @module components/query-results/study-record
 * @author Michał Borzęcki
 * @copyright (C) 2019 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import Component from '@ember/component';
import { get } from '@ember/object';
import I18n from 'onezone-gui-plugin-ecrin/mixins/i18n';
import notImplementedIgnore from 'onezone-gui-plugin-ecrin/utils/not-implemented-ignore';

export default Component.extend(I18n, {
  classNames: ['study-record'],

  /**
   * @override
   */
  i18nPrefix: 'components.queryResults.studyRecord',

  /**
   * True if application is in the middle of data fetching process
   * @virtual optional
   * @type {boolean}
   */
  isFetchingData: false,

  /**
   * @virtual
   * @type {Object}
   */
  study: undefined,

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
   * @returns {any}
   */
  remove: notImplementedIgnore,

  actions: {
    toggleDataObjectExpansion(dataObject) {
      toggleListItemExistence(this.get('study.expandedDataObjects'), dataObject);
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
      toggleListItemExistence(this.get('study.selectedDataObjects'), dataObject);
    },
    remove() {
      const {
        isFetchingData,
        remove,
      } = this.getProperties('isFetchingData', 'remove');

      if (!isFetchingData) {
        return remove();
      }
    },
  },
});

function toggleListItemExistence(list, item) {
  if (list.includes(item)) {
    list.removeObject(item);
  } else {
    list.addObject(item);
  }
}
