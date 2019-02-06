import Component from '@ember/component';
import { inject as service } from '@ember/service';

export default Component.extend({
  elasticsearch: service(),

  init() {
    this._super(...arguments);

    const elasticsearch = this.get('elasticsearch');
    elasticsearch.fetch('/countries/country/1');
  },
});
