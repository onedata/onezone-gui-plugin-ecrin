import LineClamp from 'ember-line-clamp/components/line-clamp';

export default LineClamp.extend({
  didInsertElement() {
    this._super(...arguments);

    this._handleNewTruncateAttr(this.get('truncate'));
  },
});
