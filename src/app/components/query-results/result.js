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
import { reads } from '@ember/object/computed';
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
   * @type {Object}
   */
  study: undefined,

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
   * Set by `fetchDataObjects` method
   */
  fetchDataObjectsProxy: undefined,

  /**
   * @type {ComputedProperty<string>}
   */
  studyDescription: reads('study.study_status.brief_description'),

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
   * @type {Array<Object>}
   */
  dataObjects: undefined,

  /**
   * @type {number}
   */
  dataObjectsNumber: -1,

  isExpandedObserver: observer(
    'isExpanded',
    function isExpandedObserver() {
      const {
        isExpanded,
        dataObjectsNumber,
      } = this.getProperties('isExpanded', 'dataObjectsNumber');
      if (isExpanded && dataObjectsNumber === -1) {
        this.fetchDataObjects();
      }
    }
  ),

  // filterParamsObserver: observer('filterParams', function filterParamsObserver() {
  //   this.reloadDataObjects();
  // }),

  init() {
    this._super(...arguments);

    this.reloadDataObjects();
  },

  /**
   * Clears and fetches again list of data objects related with this study
   * @returns {undefined}
   */
  reloadDataObjects() {
    this.clearDataObjects();
    if (this.get('isExpanded')) {
      this.fetchDataObjects();
    }
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
   * Loads data object records related to study
   * @returns {PromiseObject}
   */
  fetchDataObjects() {
    let fetchDataObjectsProxy = this.get('fetchDataObjectsProxy');
    if (fetchDataObjectsProxy && get(fetchDataObjectsProxy, 'isLoading')) {
      return fetchDataObjectsProxy;
    } else {
      const {
        elasticsearch,
        study,
        typeMapping,
        accessTypeMapping,
        filterParams,
      } = this.getProperties(
        'elasticsearch',
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

      const filters = [{
        terms: {
          id: get(study, 'linked_data_objects'),
        },
      }];
      const body = {
        sort: [
          { publication_year: { order: 'desc' } },
          { id: { order: 'asc' } },
        ],
        query: {
          bool: {
            filter: filters,
          },
        },
      };
      if (typeFilter && get(typeFilter, 'length')) {
        filters.push({
          terms: {
            'type.id': typeFilter.mapBy('id'),
          },
        });
      }
      if (accessTypeFilter && get(accessTypeFilter, 'length')) {
        filters.push({
          terms: {
            'access_type.id': accessTypeFilter.mapBy('id'),
          },
        });
      }
      if (parsedYearFilter && parsedYearFilter.length) {
        const yearFilter = {
          bool: {
            should: [],
          },
        };
        parsedYearFilter.forEach(rangeOrNumber => {
          if (typeof rangeOrNumber === 'number') {
            yearFilter.bool.should.push({
              term: {
                publication_year: rangeOrNumber,
              },
            });
          } else {
            yearFilter.bool.should.push({
              range: {
                publication_year: {
                  gte: rangeOrNumber.start,
                  lte: rangeOrNumber.end,
                },
              },
            });
          }
        });
        filters.push(yearFilter);
      }
      if (publisherFilter && get(publisherFilter, 'length')) {
        filters.push({
          terms: {
            'managing_organization.id': publisherFilter.mapBy('id'),
          },
        });
      }
      fetchDataObjectsProxy = PromiseObject.create({
        promise: elasticsearch.post('data_object', '_search', body)
          .then(results => {
            safeExec(this, () => {
              this.setProperties({
                dataObjectsNumber: results.hits.total.value,
              });
            });
            const hits = results.hits.hits;
            hits.forEach(({ _source: { object_type, access_type } }) => {
              const typeId = get(object_type, 'id');
              const typeDef = typeMapping.findBy('id', typeId);
              if (typeDef) {
                set(object_type, 'translatedName', get(typeDef, 'name'));
              }
              const accessTypeId = get(access_type, 'id');
              const accessTypeDef =
                accessTypeMapping.findBy('id', accessTypeId);
              if (accessTypeDef) {
                set(access_type, 'indicator', get(accessTypeDef,
                  'indicator'));
              }
            });
            safeExec(this, () => {
              this.setProperties({
                dataObjectsNumber: results.hits.total.value,
                dataObjects: hits,
              });
            });
          }),
      });
      return this.set('fetchDataObjectsProxy', fetchDataObjectsProxy);
    }
  },
});
