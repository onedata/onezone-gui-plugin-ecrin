/**
 * Renders a list of results (studies) obtained from elasticsearch
 * 
 * @module components/query-result
 * @author Michał Borzęcki
 * @copyright (C) 2019 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import Component from '@ember/component';
import { get, getProperties, computed, observer } from '@ember/object';
import { htmlSafe } from '@ember/string';
import ListWatcher from 'onezone-gui-plugin-ecrin/utils/list-watcher';
import I18n from 'onezone-gui-plugin-ecrin/mixins/i18n';
import safeExec from 'onezone-gui-plugin-ecrin/utils/safe-method-execution';
import $ from 'jquery';

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

  /**
   * @virtual
   * @type {number}
   */
  totalResultsNumber: undefined,

  /**
   * @virtual
   * @type {Utils.QueryParams}
   */
  queryParams: undefined,

  rowHeight: 43,

  expandedRowExtraHeight: 250,

  /**
   * @type {JQuery}
   */
  scrollContainer: undefined,

  /**
   * @type {string}
   */
  expandedResultId: undefined,

  /**
   * @type {Ember.ComputedProperty<number>}
   */
  firstRowHeight: computed('rowHeight', 'results._start', function firstRowHeight() {
    const {
      expandedResultId,
      results,
      rowHeight,
      expandedRowExtraHeight,
    } = this.getProperties(
      'expandedResultId',
      'results',
      'rowHeight',
      'expandedRowExtraHeight'
    );
    const {
      _start,
      sourceArray,
    } = getProperties(results, '_start', 'sourceArray');
    if (!_start) {
      return 0;
    } else {
      let height = _start * rowHeight;
      if (sourceArray.slice(0, _start).map(x => get(x, 'index.id'))
        .includes(expandedResultId)) {
        height += expandedRowExtraHeight;
      }
      return height;
    }
  }),

  /**
   * @type {Ember.ComputedProperty<HTMLSafe>}
   */
  firstRowStyle: computed('firstRowHeight', function firstRowStyle() {
    return htmlSafe(`height: ${this.get('firstRowHeight')}px;`);
  }),

  /**
   * @type {Ember.ComputedProperty<boolean>}
   */
  bottomLoading: computed(
    'results.{_fetchNextLock,initialLoad.isPending}',
    function bottomLoading() {
      return this.get('results._fetchNextLock') ||
        this.get('results.initialLoad.isPending');
    }
  ),

  resultsObserver: observer('results', function resultsObserver() {
    const scrollContainer = this.get('scrollContainer');
    if (scrollContainer) {
      scrollContainer.scrollTop(0);
    }
  }),

  didInsertElement() {
    this._super(...arguments);

    this.set('scrollContainer', $('.application-container'));
    const listWatcher = this.set('listWatcher', this.createListWatcher());
    listWatcher.scrollHandler();
  },

  createListWatcher() {
    return new ListWatcher(
      this.get('scrollContainer'),
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
    const resultsArrayIds = sourceArray.map(x => get(x, 'index.id'));
    const firstId = items[0] && Number(items[0].getAttribute('data-row-id')) || null;
    const lastId = items[items.length - 1] &&
      Number(items[items.length - 1].getAttribute('data-row-id')) || null;
    let startIndex, endIndex;
    if (firstId === null && get(sourceArray, 'length') !== 0) {
      const rowHeight = this.get('rowHeight');
      const $firstRow = this.$('.data-start-row');
      const blankStart = $firstRow.offset().top * -1;
      const blankEnd = blankStart + window.innerHeight;
      startIndex = Math.floor(blankStart / rowHeight);
      endIndex = Math.floor(blankEnd / rowHeight);
    } else {
      startIndex = resultsArrayIds.indexOf(firstId);
      endIndex = resultsArrayIds.indexOf(lastId);
    }
    resultsArray.setProperties({ startIndex, endIndex });
    safeExec(this, 'set', 'headerVisible', headerVisible);
  },

  actions: {
    resultExpanded(resultId) {
      this.set('expandedResultId', resultId);
    },
  },
});
