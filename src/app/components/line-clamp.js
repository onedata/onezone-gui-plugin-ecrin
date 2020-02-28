/**
 * An extended version of line-clamp component which fixes lack of checking
 * `truncate` property at initial render
 * 
 * @module components/line-clamp
 * @author Michał Borzęcki
 * @copyright (C) 2019 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import LineClamp from 'ember-line-clamp/components/line-clamp';

export default LineClamp.extend({
  didInsertElement() {
    this._super(...arguments);

    const truncate = this.get('truncate');
    this._handleNewTruncateAttr(truncate);
    this.set('_expanded', !truncate);
  },
});
