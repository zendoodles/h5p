var H5P = H5P || {};

// Determine if we're inside an iframe.
H5P.isFramed = (window.self !== window.top);

// Useful jQuery object.
H5P.$window = H5P.jQuery(window);

// Detect if we support fullscreen, and what prefix to use.
if (document.documentElement.requestFullScreen) {
  H5P.fullScreenBrowserPrefix = '';
}
else if (document.documentElement.webkitRequestFullScreen
    && navigator.userAgent.indexOf('Android') === -1 // Skip Android
    && navigator.userAgent.indexOf('Version/') === -1 // Skip Safari
    ) {
  H5P.fullScreenBrowserPrefix = 'webkit';
}
else if (document.documentElement.mozRequestFullScreen) {
  H5P.fullScreenBrowserPrefix = 'moz';
}
else if (document.documentElement.msRequestFullscreen) {
  H5P.fullScreenBrowserPrefix = 'ms';
}

/**
 * Initialize H5P content.
 * Scans for ".h5p-content" in the document and initializes H5P instances where found.
 */
H5P.init = function () {
  // Useful jQuery object.
  H5P.$body = H5P.jQuery('body');

  // Prepare internal resizer for content.
  var $window = H5P.jQuery(window.top);

  // H5Ps added in normal DIV.
  var $containers = H5P.jQuery(".h5p-content").each(function () { 
    var $element = H5P.jQuery(this);
    var $container = H5P.jQuery('<div class="h5p-container"></div>').appendTo($element);
    var contentId = $element.data('content-id');
    var contentData = H5PIntegration.getContentData(contentId);
    var library = {
      library: contentData.library,
      params: H5P.jQuery.parseJSON(contentData.jsonContent)
    };

    // Create new instance.
    var instance = H5P.newRunnable(library, contentId);
    instance.attach($container); // Not sent to newRunnable to avoid resize.
    
    // Check if we should add and display a fullscreen button for this H5P.
    if (contentData.fullScreen == 1) {
      H5P.jQuery('<div class="h5p-content-controls"><div role="button" tabindex="1" class="h5p-enable-fullscreen">' + H5P.t('fullscreen') + '</div></div>').insertBefore($container).children().click(function () {
        H5P.fullScreen($container, instance);
      });
    };
    
    var $actions = H5P.jQuery('<ul class="h5p-actions"></ul>');
    if (contentData.export !== '') {
      // Display export button
      H5P.jQuery('<li class="h5p-button h5p-export" role="button" tabindex="1">' + H5P.t('download') + '</li>').appendTo($actions).click(function () {
        window.location.href = contentData.export;
      });
    }
    if (instance.getCopyrights !== undefined) {
      // Display copyrights button
      H5P.jQuery('<li class="h5p-button h5p-copyrights" role="button" tabindex="1">' + H5P.t('copyrights') + '</li>').appendTo($actions).click(function () {
        H5P.openCopyrightsDialog($actions, instance);
      });
    }
    if ($actions.children().length) {
      $actions.insertAfter($container);
    }
    else {
      $actions.remove();
    }
    
    if (H5P.isFramed) {
      // Make it possible to resize the iframe when the content changes size. This way we get no scrollbars.
      var iframe = window.parent.document.getElementById('h5p-iframe-' + contentId);
      var resizeIframe = function () {
        // Use timeout to make sure the iframe is resized
        setTimeout(function () {
          var fullscreen = $container.hasClass('h5p-fullscreen') || $container.hasClass('h5p-semi-fullscreen');
          if (!fullscreen) {
            // Resize iframe so all content is visible.
            iframe.style.height = '1px';
            iframe.style.height = (iframe.contentDocument.body.scrollHeight) + 'px';
          }
        }, 1);
      };
      
      if (instance.$ !== undefined) {
        instance.$.on('resize', resizeIframe);
      }
    }
    
    var resize = function () {
      if (instance.$ !== undefined) {
        // Resize content.
        instance.$.trigger('resize');
      }
    };
    resize();
    
    // Resize everything when window is resized.
    $window.resize(resize);
  });

  // Insert H5Ps that should be in iframes.
  H5P.jQuery("iframe.h5p-iframe").each(function () {
    var $iframe = H5P.jQuery(this);
    var contentId = $iframe.data('content-id');

    // DEPRECATED AND WILL BE REMOVED. MAKE SURE YOUR H5Ps EXPOSES A $ AND A resize FUNCTION.
    $iframe.ready(function () {
      resizeIframeInterval = setInterval(function () {
        if (H5P.isFullscreen) {
          return; 
        }
        
        var $doc = $iframe.contents(); 
        var contentHeight = $doc.height();
        var frameHeight = $iframe.innerHeight();
       

        if (frameHeight !== contentHeight) {
          $iframe.css('height', contentHeight + 'px');
          $doc[0].documentElement.style.overflow = 'hidden';
        }
      }, 500);
    });
    // END DEPRECATION

    this.contentDocument.open();
    this.contentDocument.write('<!doctype html><html class="h5p-iframe"><head>' + H5PIntegration.getHeadTags(contentId) + '</head><body><div class="h5p-content" data-content-id="' + contentId + '"/></body></html>');
    this.contentDocument.close();
  });
};

