import Component from '@ember/component';

export default Component.extend({
  classNames: ['filter-collapse', 'form-group'],

  /**
   * @virtual optional
   * @type {string}
   */
  label: undefined,

  /**
   * @type {boolean}
   */
  isExpanded: false,
});
