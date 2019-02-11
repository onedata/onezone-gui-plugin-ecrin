import Component from '@ember/component';
import { computed } from '@ember/object';
import ReplacingChunksArray from 'onezone-gui-plugin-ecrin/utils/replacing-chunks-array';
import I18n from 'onezone-gui-plugin-ecrin/mixins/i18n';
import { Promise, resolve } from 'rsvp';
import QueryParams from 'onezone-gui-plugin-ecrin/utils/query-params';

export default Component.extend(I18n, {
  classNames: ['content-query', 'content'],

  /**
   * @override
   */
  i18nPrefix: 'components.contentQuery',

  /**
   * @type {Object}
   */
  queryParams: computed(function queryParams() {
    return QueryParams.create();
  }),

  /**
   * @type {Ember.ComputedProperty<Utils.ReplacingChunksArray>}
   */
  queryResults: computed(function queryResults() {
    return ReplacingChunksArray.create({
      fetch: () => resolve([]),
      startIndex: 0,
      endIndex: 50,
      indexMargin: 24,
    });
  }),

  fetchResults(startFromIndex, size, offset) {
    if (startFromIndex === undefined) {
      startFromIndex = 0;
    }
    return new Promise((resolve, reject) => {
      const records = [];
      for (let i = 1; i < size+1; i++) {
        records.push({
          id: String(startFromIndex + offset + i),
          index: startFromIndex + offset + i,
          name: 'record' + (startFromIndex + offset + i),
        });
      }
      if (startFromIndex < 200) {
        resolve(records);
      } else {
        reject('error');
      }
    });
  },

  actions: {
    parameterChanged(fieldName, newValue) {
      this.set(`queryParams.${fieldName}`, newValue);
    },
    find() {
      this.set('queryResults', ReplacingChunksArray.create({
        fetch: (...fetchArgs) => this.fetchResults(...fetchArgs),
        startIndex: 0,
        endIndex: 50,
        indexMargin: 24,
      }));
    },
    clearAll() {
      this.get('queryParams').clear();
      this.set('queryResults', ReplacingChunksArray.create({
        fetch: () => resolve([]),
        startIndex: 0,
        endIndex: 50,
        indexMargin: 24,
      }));
    },
  },
});
