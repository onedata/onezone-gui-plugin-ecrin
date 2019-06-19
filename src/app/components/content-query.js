/**
 * A component, which shows whole layout of query parameters and results
 * 
 * @module components/content-query
 * @author Michał Borzęcki
 * @copyright (C) 2019 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import Component from '@ember/component';
import { observer, get, getProperties, set, setProperties, computed } from '@ember/object';
import { reads } from '@ember/object/computed';
import ReplacingChunksArray from 'onezone-gui-plugin-ecrin/utils/replacing-chunks-array';
import I18n from 'onezone-gui-plugin-ecrin/mixins/i18n';
import { resolve } from 'rsvp';
import { inject as service } from '@ember/service';
import _ from 'lodash';

export default Component.extend(I18n, {
  classNames: ['content-query', 'content'],

  elasticsearch: service(),
  router: service(),

  /**
   * @override
   */
  i18nPrefix: 'components.contentQuery',

  /**
   * @virtual
   * @type {Utils.QueryParams}
   */
  queryParams: undefined,

  /**
   * @type {Utils.ReplacingChunksArray}
   */
  queryResults: undefined,

  /**
   * Number of records, that fulfills query conditions. -1 means, that results are
   * not available.
   * @type {number}
   */
  queryResultsNumber: -1,

  /**
   * @type {Ember.ComputedProperty<string>}
   */
  mode: reads('queryParams.mode'),

  /**
   * @type {Ember.ComputedProperty<Object>}
   */
  activeFindParams: reads('queryParams.activeFindParams'),

  /**
   * @type {Ember.ComputedProperty<boolean>}
   */
  hasActiveFindParams: reads('queryParams.hasActiveFindParams'),

  /**
   * Study ids used to render list of query result. Checking this array while
   * fetching results helps to avoid possible duplicates of studies (which
   * breaks down rendering). For now only used by fetchViaPubPaper.
   * @type {Ember.ComputedPropert<Array<number>>}
   */
  usedStudyIds: computed(function () { return [];}),

  /**
   * Field used as a cursor of query results in fetchViaPubPaper.
   * @type {number}
   */
  lastCheckedDataObjectId: undefined,

  queryParamsObserver: observer('queryParams', function queryParamsObserver() {
    this.setProperties({
      usedStudyIds: [],
      lastCheckedDataObjectId: undefined,
    });
    this.find();
  }),

  init() {
    this._super(...arguments);
    this.queryParamsObserver();
  },

  fetchResults(startFromIndex, size /*, offset */ ) {
    const mode = this.get('mode');
    if (startFromIndex === undefined) {
      startFromIndex = {};
    }

    let promise = resolve([]);
    switch (mode) {
      case 'specificStudy':
        promise = this.fetchSpecificStudy(startFromIndex, size);
        break;
      case 'studyCharact':
        promise = this.fetchStudyCharact(startFromIndex, size);
        break;
      case 'viaPubPaper':
        promise = this.fetchViaPubPaper(startFromIndex, size);
        break;
    }
    return this.extractResultsFromResponse(promise, startFromIndex);
  },

  /**
   * @param {Promise} promise 
   * @param {Object} startFromIndex 
   * @returns {Promise}
   */
  extractResultsFromResponse(promise, startFromIndex) {
    return promise.then(results => {
        if (results) {
          this.set('queryResultsNumber', get(results, 'total'));
          results = get(results, 'results.hits.hits');
          results.forEach((doc, i) => {
            // add index required by ReplacingChunksArray
            doc.index = {
              name: get(doc, '_source.scientific_title.title'),
              index: (startFromIndex.index || 0) + i,
              id: get(doc, '_source.id'),
            };
          });
          return results;
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
   * @param {Object} startFromIndex index from ReplacingChunksArray
   * @param {number} size expected results size
   * @returns {Object}
   */
  constructQueryBodyBase(type, startFromIndex, size) {
    const body = {};
    
    let _source;
    if (type === 'study') {
      _source = [
        'id',
        'scientific_title.title',
        'linked_data_objects',
      ];
      body.sort = [
        { 'scientific_title.title.raw': { order: 'asc' } },
        { id: { order: 'asc' } },
      ];
      if (startFromIndex && get(startFromIndex, 'index') !== undefined) {
        body.search_after = [startFromIndex.name, startFromIndex.id];
      }
    } else if (type === 'data_object') {
      _source = [
        'id',
        'related_studies',
      ];
      body.sort = [
        { id: { order: 'asc' } },
      ];
      if (startFromIndex && get(startFromIndex, 'lastDataObjectId') !== undefined) {
        body.search_after = [startFromIndex.lastDataObjectId];
      }
    }
    setProperties(body, {
      size,
      _source,
    });
    return body;
  },

  /**
   * Loads studies according to study identifier
   * @param {Object} startFromIndex index from ReplacingChunksArray
   * @param {number} size expected results size
   * @returns {Promise}
   */
  fetchSpecificStudy(startFromIndex, size) {
    const {
      elasticsearch,
      activeFindParams,
      hasActiveFindParams,
    } = this.getProperties(
      'elasticsearch',
      'activeFindParams',
      'hasActiveFindParams'
    );
    const body = this.constructQueryBodyBase('study', startFromIndex, size);

    if (hasActiveFindParams) {
      const {
        studyIdType,
        studyId,
      } = getProperties(
        activeFindParams,
        'studyIdType',
        'studyId'
      );

      set(body, 'query', {
        bool: {
          filter: [{
            nested: {
              path: 'study_identifiers',
              query: {
                bool: {
                  must: [{
                    term: {
                      'study_identifiers.type.id': get(studyIdType, 'id'),
                    },
                  }, {
                    term: {
                      'study_identifiers.value': studyId,
                    },
                  }],
                },
              },
            },
          }],
        },
      });
    }

    return elasticsearch.post('study', '_search', body).then(results => ({
      results,
      total: get(results, 'hits.total'),
    }));
  },

  /**
   * Loads studies according to study parameters
   * @param {Object} startFromIndex index from ReplacingChunksArray
   * @param {number} size expected results size
   * @returns {Promise}
   */
  fetchStudyCharact(startFromIndex, size) {
    const {
      elasticsearch,
      activeFindParams,
      hasActiveFindParams,
    } = this.getProperties(
      'elasticsearch',
      'activeFindParams',
      'hasActiveFindParams'
    );
    const body = this.constructQueryBodyBase('study', startFromIndex, size);

    if (hasActiveFindParams) {
      const {
        studyTitleContains,
        studyTopicsInclude,
        studyTitleTopicOperator,
      } = getProperties(
        activeFindParams,
        'studyTitleContains',
        'studyTopicsInclude',
        'studyTitleTopicOperator',
      );
      const filtersArray = [];
      if (studyTitleContains) {
        filtersArray.push({
          simple_query_string: {
            query: studyTitleContains,
            fields: ['scientific_title.title'],
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
                fields: ['study_topics.value'],
              },
            },
          },
        });
      }
      if (studyTitleTopicOperator === 'or') {
        set(body, 'query', {
          bool: {
            should: filtersArray,
          },
        });
      } else {
        set(body, 'query', {
          bool: {
            filter: filtersArray,
          },
        });
      }
    }

    return elasticsearch.post('study', '_search', body).then(results => ({
      results,
      total: get(results, 'hits.total'),
    }));
  },

  /**
   * Fetches ids of studies, that are related to data objects specified by
   * `published paper` query params. If first fetch attempt does not give
   * enough number of ids, method will call itself again to filfill
   * `size` requirement (if possible).
   * @param {number} dataObjectLastId last checked data object (works as query cursor)
   * @param {number} size
   * @param {Array<number>} [alreadyFound=[]] array of study ids, that were
   * fetched in previous recurrent call of this method. Used to aggregate results
   * of subsequent calls
   * @returns {Promise<{dataObjectLastId: number, studyIds: Array<number>}>}
   */
  fetchStudyIdsForPerPaperSearch(dataObjectLastId, size, alreadyFound = []) {
    const {
      elasticsearch,
      activeFindParams,
      usedStudyIds,
    } = this.getProperties(
      'elasticsearch',
      'activeFindParams',
      'usedStudyIds'
    );

    // Minimum studies number, to avoid fetching data objects one by one
    size = Math.max(size, 6);
    // Algorithm of fetching assumes, that each data object has 1+ related studies,
    // so we should fetch less than `size` data objects to get `size` studies
    const dataObjectsToFetch = Math.floor(size * 0.75);

    const filters = [];
    const dataObjectBody = {
      size: dataObjectsToFetch,
      _source: [
        'id',
        'related_studies',
      ],
      sort: [
        { id: { order: 'asc' } },
      ],
      search_after: dataObjectLastId !== undefined ? [dataObjectLastId] : undefined,
      query: {
        bool: {
          filter: filters,
        },
      },
    };

    const {
      doi,
      dataObjectTitle,
    } = getProperties(activeFindParams, 'doi', 'dataObjectTitle');
    if (doi) {
      filters.push({
        term: {
          DOI: doi,
        },
      });
    } else if (dataObjectTitle) {
      filters.push({
        simple_query_string: {
          query: dataObjectTitle,
          fields: ['data_object_title'],
        },
      });
    } else {
      return resolve({
        studyIds: [],
      });
    }
    return elasticsearch.post('data_object', '_search', dataObjectBody)
      .then(results => {
        results = results.hits.hits;
        const fetchedDataObjects = get(results, 'length');
        if (fetchedDataObjects === 0) {
          return {
            dataObjectLastId,
            studyIds: alreadyFound,
          };
        }
        const dataObjectLastId = get(results[results.length - 1], '_source.id');

        // extract studies from data objects
        let newStudyIds = _.uniq(_.flatten(
          results.map(dataObject =>
            (get(dataObject, '_source.related_studies') || []).mapBy('id')
          )
        ));
        newStudyIds = _.without(newStudyIds, ...alreadyFound.concat(usedStudyIds));
        const studyIds = alreadyFound.concat(newStudyIds);
        if (get(studyIds, 'length') >= size || dataObjectsToFetch > fetchedDataObjects) {
          return {
            dataObjectLastId,
            studyIds,
          };
        } else {
          return this.fetchStudyIdsForPerPaperSearch(dataObjectLastId, size, studyIds);
        }
      });
  },

  /**
   * Loads studies according to related paper
   * @param {Object} startFromIndex index from ReplacingChunksArray
   * @param {number} size expected results size
   * @returns {Promise}
   */
  fetchViaPubPaper(startFromIndex, size) {
    const {
      elasticsearch,
      hasActiveFindParams,
      lastCheckedDataObjectId,
    } = this.getProperties(
      'elasticsearch',
      'hasActiveFindParams',
      'lastCheckedDataObjectId'
    );

    if (!hasActiveFindParams) {
      return resolve(null);
    }

    return this.fetchStudyIdsForPerPaperSearch(lastCheckedDataObjectId, size)
      .then(results => {
        const usedStudyIds = this.get('usedStudyIds');
        const {
          dataObjectLastId,
          studyIds,
        } = getProperties(results, 'dataObjectLastId', 'studyIds');

        // Remember state of fetch
        this.setProperties({
          lastCheckedDataObjectId: dataObjectLastId,
          usedStudyIds: usedStudyIds.concat(studyIds),
        });

        const studyIdsNumber = get(studyIds, 'length');
        let noStudyIdsLeft = false;
        if (studyIdsNumber) {
          if (studyIdsNumber < size) {
            noStudyIdsLeft = true;
          }
          const studyBody =
            this.constructQueryBodyBase('study', undefined, studyIdsNumber);
          set(studyBody, 'query', {
            bool: {
              filter: [{
                terms: {
                  id: studyIds,
                },
              }],
            },
          });
          // fetch studies
          return elasticsearch.post('study', '_search', studyBody).then(results => {
            const hitsNumber = get(results, 'hits.total');
            if (hitsNumber < size && !noStudyIdsLeft) {
              // if found studies are not enough, perform next query
              return this.fetchViaPubPaper(null, size - hitsNumber)
                .then(({ results: nextResults }) => {
                  // append results from subsequent query to the first result
                  set(
                    results,
                    'hits.total',
                    hitsNumber + get(nextResults, 'hits.total')
                  );
                  get(results, 'hits.hits')
                    .push(...get(nextResults, 'hits.hits'));
                  return results;
                });
            } else {
              return results;
            }
          }).then(results => ({
            results,
            total: -1,
          }));
        } else {
          return null;
        }
      });
  },

  /**
   * Creates new dynamic array with find query results
   * @returns {undefined}
   */
  find() {
    this.setProperties({
      queryResults: ReplacingChunksArray.create({
        fetch: (...fetchArgs) => this.fetchResults(...fetchArgs),
        startIndex: 0,
        endIndex: 50,
        indexMargin: 24,
        sortFun: (a, b) => {
          const ai = get(a, 'index.index');
          const bi = get(b, 'index.index');
          if (ai < bi) {
            return -1;
          } else if (ai > bi) {
            return 1;
          } else {
            return 0;
          }
        },
      }),
      queryResultsNumber: -1,
    });
  },

  actions: {
    parameterChanged(fieldName, newValue) {
      this.set(`queryParams.${fieldName}`, newValue);
    },
    find() {
      this.get('queryParams').applyFindParams();
      this.get('router').transitionTo({
        queryParams: this.get('queryParams.findQueryParams'),
      });
    },
    filter() {
      this.get('queryParams').applyFilterParams();
      this.get('router').transitionTo({
        queryParams: this.get('queryParams.filterQueryParams'),
      });
    },
  },
});
