import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { Promise } from 'rsvp';

export default Route.extend({
  configuration: service(),

  beforeModel() {
    const result = this._super(...arguments);

    const configuration = this.get('configuration');

    return Promise.all([
      configuration.reloadConfiguration(),
      configuration.reloadAvailableEsValues(),
    ]).then(() => result);
  },
});
