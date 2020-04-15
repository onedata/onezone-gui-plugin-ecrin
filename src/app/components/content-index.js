/**
 * A component, which shows whole layout of query parameters and results
 * 
 * @module components/content-index
 * @author Michał Borzęcki
 * @copyright (C) 2019 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import Component from '@ember/component';
import {
  computed,
  get,
  getProperties,
  set,
  setProperties,
} from '@ember/object';
import { reads } from '@ember/object/computed';
import I18n from 'onezone-gui-plugin-ecrin/mixins/i18n';
import { resolve } from 'rsvp';
import { inject as service } from '@ember/service';
import _ from 'lodash';
import StudySearchParams from 'onezone-gui-plugin-ecrin/utils/study-search-params';
import Study from 'onezone-gui-plugin-ecrin/utils/study';
import DataObject from 'onezone-gui-plugin-ecrin/utils/data-object';
import PromiseObject from 'onezone-gui-plugin-ecrin/utils/promise-object';
import { isBlank } from '@ember/utils';
import {
  studyFiltersToSave,
  studyFiltersFromSaved,
  dataObjectFiltersToSave,
  dataObjectFiltersFromSaved,
} from 'onezone-gui-plugin-ecrin/utils/data-filters-converters';
import safeExec from 'onezone-gui-plugin-ecrin/utils/safe-method-execution';
import DataStore from 'onezone-gui-plugin-ecrin/utils/data-store';

export default Component.extend(I18n, {
  classNames: ['content-index', 'content'],

  elasticsearch: service(),
  configuration: service(),
  indexeddbStorage: service(),
  pdfGenerator: service(),

  /**
   * @override
   */
  i18nPrefix: 'components.contentIndex',

  /**
   * @type {StudySearchParams}
   */
  studySearchParams: computed(() => StudySearchParams.create()),

  /**
   * @type {Utils.DataStore}
   */
  dataStore: undefined,

  /**
   * @type {ComputedProperty<PromiseObject>}
   */
  fetchDataPromiseObject: computed(() =>
    PromiseObject.create({ promise: resolve() })
  ),

  /**
   * @type {ComputedProperty<boolean>}
   */
  isFetchingData: reads('fetchDataPromiseObject.isPending'),

  init() {
    this._super(...arguments);

    this.set('dataStore', DataStore.create({
      configuration: this.get('configuration'),
    }));
  },

  searchStudies() {
    if (this.get('studySearchParams.hasMeaningfulParams')) {
      const fetchDataPromiseObject = this.get('fetchDataPromiseObject');
      let promise = get(fetchDataPromiseObject, 'isSettled') ?
        resolve() : fetchDataPromiseObject;

      switch (this.get('studySearchParams.mode')) {
        case 'specificStudy':
          promise = promise.then(() => this.fetchSpecificStudy());
          break;
        case 'studyCharact':
          promise = promise.then(() => this.fetchStudyCharact());
          break;
        case 'viaPubPaper':
          promise = promise.then(() => this.fetchViaPubPaper());
          break;
      }

      promise = promise
        .then(results => this.extractResultsFromResponse(results))
        .then(newStudies => this.loadDataObjectsForStudies(newStudies));
      this.set('fetchDataPromiseObject', PromiseObject.create({ promise }));
    }
  },

  /**
   * @param {Object} results 
   * @returns {Promise}
   */
  extractResultsFromResponse(results) {
    if (results) {
      results = get(results, 'hits.hits') || [];
      const {
        dataStore,
        configuration,
      } = this.getProperties('dataStore', 'configuration');
      const alreadyFetchedStudies = get(dataStore, 'studies');
      const alreadyFetchedStudiesIds = alreadyFetchedStudies.mapBy('id');
      const newStudies = results
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

  /**
   * Loads studies according to study identifier
   * @returns {Promise}
   */
  fetchSpecificStudy() {
    const {
      elasticsearch,
      studySearchParams,
    } = this.getProperties(
      'elasticsearch',
      'studySearchParams',
    );
    const body = this.constructQueryBodyBase('study');
    const {
      studyIdType,
      studyId,
    } = getProperties(
      studySearchParams,
      'studyIdType',
      'studyId'
    );
    const studyIdTypeId = get(studyIdType, 'id');

    body.size = 1000;
    body.query = {
      bool: {
        filter: [{
          nested: {
            path: 'study_identifiers',
            query: {
              bool: {
                must: [{
                  term: {
                    'study_identifiers.identifier_type.id': studyIdTypeId,
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

    return elasticsearch.post('study', '_search', body);
  },

  /**
   * Loads studies according to study parameters
   * @returns {Promise}
   */
  fetchStudyCharact() {
    const {
      elasticsearch,
      studySearchParams,
    } = this.getProperties(
      'elasticsearch',
      'studySearchParams',
    );
    const body = this.constructQueryBodyBase('study');
    body.size = 1000;
    body.query = {
      bool: {
        must_not: this.generateExcludeFetchedStudiesClause(),
      },
    };
    const {
      studyTitleContains,
      studyTopicsInclude,
      studyTitleTopicOperator,
    } = getProperties(
      studySearchParams,
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
      Object.assign(body.query.bool, {
        should: filtersArray,
      });
    } else {
      Object.assign(body.query.bool, {
        must: filtersArray,
      });
    }
    return elasticsearch.post('study', '_search', body);
  },

  /**
   * Fetches ids of studies, that are related to data objects specified by
   * `published paper` query params.
   * @returns {Promise<Array<number>>}
   */
  fetchStudyIdsForPerPaperSearch() {
    const {
      elasticsearch,
      studySearchParams,
    } = this.getProperties(
      'elasticsearch',
      'studySearchParams'
    );

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
    } = getProperties(studySearchParams, 'doi', 'dataObjectTitle');
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
    return elasticsearch.post('data_object', '_search', dataObjectBody)
      .then(results => {
        results = results.hits.hits;
        return _.uniq(_.flatten(
          results.map(dataObject =>
            (get(dataObject, '_source.related_studies') || [])
          )
        ));
      });
  },

  /**
   * Loads studies according to related paper
   * @returns {Promise}
   */
  fetchViaPubPaper() {
    const elasticsearch = this.get('elasticsearch');

    return this.fetchStudyIdsForPerPaperSearch()
      .then(studyIds => {
        const studyIdsNumber = get(studyIds, 'length');
        if (studyIdsNumber) {
          const studyBody =
            this.constructQueryBodyBase('study');
          studyBody.size = 1000;
          studyBody.query = {
            bool: {
              filter: [{
                terms: {
                  id: studyIds,
                },
              }],
              must_not: this.generateExcludeFetchedStudiesClause(),
            },
          };
          // fetch studies
          return elasticsearch.post('study', '_search', studyBody);
        } else {
          return null;
        }
      });
  },

  generateExcludeFetchedStudiesClause() {
    return {
      terms: {
        id: this.get('dataStore.studies').mapBy('id'),
      },
    };
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
      const body = this.constructQueryBodyBase('data_object');
      body.size = idsOfDataObjectsToFetch.length;
      body.query = {
        bool: {
          filter: [{
            terms: {
              id: idsOfDataObjectsToFetch,
            },
          }],
        },
      };
      fetchDataObjectsPromise = elasticsearch.post('data_object', '_search', body)
        .then(results => {
          const alreadyFetchedDataObjects = get(dataStore, 'dataObjects');
          const hits = results.hits.hits;
          const newDataObjects = hits.map(doHit => {
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

  loadStudiesFromSavedResults(results) {
    const savedStudyIds = get(results, 'studies');
    const elasticsearch = this.get('elasticsearch');
    const body = Object.assign(this.constructQueryBodyBase('study'), {
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

    return elasticsearch.post('study', '_search', body)
      .then(results => {
        const studies = this.extractResultsFromResponse(results);
        return this.loadDataObjectsForStudies(studies).then(() => studies);
      });
  },

  actions: {
    parameterChanged(fieldName, newValue) {
      this.set(`studySearchParams.${fieldName}`, newValue);
    },
    find() {
      this.searchStudies();
    },
    removeStudy(study) {
      this.get('dataStore').removeStudies([study]);
    },
    removeAllStudies() {
      const dataStore = this.get('dataStore');
      dataStore.removeStudies(get(dataStore, 'studies'));
    },
    resetStudyFilters() {
      this.get('dataStore').resetStudyFilters();
    },
    resetDataObjectFilters() {
      this.get('dataStore').resetDataObjectFilters();
    },
    saveResults(name) {
      const {
        indexeddbStorage,
        dataStore,
        studySearchParams,
      } = this.getProperties(
        'indexeddbStorage',
        'dataStore',
        'studySearchParams'
      );
      const {
        studies,
        studyFilters,
        dataObjectFilters,
      } = getProperties(dataStore, 'studies', 'studyFilters', 'dataObjectFilters');
      const resultsToSave = {
        name,
        timestamp: Math.floor(Date.now() / 1000),
        studies: studies.mapBy('id'),
        studyFilters: studyFiltersToSave(studyFilters),
        dataObjectFilters: dataObjectFiltersToSave(dataObjectFilters),
        studySearchParams: studySearchParams.dumpValues(),
      };

      return indexeddbStorage.saveResults(resultsToSave);
    },
    loadSavedResultsList() {
      return this.get('indexeddbStorage').loadResultsList();
    },
    loadSavedResults(results) {
      const {
        configuration,
        studySearchParams,
        dataStore,
      } = this.getProperties('configuration', 'studySearchParams', 'dataStore');
      if (results.studySearchParams) {
        studySearchParams.loadDumpedValues(
          results.studySearchParams,
          get(configuration, 'studyIdTypeMapping')
        );
      }

      dataStore.removeStudies(get(dataStore, 'studies'));
      dataStore.resetStudyFilters();
      dataStore.resetDataObjectFilters();
      return this.loadStudiesFromSavedResults(results)
        .then(() => safeExec(this, () => {
          const {
            studyFilters: savedStudyFilters,
            dataObjectFilters: savedDataObjectFilters,
          } = results;
          const dataObjectPublisherMapping =
            get(dataStore, 'dataObjectPublisherMapping');
          const dataObjectFilters = dataObjectFiltersFromSaved(
            savedDataObjectFilters,
            configuration,
            dataObjectPublisherMapping
          );

          setProperties(dataStore, {
            studyFilters: studyFiltersFromSaved(
              savedStudyFilters,
              configuration
            ),
            dataObjectFilters,
          });
        }));
    },
    removeSavedResults(results) {
      return this.get('indexeddbStorage').removeResults(results);
    },
    exportResultsToPdf() {
      const {
        pdfGenerator,
        dataStore,
      } = this.getProperties('pdfGenerator', 'dataStore');

      return pdfGenerator.generatePdfFromResults(dataStore);
    },
  },
});
