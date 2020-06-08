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
  'paperSearchField',
  'doi',
  'dataObjectTitle',
  'internalStudyIds',
];

export default EmberObject.extend({
  /**
   * One of 'specificStudy', 'studyCharact', 'viaPubPaper', 'viaInternalId'
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
   * One of: 'doi', 'title'
   * @type {string}
   * @virtual
   */
  paperSearchField: 'doi',

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
   * Only for mode === 'viaInternalId'
   * @type {Array<number>}
   */
  internalStudyIds: undefined,

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
      paperSearchField,
      doi,
      dataObjectTitle,
      internalStudyIds,
    } = this.getProperties(...paramsList);

    switch (mode) {
      case 'specificStudy':
        return Boolean(studyIdType && studyId);
      case 'studyCharact':
        return Boolean(studyTitleContains || studyTopicsInclude);
      case 'viaPubPaper':
        return Boolean(paperSearchField === 'title' ? dataObjectTitle : doi);
      case 'viaInternalId':
        return Boolean(internalStudyIds && internalStudyIds.length);
      default:
        return false;
    }
  }),

  dumpValues() {
    const dump = this.getProperties(...paramsList);
    dump.studyIdType = (dump.studyIdType || {}).id;
    return dump;
  },

  loadDumpedValues(dump, studyIdTypeMapping) {
    this.setProperties(Object.assign({}, dump, {
      studyIdType: studyIdTypeMapping.findBy('id', dump.studyIdType),
    }));
  },
});
