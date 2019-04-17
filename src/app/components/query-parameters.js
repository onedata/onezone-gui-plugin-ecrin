import Component from '@ember/component';
import { reads } from '@ember/object/computed';
import I18n from 'onezone-gui-plugin-ecrin/mixins/i18n';
import { inject as service } from '@ember/service';

export default Component.extend(I18n, {
  tagName: 'form',
  classNames: ['query-parameters', 'form'],

  configuration: service(),

  /**
   * @override
   */
  i18nPrefix: 'components.queryParameters',

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
  onFilter: () => {},

  /**
   * @virtual
   * @type {Utils.QueryParams}
   */
  queryParams: undefined,

  /**
   * @type {boolean}
   */
  areDataObjectFiltersVisible: true,

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

  actions: {
    toggleDataObjectFilters() {
      this.toggleProperty('areDataObjectFiltersVisible');
    },
  },
});
