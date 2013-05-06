var H5PEditor = H5PEditor || {};

H5PEditor.widgets.select = H5PEditor.Select = (function (E) {
  /**
   * Initialize a new widget.
   *
   * @param {object} parent
   * @param {object} field
   * @param {object} params
   * @param {function} setValue
   * @returns {_L3.C}
   */
  function C(parent, field, params, setValue) {
    this.field = field;
    this.value = params;
    this.setValue = setValue;
  };

  /**
   * Append widget to the DOM.
   *
   * @param {jQuery} $wrapper
   * @returns {undefined}
   */
  C.prototype.appendTo = function ($wrapper) {
    this.$item = E.$(this.createHtml()).appendTo($wrapper);
    this.$errors = this.$item.children('.errors');

    // TODO: Support changes callbacks?
  };

  /**
   * Generate HTML for the widget.
   *
   * @returns {String} HTML.
   */
  C.prototype.createHtml = function () {
    var options = '';
    for (var i = 0; i < this.field.options.length; i++) {
      var option = this.field.options[i];
      options += E.createOption(option.value, option.label, option.value === this.value);
    }

    var label = E.createLabel(this.field, '<select>' + options + '</select>');

    return E.createItem(this.field.type, label, this.field.description);
  };


  /**
   * Validate this field.
   *
   * @returns {Boolean}
   */
  C.prototype.validate = function () {
    return true;
  };


  /**
   * Remove widget from DOM.
   *
   * @returns {undefined}
   */
  C.prototype.remove = function () {
    this.$item.remove();
  };

  return C;
})(H5PEditor);