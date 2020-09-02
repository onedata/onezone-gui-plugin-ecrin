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
import { get, computed, getProperties } from '@ember/object';
import { array, raw } from 'ember-awesome-macros';
import I18n from 'onezone-gui-plugin-ecrin/mixins/i18n';
import notImplementedIgnore from 'onezone-gui-plugin-ecrin/utils/not-implemented-ignore';
import notImplementedReject from 'onezone-gui-plugin-ecrin/utils/not-implemented-reject';
import _ from 'lodash';

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
  studyBasicDetails: computed(
    'study.{type,status,genderEligibility}',
    function studyBasicDetails() {
      const details = ['type', 'status', 'genderEligibility']
        .map(detailName => this.generateStudyDetailEntry(detailName))
        .compact();

      details.slice(0, -1).setEach('separator', '|');

      return details;
    }
  ),

  /**
   * @type {ComputedProperty<Array<Object>>}
   */
  studyFeatureDetails: computed(
    'study.{isInterventional,isObservational,phase,interventionModel,allocationType,primaryPurpose,masking,observationalModel,timePerspective,biospecimensRetained}',
    function studyFeatureDetails() {
      const detailNames = [];
      if (this.get('study.isInterventional')) {
        detailNames.push(
          'phase',
          'interventionModel',
          'allocationType',
          'primaryPurpose',
          'masking'
        );
      } else if (this.get('study.isObservational')) {
        detailNames.push(
          'observationalModel',
          'timePerspective',
          'biospecimensRetained'
        );
      }

      return detailNames
        .map(detailName => this.generateStudyDetailEntry(detailName))
        .compact();
    }
  ),

  /**
   * @type {ComputedProperty<String>}
   */
  ageRange: computed(
    'study.{minAge,minAgeUnits,maxAge,maxAgeUnits}',
    function ageRange() {
      const {
        minAge,
        minAgeUnits,
        maxAge,
        maxAgeUnits,
      } = getProperties(
        this.get('study'),
        'minAge',
        'minAgeUnits',
        'maxAge',
        'maxAgeUnits'
      );

      const minAgeDescription = this.generateAgeDescription(minAge, minAgeUnits);
      const maxAgeDescription = this.generateAgeDescription(maxAge, maxAgeUnits);
      const ageNotSpecifiedDescription = this.t('ageNotSpecified');

      if (!minAgeDescription && !maxAgeDescription) {
        return ageNotSpecifiedDescription;
      }

      return `${minAgeDescription || ageNotSpecifiedDescription} - ${maxAgeDescription || ageNotSpecifiedDescription}`;
    }
  ),

  /**
   * @type {ComputedProperty<Array<Object>>}
   */
  groupedRelatedStudies: array.sort(
    array.groupBy('study.relatedStudies', raw('relationshipType')),
    ['value.id']
  ),

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

  generateStudyDetailEntry(detailName) {
    const detail = this.get(`study.${detailName}`);
    if (detail) {
      return {
        label: this.t(`study${_.upperFirst(detailName)}`),
        value: detail.name,
      };
    }
  },

  generateAgeDescription(age, ageUnit) {
    if (typeof age !== 'number') {
      return undefined;
    }

    return `${age}${ageUnit ? ' ' + ageUnit : ''}`;
  },

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

      if (notFetchedRelatedStudies.contains(relatedStudy) && !isFetchingData) {
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
