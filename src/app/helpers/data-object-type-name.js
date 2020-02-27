/**
 * Constructs name for passed data object type.
 *
 * @module helpers/data-object-type-name
 * @author Michał Borzęcki
 * @copyright (C) 2020 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import { helper } from '@ember/component/helper';
import { get } from '@ember/object';

export function dataObjectTypeName(type) {
  return `${get(type, 'name')} [${get(type, 'class')}]`;
}

export default helper(([type]) => dataObjectTypeName(type));
