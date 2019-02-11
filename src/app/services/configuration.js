import Service, { inject as service } from '@ember/service';
import safeExec from 'onezone-gui-plugin-ecrin/utils/safe-method-execution';

export default Service.extend({
  onezoneGuiResources: service(),

  /**
   * @type {Object|undefined}
   */
  configuration: undefined,

  /**
   * (Re)loads configuration object
   * @returns {Promise}
   */
  reloadConfiguration() {
    const onezoneGuiResources = this.get('onezoneGuiResources');
    return onezoneGuiResources.configRequest()
      .then(config => safeExec(this, () => {
        this.set('configuration', config);
      }))
      .catch(() => safeExec(this, () => {
        this.set('configuration', undefined);
      }));
  },
});
