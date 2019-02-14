import Component from '@ember/component';
import { observer, computed, get } from '@ember/object';
import { reads, alias, equal, or } from '@ember/object/computed';
import { inject as service } from '@ember/service';
import PromiseObject from 'onezone-gui-plugin-ecrin/utils/promise-object';
import { resolve } from 'rsvp';
import { A } from '@ember/array';
import I18n from 'onezone-gui-plugin-ecrin/mixins/i18n';

export default Component.extend(I18n, {
  classNames: ['query-results-result'],

  elasticsearch: service(),

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
   * @type {BsAccordion.Item}
   */
  item: undefined,

  /**
   * @virtual
   * @type {boolean}
   */
  isExpanded: false,

  fetchInnerRecordsProxy: computed(function () {
    return PromiseObject.create({
      promise: resolve(),
    });
  }),

  /**
   * @type {Ember.ComputedProperty<Object>}
   */
  source: reads('result._source'),

  id: reads('result._id'),

  /**
   * @type {Ember.ComputedProperty<string>}
   */
  title: or('source.title', 'source.description'),

  /**
   * @type {Ember.ComputedProperty<string>}
   */
  resultType: reads('result._type'),

  /**
   * Is true if component should show multiple studies for DO instead of
   * multiple DOs for study
   * @type {Ember.ComputedProperty<boolean>}
   */
  isRelationInverted: equal('resultType', 'do'),

  /**
   * @type {Ember.ComputedProperty<Ember.A<Object>>}
   */
  innerRecords: alias('result.innerRecord'),

  /**
   * Is different than -1 if inner records have been fetched at least once
   * @type {Ember.ComputedProperty<number>}
   */
  innerRecordsNumber: alias('result.innerRecordNumber'),

  /**
   * @type {Ember.ComputedProperty<string>}
   */
  innerRecordsQueryPath: computed(
    'isRelationInverted',
    function innerRecordsSearchPath() {
      return this.get('isRelationInverted') ?
        '/studies/study/_search' : '/dos/do/_search';
    }
  ),

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

  init() {
    this._super(...arguments);

    const innerRecordsNumber = this.get('innerRecordsNumber');

    if (innerRecordsNumber === undefined) {
      this.setProperties({
        innerRecords: A(),
        innerRecordsNumber: -1,
      });
    }

    this.isExpandedObserver();
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
        innerRecordsQueryPath,
        isRelationInverted,
      } = this.getProperties(
        'elasticsearch',
        'innerRecordsNumber',
        'innerRecords',
        'innerRecordsQueryPath',
        'isRelationInverted'
      );
      let body = {};
      let searchAfter = undefined;
      if (isRelationInverted) {
        if (innerRecordsNumber > 0) {
          searchAfter = [get(innerRecords, 'lastObject._id')];
        }
        body = {
          sort: {
            _id: 'asc',
          },
          query: {
            terms: {
              _id: this.get('source.studies'),
            },
          },
        };
      } else {
        if (innerRecordsNumber > 0) {
          searchAfter = [
            get(innerRecords, 'lastObject._source.year') || 0,
            get(innerRecords, 'lastObject._id'),
          ];
        }
        body = {
          sort: {
            year: 'asc',
            _id: 'asc',
          },
          query: {
            term: {
              studies: this.get('id'),
            },
          },
        };
      }
      if (searchAfter) {
        body.search_after = searchAfter;
      }
      fetchInnerRecordsProxy = PromiseObject.create({
        promise: elasticsearch.request('POST', innerRecordsQueryPath, body)
          .then(results => {
            if (innerRecordsNumber === -1) {
              this.set('innerRecordsNumber', results.hits.total);
            }
            innerRecords.pushObjects(results.hits.hits);
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
