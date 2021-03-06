/**
 * A form with query parameters for studies.
 * 
 * @module components/query-parameters
 * @author Michał Borzęcki
 * @copyright (C) 2019 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import Component from '@ember/component';
import { get } from '@ember/object';
import { reads } from '@ember/object/computed';
import I18n from 'onezone-gui-plugin-ecrin/mixins/i18n';
import { inject as service } from '@ember/service';
import notImplementedIgnore from 'onezone-gui-plugin-ecrin/utils/not-implemented-ignore';

export default Component.extend(I18n, {
  tagName: 'form',
  classNames: ['query-parameters', 'form'],

  configuration: service(),
  router: service(),

  /**
   * @override
   */
  i18nPrefix: 'components.queryParameters',

  /**
   * True if application is in the middle of data fetching process
   * @virtual optional
   * @type {boolean}
   */
  isFetchingData: false,

  /**
   * @virtual
   * @type {Utils.StudySearchParams}
   */
  studySearchParams: undefined,

  /**
   * @virtual optional
   * @type {boolean}
   */
  isStackingBlocked: false,

  /**
   * @virtual
   * @type {Function}
   * @param {string} fieldName
   * @param {any} newValue
   * @returns {undefined}
   */
  onChange: undefined,

  /**
   * @virtual
   * @type {Function}
   * @returns {undefined}
   */
  onFind: notImplementedIgnore,

  /**
   * @virtual
   * @type {Function}
   * @returns {undefined}
   */
  onFindWithStacking: notImplementedIgnore,

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
  studyTitleTopicOperatorOptions: Object.freeze(['and', 'or']),

  /**
   * @type {Ember.ComputedProperty<Array<Object>>}
   */
  studyIdTypeMapping: reads('configuration.studyIdTypeMapping'),

  entryMatcher(item, term) {
    return get(item, 'name').toLowerCase().indexOf(term.trim().toLowerCase());
  },

  actions: {
    goToHelp() {
      this.get('router').transitionTo('search-help');
    },
  },
});
