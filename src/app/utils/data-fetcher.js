/**
 * Is responsible for fetching studies and data objects from Elasticsearch. Automatically
 * places query results into the data store.
 *
 * @module utils/data-fetcher
 * @author Michał Borzęcki
 * @copyright (C) 2020 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import EmberObject, { get, getProperties, set, computed } from '@ember/object';
import PromiseObject from 'onezone-gui-plugin-ecrin/utils/promise-object';
import { resolve, reject, all as allFulfilled } from 'rsvp';
import { isBlank } from '@ember/utils';
import Study from 'onezone-gui-plugin-ecrin/utils/study';
import _ from 'lodash';
import isUrl from 'is-url';

const studyCategorizedFields = [{
  fieldName: 'type',
  rawFieldName: 'study_type',
}, {
  fieldName: 'status',
  rawFieldName: 'study_status',
}, {
  fieldName: 'genderEligibility',
  rawFieldName: 'study_gender_elig',
}];

const studyFeatureTypeNames = [
  'phase',
  'interventionModel',
  'allocationType',
  'primaryPurpose',
  'masking',
  'observationalModel',
  'timePerspective',
  'biospecimensRetained',
];

const dataObjectCategorizedFields = [{
  fieldName: 'accessType',
  rawFieldName: 'access_type',
}];

export default EmberObject.extend({
  /**
   * @virtual
   * @type {Services.Configuration}
   */
  configuration: undefined,

  /**
   * @virtual
   * @type {Services.Elasticsearch}
   */
  elasticsearch: undefined,

  /**
   * @virtual
   * @type {Utils.DataStore}
   */
  dataStore: undefined,

  /**
   * Set by searchStudies to indicate query status (only one query at a time is possible).
   * @type {PromiseObject}
   */
  fetchDataPromiseObject: undefined,

  /**
   * @type {number}
   */
  latestSearchFittingStudiesCount: 0,

  /**
   * Additional data needed to construct study from query result. Calculated once
   * for performance reasons. Contains fields:
   * [type|status|...]: {
   *   valuesMap: Map<number,Mapping>, // Map id -> corresponding value mapping
   *   unknownValue: Mapping, // mapping used for values without known categorization
   * }
   * featureNameToFeatureId: Map<String,number>
   * @type {ComputedProperty<Object>}
   */
  studyInstanceCreatorData: computed(
    function studyInstanceCreatorData() {
      const studyFeatureTypeMapping = this.get('configuration.studyFeatureTypeMapping');
      const creatorData = {};
      [
        ...studyCategorizedFields,
        ...studyFeatureTypeNames.concat(['relationshipType'])
        .map(name => ({ fieldName: name })),
      ].forEach(({ fieldName }) => {
        creatorData[fieldName] = {
          valuesMap: this.get(
            `configuration.study${_.upperFirst(fieldName)}Map`
          ),
          unknownValue: this.get(
            `configuration.study${_.upperFirst(fieldName)}UnknownValue`
          ),
        };
      });

      creatorData.featureNameToFeatureId = new Map(
        studyFeatureTypeNames.map(featureName => {
          const featureType = studyFeatureTypeMapping
            .findBy(`is${_.upperFirst(featureName)}FeatureType`);
          if (featureType) {
            return [featureName, featureType.id];
          }
        }).compact()
      );

      return creatorData;
    }
  ),

  /**
   * Additional data needed to construct data object from query result. Calculated once
   * for performance reasons. Contains fields:
   * [accessType|filterType|...]: {
   *   valuesMap: Map<number,Mapping>, // Map id -> corresponding value mapping
   *   unknownValue: Mapping, // mapping used for values without known categorization
   * }
   * @type {ComputedProperty<Object>}
   */
  dataObjectInstanceCreatorData: computed(
    function dataObjectInstanceCreatorData() {
      const {
        dataObjectFilterTypeMapping,
        dataObjectFilterTypeUnknownValue,
      } = getProperties(
        this.get('configuration'),
        'dataObjectFilterTypeMapping',
        'dataObjectFilterTypeUnknownValue'
      );
      const creatorData = {};
      dataObjectCategorizedFields.forEach(({ fieldName }) => {
        creatorData[fieldName] = {
          valuesMap: this.get(
            `configuration.dataObject${_.upperFirst(fieldName)}Map`
          ),
          unknownValue: this.get(
            `configuration.dataObject${_.upperFirst(fieldName)}UnknownValue`
          ),
        };
      });
      const typeIdToFilterTypeIdMapDef = dataObjectFilterTypeMapping
        .reduce((mapDef, filterType) => {
          const objectTypeIds = filterType.objectTypeIds || [];
          return mapDef.concat(objectTypeIds.map(typeId => [typeId, filterType]));
        }, []);
      creatorData.filterType = {
        valuesMap: new Map(typeIdToFilterTypeIdMapDef),
        unknownValue: dataObjectFilterTypeUnknownValue,
      };

      return creatorData;
    }
  ),

  /**
   * Additional data needed to construct related study from query result. Calculated once
   * for performance reasons. Contains fields:
   * [identifierType|...]: {
   *   valuesMap: Map<number,Mapping>, // Map id -> corresponding value mapping
   *   unknownValue: Mapping, // mapping used for values without known categorization
   * }
   * @type {ComputedProperty<Object>}
   */
  relatedStudyInstanceCreatorData: computed(
    function relatedStudyInstanceCreatorData() {
      const creatorData = {
        identifierType: {
          valuesMap: this.get('configuration.studyIdTypeMap'),
          unknownValue: null,
        },
      };

      return creatorData;
    }
  ),

  init() {
    this._super(...arguments);

    this.set('fetchDataPromiseObject', PromiseObject.create({ promise: resolve() }));
    // Precalculate creators data to make the first query faster
    this.getProperties('studyInstanceCreatorData', 'dataObjectInstanceCreatorData');
  },

  /**
   * Starts study query
   * @param {Utils.StudySearchParams} searchParams
   * @param {Utils.Study} [stackAfterStudy=null]
   * @returns {Promise}
   */
  searchStudies(searchParams, stackAfterStudy = null) {
    const {
      hasMeaningfulParams,
      mode,
    } = getProperties(searchParams, 'hasMeaningfulParams', 'mode');
    if (hasMeaningfulParams) {
      const fetchDataPromiseObject = this.get('fetchDataPromiseObject');
      let promise = get(fetchDataPromiseObject, 'isSettled') ?
        resolve() : fetchDataPromiseObject;
      promise = promise
        .then(() => {
          if (!stackAfterStudy) {
            this.get('dataStore').removeAllStudies();
          }

          switch (mode) {
            case 'specificStudy':
              return this.fetchSpecificStudy(searchParams);
            case 'studyCharact':
              return this.fetchStudyCharact(searchParams);
            case 'viaPubPaper':
              return this.fetchViaPubPaper(searchParams);
            case 'viaInternalId':
              return this.fetchViaInternalId(searchParams);
            default:
              return reject('incorrect search method');
          }
        })
        .then(results =>
          this.loadStudiesFromResponse(results, mode !== 'viaInternalId', stackAfterStudy)
        )
        .then(newStudies => allFulfilled([
          this.loadDataObjectsForStudies(newStudies),
          this.loadRelatedStudiesForStudies(newStudies),
        ]));
      return this.set('fetchDataPromiseObject', PromiseObject.create({ promise }));
    }
  },

  /**
   * Loads studies according to study identifier
   * @param {Utils.StudySearchParams} searchParams
   * @returns {Promise}
   */
  fetchSpecificStudy(searchParams) {
    const queryBody = this.constructStudyQueryBodyBase();
    const {
      studyIdType,
      studyId,
    } = getProperties(
      searchParams,
      'studyIdType',
      'studyId'
    );

    queryBody.size = this.getStudiesLimit();
    queryBody.query = {
      bool: {
        filter: [{
          nested: {
            path: 'study_identifiers',
            query: {
              bool: {
                must: [{
                  term: {
                    'study_identifiers.identifier_type.id': studyIdType.id,
                  },
                }, {
                  term: {
                    'study_identifiers.identifier_value': studyId,
                  },
                }],
              },
            },
          },
        }],
        must_not: this.generateExcludeFetchedStudiesClause(),
      },
    };

    return this.get('elasticsearch').post('study', '_search', queryBody);
  },

  /**
   * Loads studies according to study parameters
   * @param {Utils.StudySearchParams} searchParams
   * @returns {Promise}
   */
  fetchStudyCharact(searchParams) {
    const queryBody = this.constructStudyQueryBodyBase();
    queryBody.size = this.getStudiesLimit();
    queryBody.query = {
      bool: {
        must_not: this.generateExcludeFetchedStudiesClause(),
      },
    };
    const {
      studyTitleContains,
      studyTopicsInclude,
      studyTitleTopicOperator,
    } = getProperties(
      searchParams,
      'studyTitleContains',
      'studyTopicsInclude',
      'studyTitleTopicOperator',
    );
    const filtersArray = [];
    if (studyTitleContains) {
      filtersArray.push({
        bool: {
          should: [{
            simple_query_string: {
              query: studyTitleContains,
              fields: ['display_title.title_text'],
              default_operator: 'and',
            },
          }, {
            nested: {
              path: 'study_titles',
              query: {
                simple_query_string: {
                  query: studyTitleContains,
                  fields: ['study_titles.title_text'],
                  default_operator: 'and',
                },
              },
            },
          }],
        },
      });
    }
    if (studyTopicsInclude) {
      filtersArray.push({
        nested: {
          path: 'study_topics',
          query: {
            simple_query_string: {
              query: studyTopicsInclude,
              fields: ['study_topics.topic_value'],
              default_operator: 'and',
            },
          },
        },
      });
    }
    if (studyTitleTopicOperator === 'or') {
      Object.assign(queryBody.query.bool, {
        should: filtersArray,
      });
    } else {
      Object.assign(queryBody.query.bool, {
        must: filtersArray,
      });
    }
    return this.get('elasticsearch').post('study', '_search', queryBody);
  },

  /**
   * Loads studies according to related paper
   * @param {Utils.StudySearchParams} searchParams
   * @returns {Promise}
   */
  fetchViaPubPaper(searchParams) {
    return this.fetchStudyIdsForPerPaperSearch(searchParams)
      .then(studyIds => {
        if (studyIds.length) {
          const queryBody = this.constructStudyQueryBodyBase();
          queryBody.size = this.getStudiesLimit();
          queryBody.query = {
            bool: {
              filter: [{
                terms: {
                  id: studyIds,
                },
              }],
              must_not: this.generateExcludeFetchedStudiesClause(),
            },
          };
          return this.get('elasticsearch').post('study', '_search', queryBody)
            .then(results =>
              this.sortStudyResultsAccordingToIdsList(results, studyIds)
            );
        } else {
          return null;
        }
      });
  },

  /**
   * Fetches ids of studies, that are related to data objects specified by
   * `published paper` query params.
   * @param {Utils.StudySearchParams} searchParams
   * @returns {Promise<Array<number>>}
   */
  fetchStudyIdsForPerPaperSearch(searchParams) {
    const filters = [];
    const dataObjectBody = {
      size: 10000,
      _source: ['related_studies'],
      query: {
        bool: {
          must: filters,
        },
      },
    };
    const {
      paperSearchField,
      doi,
      dataObjectTitle,
    } = getProperties(searchParams, 'paperSearchField', 'doi', 'dataObjectTitle');
    if (paperSearchField === 'doi' && doi) {
      filters.push({
        term: {
          doi: doi,
        },
      });
    } else if (paperSearchField === 'title' && dataObjectTitle) {
      filters.push({
        bool: {
          filter: [{
            term: {
              // Journal article
              'object_type.id': 12,
            },
          }],
          should: [{
            simple_query_string: {
              query: dataObjectTitle,
              fields: ['display_title'],
              default_operator: 'and',
            },
          }, {
            nested: {
              path: 'object_titles',
              query: {
                simple_query_string: {
                  query: dataObjectTitle,
                  fields: ['object_titles.title_text'],
                  default_operator: 'and',
                },
              },
            },
          }],
          minimum_should_match: 1,
        },
      });
    } else {
      return resolve([]);
    }
    return this.get('elasticsearch').post('data_object', '_search', dataObjectBody)
      .then(results => {
        const hits = (results && results.hits && results.hits.hits) || [];
        return _.uniq(_.flatten(
          hits.map(dataObject =>
            (get(dataObject, '_source.related_studies') || [])
          )
        ));
      });
  },

  fetchViaInternalId(searchParams) {
    const internalStudyIds = get(searchParams, 'internalStudyIds');
    const queryBody = Object.assign(this.constructStudyQueryBodyBase(), {
      size: internalStudyIds.length,
      query: {
        bool: {
          filter: [{
            terms: {
              id: internalStudyIds,
            },
          }],
          must_not: this.generateExcludeFetchedStudiesClause(),
        },
      },
    });

    return this.get('elasticsearch').post('study', '_search', queryBody)
      .then(results =>
        this.sortStudyResultsAccordingToIdsList(results, internalStudyIds)
      );
  },

  sortStudyResultsAccordingToIdsList(results, idsList) {
    const rawStudies = results && results.hits && results.hits.hits;
    if (rawStudies && rawStudies.length) {
      const idToRawStudyMap = new Map(rawStudies.map(rawStudy => [
        rawStudy._source && rawStudy._source.id,
        rawStudy,
      ]));
      const sortedRawStudies = idsList
        .map(id => idToRawStudyMap.get(id))
        .compact();
      results.hits.hits = sortedRawStudies;
    }
    return results;
  },

  /**
   * @param {Object} results 
   * @param {boolean} [rememberFittingStudiesCount=true]
   * @param {Utils.Study} [stackAfterStudy=null]
   * @returns {Promise<Array<Utils.Study>>}
   */
  loadStudiesFromResponse(
    results,
    rememberFittingStudiesCount = true,
    stackAfterStudy = null
  ) {
    if (results) {
      const {
        dataStore,
        studyInstanceCreatorData,
      } = this.getProperties('dataStore', 'studyInstanceCreatorData');

      const total = get(results, 'hits.total.value');
      if (rememberFittingStudiesCount && typeof total === 'number') {
        this.set('latestSearchFittingStudiesCount', total);
      }

      const alreadyFetchedStudies = get(dataStore, 'studies');
      const alreadyFetchedStudiesIds = alreadyFetchedStudies.mapBy('id');
      const newStudies = (get(results, 'hits.hits') || [])
        .mapBy('_source')
        .filter(doc => {
          const studyId = get(doc, 'id');
          return !isBlank(studyId) && !alreadyFetchedStudiesIds.includes(studyId);
        })
        .map(doc => this.createStudyInstance(doc, studyInstanceCreatorData));

      let stackAfterIndex = alreadyFetchedStudies.indexOf(stackAfterStudy);
      if (stackAfterIndex === -1) {
        stackAfterIndex = get(alreadyFetchedStudies, 'length') - 1;
      }
      set(dataStore, 'studies', [
        ...alreadyFetchedStudies.slice(0, stackAfterIndex + 1),
        ...newStudies,
        ...alreadyFetchedStudies.slice(stackAfterIndex + 1),
      ]);

      return newStudies;
    } else {
      return [];
    }
  },

  loadDataObjectsForStudies(studies) {
    const {
      elasticsearch,
      dataStore,
      dataObjectInstanceCreatorData,
    } = this.getProperties(
      'elasticsearch',
      'dataStore',
      'dataObjectInstanceCreatorData'
    );
    const idsOfFetchedDataObjects = get(dataStore, 'dataObjects').mapBy('id');
    const idsOfDataObjectsToFetch = _.difference(
      _.uniq(_.flatten(
        studies.mapBy('dataObjectsIds')
      )),
      idsOfFetchedDataObjects
    );

    let fetchDataObjectsPromise;
    if (idsOfDataObjectsToFetch.length) {
      const queryBody = this.constructDataObjectQueryBodyBase();
      queryBody.size = idsOfDataObjectsToFetch.length;
      queryBody.query = {
        bool: {
          filter: [{
            terms: {
              id: idsOfDataObjectsToFetch,
            },
          }],
        },
      };
      fetchDataObjectsPromise = elasticsearch.post('data_object', '_search', queryBody)
        .then(results => {
          const alreadyFetchedDataObjects = get(dataStore, 'dataObjects');
          const alreadyFetchedDataObjectsIds = alreadyFetchedDataObjects.mapBy('id');
          const newDataObjects = results.hits.hits.map(doHit => {
            const dataObjectAlreadyExists =
              alreadyFetchedDataObjectsIds.includes(get(doHit, '_source.id'));
            if (!dataObjectAlreadyExists) {
              return this.createDataObjectInstance(
                doHit._source,
                dataObjectInstanceCreatorData
              );
            }
          }).compact();
          return alreadyFetchedDataObjects.concat(newDataObjects);
        });
    } else {
      fetchDataObjectsPromise = resolve(get(dataStore, 'dataObjects'));
    }
    return fetchDataObjectsPromise.then(dataObjects => {
      const dataObjectsMap = new Map(dataObjects.map(dataObject => (
        [get(dataObject, 'id'), dataObject]
      )));
      studies.forEach(study => {
        const studyDataObjects = get(study, 'dataObjectsIds')
          .map(id => dataObjectsMap.get(id))
          .compact();
        set(study, 'dataObjects', studyDataObjects);
      });
      dataStore.recalculateDataObjects();
      return dataObjects;
    });
  },

  loadRelatedStudiesForStudies(studies) {
    const relatedStudiesIds =
      _.flatten(studies.mapBy('relatedStudies')).mapBy('targetId').uniq().compact();

    if (!relatedStudiesIds.length) {
      return resolve();
    }

    const {
      elasticsearch,
      relatedStudyInstanceCreatorData,
    } = this.getProperties('elasticsearch', 'relatedStudyInstanceCreatorData');

    const queryBody = this.constructRelatedStudyQueryBodyBase();
    queryBody.size = relatedStudiesIds.length;
    queryBody.query = {
      bool: {
        filter: [{
          terms: {
            id: relatedStudiesIds,
          },
        }],
      },
    };

    return elasticsearch.post('study', '_search', queryBody)
      .then(results => {
        const relatedStudies = (get(results || {}, 'hits.hits') || [])
          .mapBy('_source')
          .map(result =>
            this.createRelatedStudyInstance(result, relatedStudyInstanceCreatorData)
          );

        const relatedStudiesMap = new Map(relatedStudies.map(relatedStudy => (
          [get(relatedStudy, 'id'), relatedStudy]
        )));
        for (const study of studies) {
          for (const relatedStudyEntry of study.relatedStudies) {
            relatedStudyEntry.target = relatedStudiesMap.get(relatedStudyEntry.targetId);
          }
          // remove related study entries without existing study
          study.relatedStudies = study.relatedStudies.filterBy('target');
        }
      });
  },

  /**
   * Generates body base object for Elastisearch study query
   * @returns {Object}
   */
  constructStudyQueryBodyBase() {
    return {
      _source: [
        'id',
        'study_type',
        'brief_description',
        'data_sharing_statement',
        'display_title.title_text',
        'study_status.id',
        'study_gender_elig.id',
        'study_features.feature_value.id',
        'study_features.feature_type.id',
        'study_topics.topic_value',
        'study_topics.topic_source_type.name',
        'study_topics.topic_ct.name',
        'study_topics.topic_ct_code',
        'linked_data_objects',
        'related_studies.relationship_type.id',
        'related_studies.target_id',
        'provenance_data',
        'min_age',
        'min_age_units',
        'max_age',
        'max_age_units',
      ],
    };
  },

  /**
   * Generates body base object for Elastisearch data object query
   * @returns {Object}
   */
  constructDataObjectQueryBodyBase() {
    return {
      _source: [
        'id',
        'display_title',
        'managing_organisation',
        'object_type',
        'publication_year',
        'access_type',
        'access_details',
        'access_details_url',
        'object_instances',
        'related_studies',
        'provenance_data',
      ],
    };
  },

  /**
   * Generates body base object for Elastisearch study query (narrowed data for related
   * studies only).
   * @returns {Object}
   */
  constructRelatedStudyQueryBodyBase() {
    return {
      _source: [
        'id',
        'display_title.title_text',
        'study_identifiers.identifier_type.id',
        'study_identifiers.identifier_value',
      ],
    };
  },

  getStudiesLimit() {
    return Math.max(0, Math.min(
      1000,
      this.get('dataStore.studiesLimit') - this.get('dataStore.studies.length')
    ));
  },

  generateExcludeFetchedStudiesClause() {
    return {
      terms: {
        id: this.get('dataStore.studies').mapBy('id'),
      },
    };
  },

  createStudyInstance(rawData, creatorData) {
    const studyComputedData = {
      id: rawData.id,
      provenance: rawData.provenance_data,
      title: get(rawData, 'display_title.title_text'),
      description: rawData.brief_description,
      dataSharingStatement: rawData.data_sharing_statement,
      minAge: rawData.min_age,
      minAgeUnits: get(rawData, 'min_age_units.name'),
      maxAge: rawData.max_age,
      maxAgeUnits: get(rawData, 'max_age_units.name'),
      dataObjectsIds: rawData.linked_data_objects || [],
      dataObjects: [],
      expandedDataObjects: [],
    };

    studyComputedData.topics = (rawData.study_topics || [])
      .filterBy('topic_value')
      .map(topic => ({
        value: topic.topic_value,
        sourceType: get(topic, 'topic_source_type.name'),
        controlledTerminology: get(topic, 'topic_ct.name'),
        controlledTerminologyCode: topic.topic_ct_code,
      }));

    studyComputedData.relatedStudies = (rawData.related_studies || [])
      .map(({ target_id, relationship_type }) => ({
        targetId: target_id,
        relationshipType: this.categorizeValue(
          relationship_type,
          creatorData.relationshipType.valuesMap,
          creatorData.relationshipType.unknownValue
        ),
      }));

    studyCategorizedFields.forEach(({ fieldName, rawFieldName }) =>
      studyComputedData[fieldName] = this.categorizeValue(
        rawData[rawFieldName],
        creatorData[fieldName].valuesMap,
        creatorData[fieldName].unknownValue
      )
    );
    studyComputedData.isInterventional =
      Boolean(studyComputedData.type.isInterventional);
    studyComputedData.isObservational =
      Boolean(studyComputedData.type.isObservational);

    studyFeatureTypeNames.forEach(featureName =>
      studyComputedData[featureName] = this.categorizeStudyFeature(
        rawData.study_features || [],
        creatorData.featureNameToFeatureId.get(featureName),
        creatorData[featureName].valuesMap,
        creatorData[featureName].unknownValue
      )
    );

    return Study.create(studyComputedData);
  },

  createDataObjectInstance(rawData, creatorData) {
    const dataObjectComputedData = {
      id: rawData.id,
      provenance: rawData.provenance_data,
      title: rawData.display_title,
      type: rawData.object_type,
      year: rawData.publication_year,
      accessDetails: rawData.access_details,
      accessDetailsUrl: rawData.access_details_url,
      hasCorrectAccessDetailsUrl: isUrl(rawData.access_details_url),
      managingOrganisation: rawData.managing_organisation,
    };
    dataObjectCategorizedFields.forEach(({ fieldName, rawFieldName }) =>
      dataObjectComputedData[fieldName] = this.categorizeValue(
        rawData[rawFieldName],
        creatorData[fieldName].valuesMap,
        creatorData[fieldName].unknownValue
      )
    );
    dataObjectComputedData.filterType = this.categorizeValue(
      rawData.object_type,
      creatorData.filterType.valuesMap,
      creatorData.filterType.unknownValue
    );
    dataObjectComputedData.isJournalArticle =
      Boolean(dataObjectComputedData.filterType.isJournalArticle);
    dataObjectComputedData.urls = this.generateUrlsForDataObject(
      rawData.object_instances || [],
      dataObjectComputedData.isJournalArticle
    );

    return dataObjectComputedData;
  },

  createRelatedStudyInstance(rawData, creatorData) {
    const relatedStudyComputedData = {
      id: rawData.id,
      title: get(rawData, 'display_title.title_text'),
    };

    relatedStudyComputedData.identifiers = (rawData.study_identifiers || [])
      .filter(identifier =>
        identifier &&
        !isBlank(get(identifier, 'identifier_value')) &&
        // only #11 (trial registry ID) and #42 (NHLBI ID) identifier types are needed for GUI
        [11, 42].indexOf(get(identifier, 'identifier_type.id')) > -1
      )
      .map(({ identifier_value, identifier_type }) => ({
        identifierValue: identifier_value,
        identifierType: this.categorizeValue(
          identifier_type,
          creatorData.identifierType.valuesMap,
          creatorData.identifierType.unknownValue
        ),
      }))
      .filterBy('identifierType');

    return relatedStudyComputedData;
  },

  categorizeValue(value, valuesMap, unknownValue) {
    if (value && value.id !== undefined) {
      return valuesMap.get(value.id) || unknownValue;
    } else {
      return unknownValue;
    }
  },

  categorizeStudyFeature(rawFeatures, featureId, featuresMap, unknownValue) {
    if (typeof featureId === 'number') {
      const rawFeature = rawFeatures.find(rawFeature =>
        (rawFeature.feature_value && rawFeature.feature_type.id) === featureId
      );
      return rawFeature && featuresMap.get(rawFeature.feature_value.id) ||
        unknownValue;
    }
  },

  generateUrlsForDataObject(objectInstances, isJournalArticle) {
    objectInstances = objectInstances.uniqBy('url').filterBy('url');
    const urlsCollection = [];

    if (isJournalArticle) {
      [{
        type: 'journalAbstract',
        id: 40,
      }, {
        type: 'journalArticle',
        id: 36,
      }].forEach(({ type, id }) => {
        let instance;
        do {
          instance = objectInstances.findBy('resource_type.id', id);
          if (instance) {
            urlsCollection.push({
              type,
              url: instance.url,
              isUrlCorrect: isUrl(instance.url),
            });
            objectInstances = objectInstances.without(instance);
          }
        } while (instance);
      });
    }
    objectInstances.forEach(instance =>
      urlsCollection.push({
        type: 'unknown',
        url: instance.url,
        isUrlCorrect: isUrl(instance.url),
      })
    );

    return urlsCollection;
  },
});
