/**
 * A set of formatter functions used to present study data in a user-friendly form.
 * Can be used to transform study object to a simplified data representation, which is
 * ready to render.
 *
 * @module utils/study-formatters
 * @author Michał Borzęcki
 * @copyright (C) 2020 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import _ from 'lodash';
import { get, getProperties } from '@ember/object';

const i18nPrefix = 'utils.studyFormatters';

/**
 * @param {Ember.Service} i18n
 * @param {Utils.Study} study
 * @returns {Array<Object>} array of objects, where each represents a single study detail:
 * ```
 * {
 *   name: String // detail name (ready to render)
 *   value: String // detail value (ready to render)
 *   separator: String|undefined // '|' or undefined
 * }
 * ```
 */
export function formatBasicDetails(i18n, study) {
  const details = ['type', 'status']
    .map(detailName => generateDetailEntry(i18n, study, detailName))
    .compact();

  details.slice(0, -1).setEach('separator', '|');

  return details;
}

/**
 * @param {Ember.Service} i18n
 * @param {Utils.Study} study
 * @returns {Array<Object>} array of objects, where each represents a single study feature:
 * ```
 * {
 *   name: String // feature name (ready to render)
 *   value: String // feature value (ready to render)
 * }
 * ```
 */
export function formatFeatureDetails(i18n, study) {
  const {
    isInterventional,
    isObservational,
  } = getProperties(study, 'isInterventional', 'isObservational');

  const detailNames = [];
  if (isInterventional) {
    detailNames.push(
      'phase',
      'interventionModel',
      'allocationType',
      'primaryPurpose',
      'masking'
    );
  } else if (isObservational) {
    detailNames.push(
      'observationalModel',
      'timePerspective',
      'biospecimensRetained'
    );
  }

  return detailNames
    .map(detailName => generateDetailEntry(i18n, study, detailName))
    .compact();
}

/**
 * @param {Ember.Service} i18n
 * @param {Utils.Study} study
 * @returns {String} array of objects, where each represents a single study enrolment detail
 * ```
 * {
 *   name: String // detail name (ready to render)
 *   value: String // detail value (ready to render)
 *   separator: String|undefined // '|' or undefined
 * }
 * ```
 */
export function formatEnrolmentData(i18n, study) {
  const {
    minAge,
    maxAge,
    enrolment,
  } = getProperties(
    study,
    'minAge',
    'maxAge',
    'enrolment',
  );

  const minAgeDescription = generateAgeDescription(minAge);
  const maxAgeDescription = generateAgeDescription(maxAge);
  const notSpecifiedDescription = i18n.t(`${i18nPrefix}.notSpecified`);

  let ageDescription;
  if (!minAgeDescription && !maxAgeDescription) {
    ageDescription = notSpecifiedDescription;
  } else {
    ageDescription =
      `${minAgeDescription || notSpecifiedDescription} - ${maxAgeDescription || notSpecifiedDescription}`;
  }

  const dataElements = [
    generateDetailEntry(i18n, study, 'genderEligibility'), {
      name: i18n.t(`${i18nPrefix}.studyFields.ageRange`),
      value: ageDescription,
    }, {
      name: i18n.t(`${i18nPrefix}.studyFields.numberOfParticipants`),
      value: enrolment !== null ? String(enrolment) : notSpecifiedDescription,
    },
  ];

  dataElements.slice(0, -1).setEach('separator', '|');

  return dataElements;
}

/**
 * @param {Utils.Study} study
 * @returns {Array<String>} string representation of study topics (ready to render)
 */
export function formatTopics(study) {
  return (get(study, 'topics') || [])
    .map(({ value, code, typeName }) => {
      let topicDescription = value;

      let additionalInfo = '';
      if (typeName) {
        additionalInfo += typeName;
      }

      if (code) {
        if (additionalInfo) {
          additionalInfo += '; ';
        }
        additionalInfo += `MESH: ${code}`;
      }

      if (additionalInfo) {
        topicDescription += ` [${additionalInfo}]`;
      }

      return topicDescription;
    });
}

/**
 * @param {Utils.Study} study
 * @returns {Array<Object>} array of objects, where each represents a single type of relation
 * with all studies with that relation. It has format:
 * ```
 * {
 *   relation: String // Relation name (ready to render)
 *   studies: Array<{ description: String, raw: Object }> // Has stringified representation
 *     // of related studies in `description` (ready to render) and related study object in `raw`
 * }
 * ```
 */
export function formatRelatedStudies(study) {
  const relatedStudies = get(study, 'relatedStudies') || [];
  const groupedRelatedStudies = _.sortBy(
    _.toPairs(_.groupBy(relatedStudies, v => v.relationshipType.id)),
    v => v[0]
  ).map(([, items]) => items);

  return groupedRelatedStudies.map(studiesGroup => ({
    relation: `${studiesGroup[0].relationshipType.name}`,
    studies: studiesGroup.map(({ target: study }) => {
      let description = study.title + ' ';
      study.identifiers.forEach(identifier =>
        description +=
        `[${identifier.type.name}: ${identifier.value}]`
      );
      return {
        description,
        raw: study,
      };
    }),
  }));
}

function generateDetailEntry(i18n, study, detailName) {
  const detail = get(study, detailName);
  if (detail) {
    return {
      name: i18n.t(`${i18nPrefix}.studyFields.${detailName}`),
      value: detail.name,
    };
  }
}

function generateAgeDescription(age) {
  const {
    value,
    unit_name,
  } = (age || {});
  if (typeof value !== 'number') {
    return undefined;
  }

  return `${value}${unit_name ? ' ' + unit_name : ''}`;
}