/**
 * Enable full screen for the given h5p.
 *
 * @param {jQuery} $element Content container.
 * @param {object} instance
 * @param {function} exitCallback Callback function called when user exits fullscreen.
 * @param {jQuery} $body For internal use. Gives the body of the iframe.
 * @returns {undefined}
 */
H5P.fullScreen = function ($element, instance, exitCallback, body) {
  if (H5P.isFramed) {
    // Trigger resize on wrapper in parent window.
    window.parent.H5P.fullScreen($element, instance, exitCallback, H5P.$body.get());
    return;
  }
  
  var $container = $element;
  var $classes, $iframe;
  if (body === undefined)  {
    $body = H5P.$body;
  }
  else {
    // We're called from an iframe.
    $body = H5P.jQuery(body);
    $classes = $body.add($element.get());
    var iframeSelector = '#h5p-iframe-' + $element.parent().data('content-id');
    $iframe = H5P.jQuery(iframeSelector);
    $element = $iframe.parent(); // Put iframe wrapper in fullscreen, not container.
  }
  
  $classes = $element.add(H5P.$body).add($classes);
  
  var done = function (c) {
    H5P.isFullscreen = false;
    $classes.removeClass(c);
    
    if (H5P.fullScreenBrowserPrefix === undefined) {
      // Resize content.
      if (instance.$ !== undefined) {
        instance.$.trigger('resize');
      }
      else if (instance.resize !== undefined) {
        instance.resize();
      }
    }

    if (exitCallback !== undefined) {
      exitCallback();
    }
  };

  if (H5P.fullScreenBrowserPrefix === undefined) {
    // Create semi fullscreen.
    
    $classes.addClass('h5p-semi-fullscreen');
    H5P.isFullscreen = true;

    var $disable = $container.prepend('<a href="#" class="h5p-disable-fullscreen">Disable fullscreen</a>').children(':first');
    var keyup, disableSemiFullscreen = function () {
      $disable.remove();      
      $body.unbind('keyup', keyup);
      done('h5p-semi-fullscreen');
      return false;
    };
    keyup = function (event) {
      if (event.keyCode === 27) {
        disableSemiFullscreen();
      }
    };
    $disable.click(disableSemiFullscreen);
    $body.keyup(keyup);
  }
  else {
    // Create real fullscreen.
    
    var first, eventName = (H5P.fullScreenBrowserPrefix === 'ms' ? 'MSFullscreenChange' : H5P.fullScreenBrowserPrefix + 'fullscreenchange');
    H5P.isFullscreen = true;
    document.addEventListener(eventName, function () {
      if (first === undefined) {
        first = false;
        return;
      }
      done('h5p-fullscreen');
      document.removeEventListener(eventName, arguments.callee, false);
    });

    if (H5P.fullScreenBrowserPrefix === '') {
      $element[0].requestFullScreen();
    }
    else {
      var method = (H5P.fullScreenBrowserPrefix === 'ms' ? 'msRequestFullscreen' : H5P.fullScreenBrowserPrefix + 'RequestFullScreen');
      var params = (H5P.fullScreenBrowserPrefix === 'webkit' ? Element.ALLOW_KEYBOARD_INPUT : undefined);
      $element[0][method](params);
    }

    $classes.addClass('h5p-fullscreen');
  }
  
  if ($iframe !== undefined) {
    // Set iframe to its default size(100%).
    $iframe.css('height', '');
  }
  
  if (H5P.fullScreenBrowserPrefix === undefined) {
    // Resize content.
    if (instance.$ !== undefined) {
      instance.$.trigger('resize');
    }
    else if (instance.resize !== undefined) {
      instance.resize();
    }
  }

  // Allow H5P to set focus when entering fullscreen mode
  if (instance.focus !== undefined) {
    instance.focus();
  }
};

/**
 * Find the path to the content files based on the id of the content
 *
 * Also identifies and returns absolute paths
 *
 * @param string path
 *  Absolute path to a file, or relative path to a file in the content folder
 * @param contentId
 *  Id of the content requesting a path
 */
