import Component from '@ember/component';
import { computed, observer, get, getProperties, set, setProperties } from '@ember/object';
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
   * @type {Ember.ComputedProperty<string>}
   */
  mode: reads('queryParams.mode'),

  /**
   * Number of records, that fulfills query conditions. -1 means, that results are
   * not available.
   * @type {number}
   */
  queryResultsNumber: -1,

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

  extractResultsFromResponse(promise, startFromIndex) {
    return promise.then(results => {
      if (results) {
        this.set('queryResultsNumber', get(results, 'total'));
        results = get(results, 'results.hits.hits');
        results.forEach((doc, i) => {
          doc.index = {
            index: (startFromIndex.index || 0) + i,
            id: get(doc, '_source.' + get(doc, '_source.type') + '_payload.id'),
          };
        });
        return results;
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

  constructQueryBodyBase(type, startFromIndex, size) {
    const body = {};
    if (startFromIndex && get(startFromIndex, 'index')) {
      set(body, 'search_after', [ startFromIndex.id ]);
    }
    let _source;
    switch (type) {
      case 'study':
        _source = [
          'type',
          'study_payload.id',
          'study_payload.scientific_title.title',
          'study_payload.linked_data_objects',
        ];
        break;
    }
    setProperties(body, {
      size,
      _source,
      sort: [
        // FIXME sorting text fields does not work
        { [type + '_payload.id']: 'asc' },
      ],
    });
    if (type) {
      set(body, 'query', {
        bool: {
          filter: [{
            term: {
              type,
            },
          }],
        },
      });
    }
    return body;
  },

  fetchSpecificStudy(startFromIndex, size) {
    const {
      elasticsearch,
      queryParams,
    } = this.getProperties('elasticsearch', 'queryParams');
    const body = this.constructQueryBodyBase('study', startFromIndex, size);

    if (get(queryParams, 'hasParams')) {
      const {
        studyIdType,
        studyId,
      } = getProperties(
        queryParams,
        'studyIdType',
        'studyId'
      );

      get(body, 'query.bool.filter').push({
        nested: {
          path: 'study_payload.study_identifiers',
          query: {
            bool: {
              must: [{
                term: {
                  'study_payload.study_identifiers.type.id': get(studyIdType, 'id'),
                },
              }, {
                term: {
                  'study_payload.study_identifiers.value': studyId,
                },
              }],
            },
          },
        },
      });
    }

    return elasticsearch.post('_search', body).then(results => ({
      results,
      total: get(results, 'hits.total'),
    }));
  },

  fetchStudyCharact(startFromIndex, size) {
    const {
      elasticsearch,
      queryParams,
    } = this.getProperties('elasticsearch', 'queryParams');
    const body = this.constructQueryBodyBase('study', startFromIndex, size);

    if (get(queryParams, 'hasParams')) {
      const {
        studyTitleContains,
        studyTopicsInclude,
      } = getProperties(
        queryParams,
        'studyTitleContains',
        'studyTopicsInclude',
      );
      if (studyTitleContains) {
        get(body, 'query.bool.filter').push({
          simple_query_string: {
            query: studyTitleContains,
            fields: ['study_payload.scientific_title.title'],
          },
        });
      }
      if (studyTopicsInclude) {
        get(body, 'query.bool.filter').push({
          simple_query_string: {
            query: studyTopicsInclude,
            fields: ['study_payload.study_topics.value'],
          },
        });
      }
    }

    return elasticsearch.post('_search', body).then(results => ({
      results,
      total: get(results, 'hits.total'),
    }));
  },

  fetchViaPubPaper(startFromIndex, size) {
    const {
      elasticsearch,
      queryParams,
    } = this.getProperties('elasticsearch', 'queryParams');
    const dataObjectBody = this.constructQueryBodyBase('data_object', undefined, size);

    setProperties(dataObjectBody, {
      size: 0,
      aggs: {
        related_studies_ids: {
          composite: {
            size: Math.max(size, 20),
            sources: [{
              id: {
                terms: {
                  field: 'data_object_payload.related_studies.id',
                },
              },
            }],
          },
        },
      },
    });
    if (get(startFromIndex, 'id') !== undefined) {
      set(dataObjectBody, 'aggs.related_studies_ids.composite.after', {id: get(startFromIndex, 'id')});
    }

    if (get(queryParams, 'hasParams')) {
      const {
        doi,
        dataObjectTitle,
      } = getProperties(queryParams, 'doi', 'dataObjectTitle');
      if (doi) {
        get(dataObjectBody, 'query.bool.filter').push({
          term: {
            'data_object_payload.DOI': doi,
          },
        });
      }
      else {
        get(dataObjectBody, 'query.bool.filter').push({
          simple_query_string: {
            query: dataObjectTitle,
            fields: ['data_object_payload.data_object_title'],
          },
        });
      }
    } else {
      return resolve(null);
    }
    let noStudyIdsLeft = false;
    return elasticsearch.post('_search', dataObjectBody)
      .then(results => {
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
          get(studyBody, 'query.bool.filter').push({
            terms: {
              'study_payload.id': relatedStudiesIds,
            },
          });
          return elasticsearch.post('_search', studyBody).then(results => {
            const hitsNumber = get(results, 'hits.total');
            if (hitsNumber < size && !noStudyIdsLeft) {
              return this.fetchViaPubPaper({
                index: (get(startFromIndex, 'index') || -1) + hitsNumber,
                id: relatedStudiesIds[get(relatedStudiesIds, 'length') - 1],
              }, size - hitsNumber).then(({results: nextResults}) => {
                set(
                  results,
                  'hits.total',
                  hitsNumber + get(nextResults, 'hits.total')
                );
                get(results, 'hits.hits').push(...get(nextResults, 'hits.hits'));
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
