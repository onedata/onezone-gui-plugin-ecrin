import Component from '@ember/component';
import { reads } from '@ember/object/computed';

export default Component.extend({
  /**
   * @virtual
   */
  result: undefined,

  source: reads('result._source'),

  title: reads('source.title'),
});