H5P.getPath = function (path, contentId) {
  if (path.substr(0, 7) === 'http://' || path.substr(0, 8) === 'https://') {
    return path;
  }
  
  return H5PIntegration.getContentPath(contentId) + path;
};

/**
 * THIS FUNCTION IS DEPRECATED, USE getPath INSTEAD
 *
 *  Find the path to the content files folder based on the id of the content
 *
 *  @param contentId
 *  Id of the content requesting a path
 */
H5P.getContentPath = function (contentId) {
  return H5PIntegration.getContentPath(contentId);
};

/**
 * Get library class constructor from H5P by classname.
 * Note that this class will only work for resolve "H5P.NameWithoutDot". 
 * Also check out: H5P.newRunnable
 *
 * Used from libraries to construct instances of other libraries' objects by name.
 *
 * @param {string} name Name of library
 * @returns Class constructor
 */
H5P.classFromName = function (name) {
  var arr = name.split(".");
  return this[arr[arr.length-1]];
};

/**
 * A safe way of creating a new instance of a runnable H5P.
 *
 * TODO: Should we check if version matches the library?
 * TODO: Dynamically try to load libraries currently not loaded? That will require a callback.
 * 
 * @param {Object} library Library/action object form params.
 * @param {Number} contentId 
 * @param {jQuery} $attachTo The element to attach the new instance to.
 * @return {Object} Instance.
 */
H5P.newRunnable = function (library, contentId, $attachTo) {
  try {
    var nameSplit = library.library.split(' ', 2);
    var versionSplit = nameSplit[1].split('.', 2);
  }
  catch (err) {
    return H5P.error('Invalid library string: ' + library.library);
  }
  
  if ((library.params instanceof Object) !== true || (library.params instanceof Array) === true) {
    H5P.error('Invalid library params for: ' + library.library);
    return H5P.error(library.params);
  }
  
  // Find constructor function
  try {
    nameSplit = nameSplit[0].split('.');
    var constructor = window;
    for (var i = 0; i < nameSplit.length; i++) { 
      constructor = constructor[nameSplit[i]];
    };
    if (typeof constructor !== 'function') {
      throw null;
    }
  }
  catch (err) {
    return H5P.error('Unable to find constructor for: ' + library.library);
  }
  
  var instance = new constructor(library.params, contentId);
  if ($attachTo !== undefined) {
    instance.attach($attachTo);
    if (instance.$ !== undefined) {
      // Resize content.
      instance.$.trigger('resize');
    }
  }
  return instance;
};

/**
 * Used to print useful error messages.
 *
 * @param {mixed} err Error to print.
 * @returns {undefined}
 */
H5P.error = function (err) {
  if (window['console'] !== undefined && console.error !== undefined) {
    console.error(err);
  }
}

/**
 * Translate text strings.
 *
 * @param {String} key Translation identifier, may only contain a-zA-Z0-9. No spaces or special chars.
 * @param {Object} vars Data for placeholders.
 * @param {String} ns Translation namespace. Defaults to H5P.
 * @returns {String} Text
 */
H5P.t = function (key, vars, ns) {
  if (ns === undefined) {
    ns = 'H5P';
  }

  if (H5PIntegration.i18n[ns] === undefined) {
    return '[Missing translation namespace "' + ns + '"]';
  }
  
  if (H5PIntegration.i18n[ns][key] === undefined) {
    return '[Missing translation "' + key + '" in "' + ns + '"]';
  }

  var translation = H5PIntegration.i18n[ns][key];
  
  if (vars !== undefined) {
    // Replace placeholder with variables.
    for (var placeholder in vars) {
      translation = translation.replace(placeholder, vars[placeholder]);
    }  
  }

  return translation;
};

/**
 * Gather copyright information and display in a dialog over the content.
 *
 * @param {jQuery} $element to insert dialog after.
 * @param {object} instance to get copyright information from.
 * @returns {undefined}
 */
H5P.openCopyrightsDialog = function ($element, instance) {
  var $d = H5P.jQuery('<div class="h5p-copyrights-dialog"><div class="h5p-inner"><h2>' + H5P.t('copyrightInformation') + '</h2>' + H5P.createCopyrights(instance.getCopyrights()) + '</div><div class="h5p-close" role="button" tabindex="1" titel="' + H5P.t('close') + '"></div></div>')
    .insertAfter($element)
    .click(function () {
      $d.removeClass('h5p-open'); // Fade out
      setTimeout(function () {
        $d.remove();
      }, 200);
    })
    .children('.h5p-inner')
      .click(function () {
        return false;
      })
      .end();
      
  setTimeout(function () {
    $d.addClass('h5p-open'); // Fade in
  }, 1);
};

