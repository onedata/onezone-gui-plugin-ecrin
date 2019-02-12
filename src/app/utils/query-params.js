import EmberObject from '@ember/object';
import { computed } from '@ember/object';

export default EmberObject.extend({
  /**
   * One of 'specificStudy', 'studyCharact', 'viaPubPaper'
   * @type {string}
   */
  mode: 'studyCharact',

  /**
   * Only for mode === 'specificStudy'
   * @type {string}
   */
  studyId: '',

  /**
   * Only for mode === 'studyCharact'
   * @type {string}
   */
  studyTitleContains: '',

  /**
   * Only for mode === 'studyCharact'
   * @type {string}
   */
  studyTopicsInclude: '',

  /**
   * Only for mode === 'studyCharact'
   * @type {string}
   */
  typeFilter: Object.freeze([]),

  /**
   * Only for mode === 'studyCharact'
   * @type {string}
   */
  accessTypeFilter: Object.freeze([]),

  /**
   * Only for mode === 'studyCharact'
   * @type {string}
   */
  yearFilter: '',

  /**
   * Only for mode === 'studyCharact'
   * @type {string}
   */
  publisherFilter: Object.freeze([]),
  
  /**
   * Only for mode === 'viaPubPaper'
   * @type {string}
   */
  doi: '',

  /**
   * @type {Ember.ComputedProperty<boolean>}
   */
  hasParams: computed(
    'mode',
    'studyId',
    'studyTitleContains',
    'studyTopicsInclude',
    'typeFilter',
    'accessTypeFilter',
    'yearFilter',
    'publisherFilter',
    'doi',
    function hasParams() {
      const {
        mode,
        studyId,
        studyTitleContains,
        studyTopicsInclude,
        typeFilter,
        accessTypeFilter,
        yearFilter,
        publisherFilter,
        doi,
      } = this.getProperties(
        'mode',
        'studyId',
        'studyTitleContains',
        'studyTopicsInclude',
        'typeFilter',
        'accessTypeFilter',
        'yearFilter',
        'publisherFilter',
        'doi'
      );
      switch (mode) {
        case 'specificStudy':
          return !!studyId;
        case 'studyCharact':
          return !!studyTitleContains || !!studyTopicsInclude ||
            !!typeFilter.length || !!accessTypeFilter.length || !!yearFilter ||
            !!publisherFilter.length;
        case 'viaPubPaper':
          return !!doi;
      }
    }
  ),

  /**
   * Clears query params
   * @returns {undefined}
   */
  clear() {
    this.setProperties({
      mode: 'studyCharact',
      studyId: '',
      studyTitleContains: '',
      studyTopicsInclude: '',
      typeFilter: [],
      accessTypeFilter: [],
      yearFilter: '',
      publisherFilter: [],
      doi: '',
    });
  },
});
