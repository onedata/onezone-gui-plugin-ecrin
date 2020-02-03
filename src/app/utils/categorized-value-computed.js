/**
 * Creates a computed which casts elasticsearch model property value to some
 * value from bounded set of possible values (specified in configuration).
 *
 * @module utils/categorized-value-computed
 * @author Michał Borzęcki
 * @copyright (C) 2019 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import { computed } from '@ember/object';

export default function categorizedValueComputed(rawFieldPath, fieldNameInConfig) {
  return computed(
    `raw.${rawFieldPath}.id`,
    `configuration.{${fieldNameInConfig}Mapping,${fieldNameInConfig}UnknownValue}`,
    function () {
      const rawValueId = this.get(`raw.${rawFieldPath}.id`);
      const mapping = this.get(`configuration.${fieldNameInConfig}Mapping`);
      const unknownValue = this.get(`configuration.${fieldNameInConfig}UnknownValue`);

      if (rawValueId !== undefined) {
        return mapping.findBy('id', rawValueId) || unknownValue;
      } else {
        return unknownValue;
      }
    }
  );
}
