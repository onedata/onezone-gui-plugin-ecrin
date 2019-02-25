import Component from '@ember/component';
import { computed, observer, get, getProperties } from '@ember/object';
import { reads } from '@ember/object/computed';
import ReplacingChunksArray from 'onezone-gui-plugin-ecrin/utils/replacing-chunks-array';
import I18n from 'onezone-gui-plugin-ecrin/mixins/i18n';
import { resolve } from 'rsvp';
import { inject as service } from '@ember/service';

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
   * @type {Ember.ComputedProperty<string>}
   */
  mode: reads('queryParams.mode'),

  /**
   * @type {Ember.ComputedProperty<Utils.ReplacingChunksArray>}
   */
  queryResults: computed(function queryResults() {
    return ReplacingChunksArray.create({
      fetch: () => resolve([]),
      startIndex: 0,
      endIndex: 50,
      indexMargin: 24,
    });
  }),

  queryParamsObserver: observer('queryParams', function queryParamsObserver() {
    this.find();
  }),

  init() {
    this._super(...arguments);
    this.queryParamsObserver();
  },

  fetchResults(startFromIndex, size /*, offset */) {
    const {
      mode,
      queryParams,
    } = this.getProperties('mode', 'queryParams');
    if ((mode === 'specificStudy' || mode === 'viaPubPaper') &&
      get(queryParams, 'hasParams') &&
      startFromIndex) {
      return resolve([]);
    }
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

  extractResultsFromResponse(promise, startFromIndex) {
    return promise.then(results => {
      if (results) {
        // if is an array of documents
        if (results.hits !== undefined) {
          results = results.hits.hits;
          results.forEach((doc, i) => {
            doc.index = {
              index: (startFromIndex.index || 0) + i,
              id: doc._id,
            };
          });
          return results;
        } else {
          results.index = {
            index: 0,
            id: results._id,
          };
          return [results];
        }
      }
       else {
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

  constructQueryBaseBody(size) {
    return {
      size,
      // FIXME sorting text fields does not work
      sort: [
        { _id: 'asc' },
      ],
      query: {},
    };
  },

  fetchSpecificStudy(startFromIndex, size) {
    const queryParams = this.get('queryParams');
    const hasParams = get(queryParams, 'hasParams');
    const body = this.constructQueryBaseBody(size);
    if (startFromIndex.index !== undefined) {
      body.search_after = [startFromIndex.id];
    }
    if (!hasParams) {
      body.query.match_all = {};
    } else {
      const {
        studyIdType,
        studyId,
      } = getProperties(
        queryParams,
        'studyIdType',
        'studyId'
      );
      body.query = {
        nested: {
          path: 'study_identifiers',
          query: {
            bool: {
              must: [{
                term: {
                  'study_identifiers.type': get(studyIdType, 'id'),
                },
              }, {
                term: {
                  'study_identifiers.value': studyId,
                },
              }],
            },
          },
        },
      };
    }

    return this.get('elasticsearch').request(
      'POST',
      '/studies/study/_search',
      body
    );
  },

  fetchStudyCharact(startFromIndex, size) {
    const queryParams = this.get('queryParams');
    const hasParams = get(queryParams, 'hasParams');
    const body = this.constructQueryBaseBody(size);
    if (startFromIndex.index !== undefined) {
      body.search_after = [startFromIndex.id];
    }
    if (!hasParams) {
      body.query.match_all = {};
    } else {
      const {
        studyTitleContains,
        studyTopicsInclude,
      } = getProperties(
        queryParams,
        'studyTitleContains',
        'studyTopicsInclude',
      );
      if (studyTitleContains) {
        body.query.bool = {
          must: [{
            simple_query_string: {
              query: studyTitleContains,
              fields: ['title'],
            },
          }],
        };
      }
      if (studyTopicsInclude) {
        body.query.bool = body.query.bool || {};
        body.query.bool.must = body.query.bool.must || [];
        body.query.bool.must.push({
          simple_query_string: {
            query: studyTopicsInclude,
            fields: ['study_topics.value'],
          },
        });
      }
    }

    return this.get('elasticsearch').request(
      'POST',
      '/studies/study/_search',
      body
    );
  },

  fetchViaPubPaper(startFromIndex, size) {
    const {
      elasticsearch,
      queryParams,
    } = this.getProperties('elasticsearch', 'queryParams');
    const hasParams = get(queryParams, 'hasParams');
    let body = this.constructQueryBaseBody(size);
    delete body.size;
    if (!hasParams) {
      return resolve(null);
    } else {
      const {
        doi,
        dataObjectTitle,
      } = getProperties(queryParams, 'doi', 'dataObjectTitle');
      if (doi) {
        body.query.bool = {
          must: [{
            term: {
              DOI: doi,
            },
          }],
        };
      }
      else {
        body.query.bool = {
          must: [{
            simple_query_string: {
              query: dataObjectTitle,
              fields: ['data_object_title'],
            },
          }],
        };
      }
    }

    return elasticsearch.request(
      'POST',
      '/dos/do/_search',
      body
    ).then(doResults => {
      doResults = (doResults.hits || {}).hits;
      const dataObject = doResults ? doResults[0] : null;
      if (dataObject) {
        body = this.constructQueryBaseBody(size);
        body.query.bool = {
          must: [{
            terms: {
              id: dataObject._source.related_studies.mapBy('id'),
            },
          }],
        };
        return elasticsearch.request(
          'POST',
          '/studies/study/_search',
          body
        );
      } else {
        return null;
      }
    });
  },

  find() {
    this.set('queryResults', ReplacingChunksArray.create({
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
    }));
  },

  actions: {
    parameterChanged(fieldName, newValue) {
      this.set(`queryParams.${fieldName}`, newValue);
    },
    find() {
      this.get('router').transitionTo({
        queryParams: this.get('queryParams.queryParams'),
      });
    },
    clearAll() {
      this.get('queryParams').clear();
    },
    filter() {
      this.get('queryParams').applyDoParams();
      this.get('router').transitionTo({
        queryParams: this.get('queryParams.doQueryParams'),
      });
    },
  },
});
