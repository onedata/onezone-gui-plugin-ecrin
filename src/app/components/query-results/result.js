/**
 * A component used internally by query-result component, that shows
 * one record of query results (one study).
 * 
 * @module components/query-reslts/result
 * @author Michał Borzęcki
 * @copyright (C) 2019 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import Component from '@ember/component';
import { observer, get, set, getProperties } from '@ember/object';
import { reads, alias } from '@ember/object/computed';
import { inject as service } from '@ember/service';
import PromiseObject from 'onezone-gui-plugin-ecrin/utils/promise-object';
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
   * @type {PromiseProxy}
   * Set by `fetchNextDataObjects` method
   */
  fetchDataObjectsProxy: undefined,

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
  filterParams: reads('queryParams.activeFilterParams'),

  /**
   * @type {Ember.ComputedProperty<Object>}
   */
  study: reads('result._source'),

  /**
   * @type {Ember.ComputedProperty<Ember.A<Object>>}
   */
  dataObjects: alias('result.dataObjects'),

  /**
   * Is different than -1 if data objects have been fetched at least once
   * @type {Ember.ComputedProperty<number>}
   */
  dataObjectsNumber: alias('result.dataObjectsNumber'),

  isExpandedObserver: observer(
    'isExpanded',
    function isExpandedObserver() {
      const {
        isExpanded,
        dataObjectsNumber,
      } = this.getProperties('isExpanded', 'dataObjectsNumber');
      if (isExpanded && dataObjectsNumber === -1) {
        this.fetchNextDataObjects();
      }
    }
  ),

  filterParamsObserver: observer('filterParams', function filterParamsObserver() {
    this.clearDataObjects();
    if (this.get('isExpanded')) {
      this.fetchNextDataObjects();
    }
  }),

  init() {
    this._super(...arguments);

    const dataObjectsNumber = this.get('dataObjectsNumber');
    if (dataObjectsNumber === undefined) {
      this.clearDataObjects();
    }

    this.isExpandedObserver();
  },

  /**
   * Clears state of data objects fetch
   * @returns {undefined}
   */
  clearDataObjects() {
    this.setProperties({
      dataObjects: A(),
      dataObjectsNumber: -1,
    });
  },

  /**
   * Loads next data object records related to study
   * @returns {PromiseObject}
   */
  fetchNextDataObjects() {
    let fetchDataObjectsProxy = this.get('fetchDataObjectsProxy');
    if (fetchDataObjectsProxy && get(fetchDataObjectsProxy, 'isLoading')) {
      return fetchDataObjectsProxy;
    } else {
      const {
        elasticsearch,
        dataObjectsNumber,
        dataObjects,
        study,
        typeMapping,
        accessTypeMapping,
        filterParams,
      } = this.getProperties(
        'elasticsearch',
        'dataObjectsNumber',
        'dataObjects',
        'study',
        'typeMapping',
        'accessTypeMapping',
        'filterParams',
      );
      const {
        typeFilter,
        accessTypeFilter,
        parsedYearFilter,
        publisherFilter,
      } = getProperties(
        filterParams,
        'typeFilter',
        'accessTypeFilter',
        'parsedYearFilter',
        'publisherFilter'
      );

      const body = {
        sort: [
          { publication_year: { order: 'desc' } },
          { id: { order: 'asc' } },
        ],
        size: 15,
        query: {
          bool: {
            filter: [{
              terms: {
                id: get(study, 'linked_data_objects').mapBy('id'),
              },
            }],
          },
        },
      };
      if (dataObjectsNumber > 0) {
        body.search_after = get(dataObjects, 'lastObject.sort');
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
            'managing_organization.id': publisherFilter.mapBy('id'),
          },
        });
      }
      fetchDataObjectsProxy = PromiseObject.create({
        promise: elasticsearch.post('data_object', '_search', body)
          .then(results => {
            if (dataObjectsNumber === -1) {
              safeExec(this, () => {
                this.set('dataObjectsNumber', results.hits.total);
              });
            }
            const hits = results.hits.hits;
            hits.forEach(({ _source: { type, access_type } }) => {
              const typeId = get(type, 'id');
              const typeDef = typeMapping.findBy('id', typeId);
              if (typeDef) {
                set(type, 'translatedName', get(typeDef, 'name'));
              }
              const accessTypeId = get(access_type, 'id');
              const accessTypeDef =
                accessTypeMapping.findBy('id', accessTypeId);
              if (accessTypeDef) {
                set(access_type, 'indicator', get(accessTypeDef, 'indicator'));
              }
            });
            dataObjects.pushObjects(hits);
          }),
      });
      return this.set('fetchDataObjectsProxy', fetchDataObjectsProxy);
    }
  },

  actions: {
    loadMore() {
      this.fetchNextDataObjects();
    },
  },
});
