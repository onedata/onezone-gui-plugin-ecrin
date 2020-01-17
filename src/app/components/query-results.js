/**
 * Renders a list of results (studies) obtained from elasticsearch
 * 
 * @module components/query-result
 * @author Michał Borzęcki
 * @copyright (C) 2019 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import Component from '@ember/component';
import { set, get, getProperties, computed, observer } from '@ember/object';
import { htmlSafe } from '@ember/string';
import ListWatcher from 'onezone-gui-plugin-ecrin/utils/list-watcher';
import I18n from 'onezone-gui-plugin-ecrin/mixins/i18n';
import safeExec from 'onezone-gui-plugin-ecrin/utils/safe-method-execution';
import $ from 'jquery';
import { inject as service } from '@ember/service';
import ReplacingChunksArray from 'onezone-gui-plugin-ecrin/utils/replacing-chunks-array';
import { resolve } from 'rsvp';
import { A } from '@ember/array';

export default Component.extend(I18n, {
  classNames: ['query-results'],

  media: service(),

  /**
   * @override
   */
  i18nPrefix: 'components.queryResults',

  studies: computed(() => A()),

  /**
   * @type {number}
   */
  rowHeight: 43,

  /**
   * @type {number}
   */
  expandedRowExtraHeight: 250,

  /**
   * @type {JQuery}
   */
  $scrollContainer: undefined,

  /**
   * @type {string}
   */
  expandedResultId: undefined,

  /**
   * @type {Util.ListWatcher}
   */
  listWatcher: null,

  studiesChunksArray: undefined,

  /**
   * @virtual
   * @type {Function}
   * @param {Array<Util.Study>} studies
   * @returns {any}
   */
  removeStudies: () => {},

  /**
   * @type {Ember.ComputedProperty<number>}
   */
  firstRowHeight: computed('rowHeight', 'studiesChunksArray._start',
    function firstRowHeight() {
      const {
        expandedResultId,
        studiesChunksArray,
        rowHeight,
        expandedRowExtraHeight,
      } = this.getProperties(
        'expandedResultId',
        'studiesChunksArray',
        'rowHeight',
        'expandedRowExtraHeight'
      );
      const {
        _start,
        sourceArray,
      } = getProperties(studiesChunksArray, '_start', 'sourceArray');
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
    'studiesChunksArray.{_fetchNextLock,initialLoad.isPending}',
    function bottomLoading() {
      return this.get('studiesChunksArray._fetchNextLock') ||
        this.get('studiesChunksArray.initialLoad.isPending');
    }
  ),

  scrollContainerModifier: observer(
    'media.isMobile',
    function scrollContainerModifier() {
      const isMobile = this.get('media.isMobile');
      const $scrollContainer = isMobile ?
        $('#application-container') : this.$('.studies-list');

      const $oldScrollContainer = this.get('$scrollContainer');
      if (!$oldScrollContainer || $oldScrollContainer[0] !== $scrollContainer[0]) {
        const oldListWatcher = this.get('listWatcher');
        if (oldListWatcher) {
          oldListWatcher.destroy();
        }

        const newListWatcher = new ListWatcher(
          $scrollContainer,
          '.data-row',
          (items, onTop) => safeExec(this, 'onListScroll', items, onTop),
          '.data-start-row',
        );
        newListWatcher.scrollHandler();

        this.setProperties({
          $scrollContainer,
          listWatcher: newListWatcher,
        });
      }
    }
  ),

  studiesObserver: observer('studies', function studiesObserver() {
    this.set('studiesChunksArray.sourceArray', this.get('studies'));
  }),

  init() {
    this._super(...arguments);

    const studiesChunksArray = ReplacingChunksArray.create({
      fetch() { return resolve([]); },
      startIndex: 0,
      endIndex: 50,
      indexMargin: 24,
    });
    get(studiesChunksArray, 'initialLoad')
      .then(() => set(studiesChunksArray, '_endReached', true));

    this.set('studiesChunksArray', studiesChunksArray);
    this.studiesObserver();
  },

  didInsertElement() {
    this._super(...arguments);

    this.scrollContainerModifier();
  },

  /**
   * @param {Array<HTMLElement>} items 
   * @param {boolean} headerVisible
   * @returns {undefined}
   */
  onListScroll(items, headerVisible) {
    const resultsArray = this.get('studiesChunksArray');
    const sourceArray = get(resultsArray, 'sourceArray');
    const resultsArrayIds = sourceArray.map(x => get(x, 'id'));
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
    removeStudy(study) {
      const {
        removeStudies,
        expandedResultId,
      } = this.getProperties('removeStudies', 'expandedResultId');

      removeStudies([study]);
      if (expandedResultId === get(study, 'id')) {
        this.set('expandedResultId', null);
      }
    },
    removeAllStudies() {
      const {
        removeStudies,
        studies,
      } = this.getProperties('removeStudies', 'studies');

      removeStudies(studies);
      this.set('expandedResultId', null);
    },
  },
});
