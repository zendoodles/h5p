var H5PEditor = H5PEditor || {};
var ns = H5PEditor;

/**
 * Creates a boolean field for the editor.
 * 
 * @param {mixed} parent
 * @param {object} field
 * @param {mixed} params
 * @param {function} setValue
 * @returns {ns.Boolean}
 */
ns.Boolean = function (parent, field, params, setValue) {
  this.field = field;
  this.value = params;
  this.setValue = setValue;
};

/**
 * Create HTML for the boolean field.
 */
ns.Boolean.prototype.createHtml = function () {
  var input = '<input type="checkbox"';
  if (this.field.description !== undefined) {
    input += ' title="' + this.field.description + '"';
  }
  if (this.value !== undefined && this.value) {
    input += ' checked="checked"';
  }
  input += '/>';
  
  var label = '<label>' + input;
  if (this.field.label !== 0) {
    label += this.field.label === undefined ? this.field.name : this.field.label;
  }
  label += '</label>';
  
  return ns.createItem(this.field.type, label);
};

/**
 * "Validate" the current boolean field.
 */
ns.Boolean.prototype.validate = function () {
  return this.$input.is(':checked') ? true : false;
};

/**
 * Append the boolean field to the given wrapper.
 * 
 * @param {jQuery} $wrapper
 * @returns {undefined}
 */
ns.Boolean.prototype.appendTo = function ($wrapper) {
  var that = this;

  this.$item = ns.$(this.createHtml()).appendTo($wrapper);
  this.$input = this.$item.children('label').children('input');
  this.$errors = this.$item.children('.h5peditor-errors');

  this.$input.change(function () {
    // Validate
    var value = that.validate();
    that.setValue(that.field, value);
  });
};

/**
 * Remove this item.
 */
ns.Boolean.prototype.remove = function () {
  this.$item.remove();
};

// Tell the editor what semantic field we are.
ns.fieldTypes['boolean'] = ns.Boolean;