import Component from '@ember/component';
import I18n from 'onezone-gui-plugin-ecrin/mixins/i18n';
import notImplementedIgnore from 'onezone-gui-plugin-ecrin/utils/not-implemented-ignore';
import { computed } from '@ember/object';
import { debounce } from '@ember/runloop';

export default Component.extend(I18n, {
  classNames: ['data-object-record'],

  /**
   * @type {Window}
   */
  _window: window,

  /**
   * @override
   */
  i18nPrefix: 'components.queryResults.dataObjectRecord',

  /**
   * @virtual
   * @type {boolean}
   */
  isExpanded: false,

  /**
   * @type {Function}
   * @returns {any}
   */
  toggleExpansion: notImplementedIgnore,

  /**
   * @virtual
   * @type {String}
   */
  typeText: undefined,

  /**
   * @virtual optional
   * @type {number}
   */
  year: undefined,

  /**
   * @virtual optional
   * @type {String}
   */
  accessTypeIndicator: undefined,

  /**
   * @virtual optional
   * @type {String}
   */
  accessTypeName: undefined,

  /**
   * @virtual optional
   * @type {boolean}
   */
  showYear: true,

  /**
   * @virtual optional
   * @type {boolean}
   */
  showAccessIndicator: true,

  /**
   * @virtual optional
   * @type {boolean}
   */
  showCheckbox: true,

  /**
   * @type {Function}
   * @returns {any}
   */
  toggleSelection: notImplementedIgnore,

  /**
   * @type {ComputedProperty<Function>}
   */
  windowResizeHandler: computed(function () {
    return () => debounce(this, 'recalculateIsExpandable', 200);
  }),

  didInsertElement() {
    this._super(...arguments);

    const {
      windowResizeHandler,
      _window,
    } = this.getProperties(
      'windowResizeHandler',
      '_window'
    );

    _window.addEventListener('resize', windowResizeHandler);
    this.recalculateIsExpandable();
  },

  willDestroyElement() {
    try {
      const {
        windowResizeHandler,
        _window,
      } = this.getProperties(
        'windowResizeHandler',
        '_window'
      );

      _window.removeEventListener('resize', windowResizeHandler);
    } finally {
      this._super(...arguments);
    }
  },

  recalculateIsExpandable() {
    const $overflowContainer = this.$('.data-object-overflow-container');
    this.set('isExpandable', $overflowContainer[0].scrollHeight > 44);
  },
});
