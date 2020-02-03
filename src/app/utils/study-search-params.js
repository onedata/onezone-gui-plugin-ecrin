/**
 * Represents studies search params. which will be used to create query to
 * Elasticsearch.
 *
 * @module utils/study-search-params
 * @author Michał Borzęcki
 * @copyright (C) 2019 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import EmberObject, { computed } from '@ember/object';

const paramsList = [
  'mode',
  'studyIdType',
  'studyId',
  'studyTitleContains',
  'studyTopicsInclude',
  'studyTitleTopicOperator',
  'doi',
  'dataObjectTitle',
];

export default EmberObject.extend({
  /**
   * One of 'specificStudy', 'studyCharact', 'viaPubPaper'
   * @type {string}
   * @virtual
   */
  mode: 'studyCharact',

  /**
   * Only for mode === 'specificStudy'
   * @type {string}
   * @virtual
   */
  studyIdType: null,

  /**
   * Only for mode === 'specificStudy'
   * @type {string}
   * @virtual
   */
  studyId: '',

  /**
   * Only for mode === 'studyCharact'
   * @type {string}
   * @virtual
   */
  studyTitleContains: '',

  /**
   * Only for mode === 'studyCharact'
   * @type {string}
   * @virtual
   */
  studyTopicsInclude: '',

  /**
   * Only for mode === 'viaPubPaper'
   * @type {string}
   * @virtual
   */
  doi: '',

  /**
   * Only for mode === 'viaPubPaper'
   * @type {string}
   * @virtual
   */
  dataObjectTitle: '',

  /**
   * Only for mode === 'studyCharact'
   * @type {ComputedProperty<string>}
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
   * @type {ComputedProperty<boolean>}
   * @public
   * True if params can be used to create a query
   */
  hasMeaningfulParams: computed(...paramsList, function hasMeaningfulParams() {
    const {
      mode,
      studyIdType,
      studyId,
      studyTitleContains,
      studyTopicsInclude,
      doi,
      dataObjectTitle,
    } = this.getProperties(...paramsList);

    switch (mode) {
      case 'specificStudy':
        return Boolean(studyIdType && studyId);
      case 'studyCharact':
        return Boolean(studyTitleContains || studyTopicsInclude);
      case 'viaPubPaper':
        return Boolean(doi || dataObjectTitle);
      default:
        return false;
    }
  }),
});
