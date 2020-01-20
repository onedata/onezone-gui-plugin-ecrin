/**
 * A component, which shows whole layout of query parameters and results
 * 
 * @module components/content-query
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
import { A } from '@ember/array';
import PromiseObject from 'onezone-gui-plugin-ecrin/utils/promise-object';

export default Component.extend(I18n, {
  classNames: ['content-query', 'content'],

  elasticsearch: service(),
  configuration: service(),
  router: service(),

  /**
   * @override
   */
  i18nPrefix: 'components.contentQuery',

  /**
   * @type {StudySearchParams}
   */
  studySearchParams: computed(() => StudySearchParams.create()),

  studies: computed(() => A()),

  dataObjects: computed(() => A()),

  /**
   * @type {Ember.ComputedProperty<string>}
   */
  mode: reads('studySearchParams.mode'),

  /**
   * @type {ComputedProperty<boolean>}
   */
  hasMeaningfulStudySearchParams: reads('studySearchParams.hasMeaningfulParams'),

  searchStudies() {
    const mode = this.get('mode');

    let promise = resolve([]);
    switch (mode) {
      case 'specificStudy':
        promise = this.fetchSpecificStudy();
        break;
      case 'studyCharact':
        promise = this.fetchStudyCharact();
        break;
      case 'viaPubPaper':
        promise = this.fetchViaPubPaper();
        break;
    }
    return this.extractResultsFromResponse(promise)
      .then(newStudies => this.loadDataObjectsForStudies(newStudies));
  },

  /**
   * @param {Promise} promise 
   * @returns {Promise}
   */
  extractResultsFromResponse(promise) {
    return promise.then(results => {
        if (results) {
          results = get(results, 'hits.hits') || [];
          const alreadyFetchedStudies = this.get('studies');
          const newStudies = results.map(doc => Study.create({
            raw: get(doc, '_source'),
          }));
          alreadyFetchedStudies.pushObjects(newStudies);
          return newStudies;
        } else {
          return [];
        }
      })
      .catch(error => {
        if (get(error, 'status') === 404) {
          return [];
        } else {
          throw error;
        }
      });
  },

  /**
   * Generates body base object for Elastisearch query
   * @param {string} type `study` or `data_object`
   * @returns {Object}
   */
  constructQueryBodyBase(type) {
    const body = {};

    let _source;
    if (type === 'study') {
      _source = [
        'id',
        'study_type',
        'display_title.title',
        'study_status.id',
        'study_status.data_sharing_statement',
        'study_status.brief_description',
        'linked_data_objects',
      ];
    } else if (type === 'data_object') {
      _source = [
        'id',
        'related_studies',
      ];
    }
    body.sort = [
      { id: { order: 'asc' } },
    ];
    setProperties(body, {
      size: 1000,
      _source,
    });
    return body;
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

    if (get(studySearchParams, 'hasMeaningfulParams')) {
      const {
        studyIdType,
        studyId,
      } = getProperties(
        studySearchParams,
        'studyIdType',
        'studyId'
      );
      const studyIdTypeId = get(studyIdType, 'id');

      set(body, 'query', {
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
      });

      return elasticsearch.post('study', '_search', body);
    } else {
      return resolve(null);
    }
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
    body.query = {
      bool: {
        must_not: this.generateExcludeFetchedStudiesClause(),
      },
    };

    if (get(studySearchParams, 'hasMeaningfulParams')) {
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
          simple_query_string: {
            query: studyTitleContains,
            fields: ['display_title.title'],
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
          filter: filtersArray,
        });
      }
      return elasticsearch.post('study', '_search', body);
    } else {
      return resolve(null);
    }
  },

  /**
   * Fetches ids of studies, that are related to data objects specified by
   * `published paper` query params. If first fetch attempt does not give
   * enough number of ids, method will call itself again to filfill
   * `size` requirement (if possible).
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
      sort: [
        { id: { order: 'asc' } },
      ],
      query: {
        bool: {
          filter: filters,
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
        simple_query_string: {
          query: dataObjectTitle,
          fields: ['display_title'],
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
          set(studyBody, 'query', {
            bool: {
              filter: [{
                terms: {
                  id: studyIds,
                },
              }],
              must_not: this.generateExcludeFetchedStudiesClause(),
            },
          });
          // fetch studies
          return elasticsearch.post('study', '_search', studyBody);
        } else {
          return null;
        }
      });
  },

  generateExcludeFetchedStudiesClause() {
    const studies = this.get('studies') || [];
    const studyIds = studies.mapBy('id');
    return {
      terms: {
        id: studyIds,
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
      fetchDataObjectsPromise = elasticsearch.post('data_object', '_search', {
        query: {
          bool: {
            filter: [{
              terms: {
                id: idsOfDataObjectsToFetch,
              },
            }],
          },
        },
      }).then(results => {
        const newDataObjectInjections = getProperties(
          configuration,
          'objectTypeMapping',
          'accessTypeMapping'
        );
        const hits = results.hits.hits;
        const newDataObjects = hits.map(doHit => {
          const existingDataObjectInstance =
            dataObjects.findBy('id', get(doHit, '_source.id'));
          if (existingDataObjectInstance) {
            return existingDataObjectInstance;
          } else {
            return DataObject.create(newDataObjectInjections, {
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
        promise: fetchDataObjectsPromise.then(dataObjects => {
          const dataObjectsIds = get(study, 'dataObjectsIds');
          return dataObjectsIds
            .map(id => dataObjects.findBy('id', id))
            .compact();
        }),
      }));
    });

    return fetchDataObjectsPromise;
  },

  removeStudies(studiesToRemove) {
    const {
      studies,
      dataObjects,
    } = this.getProperties('studies', 'dataObjects');

    studies.removeObjects(studiesToRemove);

    const dataObjectsMaybeToRemove = _.uniq(_.flatten(
      studiesToRemove.mapBy('dataObjects').compact()
    ));
    const usedDataObjectIds = _.flatten(studies.mapBy('dataObjectsIds'));
    const dataObjectsToRemove = dataObjectsMaybeToRemove.filter(dataObject => {
      const doId = get(dataObject, 'id');
      return !usedDataObjectIds.includes(doId);
    });
    dataObjects.removeObjects(dataObjectsToRemove);
  },

  actions: {
    parameterChanged(fieldName, newValue) {
      this.set(`studySearchParams.${fieldName}`, newValue);
    },
    find() {
      this.searchStudies();
    },
    removeStudies(studiesToRemove) {
      this.removeStudies(studiesToRemove);
    },
    loadDataObjectsForStudies() {
      this.loadDataObjectsForStudies(...arguments);
    },
    filterStudies(filters) {
      const studies = this.get('studies');

      const {
        type,
        status,
      } = getProperties(filters, 'type', 'status');

      let filteredStudies = studies.slice();
      if (type) {
        filteredStudies = filteredStudies.filter(study =>
          type.includes(get(study, 'type.id'))
        );
      }
      if (status) {
        filteredStudies = filteredStudies.filter(study =>
          status.includes(get(study, 'status.id'))
        );
      }

      const studiesToRemove = _.difference(studies.toArray(), filteredStudies);
      this.removeStudies(studiesToRemove);
    },
    filterDataObjects(filters) {
      const {
        studies,
        dataObjects,
      } = this.getProperties('studies', 'dataObjects');

      const {
        type,
        accessType,
        year,
        publisher,
      } = getProperties(filters, 'type', 'accessType', 'year', 'publisher');

      let filteredDataObjects = dataObjects.slice();
      if (type) {
        filteredDataObjects = filteredDataObjects.filter(dataObject =>
          type.includes(get(dataObject, 'type.id'))
        );
      }
      if (accessType) {
        filteredDataObjects = filteredDataObjects.filter(dataObject =>
          accessType.includes(get(dataObject, 'accessType.id'))
        );
      }
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
        filteredDataObjects = filteredDataObjects.filter(dataObject =>
          publisher.includes(get(dataObject, 'managingOrganisation.id'))
        );
      }

      studies.forEach(study => {
        const selectedDataObjects = get(study, 'selectedDataObjects');
        selectedDataObjects.removeObjects(
          selectedDataObjects.reject(dataObject =>
            filteredDataObjects.includes(dataObject)
          )
        );
      });
    },
  },
});
