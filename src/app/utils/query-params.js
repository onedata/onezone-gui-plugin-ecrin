import EmberObject from '@ember/object';

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
  typeFilter: undefined,

  /**
   * Only for mode === 'studyCharact'
   * @type {string}
   */
  accessTypeFilter: undefined,

  /**
   * Only for mode === 'studyCharact'
   * @type {string}
   */
  yearFilter: '',

  /**
   * Only for mode === 'studyCharact'
   * @type {string}
   */
  publisherFilter: '',
  
  /**
   * Only for mode === 'viaPubPaper'
   * @type {string}
   */
  doi: '',

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
      typeFilter: undefined,
      accessTypeFilter: undefined,
      yearFilter: '',
      publisherFilter: '',
      doi: '',
    });
  },
});
