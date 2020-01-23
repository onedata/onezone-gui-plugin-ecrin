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
