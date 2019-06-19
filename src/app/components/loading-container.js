/**
 * Wraps other template into loader or error alert basing on provided state
 *
 * It helps in building GUI with showing state of some async resource.
 *
 * An example:
 * ```
 * {{#loading-container isLoading=loadingState errorReason=backendError}}
 *   {{some-component}}
 * {{/loading-container}}
 * ```
 *
 * It will render loader (eg. spinner) if `loadingState` is true.
 * It will render error message if `backendError` is non-empty string
 * It will render `some-component` if above conditions are not met.
 *
 * @module components/loading-container
 * @author Jakub Liput
 * @copyright (C) 2017-2019 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import Component from '@ember/component';
import { computed } from '@ember/object';
export default Component.extend({
  tagName: '',

  /**
   * @virtual optional
   * If provided and tag name is not empty, set the class of additional spinner
   * container when loading.
   * @type {string}
   */
  loadingClass: '',

  sizeClass: 'md',

  isLoaded: computed('isLoading', 'isError', function () {
    return !this.get('isLoading') && !this.get('isError');
  }),
  isLoading: undefined,
  isError: computed('errorReason', function () {
    return this.get('errorReason') != null;
  }),
  errorReason: undefined,
  customErrorMessage: undefined,
});
