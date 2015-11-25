/**
 * Copyright 2015 The Chord Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview Manages the Chord viewer,
 * including a test panel with a set of emulators and a log panel.
 * @author peggychi@google.com (Peggy Chi)
 */

/**
 * The file paths to device spec, script, and info.
 * @constructor
 */
var FILEPATH = {
  DEVICE_INFO_URL: '/device/deviceSpec.json',
  DEVICE_TEMPLATE: '/device/deviceTemplate.html',
  SAMPLES: {
    'Launch Pad': '/samples/launchPad',
    'Bump': '/samples/bump',
    'Photo Launcher': '/samples/photoLauncher'
  },
  SCRIPT_NAME: 'service.js',
  VIEWER: 'viewer/'
};

// retrieve device info when UI is ready
$(document).ready(function() {
  window.requestFileSystem = window.requestFileSystem ||
    window.webkitRequestFileSystem;
  $.getJSON(FILEPATH.DEVICE_INFO_URL, function(data) { // load device specs
    chord.setup(data.deviceCapabilities, data.devices);
    viewer.init('dialog');
    emulatorManager.init('devices', 'phone-watch-tablet');
    scriptManager.init('.icon.sample', '.icon.folder', '.run');
    window.Log = emulatorManager.showSystemLog;
    Log.v('Chord plugin ready');
  });
});

/**
 * The viewer object handling UI interactions.
 * @constructor
 */
var viewer = {
  dialog: null,
  dialogId: '',
  pathToShow: '.path',
  runIcon: '.run',
  /**
   * Initializes the viewer.
   * @param {string} dialogId Id of the dialog element.
   */
  init: function(dialogId) {
    this.dialogId = dialogId;
    this.dialog = document.querySelector('#' + dialogId);
    $('#' + dialogId + ' .dlg_close').click(function() {
      dialog.close();
    });
  },
  /**
   * Shows a dialog given content.
   * @param {string} message Id of the device panel container.
   * @param {Object} callbacks Classes and callbacks listening to a click event.
   */
  showDialog: function(message, callbacks) {
    var dialogObj = $('#' + this.dialogId + ' .dlg_content').html(message);
    this.dialog.showModal();
    for (var evt in callbacks) {
      dialogObj.find(evt).click(callbacks[evt]);
    }
  }
};

/**
 * The emulatorManager object handling the emulators and events.
 * @constructor
 */
