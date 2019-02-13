import Component from '@ember/component';
import { computed, get, getProperties } from '@ember/object';
import { reads } from '@ember/object/computed';
import ReplacingChunksArray from 'onezone-gui-plugin-ecrin/utils/replacing-chunks-array';
import I18n from 'onezone-gui-plugin-ecrin/mixins/i18n';
import { resolve } from 'rsvp';
import QueryParams from 'onezone-gui-plugin-ecrin/utils/query-params';
import { inject as service } from '@ember/service';

export default Component.extend(I18n, {
  classNames: ['content-query', 'content'],

  elasticsearch: service(),

  /**
   * @override
   */
  i18nPrefix: 'components.contentQuery',

  /**
   * @type {Object}
   */
  queryParams: computed(function queryParams() {
    return QueryParams.create();
  }),

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

  fetchResults(startFromIndex, size, offset) {
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
      });
  },

  getQueryMethod() {
    const mode = this.get('mode');
    switch (mode) {
      case 'specificStudy':
        return 'GET';
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
        return '/studies/study/' + get(queryParams, 'studyId');
      case 'studyCharact':
        return '/studies/study/_search';
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

  actions: {
    parameterChanged(fieldName, newValue) {
      this.set(`queryParams.${fieldName}`, newValue);
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
    clearAll() {
      this.get('queryParams').clear();
      this.set('queryResults', ReplacingChunksArray.create({
        fetch: () => resolve([]),
        startIndex: 0,
        endIndex: 50,
        indexMargin: 24,
      }));
    },
  },
});
