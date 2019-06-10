import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { get } from '@ember/object';
import { Promise } from 'rsvp';

export default Route.extend({
  appProxy: service(),
  configuration: service(),

  beforeModel() {
    const result = this._super(...arguments);

    const {
      appProxy,
      configuration,
    } = this.getProperties('appProxy', 'configuration');

    return get(appProxy, 'appProxyLoadingPromise').then(() => 
      Promise.all([
        configuration.reloadConfiguration(),
        configuration.reloadAvailableEsValues(),
      ]).then(() => result)
    );
  },
});
