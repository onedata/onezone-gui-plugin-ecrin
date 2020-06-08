/**
 * Represents a single study object received from Elasticsearch.
 *
 * @module utils/study
 * @author Michał Borzęcki
 * @copyright (C) 2019-2020 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import EmberObject from '@ember/object';
import { and, or, raw, not, equal } from 'ember-awesome-macros';

// Study topics which makes sense only when study is interventional
const interventionalOnlyStudyTopicTypes = [
  'phase',
  'interventionModel',
  'allocationType',
  'primaryPurpose',
  'masking',
];

// Like above, but for observational studies
const observationalOnlyStudyTopicTypes = [
  'observationalModel',
  'timePerspective',
  'biospecimensRetained',
];

export default EmberObject.extend({
  /**
   * @virtual
   * @type {number}
   */
  id: undefined,

  /**
   * @public
   * @type {boolean}
   */
  isRecordExpanded: false,

  /**
   * @public
   * @type {boolean}
   */
  isDescriptionExpanded: false,

  /**
   * @public
   * @type {boolean}
   */
  isDataSharingStatementExpanded: false,

  /**
   * @virtual
   * @type {Array<DataObject>}
   */
  dataObjects: undefined,

  /**
   * @virtual
   * @type {Array<DataObject>}
   */
  expandedDataObjects: undefined,

  /**
   * @virtual
   * @type {String}
   */
  title: undefined,

  /**
   * @virtual
   * @type {String}
   */
  description: undefined,

  /**
   * @virtual
   * @type {String}
   */
  dataSharingStatement: undefined,

  /**
   * @virtual
   * @type {Array<number>}
   */
  dataObjectsIds: undefined,

  /**
   * @virtual
   * @type {Object}
   */
  type: undefined,

  /**
   * @virtual
   * @type {Object}
   */
  status: undefined,

  /**
   * @virtual
   * @type {Object}
   */
  genderEligibility: undefined,

  /**
   * @virtual
   * @type {Object}
   */
  phase: undefined,

  /**
   * @virtual
   * @type {Object}
   */
  interventionModel: undefined,

  /**
   * @virtual
   * @type {Object}
   */
  allocationType: undefined,

  /**
   * @virtual
   * @type {Object}
   */
  primaryPurpose: undefined,

  /**
   * @virtual
   * @type {Object}
   */
  masking: undefined,

  /**
   * @virtual
   * @type {Object}
   */
  observationalModel: undefined,

  /**
   * @virtual
   * @type {Object}
   */
  timePerspective: undefined,

  /**
   * @virtual
   * @type {Object}
   */
  biospecimensRetained: undefined,

  /**
   * @virtual
   * @type {boolean}
   */
  isInterventional: undefined,

  /**
   * @virtual
   * @type {boolean}
   */
  isObservational: undefined,

  /**
   * @type {ComputedProperty<boolean>}
   */
  hasAllElementsExpanded: and(
    or(not('description'), 'isDescriptionExpanded'),
    or(not('dataSharingStatement'), 'isDataSharingStatementExpanded'),
    equal('expandedDataObjects.length', or('dataObjects.length', raw(0))),
  ),

  expandAll() {
    const {
      expandedDataObjects,
      dataObjects,
    } = this.getProperties('expandedDataObjects', 'dataObjects');

    this.setProperties({
      isDescriptionExpanded: true,
      isDataSharingStatementExpanded: true,
    });
    expandedDataObjects.addObjects(dataObjects || []);
  },

  collapseAll() {
    this.setProperties({
      isDescriptionExpanded: false,
      isDataSharingStatementExpanded: false,
    });
    this.get('expandedDataObjects').clear();
  },

  isSupportingField(fieldName) {
    if (interventionalOnlyStudyTopicTypes.includes(fieldName)) {
      return this.get('isInterventional');
    } else if (observationalOnlyStudyTopicTypes.includes(fieldName)) {
      return this.get('isObservational');
    } else {
      return true;
    }
  },
});