/**
 * Recursive function that creates html for copyright information. 
 */
H5P.createCopyrights = function (information) {
  var html = '';
  
  // Render thumbnail
  if (information.thumbnail !== undefined) {
    var width, height = 100;
    if (information.thumbnail.width !== undefined) {
      width = Math.round(height * (information.thumbnail.width / information.thumbnail.height));
    }
    html += '<img src="' + information.thumbnail.source + '" alt="' + H5P.t('thumbnail') + '" height="' + height + '"' + (width === undefined ? '' : ' width="' + width + '"') + '/>';
  }
  
  // Render copyright fields
  if (information.copyrights !== undefined && information.copyrights.length) {
    if (information.copyrights instanceof Array) {
      for (var i = 0; i < information.copyrights.length; i++) {
        html += H5P.createDefinitionList(information.copyrights[i]);
      }
    }
    else {
      html += information.copyrights;
    }
  }
  
  // Check for children with copyright information.
  if (information.children !== undefined) {
    for (var i = 0; i < information.children.length; i++) {
      html += H5P.createCopyrights(information.children[i]);
    }
  }
  
  if (html !== '') {
    // Add a label to this info
    if (information.label !== undefined) {
      html = '<h3>' +  information.label + '</h3>' + html;
    }
    
    // Add wrapper
    html = '<div class="h5p-copyright-information">' + html + '</div>';
  }
  
  return html;
}

// Translate table for copyright license codes.
H5P.copyrightLicenses = {
  'U': 'Undisclosed',
  'CC BY': 'Attribution',
  'CC BY-SA': 'Attribution-ShareAlike',
  'CC BY-ND': 'Attribution-NoDerivs',
  'CC BY-NC': 'Attribution-NonCommercial',
  'CC BY-NC-SA': 'Attribution-NonCommercial-ShareAlike',
  'CC BY-NC-ND': 'Attribution-NonCommercial-NoDerivs',
  'GNU GPL': 'General Public License',
  'PD': 'Public Domain',
  'ODC PDDL': 'Public Domain Dedication and Licence',
  'CC PDM': 'Public Domain Mark',
  'C': 'Copyright'
};

/**
 * Creates a ordered list of copyright fields with labels and values.
 *
 * @param {Object} copyright information fields.
 * @param {Object} labels translation.  Optional.
 * @param {Array} order of fields. Optional.
 * @param {Object} extraFields for copyright. Optional.
 * @returns {Array} fields.
 */
H5P.getCopyrightFields = function (copyright, labels, order, extraFields) {
  if (copyright === undefined) {
    return;
  }

  // Add the extra fields
  for (var field in extraFields) {
    copyright[field] = extraFields[field];
  }
  
  var fields = [];
  
  if (order === undefined) {
    order = ['title', 'author', 'year', 'source', 'license'];
  }
  
  for (var i = 0; i < order.length; i++) {
    var fieldName = order[i];
    if (copyright[fieldName] !== undefined) {
      fields.push({
        label: (labels === undefined || labels[fieldName] === undefined ? H5P.t(fieldName) : labels[fieldName]),
        value: (fieldName === 'license' ? H5P.copyrightLicenses[copyright[fieldName]] : copyright[fieldName]) 
      });
    }
  }
  
  return fields;
}

/**
 * Simple function that creates html for a definition list.
 *
 * @param {Array} fields to create list from.
 * @returns {String} HTML.
 */
H5P.createDefinitionList = function (fields) {
  var html = '';
  if (fields !== undefined) {
    for (var i = 0; i < fields.length; i++) {
      var field = fields[i];
      html += '<dt>' + field.label + '</dt><dd>' + field.value + '</dd>';
    }
  }
  return (html === '' ? html : '<dl>' + html + '</dl>');
}

/**
 * THIS FUNCTION/CLASS IS DEPRECATED AND WILL BE REMOVED.
 *
 * Helper object for keeping coordinates in the same format all over.
 */
H5P.Coords = function (x, y, w, h) {
  if ( !(this instanceof H5P.Coords) )
    return new H5P.Coords(x, y, w, h);

  this.x = 0;
  this.y = 0;
  this.w = 1;
  this.h = 1;

  if (typeof(x) === 'object') {
    this.x = x.x;
    this.y = x.y;
    this.w = x.w;
    this.h = x.h;
  } else {
    if (x !== undefined) {
      this.x = x;
    }
    if (y !== undefined) {
      this.y = y;
    }
    if (w !== undefined) {
      this.w = w;
    }
    if (h !== undefined) {
      this.h = h;
    }
  }
  return this;
};

