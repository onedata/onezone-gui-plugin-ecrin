import Component from '@ember/component';
import { computed } from '@ember/object';
import ReplacingChunksArray from 'onezone-gui-plugin-ecrin/utils/replacing-chunks-array';
import I18n from 'onezone-gui-plugin-ecrin/mixins/i18n';
import { Promise } from 'rsvp';

export default Component.extend(I18n, {
  classNames: ['content-query'],

  /**
   * @override
   */
  i18nPrefix: 'components.contentQuery',

  /**
   * @type {Object}
   */
  queryParameters: Object.freeze({}),

  /**
   * @type {Ember.ComputedProperty<Utils.ReplacingChunksArray>}
   */
  queryResults: computed(function queryResults() {
    return ReplacingChunksArray.create({
      fetch: (...fetchArgs) => this.fetchResults(...fetchArgs),
      startIndex: 0,
      endIndex: 50,
      indexMargin: 24,
    });
  }),

  fetchResults(startFromIndex, size, offset) {
    if (startFromIndex === undefined) {
      startFromIndex = 0;
    }
    return new Promise((resolve) => {
      const records = [];
      for (let i = 0; i < size; i++) {
        records.push({
          id: String(startFromIndex + offset + i),
          index: startFromIndex + offset + i,
          name: 'record' + (startFromIndex + offset + i),
        });
      }
      resolve(records);
    });
  },

  actions: {
    parametersChanged(params) {
      this.set('queryParameters', params);
    },
  },
});
