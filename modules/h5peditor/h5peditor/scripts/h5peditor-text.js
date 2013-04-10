var H5PEditor = H5PEditor || {};
var ns = H5PEditor;

/**
 * Create a text field for the form.
 * 
 * @param {mixed} parent
 * @param {Object} field
 * @param {mixed} params
 * @param {function} setValue
 * @returns {ns.Text}
 */
ns.Text = function (parent, field, params, setValue) {
  this.field = field;
  this.value = params;
  this.setValue = setValue;
};

/**
 * Append field to wrapper.
 * 
 * @param {type} $wrapper
 * @returns {undefined}
 */
ns.Text.prototype.appendTo = function ($wrapper) {
  var that = this;
  
  this.$item = ns.$(this.createHtml()).appendTo($wrapper);
  this.$input = this.$item.children('label').children('input');
  this.$errors = this.$item.children('.errors');
  
  this.$input.change(function () {
    // Validate
    var value = that.validate();
    
    if (value) {
      // Set param
      that.value = value;
      that.setValue(that.field, value);
    }
  });
};

/**
 * Create HTML for the text field.
 */
ns.Text.prototype.createHtml = function () {
  var input = ns.createText(this.field.hint, this.value, this.field.maxLength, this.field.description);
  var label = ns.createLabel(this.field, input);
  
  return ns.createItem(this.field.type, label);
};

/**
 * Validate the current text field.
 */
ns.Text.prototype.validate = function () {
  var that = this;
  
  var value = ns.trim(this.$input.val());
    
  if ((that.field.optional === undefined || !that.field.optional) && !value.length) {
    this.$errors.append(ns.createError(ns.t('requiredProperty', {':property': 'text field'})));
  }
  else if (value.length > this.field.maxLength) {
    this.$errors.append(ns.createError(ns.t('tooLong', {':max': this.field.maxLength})));
  }
  else if (this.field.regexp !== undefined && !value.match(new RegExp(this.field.regexp.pattern, this.field.regexp.modifiers))) {
    this.$errors.append(ns.createError(ns.t('invalidFormat')));
  }

  return ns.checkErrors(this.$errors, this.$input, value);
};

/**
 * Remove this item.
 */
ns.Text.prototype.remove = function () {
  this.$item.remove();
};

// Tell the editor what widget we are.
ns.widgets.text = ns.Text;