import Component from '@ember/component';
import { computed, observer } from '@ember/object';
import I18n from 'onezone-gui-plugin-ecrin/mixins/i18n';

export default Component.extend(I18n, {
  tagName: 'form',
  classNames: ['query-parameters', 'form'],

  /**
   * @override
   */
  i18nPrefix: 'components.queryParameters',

  /**
   * @type {string}
   */
  search: '',

  /**
   * @type {string}
   */
  mode: '',

  /**
   * @type {string}
   */
  studyTitleContains: '',

  /**
   * @type {string}
   */
  studyTopicsInclude: '',

  /**
   * @type {string}
   */
  typeFilter: '',

  /**
   * @type {string}
   */
  accessTypeFilter: '',

  /**
   * @type {string}
   */
  yearFilter: '',

  /**
   * @type {string}
   */
  publisherFilter: '',

  /**
   * FIXME i18n
   * @type {Array<string>}
   */
  modeOptions: Object.freeze([
    'Specific study',
    'Study characteristics',
    'Via published paper',
  ]),

  /**
   * FIXME i18n
   * @type {Array<string>}
   */
  typeFilterOptions: Object.freeze([
    'type1',
    'type2',
    'type3',
    'type4',
    'type5',
    'type6',
    'type7',
    'type8',
  ]),

  /**
   * @type {Ember.ComputedProperty<Object>}
   */
  queryParameters: computed(
    'search',
    'mode',
    'studyTitleContains',
    'studyTopicsInclude',
    'typeFilter',
    'accessTypeFilter',
    'yearFilter',
    'publisherFilter',
    function queryParameters() {
      const {
        search,
        mode,
        studyTitleContains,
        studyTopicsInclude,
        typeFilter,
        accessTypeFilter,
        yearFilter,
        publisherFilter,
      } = this.getProperties(
        'search',
        'mode',
        'studyTitleContains',
        'studyTopicsInclude',
        'typeFilter',
        'accessTypeFilter',
        'yearFilter',
        'publisherFilter'
      );
      return {
        search,
        mode,
        studyTitleContains,
        studyTopicsInclude,
        typeFilter,
        accessTypeFilter,
        yearFilter,
        publisherFilter,
      };
    }
  ),

  queryParametersObserver: observer('queryParameters', function queryParametersObserver() {
    const {
      onChange,
      queryParameters,
    } = this.getProperties('onChange', 'queryParameters');
    onChange(queryParameters);
  }),

  init() {
    this._super(...arguments);
    this.get('queryParameters');
  },
});