/**
 * Parse library string into values.
 *
 * @param {string} library
 *  library in the format "machineName majorVersion.minorVersion"
 * @returns
 *  library as an object with machineName, majorVersion and minorVersion properties
 *  return false if the library parameter is invalid
 */
H5P.libraryFromString = function (library) {
  var regExp = /(.+)\s(\d)+\.(\d)$/g;
  var res = regExp.exec(library);
  if (res !== null) {
    return {
      'machineName': res[1],
      'majorVersion': res[2],
      'minorVersion': res[3]
    };
  }
  else {
    return false;
  }
};

/**
 * Get the path to the library
 *
 * @param {String} library
 *   The library identifier in the format "machineName-majorVersion.minorVersion".
 * @returns {String} The full path to the library.
 */
H5P.getLibraryPath = function (library) {
  return H5PIntegration.getLibraryPath(library);
};

/**
 * Recursivly clone the given object.
 * TODO: Consider if this needs to be in core. Doesn't $.extend do the same? 
 *
 * @param {object} object Object to clone.
 * @param {type} recursive
 * @returns {object} A clone of object.
 */
H5P.cloneObject = function (object, recursive) {
  var clone = object instanceof Array ? [] : {};

  for (var i in object) {
    if (object.hasOwnProperty(i)) {
      if (recursive !== undefined && recursive && typeof object[i] === 'object') {
        clone[i] = H5P.cloneObject(object[i], recursive);
      }
      else {
        clone[i] = object[i];
      }
    }
  }

  return clone;
};

/**
 * Remove all empty spaces before and after the value.
 * TODO: Only include this or String.trim(). What is best?
 *
 * @param {String} value
 * @returns {@exp;value@call;replace}
 */
H5P.trim = function (value) {
  return value.replace(/^\s+|\s+$/g, '');
};

/**
 * Check if javascript path/key is loaded.
 *
 * @param {String} path
 * @returns {Boolean}
 */
H5P.jsLoaded = function (path) {
  for (var i = 0; i < H5P.loadedJs.length; i++) {
    if (H5P.loadedJs[i] === path) {
      return true;
    }
  }

  return false;
};

/**
 * Check if styles path/key is loaded.
 *
 * @param {String} path
 * @returns {Boolean}
 */
H5P.cssLoaded = function (path) {
  for (var i = 0; i < H5P.loadedCss.length; i++) {
    if (H5P.loadedCss[i] === path) {
      return true;
    }
  }

  return false;
};

/**
 * Shuffle an array in place.
 * TODO: Consider if this should be a part of core. I'm guessing very few libraries are going to use it.
 *
 * @param {array} array Array to shuffle
 * @returns {array} The passed array is returned for chaining.
 */
H5P.shuffleArray = function (array) {
  if (! array instanceof Array) {
    return;
  }

  var i = array.length, j, tempi, tempj;
  if ( i === 0 ) return false;
  while ( --i ) {
    j       = Math.floor( Math.random() * ( i + 1 ) );
    tempi   = array[i];
    tempj   = array[j];
    array[i] = tempj;
    array[j] = tempi;
  }
  return array;
};

/**
 * Post finished results for user.
 * TODO: Should we use events instead? That way the parent can handle the results of the child.
 *
 * @param {Number} contentId
 * @param {Number} points
 * @param {Number} maxPoints
 */
H5P.setFinished = function (contentId, points, maxPoints) {
  if (H5P.postUserStatistics === true) {
    H5P.jQuery.post(H5P.ajaxPath + 'setFinished', {contentId: contentId, points: points, maxPoints: maxPoints});
  }
};

// Add indexOf to browsers that lack them. (IEs)
if (!Array.prototype.indexOf) {
  Array.prototype.indexOf = function (needle) {
    for (var i = 0; i < this.length; i++) {
      if (this[i] === needle) {
        return i;
      }
    }
    return -1;
  };
}

// Need to define trim() since this is not available on older IEs,
// and trim is used in several libs
if (String.prototype.trim === undefined) {
  String.prototype.trim = function () {
    return H5P.trim(this);
  };
}

// Finally, we want to run init when document is ready. But not if we're
// in an iFrame. Then we wait for parent to start init().
if (H5P.jQuery) {
  H5P.jQuery(document).ready(function () {
    if (!H5P.initialized) {
      H5P.initialized = true;
      H5P.init();
    }
  });
}
