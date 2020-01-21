/**
 * Exposes configuration of this application
 *
 * @module services/configuration
 * @author Michał Borzęcki
 * @copyright (C) 2019 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import Service, { inject as service } from '@ember/service';
import safeExec from 'onezone-gui-plugin-ecrin/utils/safe-method-execution';
import { or, raw } from 'ember-awesome-macros';
import _ from 'lodash';

const interventionalOnlyStudyTopicTypes = [
  'phase',
  'interventionModel',
  'allocationType',
  'primaryPurpose',
  'masking',
];

const observationalOnlyStudyTopicTypes = [
  'observationalModel',
  'timePerspective',
  'biospecimensRetained',
];

const mappingFields = [
  'studyIdType',
  'studyType',
  'studyStatus',
  'studyTopicType',
  'studyGenderEligibility',
  'objectType',
  'accessType',
].concat([
  ...interventionalOnlyStudyTopicTypes,
  ...observationalOnlyStudyTopicTypes,
].map(topicType => `study${_.upperFirst(topicType)}`));

const serviceFields = {};

mappingFields.forEach(mappingField => {
  serviceFields[`${mappingField}Mapping`] =
    or(`configuration.${mappingField}Mapping`, raw([]));
});

export default Service.extend(serviceFields, {
  appProxy: service(),
  elasticsearch: service(),

  /**
   * @type {Object|undefined}
   */
  configuration: undefined,

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
