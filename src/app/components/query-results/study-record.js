/**
 * A component used internally by query-result component, that shows
 * one record of query results (one study).
 *
 * @module components/query-results/study-record
 * @author Michał Borzęcki
 * @copyright (C) 2019-2020 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import Component from '@ember/component';
import { get, computed } from '@ember/object';
import I18n from 'onezone-gui-plugin-ecrin/mixins/i18n';
import notImplementedIgnore from 'onezone-gui-plugin-ecrin/utils/not-implemented-ignore';
import notImplementedReject from 'onezone-gui-plugin-ecrin/utils/not-implemented-reject';
import {
  formatBasicDetails,
  formatFeatureDetails,
  formatEnrolmentData,
  formatTopics,
  formatRelatedStudies,
} from 'onezone-gui-plugin-ecrin/utils/study-formatters';

export default Component.extend(I18n, {
  classNames: ['study-record', 'panel', 'panel-default'],
  classNameBindings: [
    'study.isRecordExpanded:is-expanded:is-collapsed',
  ],

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
   * @type {Set<number>}
   */
  fetchedStudiesIds: undefined,

  /**
   * @virtual
   * @type {Object}
   */
  selectedDataObjects: undefined,

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

  /**
   * @virtual
   * @type {Function}
   * @param {Object} relatedStudy
   * @returns {Promise}
   */
  addRelatedStudyToResults: notImplementedReject,

  /**
   * @type {ComputedProperty<Array<Object>>}
   */
  formattedStudyBasicDetails: computed(
    'study.{type,status}',
    function formattedStudyBasicDetails() {
      const {
        i18n,
        study,
      } = this.getProperties('i18n', 'study');

      return formatBasicDetails(i18n, study);
    }
  ),

  /**
   * @type {ComputedProperty<Array<Object>>}
   */
  formattedStudyFeatureDetails: computed(
    'study.{isInterventional,isObservational,phase,interventionModel,allocationType,primaryPurpose,masking,observationalModel,timePerspective,biospecimensRetained}',
    function formattedStudyFeatureDetails() {
      const {
        i18n,
        study,
      } = this.getProperties('i18n', 'study');

      return formatFeatureDetails(i18n, study);
    }
  ),

  /**
   * @type {ComputedProperty<Array<Object>>}
   */
  formattedStudyEnrolmentData: computed(
    'study.{minAge,maxAge,enrolment,genderEligibility}',
    function formattedStudyEnrolmentData() {
      const {
        i18n,
        study,
      } = this.getProperties('i18n', 'study');

      return formatEnrolmentData(i18n, study);
    }
  ),

  /**
   * @type {ComputedProperty<Array<String>>}
   */
  formattedStudyTopics: computed('study.topics.[]', function formattedStudyTopics() {
    return formatTopics(this.get('study'));
  }),

  /**
   * @type {ComputedProperty<Array<Object>>}
   */
  formattedRelatedStudies: computed('study', function formattedRelatedStudies() {
    return formatRelatedStudies(this.get('study'));
  }),

  /**
   * @type {ComputedProperty<Array<Object>>}
   */
  studyIdentifiers: computed('study', function studyIdentifiers() {
    return [...(this.get('study.identifiers') || [])].sortBy('typeId');
  }),

  /**
   * @type {ComputedProperty<Array<Object>>}
   */
  notFetchedRelatedStudies: computed(
    'fetchedStudiesIds',
    'study.relatedStudies',
    function notFetchedRelatedStudies() {
      const fetchedStudiesIds = this.get('fetchedStudiesIds');
      const relatedStudies = this.get('study.relatedStudies') || [];

      if (!fetchedStudiesIds) {
        return relatedStudies;
      }

      return relatedStudies
        .filter(({ targetId }) => !fetchedStudiesIds.has(targetId))
        .mapBy('target');
    }
  ),

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
    remove() {
      const {
        isFetchingData,
        remove,
      } = this.getProperties('isFetchingData', 'remove');

      if (!isFetchingData) {
        return remove();
      }
    },
    addRelatedStudyToResults(relatedStudy) {
      const {
        notFetchedRelatedStudies,
        isFetchingData,
        addRelatedStudyToResults,
      } = this.getProperties(
        'notFetchedRelatedStudies',
        'isFetchingData',
        'addRelatedStudyToResults'
      );

      if (notFetchedRelatedStudies.includes(relatedStudy) && !isFetchingData) {
        addRelatedStudyToResults(relatedStudy);
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
