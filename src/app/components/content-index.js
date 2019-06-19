/**
 * A component, which shows start page with simplified query parameters form.
 * 
 * @module components/content-index
 * @author Michał Borzęcki
 * @copyright (C) 2019 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import Component from '@ember/component';
import { inject as service } from '@ember/service';
import { computed, get } from '@ember/object';
import { reads } from '@ember/object/computed';
import I18n from 'onezone-gui-plugin-ecrin/mixins/i18n';
import QueryParams from 'onezone-gui-plugin-ecrin/utils/query-params';

export default Component.extend(I18n, {
  classNames: ['content-index'],

  router: service(),
  configuration: service(),

  /**
   * @override
   */
  i18nPrefix: 'components.contentIndex',

  /**
   * @type {Array<string>}
   */
  modeOptions: Object.freeze([
    'specificStudy',
    'studyCharact',
    'viaPubPaper',
  ]),

  /**
   * @type {Ember.ComputedProperty<Array<Object>>}
   */
  studyIdTypeMapping: reads('configuration.studyIdTypeMapping'),

  /**
   * @type {Ember.ComputedProperty<Array<Object>>}
   */
  typeFilterOptions: reads('configuration.typeMapping'),

  /**
   * @type {Ember.ComputedProperty<Array<Object>>}
   */
  accessTypeFilterOptions: reads('configuration.accessTypeMapping'),

  /**
   * @type {Ember.ComputedProperty<Array<Object>>}
   */
  publisherFilterOptions: reads('configuration.publisherMapping'),

  /**
   * @type {Ember.ComputedProperty<Utils.QueryParams>}
   */
  queryParams: computed(function queryParams() {
    return QueryParams.create();
  }),

  actions: {
    find() {
      const queryParams = this.get('queryParams');
      queryParams.applyFindParams();
      this.get('router').transitionTo('query', {
        queryParams: get(queryParams, 'findQueryParams'),
      });
    },
  },
});
