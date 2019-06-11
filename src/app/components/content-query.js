/**
 * A component, which shows whole layout of query parameters and results
 * 
 * @module components/content-query
 * @author Michał Borzęcki
 * @copyright (C) 2019 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import Component from '@ember/component';
import { observer, get, getProperties, set, setProperties } from '@ember/object';
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

  queryParamsObserver: observer('queryParams', function queryParamsObserver() {
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
    if (startFromIndex && get(startFromIndex, 'index') !== undefined) {
      set(body, 'search_after', [startFromIndex.name, startFromIndex.id]);
    }
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
   * Loads studies according to related paper
   * @param {Object} startFromIndex index from ReplacingChunksArray
   * @param {number} size expected results size
   * @returns {Promise}
   */
  fetchViaPubPaper(startFromIndex, size) {
    const {
      elasticsearch,
      activeFindParams,
      hasActiveFindParams,
    } = this.getProperties(
      'elasticsearch',
      'activeFindParams',
      'hasActiveFindParams'
    );
    const dataObjectBody = this.constructQueryBodyBase('data_object', undefined, size);

    setProperties(dataObjectBody, {
      size: 0,
      aggs: {
        related_studies_ids: {
          composite: {
            size: Math.max(size, 50),
            sources: [{
              id: {
                terms: {
                  field: 'related_studies.id',
                },
              },
            }],
          },
        },
      },
    });
    if (get(startFromIndex, 'id') !== undefined) {
      set(
        dataObjectBody,
        'aggs.related_studies_ids.composite.after', {
          id: get(startFromIndex, 'id'),
        }
      );
    }

    if (hasActiveFindParams) {
      const filters = [];
      set(dataObjectBody, 'query', {
        bool: {
          filter: filters,
        },
      });
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
      } else {
        filters.push({
          simple_query_string: {
            query: dataObjectTitle,
            fields: ['data_object_title'],
          },
        });
      }
    } else {
      return resolve(null);
    }
    let noStudyIdsLeft = false;
    return elasticsearch.post('data_object', '_search', dataObjectBody)
      .then(results => {
        // extract studies from data objects
        let relatedStudiesIds = (get(
          results,
          'aggregations.related_studies_ids.buckets'
        ) || []).map(bucket => get(bucket, 'key.id'));
        const idsNumber = get(relatedStudiesIds, 'length');
        if (idsNumber) {
          if (idsNumber < size) {
            noStudyIdsLeft = true;
          }
          relatedStudiesIds = _.uniq(relatedStudiesIds);
          const studyBody =
            this.constructQueryBodyBase('study', undefined, size);
          set(studyBody, 'query', {
            bool: {
              filter: [{
                terms: {
                  id: relatedStudiesIds,
                },
              }],
            },
          });
          // fetch studies
          return elasticsearch.post('study', '_search', studyBody).then(results => {
            const hitsNumber = get(results, 'hits.total');
            if (hitsNumber < size && !noStudyIdsLeft) {
              // if found studies are not enough, perform next query
              return this.fetchViaPubPaper({
                index: (get(startFromIndex, 'index') || -1) + hitsNumber,
                id: relatedStudiesIds[get(relatedStudiesIds, 'length') - 1],
              }, size - hitsNumber).then(({ results: nextResults }) => {
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
