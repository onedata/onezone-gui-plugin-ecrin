import Component from '@ember/component';
import { get, computed } from '@ember/object';
import { htmlSafe } from '@ember/string';
import ListWatcher from 'onezone-gui-plugin-ecrin/utils/list-watcher';
import I18n from 'onezone-gui-plugin-ecrin/mixins/i18n';
import safeExec from 'onezone-gui-plugin-ecrin/utils/safe-method-execution';

export default Component.extend(I18n, {
  classNames: ['query-results'],

  /**
   * @override
   */
  i18nPrefix: 'components.queryResults',

  /**
   * @type {Utils.ReplacingChunksArray}
   * @virtual
   */
  results: undefined,

  rowHeight: 20,

  firstRowHeight: computed('rowHeight', 'results._start', function firstRowHeight() {
    const _start = this.get('results._start');
    return _start ? _start * this.get('rowHeight') : 0;
  }),

  firstRowStyle: computed('firstRowHeight', function firstRowStyle() {
    return htmlSafe(`height: ${this.get('firstRowHeight')}px;`);
  }),

  didInsertElement() {
    this._super(...arguments);

    const listWatcher = this.set('listWatcher', this.createListWatcher());
    listWatcher.scrollHandler();
  },

  createListWatcher() {
    return new ListWatcher(
      this.$(),
      '.data-row',
      (items, onTop) => safeExec(this, 'onListScroll', items, onTop),
      '.data-start-row',
    );
  },

  /**
   * @param {Array<HTMLElement>} items 
   * @param {boolean} headerVisible
   * @returns {undefined}
   */
  onListScroll(items, headerVisible) {
    const resultsArray = this.get('results');
    const sourceArray = get(resultsArray, 'sourceArray');
    const resultsArrayIds = sourceArray.mapBy('id');
    const firstId = items[0] && items[0].getAttribute('data-row-id') || null;
    const lastId = items[items.length - 1] &&
      items[items.length - 1].getAttribute('data-row-id') || null;
    let startIndex, endIndex;
    if (firstId === null && get(sourceArray, 'length') !== 0) {
      const rowHeight = this.get('rowHeight');
      const $firstRow = this.$('.data-start-row');
      const blankStart = $firstRow.offset().top * -1;
      const blankEnd = blankStart + window.innerHeight;
      startIndex = Math.floor(blankStart / rowHeight);
      endIndex = Math.floor(blankEnd / rowHeight);
    } else {
      startIndex = resultsArrayIds.indexOf(Number(firstId));
      endIndex = resultsArrayIds.indexOf(Number(lastId), startIndex);
    }
    resultsArray.setProperties({ startIndex, endIndex });
    safeExec(this, 'set', 'headerVisible', headerVisible);
  },
});
