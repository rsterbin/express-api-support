
class LogicBase {

  init(feature) {
    this.feature = feature;
    this.context = feature.parent.context;
    this.setup();
  }

  setup() {}
}

module.exports = LogicBase;