var emulatorManager = {
  deviceTemplate: '',
  deviceIds: [],
  devicePreset: 'phone-watch-glass',
  rootId: '',
  shownClasses: [],
  uiClass: {
    active: 'activeUI'
  },
  targetEvent: {
    toSimulate: [],
    toExlude: ['tap', 'doubleTap', 'longTap', 'listenEnd',
    'rotatePortrait', 'rotateLandscape'],
    typeToSimulate: ['shakable', 'rotatable', 'touchable', 'hearable']
  },
  /**
   * Initializes the emulators.
   * @param {string} rootId Id of the device panel container.
   * @param {string} preset The emulator set.
   */
  init: function(rootId, preset) {
    var self = this;
    this.rootId = rootId;
    if (preset) { // emulator preset
      this.devicePreset = preset;
    }
    $.get(FILEPATH.DEVICE_TEMPLATE, function(content) {
      self.deviceTemplate = content;
      self.updateDevicePreset(self.devicePreset, function() {
        setUpEvents(chord.actionCapabilityMap);
        self.showDevices();
        /**
         * Sets up input events to be simulated.
         * @param {Object} eventList The event list.
         */
        function setUpEvents(eventList) {
          self.targetEvent.toSimulate = [];
          for (var evt in eventList) {
            if (self.targetEvent.typeToSimulate.indexOf(eventList[evt]) >= 0
              && self.targetEvent.toExlude.indexOf(evt) < 0) {
              self.targetEvent.toSimulate.push(evt);
            }
          }
        }
      });
    });
    this.showSystemLog.init(); // log
  },
  /**
   * Updates the emulators.
   * @param {string} preset The emulator set.
   * @param {Object} callback Callback function to execute when finished.
   */
  updateDevicePreset: function(preset, callback) {
    this.devicePreset = preset;
    var numEmulatedDevices = {
      phone: 0,
      watch: 0,
      glass: 0,
      tablet: 0
    };
    switch (this.devicePreset) {
      case 'phone-watch-glass':
        numEmulatedDevices.phone = 1;
        numEmulatedDevices.watch = 1;
        numEmulatedDevices.glass = 1;
        break;
      case 'phone-watch-tablet':
        numEmulatedDevices.phone = 1;
        numEmulatedDevices.watch = 1;
        numEmulatedDevices.tablet = 1;
        break;
      case 'phone-watch':
        numEmulatedDevices.phone = 1;
        numEmulatedDevices.watch = 1;
        break;
      case 'one-phone':
        numEmulatedDevices.phone = 1;
        break;
      case 'two-phones':
        numEmulatedDevices.phone = 2;
        break;
      case 'glass':
        numEmulatedDevices.glass = 1;
        break;
    }
    chord.setEmulatedDevices(numEmulatedDevices, false, callback);
  },
  /**
   * Renders the emulators.
   */
  showDevices: function() {
    var IDs = [], exists = []; // update the list deviceIds
    $('#' + this.rootId + ' > .device-container').each(function() {
      IDs.push(this.id);
      exists.push(false);
    });
    this.deviceIds = IDs;
    for (d in chord.devices) { // update panel
      var device = chord.devices[d];
      var idx = this.deviceIds.indexOf(device.id);
      if (idx < 0) {
        this.addDevicePanel(device, !device.live);
        chord.devices[d].addEmulator(this);
        this.deviceIds.push(device.id);
      }
      else exists[idx] = true;
    }
    for (var i = 0; i < exists.length; i++) {
      if (!exists[i]) { // remove inactive devices
        $('#' + this.rootId + ' > .device-container[id='
          + this.deviceIds[i] + ']')
            .fadeOut(1000, function() { $(this).remove(); });
      }
    }
  },
  /**
   * Updates the emulators.
   * @param {Object} device A Chord device.
   * @param {boolean} isEmulator Is an emulator.
   */
  addDevicePanel: function(device, isEmulator) {
    var self = this;
    var panelHTML = this.deviceTemplate;
    panelHTML = panelHTML.replace(/DEVICE_ID/g, device.id)
        .replace(/DEVICE_TYPE/g, device.type)
        .replace(/DEVICE_NAME/g, device.name);
    $('#' + this.rootId).prepend($(panelHTML).fadeIn('slow'));
    var div = $('#' + device.id + ' > div .manualEvts');
    var removeDevice = function(deviceId, type) {
      var success = chord.deleteDevice(deviceId);
      if (success) {
        Log.w('Delete device: ' + type);
        self.showDevices();
      }
      return success;
    };
    $('#' + device.id + ' .device_delete').click(function() { // remove device
      var id_toDelete = $(this).parent().attr('id');
      var type_toDelete = $(this).parent().attr('dType');
      viewer.showDialog('<p>Remove ' +
        type_toDelete + ' ' + id_toDelete + '?</p>' +
        '<button class="btn btn-default">Cancel</button>' +
        '<button class="btn btn-danger">Delete</button>', {
          '.btn-default': function() {
            dialog.close();
          }, '.btn-danger': function() {
            dialog.close();
            removeDevice(id_toDelete, type_toDelete);
          }
        });
    });
    if (isEmulator) { // add events for simulations
      for (cap in device.capability) {
        var evts = device.capability[cap].on;
        if (evts !== undefined) {
          for (var idx = 0, evt; evt = evts[idx]; idx++) {
            if (self.targetEvent.toSimulate.indexOf(evt) >= 0) {
              var evtClass = ' evt evt_' + evt;
              $('<button class="btn btn-default' + evtClass +
                  '" evtName="' + evt + '"></button>')
                .appendTo(div)
                .click(function() {
                  simulateEvent($(this).attr('evtName'), device.id);
                });
            }
          }
        }
      }
    } else {
      $('#' + device.id).removeClass('panel-info');
      $('#' + device.id).addClass('panel-primary');
      div.append('<span class="live">Live</span>');
    }

    /**
     * Simulates an input event update to an emulator.
     * @param {string} eventType The event type.
     * @param {string} deviceId The device ID.
     */
    function simulateEvent(eventType, deviceId) {
      chord.getDeviceById(deviceId).on(eventType);
    }
  },
  /**
   * Adds a new emulator.
   * @param {string} id The new device id.
   * @param {string} type The new device type.
   * @param {string} name The new device name.
   */
  addManulDevice: function(id, type, name) {
    chord.addEmulatedDevices(id, type, name);
    this.showDevices();
  },
  /**
   * Updates the device status.
   * @param {string} deviceId The device id.
   * @param {string} msg The status update message.
   */
  updateStatus: function(deviceId, msg) {
    $('#' + deviceId).find('.status').html(msg);
    Log.v('[' + deviceId + '] ' + msg);
  },
  /**
   * Applies the event class.
   * @param {string} deviceId The device id.
   * @param {string} evt The event name.
   */
  applyClass: function(deviceId, evt) {
    this.getUI(deviceId).addClass(evt);
    this.updateStatus(deviceId, 'received event ' + evt);
    this.shownClasses.push(evt);
  },
  /**
   * Activates the device emulator view.
   * @param {Object} device The device.
   */
  wakeup: function(device) {
    this.getUI(device.id).toggleClass(this.uiClass.active, true);
    this.shownClasses.push(this.uiClass.active);
  },
  /**
   * Resets the device emulator view.
   * @param {string} deviceId The device id.
   */
  reset: function(deviceId) {
    this.getUI(deviceId).removeClass(this.shownClasses.join(' ')).html('');
    this.updateStatus(deviceId, 'reset');
  },
  /**
   * Resets all the device emulators.
   */
  resetAll: function() {
    this.shownClasses = [];
  },
  /**
   * Retrieves the jQuery element of the emulator.
   * @param {string} deviceId The device id.
   */
  getUI: function(deviceId) {
    return $('#' + deviceId).find('.UI');
  },
  /**
   * Shows the device emulator view.
   * @param {Object} device The device.
   * @param {string} uiContent The html content.
   */
  showUI: function(device, uiContent) {
    this.updateStatus(device.id, 'UI updated');
    var UI = this.getUI(device.id);
    if (typeof uiContent === 'object') { // tmp: watch
      UI = UI.html('<button class="prev" value="prev">Previous</button>');
      UI = UI.html('<button class="next" value="next">Next</button>');
    } else {
      UI = UI.html(uiContent);
      UI.find('*').css('font-size', '12px');
    }
    return UI;
  },
  /**
   * Launches an application on the device emulator.
   * @param {Object} device The device.
   * @param {string} appName The app name.
   */
  startApp: function(device, appName) {
    this.wakeup(device);
    this.showUI(device, '<div class="app app' + appName + '"></div>');
    this.updateStatus(device.id, 'Start app ' + appName);
  },
  /**
   * Kills an application on the device emulator.
   * @param {Object} device The device.
   * @param {string} appName The app name.
   */
  killApp: function(device, appName) {
    this.showUI(device, '');
    this.updateStatus(device.id, 'Kill app ' + appName);
  },
  /**
   * Makes a phone call on the device emulator.
   * @param {Object} device The device.
   * @param {string} calleeNum The number to call.
   */
  call: function(device, calleeNum) {
    this.showUI(device, 'Calling ' + calleeNum + '...');
    this.applyClass(device.id, 'callStart');
  },
  /**
   * Rotates counter-clockwise the device emulator.
   * @param {Object} device The device.
   */
  rotateCCW: function(device) {
    this.rotateDevice(device.id, -90);
  },
  /**
   * Rotates clockwise the device emulator.
   * @param {Object} device The device.
   */
  rotateCW: function(device) {
    this.rotateDevice(device.id, 90);
  },
  /**
   * Rotates the device emulator.
   * @param {string} deviceId The device id.
   * @param {double} angle The rotate angle.
   */
  rotateDevice: function(deviceId, angle) {
    var view = $('#' + deviceId).find('.deviceSkin');
    var subview = this.getUI(deviceId);
    if (view.attr('orientation') !== undefined) {
      angle += parseInt(view.attr('orientation'));
    }
    view.css('-webkit-transform', 'rotate(' + angle + 'deg)');
    (angle % 180 === 0) ? subview.removeClass('landscape') :
        subview.addClass('landscape');
    subview.css('-webkit-transform', 'rotate(' + (-angle) + 'deg)');
    view.attr('orientation', (angle % 360).toString());
  },
  /**
   * Handles log messages on the log panel.
   */
  showSystemLog: {
    v: function(msg) { this.log('log_v', msg); },
    d: function(msg) { this.log('log_d', msg); },
    i: function(msg) { this.log('log_i', msg); },
    w: function(msg) { this.log('log_w', msg); },
    e: function(msg) { this.log('log_e', msg); },
    /**
     * Prepends the log message to the log panel.
     * @param {string} c The class name of the message.
     * @param {string} msg The log message.
     */
    log: function(c, msg) {
      $('<div class="' + c + '">' + this.getDate(
          new Date()) + '  ' + msg + '</div>')
          .prependTo('#logConsole');
    },
    /**
     * Renders the date to a readable form.
     * @param {Object} d The date.
     */
    getDate: function(d) { // "07-24 15:46:10.006"
      var dd = attachZero(d.getDate(), 10);
      var mm = attachZero(d.getMonth() + 1, 10);
      var h = attachZero(d.getHours(), 10);
      var m = attachZero(d.getMinutes(), 10);
      var s = attachZero(d.getSeconds(), 10);
      var ms = attachZero(d.getMilliseconds(), 100);
      if (ms.length < 3) {
        ms = '0' + ms;
      }
      return [mm, '-', dd, ' ', h, ':', m, ':', s, '.', ms].join('');

      /**
       * Prepends zero(s) to a number.
       * @param {int} num The date element.
       * @param {int} range The lenght of target number.
       */
      function attachZero(num, range) {
        return (num < range) ? '0' + num : num;
      }
    },
    /**
     * Initializes the log.
     */
    init: function() {
      if (this.cachedLog.length > 0) {
        for (var i = 0, log; log = this.cachedLog[i]; i++) {
          Log.v(log);
        }
      }
      this.cachedLog = [];
    },
    cachedLog: []
  }
};

