import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default Route.extend({
  configuration: service(),

  beforeModel() {
    this._super(...arguments);
    return this.get('configuration').reloadConfiguration()
      .then(() => {
        this.transitionTo('query');
      });
  },
});
