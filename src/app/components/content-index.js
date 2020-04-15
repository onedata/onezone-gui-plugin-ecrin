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
  observer,
  get,
  getProperties,
  set,
} from '@ember/object';
import { reads } from '@ember/object/computed';
import I18n from 'onezone-gui-plugin-ecrin/mixins/i18n';
import { resolve } from 'rsvp';
import { inject as service } from '@ember/service';
import _ from 'lodash';
import StudySearchParams from 'onezone-gui-plugin-ecrin/utils/study-search-params';
import Study from 'onezone-gui-plugin-ecrin/utils/study';
import DataObject from 'onezone-gui-plugin-ecrin/utils/data-object';
import { A } from '@ember/array';
import PromiseObject from 'onezone-gui-plugin-ecrin/utils/promise-object';
import { isBlank } from '@ember/utils';
import { array, raw } from 'ember-awesome-macros';
import {
  studyFiltersToSave,
  studyFiltersFromSaved,
  dataObjectFiltersToSave,
  dataObjectFiltersFromSaved,
} from 'onezone-gui-plugin-ecrin/utils/data-filters-converters';
import stringToRanges from 'onezone-gui-plugin-ecrin/utils/string-to-ranges';
import safeExec from 'onezone-gui-plugin-ecrin/utils/safe-method-execution';

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
   * Query results - studies
   * @type {Array<Utils.Study>}
   */
  studies: computed(() => A()),

  /**
   * @type {Object}
   */
  studyFilters: Object.freeze({}),

  /**
   * @type {Object}
   */
  dataObjectFilters: Object.freeze({}),

  /**
   * All data objects loaded for studies in results
   * @type {Array<Utils.DataObject>}
   */
  dataObjects: computed(() => A()),

  /**
   * @type {Array<Object>}
   * Previous value of dataObjectPublisherMapping
   */
  prevDataObjectPublisherMapping: undefined,

  /**
   * Studies with at least one data object selected
   * @type {ComputedProperty<Array<Utils.Study>>}
   */
  studiesWithDataObjectsSelected: array.filterBy(
    'studies',
    raw('hasSelectedDataObjects')
  ),

  /**
   * Finally filtered studies
   * @type {ComputedProperty<Array<Utils.Study>>}
   */
  filteredStudies: computed(
    'studiesWithDataObjectsSelected',
    'studyFilters',
    function filteredStudies() {
      const {
        studiesWithDataObjectsSelected,
        studyFilters,
      } = this.getProperties('studiesWithDataObjectsSelected', 'studyFilters');

      let filteredStudies = studiesWithDataObjectsSelected.slice();
      [
        'type',
        'status',
        'genderEligibility',
        'phase',
        'interventionModel',
        'allocationType',
        'primaryPurpose',
        'masking',
        'observationalModel',
        'timePerspective',
        'biospecimensRetained',
      ].forEach(fieldName => {
        filteredStudies = checkMatchOfCategorizedValue(
          filteredStudies,
          fieldName,
          get(studyFilters, fieldName)
        );
      });

      return filteredStudies;
    }
  ),

  /**
   * Used as a special publisher for data objects without specified publisher
   * @type {Object}
   */
  dataObjectPublisherUnknownValue: Object.freeze({
    id: -1,
    name: 'Not provided',
    useForUnknown: true,
  }),

  /**
   * @type {ComputedProperty<Array<Object>>}
   */
  dataObjectPublisherMapping: computed(
    'dataObjects.@each.managingOrganisation',
    'dataObjectPublisherUnknownValue',
    function dataObjectPublisherMapping() {
      const {
        dataObjects,
        dataObjectPublisherUnknownValue,
      } = this.getProperties(
        'dataObjects',
        'dataObjectPublisherUnknownValue'
      );
      return dataObjects
        .mapBy('managingOrganisation')
        .compact()
        .uniqBy('id')
        .map(publisher => {
          const publisherCopy = Object.assign({}, publisher);
          const name = get(publisher, 'name');
          // Sometimes publisher name is an array of strings
          if (name && typeof name === 'object' && name[0]) {
            publisherCopy.name = name[0];
          } else if (typeof name !== 'string') {
            publisherCopy.name = null;
          }
          return publisherCopy;
        })
        .rejectBy('name', null)
        .concat([dataObjectPublisherUnknownValue]);
    }
  ),

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

  dataObjectPublisherMappingObserver: observer(
    'dataObjectPublisherMapping.[]',
    function dataObjectPublisherMappingObserver() {
      const {
        prevDataObjectPublisherMapping,
        dataObjectPublisherMapping,
        dataObjectFilters,
      } = this.getProperties(
        'prevDataObjectPublisherMapping',
        'dataObjectPublisherMapping',
        'dataObjectFilters'
      );

      const oldPublishersIds = prevDataObjectPublisherMapping.mapBy('id');
      const newPublishersIds = dataObjectPublisherMapping.mapBy('id');
      const addedPublishers = _.difference(newPublishersIds, oldPublishersIds)
        .map(id => dataObjectPublisherMapping.findBy('id', id));
      const filterInNewMapping = dataObjectFilters.publisher
        .map(publisher =>
          dataObjectPublisherMapping.findBy('id', get(publisher, 'id'))
        )
        .compact()
        .addObjects(addedPublishers);

      this.set('prevDataObjectPublisherMapping', dataObjectPublisherMapping.slice());
      this.set(
        'dataObjectFilters',
        Object.assign({}, dataObjectFilters, { publisher: filterInNewMapping })
      );
    }
  ),

  init() {
    this._super(...arguments);

    const dataObjectPublisherMapping =
      (this.get('dataObjectPublisherMapping') || []).slice();

    this.set('prevDataObjectPublisherMapping', dataObjectPublisherMapping);
    this.resetStudyFilters();
    this.resetDataObjectFilters();
  },

  resetStudyFilters() {
    this.set('studyFilters', studyFiltersFromSaved(null, this.get('configuration')));
  },

  resetDataObjectFilters() {
    const {
      configuration,
      dataObjectPublisherMapping,
    } = this.getProperties('configuration', 'dataObjectPublisherMapping');

    this.set(
      'dataObjectFilters',
      dataObjectFiltersFromSaved(null, configuration, dataObjectPublisherMapping)
    );
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
        studies: alreadyFetchedStudies,
        configuration,
      } = this.getProperties('studies', 'configuration');
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
      alreadyFetchedStudies.pushObjects(newStudies);
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
    const studies = this.get('studies') || [];
    return {
      terms: {
        id: studies.mapBy('id'),
      },
    };
  },

  loadDataObjectsForStudies(studies) {
    const {
      elasticsearch,
      dataObjects,
      configuration,
    } = this.getProperties('elasticsearch', 'dataObjects', 'configuration');
    const studiesWithoutFetchedDataObjects =
      studies.rejectBy('dataObjectsPromiseObject');
    const idsOfFetchedDataObjects = dataObjects.mapBy('id');
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
          const hits = results.hits.hits;
          const newDataObjects = hits.map(doHit => {
            const existingDataObjectInstance =
              dataObjects.findBy('id', get(doHit, '_source.id'));
            if (existingDataObjectInstance) {
              return existingDataObjectInstance;
            } else {
              return DataObject.create({
                configuration,
                raw: get(doHit, '_source'),
              });
            }
          });
          dataObjects.addObjects(newDataObjects);
          return dataObjects;
        });
    } else {
      fetchDataObjectsPromise = resolve(dataObjects);
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

  removeStudies(studiesToRemove) {
    const {
      studies,
      dataObjects,
    } = this.getProperties('studies', 'dataObjects');

    studiesToRemove = studiesToRemove.slice();
    studies.removeObjects(studiesToRemove);

    const dataObjectsOfRemovedStudies = _.uniq(_.flatten(
      studiesToRemove.mapBy('dataObjects').compact()
    ));
    const usedDataObjectIds = _.flatten(studies.mapBy('dataObjectsIds'));
    const dataObjectsToRemove = dataObjectsOfRemovedStudies.filter(dataObject => {
      const doId = get(dataObject, 'id');
      return !usedDataObjectIds.includes(doId);
    });
    dataObjects.removeObjects(dataObjectsToRemove);
  },

  loadStudiesFromSavedResults(results) {
    const savedStudies = get(results, 'studies');
    const elasticsearch = this.get('elasticsearch');
    const body = Object.assign(this.constructQueryBodyBase('study'), {
      size: savedStudies.length,
      query: {
        bool: {
          filter: [{
            terms: {
              id: savedStudies.mapBy('id'),
            },
          }],
        },
      },
    });

    return elasticsearch.post('study', '_search', body)
      .then(results => {
        const studies = this.extractResultsFromResponse(results);
        return this.loadDataObjectsForStudies(studies).then(() => studies);
      })
      .then(studies => {
        studies.forEach(study => {
          const correspondingSavedStudy =
            savedStudies.findBy('id', get(study, 'id'));
          if (correspondingSavedStudy) {
            const selectedDataObjectsIds =
              get(correspondingSavedStudy, 'selectedDataObjects') || [];
            const selectedDataObjects = get(study, 'dataObjects')
              .filter(dataObject =>
                selectedDataObjectsIds.includes(get(dataObject, 'id'))
              );
            set(study, 'selectedDataObjects', selectedDataObjects);
          }
        });
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
      this.removeStudies([study]);
    },
    removeAllStudies() {
      this.removeStudies(this.get('studies'));
    },
    filterDataObjects(filters) {
      this.set('dataObjectFilters', filters);
      const {
        studies,
        dataObjects,
        dataObjectPublisherMapping,
        dataObjectPublisherUnknownValue,
      } = this.getProperties(
        'studies',
        'dataObjects',
        'dataObjectPublisherMapping',
        'dataObjectPublisherUnknownValue'
      );

      let {
        year,
        publisher,
      } = getProperties(filters, 'year', 'publisher');
      year = stringToRanges(year);

      let filteredDataObjects = dataObjects.slice();
      [
        'filterType',
        'accessType',
      ].forEach(fieldName => {
        filteredDataObjects = checkMatchOfCategorizedValue(
          filteredDataObjects,
          fieldName,
          get(filters, fieldName)
        );
      });
      if (year && year.length) {
        filteredDataObjects = filteredDataObjects.filter(dataObject => {
          const doYear = get(dataObject, 'year');
          if (doYear) {
            return year.any(range => doYear >= range.start && doYear <= range.end);
          } else {
            return false;
          }
        });
      }
      if (publisher) {
        const allowUnknownValue = publisher.isAny('useForUnknown');
        const knownIds = dataObjectPublisherMapping
          .mapBy('id')
          .without(get(dataObjectPublisherUnknownValue, 'id'));
        filteredDataObjects = filteredDataObjects.filter(dataObject => {
          const doPublisherId = get(dataObject, 'managingOrganisation.id');
          return publisher.isAny('id', doPublisherId) ||
            (allowUnknownValue && !knownIds.includes(doPublisherId));
        });
      }

      studies.forEach(study => {
        const filteredStudyDOs = (get(study, 'dataObjects') || [])
          .filter(dataObject => filteredDataObjects.includes(dataObject));
        set(study, 'selectedDataObjects', filteredStudyDOs);
      });
    },
    resetStudyFilters() {
      this.resetStudyFilters();
    },
    resetDataObjectFilters() {
      this.resetDataObjectFilters();
      this.send('filterDataObjects', this.get('dataObjectFilters'));
    },
    saveResults(name) {
      const {
        indexeddbStorage,
        studies,
        studyFilters,
        dataObjectFilters,
        studySearchParams,
      } = this.getProperties(
        'indexeddbStorage',
        'studies',
        'studyFilters',
        'dataObjectFilters',
        'studySearchParams'
      );
      const resultsToSave = {
        name,
        timestamp: Math.floor(Date.now() / 1000),
        studies: studies.map(study => ({
          id: get(study, 'id'),
          selectedDataObjects: get(study, 'selectedDataObjects').mapBy('id'),
        })),
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
        studies,
      } = this.getProperties('configuration', 'studySearchParams', 'studies');
      if (results.studySearchParams) {
        studySearchParams.loadDumpedValues(
          results.studySearchParams,
          get(configuration, 'studyIdTypeMapping')
        );
      }

      this.removeStudies(studies.slice());
      this.resetStudyFilters();
      this.resetDataObjectFilters();
      return this.loadStudiesFromSavedResults(results)
        .then(() => safeExec(this, () => {
          const {
            studyFilters: savedStudyFilters,
            dataObjectFilters: savedDataObjectFilters,
          } = results;
          const {
            configuration,
            dataObjectPublisherMapping,
          } = this.getProperties('configuration', 'dataObjectPublisherMapping');
          const dataObjectFilters = dataObjectFiltersFromSaved(
            savedDataObjectFilters,
            configuration,
            dataObjectPublisherMapping
          );

          this.setProperties({
            studyFilters: studyFiltersFromSaved(
              savedStudyFilters,
              configuration
            ),
            dataObjectFilters,
          });
          this.send('filterDataObjects', dataObjectFilters);
        }));
    },
    removeSavedResults(results) {
      return this.get('indexeddbStorage').removeResults(results);
    },
    exportResultsToPdf() {
      const {
        pdfGenerator,
        studies,
      } = this.getProperties('pdfGenerator', 'studies');

      return pdfGenerator.generatePdfFromResults(studies);
    },
  },
});

function checkMatchOfCategorizedValue(records, fieldName, filter) {
  return records.filter(record =>
    !record.isSupportingField(fieldName) ||
    !filter || filter.includes(get(record, fieldName))
  );
}