/**
 * The scriptEntry object storing info of user's scripts.
 * @constructor
 */
var scriptEntry = {
  dir: null,
  dirPath: '',
  entries: []
};

/**
 * The scriptManager object handling sample and user's scripts.
 * @constructor
 */
var scriptManager = {
  init: function(sameplId, openDirId, runId) {
    var listOfSamples = '';
    for (var sampleName in FILEPATH.SAMPLES) {
      listOfSamples += '<p path="' + FILEPATH.SAMPLES[sampleName] + '">' +
        sampleName + '</p>';
    }
    $(sameplId).click(function() { // run a sample from the list
      viewer.showDialog(listOfSamples, {
          'p': function() {
            loadScript($(this).attr('path'));
            dialog.close();
            $('.folder-open').removeClass('folder-open').addClass('folder');
          }
        });
    });
    $(openDirId).click(function() { // open system dialog
      chrome.fileSystem.chooseEntry({
          type: 'openDirectory'
        }, function (dir) {
          if (!dir || !dir.isDirectory) {
            Log.e('unable to load the script directory: ' + dir);
            return;
          }
          scriptManager.loadDir(dir);
        });
    });
    $(runId).click(function() { // run button
      scriptEntry.dir ?
        scriptManager.loadDir(scriptEntry.dir) :
        Log.e('specify a directory to run script');
    });
  },
  loadDir: function(dir) {
    scriptEntry.dir = null;
    scriptEntry.entries = [];
    var reader = dir.createReader();
    var readEntries = function() {
      reader.readEntries(function(entries) {
        if (entries.length) {
          entries.forEach(function(item) {
            if (item.isFile) {
              scriptEntry.entries.push(item.name);
            }
          });
          readEntries();
        } else {
          retrieveScript();
        }
      }, errorHandler);
    }
    readEntries();

    function retrieveScript() {
      if (scriptEntry.entries.length === 0 ||
          scriptEntry.entries.indexOf(FILEPATH.SCRIPT_NAME) < 0) {
        Log.e('no main Chord script found');
        Log.e('did you name your script to "' + FILEPATH.SCRIPT_NAME + '"?');
      } else {
        scriptEntry.dir = dir;
        chrome.fileSystem.getDisplayPath(dir, function(path) {
          path = path.substring(path.lastIndexOf(FILEPATH.VIEWER) +
            FILEPATH.VIEWER.length, path.length) + '/';
          scriptEntry.dirPath = path;
          chord.setDir(path);
          loadSample(path + FILEPATH.SCRIPT_NAME);
          $(viewer.pathToShow).html(path);
          $(viewer.runIcon).removeClass('disable');
          $('.folder').removeClass('folder').addClass('folder-open');
        });
      }
    }

    /**
     * Loads a sample script.
     * @param {string} path The file path to the script.
     */
    function loadSample(scriptpath) {
      $.get(scriptpath, function(content) {
        runScript(content);
      }).fail(function() {
        Log.e('failed to load sample: ' + path);
      });
    }
    /**
     * Executes the Chord script by writing and retrieving from local storage.
     * @param {string} code The Chord script.
     */
    function runScript(code) {
      chord.resetDevices();
      emulatorManager.resetAll();
      window.requestFileSystem(window.TEMPORARY, 1024*1024,
        onInitFs, errorHandler);
      function onInitFs(fs) {
        fs.root.getFile('chord.js', {create: true}, function(fileEntry) {
          fileEntry.createWriter(function(fileWriter) {
            fileWriter.truncate(0);
            fileWriter.onwriteend = function(e) {
              if (fileWriter.length === 0) {
                var blob = new Blob([code], {type: 'text/plain'});
                fileWriter.write(blob);
                loadScript(fileEntry.toURL());
              }
            };
            fileWriter.onerror = function(e) {
              Log.e('failed to load script: ' + e.toString());
            };
          }, errorHandler);
        }, errorHandler);
      }
      /**
       * Loads the script.
       * @param {string} path The path to the script.
       */
      function loadScript(path) {
        $.getScript(path, function() {
          Log.d('script loaded: ' + scriptEntry.dirPath + FILEPATH.SCRIPT_NAME);
          service();
        }).fail(errorHandler);
      }
    }

    /**
     * Handles file I/O error.
     */
    function errorHandler() {
      Log.e('failed to load file');
    }
  }
};
