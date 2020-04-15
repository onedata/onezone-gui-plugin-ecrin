/**
 * Is responsible for fetching studies and data objects using Elasticsearch. Automatically
 * places query results into the data store.
 *
 * @module utils/data-fetcher
 * @author Michał Borzęcki
 * @copyright (C) 2020 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import EmberObject, { get, getProperties, set } from '@ember/object';
import PromiseObject from 'onezone-gui-plugin-ecrin/utils/promise-object';
import { resolve } from 'rsvp';
import { isBlank } from '@ember/utils';
import Study from 'onezone-gui-plugin-ecrin/utils/study';
import DataObject from 'onezone-gui-plugin-ecrin/utils/data-object';
import _ from 'lodash';

export default EmberObject.extend({
  /**
   * @virtual
   * @type {Service.Configuration}
   */
  configuration: undefined,

  /**
   * @virtual
   * @type {Service.Elasticsearch}
   */
  elasticsearch: undefined,

  /**
   * @virtual
   * @type {Utils.DataStore}
   */
  dataStore: undefined,

  /**
   * @type {PromiseObject}
   */
  fetchDataPromiseObject: undefined,

  init() {
    this._super(...arguments);

    this.set('fetchDataPromiseObject', PromiseObject.create({ promise: resolve() }));
  },

  /**
   * Starts study query
   * @param {Utils.StudySearchParams} searchParams
   * @returns {Promise}
   */
  searchStudies(searchParams) {
    const {
      hasMeaningfulParams,
      mode,
    } = getProperties(searchParams, 'hasMeaningfulParams', 'mode');
    if (hasMeaningfulParams) {
      const fetchDataPromiseObject = this.get('fetchDataPromiseObject');
      let promise = get(fetchDataPromiseObject, 'isSettled') ?
        resolve() : fetchDataPromiseObject;

      switch (mode) {
        case 'specificStudy':
          promise = promise.then(() => this.fetchSpecificStudy(searchParams));
          break;
        case 'studyCharact':
          promise = promise.then(() => this.fetchStudyCharact(searchParams));
          break;
        case 'viaPubPaper':
          promise = promise.then(() => this.fetchViaPubPaper(searchParams));
          break;
        case 'viaInternalId':
          promise = promise.then(() => this.fetchViaInternalId(searchParams));
      }

      promise = promise
        .then(results => this.loadStudiesFromResponse(results))
        .then(newStudies => this.loadDataObjectsForStudies(newStudies));
      return this.set('fetchDataPromiseObject', PromiseObject.create({ promise }));
    }
  },

  /**
   * Loads studies according to study identifier
   * @param {Utils.StudySearchParams} searchParams
   * @returns {Promise}
   */
  fetchSpecificStudy(searchParams) {
    const queryBody = this.constructQueryBodyBase('study');
    const {
      studyIdType,
      studyId,
    } = getProperties(
      searchParams,
      'studyIdType',
      'studyId'
    );

    queryBody.size = 1000;
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
    const queryBody = this.constructQueryBodyBase('study');
    queryBody.size = 1000;
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
              fields: ['display_title.title'],
            },
          }, {
            nested: {
              path: 'study_titles',
              query: {
                simple_query_string: {
                  query: studyTitleContains,
                  fields: ['study_titles.title_text'],
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
          path: 'study_features',
          query: {
            simple_query_string: {
              query: studyTopicsInclude,
              fields: ['study_features.feature_value'],
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
          const queryBody = this.constructQueryBodyBase('study');
          queryBody.size = 1000;
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
          return this.get('elasticsearch').post('study', '_search', queryBody);
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
      doi,
      dataObjectTitle,
    } = getProperties(searchParams, 'doi', 'dataObjectTitle');
    if (doi) {
      filters.push({
        term: {
          doi: doi,
        },
      });
    } else if (dataObjectTitle) {
      filters.push({
        bool: {
          should: [{
            simple_query_string: {
              query: dataObjectTitle,
              fields: ['display_title'],
            },
          }, {
            nested: {
              path: 'object_titles',
              query: {
                simple_query_string: {
                  query: dataObjectTitle,
                  fields: ['object_titles.title_text'],
                },
              },
            },
          }],
        },
      });
    } else {
      return resolve([]);
    }
    return this.get('elasticsearch').post('data_object', '_search', dataObjectBody)
      .then(results => {
        results = results.hits.hits;
        return _.uniq(_.flatten(
          results.map(dataObject =>
            (get(dataObject, '_source.related_studies') || [])
          )
        ));
      });
  },

  fetchViaInternalId(searchParams) {
    const savedStudyIds = get(searchParams, 'internalStudyIds');
    const queryBody = Object.assign(this.constructQueryBodyBase('study'), {
      size: savedStudyIds.length,
      query: {
        bool: {
          filter: [{
            terms: {
              id: savedStudyIds,
            },
          }],
        },
      },
    });

    return this.get('elasticsearch').post('study', '_search', queryBody);
  },

  /**
   * @param {Object} results 
   * @returns {Promise<Array<Utils.Study>>}
   */
  loadStudiesFromResponse(results) {
    if (results) {
      const {
        dataStore,
        configuration,
      } = this.getProperties('dataStore', 'configuration');
      const alreadyFetchedStudies = get(dataStore, 'studies');
      const alreadyFetchedStudiesIds = alreadyFetchedStudies.mapBy('id');
      const newStudies = (get(results, 'hits.hits') || [])
        .mapBy('_source')
        .filter(doc => {
          const studyId = get(doc, 'id');
          return !isBlank(studyId) && !alreadyFetchedStudiesIds.includes(studyId);
        })
        .map(doc => Study.create({
          configuration,
          raw: doc,
        }));
      set(dataStore, 'studies', alreadyFetchedStudies.concat(newStudies));
      return newStudies;
    } else {
      return [];
    }
  },

  loadDataObjectsForStudies(studies) {
    const {
      elasticsearch,
      dataStore,
      configuration,
    } = this.getProperties('elasticsearch', 'dataStore', 'configuration');
    const studiesWithoutFetchedDataObjects =
      studies.rejectBy('dataObjectsPromiseObject');
    const idsOfFetchedDataObjects = get(dataStore, 'dataObjects').mapBy('id');
    const idsOfDataObjectsToFetch = _.difference(
      _.uniq(_.flatten(
        studiesWithoutFetchedDataObjects.mapBy('dataObjectsIds')
      )),
      idsOfFetchedDataObjects
    );

    let fetchDataObjectsPromise;
    if (idsOfDataObjectsToFetch.length) {
      const queryBody = this.constructQueryBodyBase('data_object');
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
          const newDataObjects = results.hits.hits.map(doHit => {
            const existingDataObjectInstance =
              alreadyFetchedDataObjects.findBy('id', get(doHit, '_source.id'));
            if (!existingDataObjectInstance) {
              return DataObject.create({
                configuration,
                raw: get(doHit, '_source'),
              });
            }
          }).compact();
          return alreadyFetchedDataObjects.concat(newDataObjects);
        });
    } else {
      fetchDataObjectsPromise = resolve(get(dataStore, 'dataObjects'));
    }

    studiesWithoutFetchedDataObjects.forEach(study => {
      set(study, 'dataObjectsPromiseObject', PromiseObject.create({
        promise: fetchDataObjectsPromise.then(dataObjects =>
          get(study, 'dataObjectsIds')
          .map(id => dataObjects.findBy('id', id))
          .compact()
        ),
      }));
    });

    return fetchDataObjectsPromise;
  },

  /**
   * Generates body base object for Elastisearch query
   * @param {string} type `study` or `data_object`
   * @returns {Object}
   */
  constructQueryBodyBase(type) {
    let _source;
    if (type === 'study') {
      _source = [
        'id',
        'study_type',
        'brief_description',
        'data_sharing_statement',
        'display_title.title_text',
        'study_status.id',
        'study_gender_elig.id',
        'study_features.feature_value.id',
        'study_features.feature_type.id',
        'linked_data_objects',
      ];
    } else if (type === 'data_object') {
      _source = [
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
      ];
    }

    return {
      _source,
    };
  },

  generateExcludeFetchedStudiesClause() {
    return {
      terms: {
        id: this.get('dataStore.studies').mapBy('id'),
      },
    };
  },
});
