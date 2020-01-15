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
import ReplacingChunksArray from 'onezone-gui-plugin-ecrin/utils/replacing-chunks-array';
import I18n from 'onezone-gui-plugin-ecrin/mixins/i18n';
import { resolve } from 'rsvp';
import { inject as service } from '@ember/service';
import _ from 'lodash';
import StudySearchParams from 'onezone-gui-plugin-ecrin/utils/study-search-params';

export default Component.extend(I18n, {
  classNames: ['content-query', 'content'],

  elasticsearch: service(),
  router: service(),

  /**
   * @override
   */
  i18nPrefix: 'components.contentQuery',

  /**
   * @type {StudySearchParams}
   */
  studySearchParams: computed(() => StudySearchParams.create()),

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
   * Number of records, that fulfills query conditions.
   * @type {number}
   */
  queryResultsNumber: reads('queryResults.sourceArray.length'),

  /**
   * @type {Ember.ComputedProperty<string>}
   */
  mode: reads('studySearchParams.mode'),

  /**
   * @type {ComputedProperty<boolean>}
   */
  hasMeaningfulStudySearchParams: reads('studySearchParams.hasMeaningfulParams'),

  // /**
  //  * @type {Ember.ComputedProperty<Object>}
  //  */
  // activeFindParams: reads('queryParams.activeFindParams'),

  // /**
  //  * @type {Ember.ComputedProperty<boolean>}
  //  */
  // hasActiveFindParams: reads('queryParams.hasActiveFindParams'),

  // queryParamsObserver: observer('queryParams', function queryParamsObserver() {
  //   this.searchStudies();
  // }),

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
    return this.extractResultsFromResponse(promise);
  },

  /**
   * @param {Promise} promise 
   * @returns {Promise}
   */
  extractResultsFromResponse(promise) {
    return promise.then(results => {
        if (results) {
          results = get(results, 'hits.hits') || [];
          const alreadyFetchedStudies = this.get('queryResults.sourceArray');
          results.forEach((doc, i) => {
            // add index required by ReplacingChunksArray
            doc.index = {
              name: get(doc, '_source.display_title.title'),
              index: (get(alreadyFetchedStudies, 'lastObject.index.index') ||
                0) + i,
              id: get(doc, '_source.id'),
            };
          });
          alreadyFetchedStudies.pushObjects(results);
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
   * @returns {Object}
   */
  constructQueryBodyBase(type) {
    const body = {};

    let _source;
    if (type === 'study') {
      _source = [
        'id',
        'display_title.title',
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
    const studies = this.get('queryResults.sourceArray') || [];
    const studyIds = studies.map(s => get(s, '_source.id'));
    return {
      terms: {
        id: studyIds,
      },
    };
  },

  init() {
    this._super(...arguments);

    const studiesChunksArray = ReplacingChunksArray.create({
      fetch() { return resolve([]); },
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
    });
    get(studiesChunksArray, 'initialLoad')
      .then(() => set(studiesChunksArray, '_endReached', true));

    this.set('queryResults', studiesChunksArray);
  },

  actions: {
    parameterChanged(fieldName, newValue) {
      this.set(`studySearchParams.${fieldName}`, newValue);
    },
    find() {
      this.searchStudies();
    },
    filter() {
      this.get('queryParams').applyFilterParams();
      this.get('router').transitionTo({
        queryParams: this.get('queryParams.filterQueryParams'),
      });
    },
  },
});
