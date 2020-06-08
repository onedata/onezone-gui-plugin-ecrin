/**
 * Container component for disclaimer
 * 
 * @module components/content-search-help
 * @author Michał Borzęcki
 * @copyright (C) 2020 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import Component from '@ember/component';
import I18n from 'onezone-gui-plugin-ecrin/mixins/i18n';
import $ from 'jquery';

export default Component.extend(I18n, {
  classNames: ['content-search-help'],

  actions: {
    goTo(anchor) {
      $('#application-container').scrollTop($(anchor).offset().top);
    },
  },
});
