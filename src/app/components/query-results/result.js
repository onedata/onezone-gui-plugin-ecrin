import Component from '@ember/component';
import { observer, computed, get, set, getProperties } from '@ember/object';
import { reads, alias } from '@ember/object/computed';
import { inject as service } from '@ember/service';
import PromiseObject from 'onezone-gui-plugin-ecrin/utils/promise-object';
import { resolve } from 'rsvp';
import { A } from '@ember/array';
import I18n from 'onezone-gui-plugin-ecrin/mixins/i18n';
import safeExec from 'onezone-gui-plugin-ecrin/utils/safe-method-execution';

export default Component.extend(I18n, {
  classNames: ['query-results-result'],

  elasticsearch: service(),
  configuration: service(),

  /**
   * @override
   */
  i18nPrefix: 'components.queryResults.result',

  /**
   * @virtual
   */
  result: undefined,

  /**
   * @virtual
   * @type {Utils.QueryParams}
   */
  queryParams: undefined,

  /**
   * @virtual
   * @type {BsAccordion.Item}
   */
  item: undefined,

  /**
   * @virtual
   * @type {boolean}
   */
  isExpanded: false,

  /**
   * @type {Ember.ComputedProperty<Array<Object>>}
   */
  typeMapping: reads('configuration.typeMapping'),

  /**
   * @type {Ember.ComputedProperty<Array<Object>>}
   */
  accessTypeMapping: reads('configuration.accessTypeMapping'),

  /**
   * @type {Ember.ComputedProperty<Array<Object>>}
   */
  publisherMapping: reads('configuration.publisherMapping'),

  /**
   * @type {Ember.ComputedProperty<Object>}
   */
  doParams: reads('queryParams.activeDoParams'),

  fetchInnerRecordsProxy: computed(function () {
    return PromiseObject.create({
      promise: resolve(),
    });
  }),

  /**
   * @type {Ember.ComputedProperty<Object>}
   */
  source: reads('result._source'),

  studyPayload: reads('source'),

  /**
   * @type {Ember.ComputedProperty<string>}
   */
  id: reads('result._id'),

  /**
   * @type {Ember.ComputedProperty<Ember.A<Object>>}
   */
  innerRecords: alias('result.innerRecord'),

  /**
   * Is different than -1 if inner records have been fetched at least once
   * @type {Ember.ComputedProperty<number>}
   */
  innerRecordsNumber: alias('result.innerRecordsNumber'),

  /**
   * @type {Ember.ComputedProperty<Array<Object>>}
   */
  dataObjects: reads('innerRecords'),

  isExpandedObserver: observer(
    'isExpanded',
    function isExpandedObserver() {
      const {
        isExpanded,
        innerRecordsNumber,
      } = this.getProperties('isExpanded', 'innerRecordsNumber');
      if (isExpanded && innerRecordsNumber === -1) {
        this.fetchNextInnerRecords();
      }
    }
  ),

  doParamsObserver: observer('doParams', function doParamsObserver() {
    this.resetInnerRecords();
    if (this.get('isExpanded')) {
      this.fetchNextInnerRecords();
    }
  }),

  init() {
    this._super(...arguments);

    const innerRecordsNumber = this.get('innerRecordsNumber');

    if (innerRecordsNumber === undefined) {
      this.resetInnerRecords();
    }

    this.isExpandedObserver();
  },

  resetInnerRecords() {
    this.setProperties({
      innerRecords: A(),
      innerRecordsNumber: -1,
    });
  },

  fetchNextInnerRecords() {
    let fetchInnerRecordsProxy = this.get('fetchInnerRecordsProxy');
    if (get(fetchInnerRecordsProxy, 'isLoading')) {
      return fetchInnerRecordsProxy;
    } else {
      const {
        elasticsearch,
        innerRecordsNumber,
        innerRecords,
        source,
        typeMapping,
        accessTypeMapping,
        doParams,
      } = this.getProperties(
        'elasticsearch',
        'innerRecordsNumber',
        'innerRecords',
        'source',
        'typeMapping',
        'accessTypeMapping',
        'doParams',
      );
      const {
        typeFilter,
        accessTypeFilter,
        parsedYearFilter,
        publisherFilter,
      } = getProperties(
        doParams,
        'typeFilter',
        'accessTypeFilter',
        'parsedYearFilter',
        'publisherFilter'
      );

      const body = {
        sort: {
          publication_year: 'asc',
          id: 'asc',
        },
        size: 15,
        query: {
          bool: {
            filter: [{
              terms: {
                id: get(source, 'linked_data_objects').mapBy('id'),
              },
            }],
          },
        },
      };
      if (innerRecordsNumber > 0) {
        body.search_after = [
          get(innerRecords, 'lastObject._source.publication_year') || 0,
          get(innerRecords, 'lastObject._id'),
        ];
      }
      if (typeFilter && get(typeFilter, 'length')) {
        body.query.bool.filter.push({
          terms: {
            'type.id': typeFilter.mapBy('id'),
          },
        });
      }
      if (accessTypeFilter && get(accessTypeFilter, 'length')) {
        body.query.bool.filter.push({
          terms: {
            'access_type.id': accessTypeFilter.mapBy('id'),
          },
        });
      }
      if (parsedYearFilter && parsedYearFilter.length) {
        body.query.bool = body.query.bool || {};
        body.query.bool.filter = body.query.bool.filter || [];
        const filter = {
          bool: {
            should: [],
          },
        };
        parsedYearFilter.forEach(rangeOrNumber => {
          if (typeof rangeOrNumber === 'number') {
            filter.bool.should.push({
              term: {
                publication_year: rangeOrNumber,
              },
            });
          } else {
            filter.bool.should.push({
              range: {
                publication_year: {
                  gte: rangeOrNumber.start,
                  lte: rangeOrNumber.end,
                },
              },
            });
          }
        });
        body.query.bool.filter.push(filter);       
      }
      if (publisherFilter && get(publisherFilter, 'length')) {
        body.query.bool.filter.push({
          terms: {
            'managing_organization.id':
              publisherFilter.mapBy('id'),
          },
        });
      }
      fetchInnerRecordsProxy = PromiseObject.create({
        promise: elasticsearch.post('data_object', '_search', body)
          .then(results => {
            if (innerRecordsNumber === -1) {
              safeExec(this, () => {
                this.set('innerRecordsNumber', results.hits.total);
              });
            }
            const hits = results.hits.hits;
            hits.forEach(({_source: { type, access_type } }) => {
              const typeId = get(type, 'id');
              const typeDef = typeMapping.findBy('id', typeId);
              if (typeDef) {
                set(type, 'translatedName', get(typeDef, 'name'));
              }
              const accessTypeId = get(access_type, 'id');
              const accessTypeDef = accessTypeMapping.findBy('id', accessTypeId);
              if (accessTypeDef) {
                set(access_type, 'indicator', get(accessTypeDef, 'indicator'));
              }
            });
            innerRecords.pushObjects(hits);
          }),
      });
      return this.set('fetchInnerRecordsProxy', fetchInnerRecordsProxy);
    }
  },

  actions: {
    resultAction() {
      console.log('result action!');
    },
    loadMore() {
      this.fetchNextInnerRecords();
    },
  },
});
