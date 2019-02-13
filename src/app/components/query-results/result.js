import Component from '@ember/component';
import { observer, computed, get } from '@ember/object';
import { reads, alias, equal } from '@ember/object/computed';
import { inject as service } from '@ember/service';
import PromiseObject from 'onezone-gui-plugin-ecrin/utils/promise-object';
import { resolve } from 'rsvp';
import { A } from '@ember/array';

export default Component.extend({
  classNames: ['query-results-result'],

  elasticsearch: service(),

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
  title: reads('source.title'),

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
        id,
      } = this.getProperties(
        'elasticsearch',
        'innerRecordsNumber',
        'innerRecords',
        'id'
      );
      let searchAfter = undefined;
      if (innerRecordsNumber > 0) {
        searchAfter = [get(innerRecords, 'lastObject._id')];
      }
      const body = {
        sort: {
          _id: 'asc',
        },
        query: {
          term: {
            studies: id,
          },
        },
      };
      if (searchAfter) {
        body.search_after = searchAfter;
      }
      fetchInnerRecordsProxy = PromiseObject.create({
        promise: elasticsearch.request('POST', '/dos/do/_search', body)
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
    loadMore() {
      this.fetchNextInnerRecords();
    },
  },
});
