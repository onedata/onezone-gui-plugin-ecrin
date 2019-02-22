import Service, { inject as service } from '@ember/service';
import safeExec from 'onezone-gui-plugin-ecrin/utils/safe-method-execution';
import { reads } from '@ember/object/computed';

export default Service.extend({
  onezoneGuiResources: service(),

  /**
   * @type {Object|undefined}
   */
  configuration: undefined,

  /**
   * @type {Ember.ComputedProperty<Array<Object>>}
   */
  studyIdTypeMapping: reads('configuration.studyIdTypeMapping'),

  /**
   * @type {Ember.ComputedProperty<Array<Object>>}
   */
  typeMapping: reads('configuration.typeMapping'),

  /**
   * @type {Ember.ComputedProperty<Array<Object>>}
   */
  accessTypeMapping: reads('configuration.accessTypeMapping'),

  /**
   * @type {Ember.ComputedProperty<Array<Object>>}
   */
  publisherMapping: reads('configuration.publisherMapping'),

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
