/**
 * Exposes configuration of this application
 *
 * @module services/configuration
 * @author Michał Borzęcki
 * @copyright (C) 2019 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

/**
 * @typedef {Object} Mapping
 * @property {number} id
 * @property {String} name
 */

import Service, { inject as service } from '@ember/service';
import safeExec from 'onezone-gui-plugin-ecrin/utils/safe-method-execution';
import { computed } from '@ember/object';
import { reads } from '@ember/object/computed';
import { or, raw, array } from 'ember-awesome-macros';

const mappingFields = [
  'studyIdType',
  'studyRelationshipType',
  'studyType',
  'studyStatus',
  'studyFeatureType',
  'studyGenderEligibility',
  'studyPhase',
  'studyInterventionModel',
  'studyAllocationType',
  'studyPrimaryPurpose',
  'studyMasking',
  'studyObservationalModel',
  'studyTimePerspective',
  'studyBiospecimensRetained',
  'dataObjectFilterType',
  'dataObjectAccessType',
];

const serviceFields = {};

mappingFields.forEach(mappingField => {
  serviceFields[`${mappingField}Mapping`] =
    or(`configuration.${mappingField}Mapping`, raw([]));

  serviceFields[`${mappingField}Map`] = computed(`${mappingField}Mapping`, function () {
    const list = this.get(`${mappingField}Mapping`);
    return new Map(list.map(item => [item.id, item]));
  });

  serviceFields[`${mappingField}UnknownValue`] =
    array.findBy(`${mappingField}Mapping`, raw('useForUnknown'));
});

export default Service.extend(serviceFields, {
  appProxy: service(),

  /**
   * @type {Object|undefined}
   */
  configuration: undefined,

  /**
   * @type {ComputedProperty<String>}
   */
  contactEmail: reads('configuration.contactEmail'),

  /**
   * (Re)loads configuration object
   * @returns {Promise}
   */
  reloadConfiguration() {
    const appProxy = this.get('appProxy');
    return appProxy.configRequest()
      .then(config => safeExec(this, () => {
        this.set('configuration', config);
      }))
      .catch(() => safeExec(this, () => {
        this.set('configuration', undefined);
      }));
  },
});
