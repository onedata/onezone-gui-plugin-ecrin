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
import { A } from '@ember/array';
import PromiseObject from 'onezone-gui-plugin-ecrin/utils/promise-object';
import { isBlank } from '@ember/utils';

export default Component.extend(I18n, {
  classNames: ['content-index', 'content'],

  elasticsearch: service(),
  configuration: service(),

  /**
   * @override
   */
  i18nPrefix: 'components.contentIndex',

  /**
   * @type {StudySearchParams}
   */
  studySearchParams: computed(() => StudySearchParams.create()),

  studies: computed(() => A()),

  dataObjects: computed(() => A()),

  dataObjectPublisherUnknownValue: Object.freeze({
    id: -1,
    name: 'Not provided',
    useForUnknown: true,
  }),

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
          if (typeof name === 'object' && name[0]) {
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
  fetchDataPromiseObject: computed(() => PromiseObject.create({ promise: resolve() })),

  /**
   * @type {ComputedProperty<boolean>}
   */
  isFetchingData: reads('fetchDataPromiseObject.isPending'),

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
    const body = {};

    let _source;
    if (type === 'study') {
      _source = [
        'id',
        'study_type',
        'brief_description',
        'data_sharing_statement',
        'display_title.title',
        'study_status.id',
        'study_topics.topic_value',
        'study_topics.topic_source_type.id',
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
        'object_instances',
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
      const body = this.constructQueryBodyBase('data_object');
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
    filterStudies(filters) {
      const studies = this.get('studies');

      let filteredStudies = studies.slice();
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
        const filter = get(filters, fieldName);
        filteredStudies = checkMatchOfCategorizedValue(
          filteredStudies,
          fieldName,
          filter
        );
      });

      const studiesToRemove = _.difference(studies.toArray(), filteredStudies);
      this.removeStudies(studiesToRemove);
    },
    filterDataObjects(filters) {
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

      const {
        year,
        publisher,
      } = getProperties(filters, 'year', 'publisher');

      let filteredDataObjects = dataObjects.slice();
      [
        'type',
        'accessType',
      ].forEach(fieldName => {
        const filter = get(filters, fieldName);
        filteredDataObjects = checkMatchOfCategorizedValue(
          filteredDataObjects,
          fieldName,
          filter
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

function checkMatchOfCategorizedValue(records, fieldName, filter) {
  return records.filter(record =>
    !record.isSupportingField(fieldName) || filter.includes(get(record, fieldName))
  );
}
