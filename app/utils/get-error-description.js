/**
 * Unpack string with error from backend rejected request
 *
 * @module utils/get-error-description
 * @author Michał Borzęcki
 * @copyright (C) 2019 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import { htmlSafe, isHTMLSafe } from '@ember/string';
import Ember from 'ember';

/**
 * Gets error details from error object that is returned on backend reject.
 *
 * @export
 * @param {object} error
 * @param {object} i18n
 * @return {object}
 */
export default function getErrorDescription(error) {
  let message;
  let errorJson;

   if (typeof error === 'object' && error.message) {
    message = error.message;
  } else if (isHTMLSafe(error)) {
    message = error;
  } else {
    try {
      errorJson = JSON.stringify(error);
    } catch (e) {
      if (!(e instanceof TypeError)) {
        throw error;
      }
    }
  }
  message = message ?
    htmlSafe(Ember.Handlebars.Utils.escapeExpression(message)) : undefined;
  errorJson = errorJson ?
    htmlSafe(`<code>${Ember.Handlebars.Utils.escapeExpression(errorJson)}</code>`) :
    undefined;
  return {
    message,
    errorJsonString: errorJson,
  };
}
