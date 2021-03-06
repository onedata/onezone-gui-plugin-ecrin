/**
 * Represents a single study object received from Elasticsearch.
 *
 * @module utils/study
 * @author Michał Borzęcki
 * @copyright (C) 2019-2020 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import EmberObject from '@ember/object';
import { and, or, raw, not, equal, isEmpty } from 'ember-awesome-macros';

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
  isProvenanceExpanded: false,

  /**
   * @public
   * @type {boolean}
   */
  areDetailsExpanded: false,

  /**
   * @public
   * @type {boolean}
   */
  isDataSharingStatementExpanded: false,

  /**
   * @public
   * @type {boolean}
   */
  areRelatedStudiesExpanded: false,

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
   * @type {{ value: number, unit_name: string }}
   */
  minAge: undefined,

  /**
   * @virtual
   * @type {{ value: number, unit_name: string }}
   */
  maxAge: undefined,

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
   * @type {Array<{ value: String, code: String, typeName: String }>}
   */
  topics: undefined,

  /**
   * @virtual
   * @type {number|null}
   */
  enrolment: undefined,

  /**
   * @virtual
   * @type {Array<{ targetId: String, target: Object, relationshipType: Object }>}
   */
  relatedStudies: undefined,

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
   * @type {Array<{ value: any, typeId: String, typeName: String }>}
   */
  identifiers: undefined,

  /**
   * @type {ComputedProperty<boolean>}
   */
  hasAllElementsExpanded: and(
    or(not('description'), 'isDescriptionExpanded'),
    or(not('provenance'), 'isProvenanceExpanded'),
    'areDetailsExpanded',
    or(not('dataSharingStatement'), 'isDataSharingStatementExpanded'),
    or(isEmpty('relatedStudies'), 'areRelatedStudiesExpanded'),
    equal('expandedDataObjects.length', or('dataObjects.length', raw(0))),
  ),

  expandAll() {
    const {
      expandedDataObjects,
      dataObjects,
    } = this.getProperties('expandedDataObjects', 'dataObjects');

    this.setProperties({
      isDescriptionExpanded: true,
      isProvenanceExpanded: true,
      areDetailsExpanded: true,
      isDataSharingStatementExpanded: true,
      areRelatedStudiesExpanded: true,
    });
    expandedDataObjects.addObjects(dataObjects || []);
  },

  collapseAll() {
    this.setProperties({
      isDescriptionExpanded: false,
      isProvenanceExpanded: false,
      areDetailsExpanded: false,
      isDataSharingStatementExpanded: false,
      areRelatedStudiesExpanded: false,
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
