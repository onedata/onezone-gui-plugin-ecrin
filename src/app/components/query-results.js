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
import notImplementedIgnore from 'onezone-gui-plugin-ecrin/utils/not-implemented-ignore';
import notImplementedReject from 'onezone-gui-plugin-ecrin/utils/not-implemented-reject';

export default Component.extend(I18n, {
  classNames: ['query-results'],

  media: service(),

  /**
   * @override
   */
  i18nPrefix: 'components.queryResults',

  /**
   * True if application is in the middle of data fetching process
   * @virtual optional
   * @type {boolean}
   */
  isFetchingData: false,

  /**
   * @virtual
   * @type {Array<Utils.Study>}
   */
  studies: computed(() => A()),

  /**
   * @virtual
   * @type {Function}
   * @returns {Promise<any>}
   */
  saveResults: notImplementedReject,

  /**
   * @virtual
   * @type {Function}
   * @param {Object} results
   * @returns {Promise<any>}
   */
  loadSavedResults: notImplementedReject,

  /**
   * @virtual
   * @type {Function}
   * @returns {Promise<Array<Object>>}
   */
  loadSavedResultsList: notImplementedReject,

  /**
   * @virtual
   * @type {Function}
   * @param {Object} results
   * @returns {Promise<any>}
   */
  removeSavedResults: notImplementedReject,

  /**
   * @virtual
   * @type {Function}
   * @returns {Promise<any>}
   */
  exportResultsToPdf: notImplementedReject,

  /**
   * @virtual
   * @type {Function}
   * @param {Array<Util.Study>} studies
   * @returns {any}
   */
  removeStudies: notImplementedIgnore,

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
  expandedStudyId: undefined,

  /**
   * @type {Util.ListWatcher}
   */
  listWatcher: null,

  /**
   * @type {ReplacingChunksArray<Utils.Study>}
   */
  studiesChunksArray: undefined,

  /**
   * @type {boolean}
   */
  isSaveDialogOpened: false,

  /**
   * @type {boolean}
   */
  isLoadDialogOpened: false,

  /**
   * @type {Ember.ComputedProperty<number>}
   */
  firstRowHeight: computed(
    'rowHeight',
    'studiesChunksArray._start',
    'expandedStudyId',
    'expandedRowExtraHeight',
    function firstRowHeight() {
      const {
        expandedStudyId,
        studiesChunksArray,
        rowHeight,
        expandedRowExtraHeight,
      } = this.getProperties(
        'expandedStudyId',
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
        if (sourceArray.slice(0, _start).findBy('id', expandedStudyId)) {
          height += expandedRowExtraHeight;
        }
        return height;
      }
    }
  ),

  /**
   * @type {Ember.ComputedProperty<HTMLSafe>}
   */
  firstRowStyle: computed('firstRowHeight', function firstRowStyle() {
    return htmlSafe(`height: ${this.get('firstRowHeight')}px;`);
  }),

  scrollContainerModifier: observer(
    'media.isMobile',
    function scrollContainerModifier() {
      const isMobile = this.get('media.isMobile');
      const $newScrollContainer = isMobile ?
        $('#application-container') : this.$('.studies-list');

      const $oldScrollContainer = this.get('$scrollContainer');
      if (!$oldScrollContainer || $oldScrollContainer[0] !== $newScrollContainer[0]) {
        const oldListWatcher = this.get('listWatcher');
        if (oldListWatcher) {
          oldListWatcher.destroy();
        }

        const newListWatcher = new ListWatcher(
          $newScrollContainer,
          '.data-row',
          (items, onTop) => safeExec(this, 'onListScroll', items, onTop),
          '.data-start-row',
        );
        newListWatcher.scrollHandler();

        this.setProperties({
          $newScrollContainer,
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
    const studiesChunksArray = this.get('studiesChunksArray');
    const sourceArray = get(studiesChunksArray, 'sourceArray');
    const sourceArrayIds = sourceArray.mapBy('id');
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
      startIndex = sourceArrayIds.indexOf(firstId);
      endIndex = sourceArrayIds.indexOf(lastId);
    }
    studiesChunksArray.setProperties({ startIndex, endIndex });
    safeExec(this, 'set', 'headerVisible', headerVisible);
  },

  actions: {
    resultExpanded(resultId) {
      this.set('expandedStudyId', resultId);
    },
    removeStudy(study) {
      const {
        removeStudies,
        expandedStudyId,
      } = this.getProperties('removeStudies', 'expandedStudyId');

      removeStudies([study]);
      if (expandedStudyId === get(study, 'id')) {
        this.set('expandedStudyId', null);
      }
    },
    removeAllStudies() {
      const {
        removeStudies,
        studies,
      } = this.getProperties('removeStudies', 'studies');

      removeStudies(studies.slice());
      this.set('expandedStudyId', null);
    },
    loadSavedResults(results) {
      return this.get('loadSavedResults')(results)
        .then(() => safeExec(this, () => {
          this.set('isLoadDialogOpened', false);
        }));
    },
    saveResults(name) {
      return this.get('saveResults')(name)
        .then(() => safeExec(this, () => {
          this.set('isSaveDialogOpened', false);
        }));
    },
  },
});
