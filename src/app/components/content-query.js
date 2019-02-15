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
   * @type {Object}
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

  fetchResults(startFromIndex, size, offset) {
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
    const method = this.getQueryMethod();
    const path = this.getQueryPath();
    const body = method === 'GET' ? undefined : this.getQueryBody(startFromIndex, size, offset);
    return this.get('elasticsearch').request(method, path, body)
      .then(results => {
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
      })
      .catch(error => {
        if (get(error, 'status') === 404) {
          return [];
        } else {
          throw error;
        }
      });
  },

  getQueryMethod() {
    const {
      mode,
      queryParams,
    } = this.getProperties('mode', 'queryParams');
    switch (mode) {
      case 'specificStudy':
      case 'viaPubPaper':
        return get(queryParams, 'hasParams') ? 'GET' : 'POST';
      default:
        return 'POST';
    }
  },

  getQueryPath() {
    const {
      mode,
      queryParams,
    } = this.getProperties('mode', 'queryParams');
    switch (mode) {
      case 'specificStudy':
        return '/studies/study/' + (get(queryParams, 'studyId') || '_search');
      case 'studyCharact':
        return '/studies/study/_search';
      case 'viaPubPaper':
        return '/dos/do/' + (get(queryParams, 'doi') || '_search');
    }
  },

  getQueryBody(startFromIndex, size, offset) {
    const {
      mode,
      queryParams,
    } = this.getProperties('mode', 'queryParams');
    const hasParams = get(queryParams, 'hasParams');
    const body = {
      size,
      // FIXME sorting text fields does not work
      sort: [
        { _id: 'asc' },
      ],
      query: {},
    };
    if (startFromIndex.index !== undefined) {
      body.search_after = [startFromIndex.id];
    }
    if (!hasParams) {
      body.query.match_all = {};
    } else {
      if (mode === 'studyCharact') {
        const {
          studyTitleContains,
          typeFilter,
          accessTypeFilter,
          publisherFilter,
        } = getProperties(
          queryParams,
          'studyTitleContains',
          'typeFilter',
          'accessTypeFilter',
          'publisherFilter'
        );
        if (studyTitleContains) {
          body.query.bool = {
            must: {
              match: {
                title: studyTitleContains,
              },
            },
          };
        }
        if (typeFilter.length) {
          body.query.bool = body.query.bool || {};
          body.query.bool.filter = [{
            terms: {
              type: typeFilter,
            },
          }];
        }
        if (accessTypeFilter.length) {
          body.query.bool = body.query.bool || {};
          body.query.bool.filter = body.query.bool.filter || [];
          body.query.bool.filter.push({
            terms: {
              accessType: accessTypeFilter.mapBy('id'),
            },
          });
        }
        if (publisherFilter.length) {
          body.query.bool = body.query.bool || {};
          body.query.bool.filter = body.query.bool.filter || [];
          body.query.bool.filter.push({
            terms: {
              publisher: publisherFilter.mapBy('id'),
            },
          });
        }
      }
    }
    return body;
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
  },
});
