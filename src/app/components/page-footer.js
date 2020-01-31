/**
 * A component, which shows content footer
 * 
 * @module components/page-footer
 * @author Michał Borzęcki
 * @copyright (C) 2019 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import Component from '@ember/component';
import I18n from 'onezone-gui-plugin-ecrin/mixins/i18n';
import { inject as service } from '@ember/service';
import { computed } from '@ember/object';

export default Component.extend(I18n, {
  classNames: ['page-footer', 'panel'],

  configuration: service(),

  /**
   * @override
   */
  i18nPrefix: 'components.pageFooter',

  /**
   * @type {ComputedProperty<String>}
   */
  contactHref: computed('configuration.contactEmail', function contactHref() {
    const contactEmail = this.get('configuration.contactEmail');
    if (contactEmail) {
      return `mailto:${contactEmail}`;
    } else {
      return 'https://www.ecrin.org/';
    }
  }),
});
