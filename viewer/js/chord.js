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
 * @fileoverview Implements the Chord framework that handles
 * the device selection, actions, and events.
 * @author peggychi@google.com (Peggy Chi)
 */

chord = (function() {
  /**
   * Whether this Chord object is running on server or web.
   * @type {boolean}
   */
  var isWebUI = typeof window !== 'undefined';
  /**
   * The Chord engine.
   * @type {!Object}
   */
  var chord = {
    /**
     * On-network device list.
     * @type {!Array<Device>}
     */
    devices: [],
    /**
     * Global device list.
     * @type {!Array<Device>}
     */
    fullDevices: [],
    /**
     * Device templates by type.
     * @type {!Object<string, !Device>}
     */
    deviceTemplates: {},
    /**
     * Emulator types and numbers.
     * @type {!Object<string, !number>}
     */
    numEmulatedDevices: {},
    /**
     * Device specification.
     * @type {!Object<string, !Object>}
     */
    deviceList: {},
    /**
     * Device capability specification.
     * @type {!Object<string, !Object>}
     */
    deviceCapabilities: {},
    /**
     * Device capability list.
     * @type {!Array<string>}
     */
    capabilityList: [],
    /**
     * The map between device actions and capabilities.
     * @type {!Object<string, !string>}
     */
    actionCapabilityMap: {},
    /**
     * Available device types.
     * @type {!Object<string, !string>}
     */
    deviceType: {},
    /**
     * Device property list.
     * @type {!Array<string>}
     */
    propertyList: ['name', 'type', 'joint', 'os'],
    /**
     * Application launch option.
     * @type {!Object<string, string>}
     */
    launchOption: {
      default: 'default',
      notification: 'notification'
    },
    /**
     * HTML layouts.
     * @type {!Object}
     */
    layouts: {},
    /**
     * Available Chord application IDs.
     * @type {!Array<string>}
     */
    services: [],
    /**
     * Current user ID.
     * @type {string}
     */
    userID: null,
    /**
     * Current username.
     * @type {string}
     */
    username: null,
    /**
     * Existing user IDs.
     * @type {Array<string>}
     */
    allUsers: null,

    /** @constructor */
    init: function() {
    },

    /**
     * Selects a set of devices that match the selector.
     * @param {!string} selectorStr The device selection criteria.
     * @param {boolean=} skipReport
     *    Whether this should not report to the server.
     * @return {!ChordSelection} A collection of devices.
     */
    select: function(selector, report) {
      if (typeof(selector) !== 'object') {
        selector = this.parseSelector(selector.toLowerCase());
      }
      var selection = new ChordSelection(selector, this.getDevices(selector));
      return selection;
    },

    /**
     * Selects all the devices on the network.
     * @return {!ChordSelection} A collection of devices.
     */
    selectAll: function() {
      return this.select('*');
    },

    /**
     * Changes all the devices on the network to behave the same.
     * @param {Object=} option Details options to manipulate the mode.
     * @return {!ChordSelection} A collection of devices in the 'all' mode.
     */
    all: function(option) {
      var devices = this.selectAll();
      devices.setMode(SelectionMode.all);
      if (option !== undefined) {
        devices.setOption(option);
      }
      return devices;
    },

    /**
     * Combines devices on the network as one virtual device.
     * @param {Object=} option Details options to manipulate the mode.
     * @return {!ChordSelection} A collection of devices in the 'combine' mode.
     */
    combine: function(option) {
      var devices = this.selectAll();
      devices.setMode(SelectionMode.combine);
      if (option !== undefined) {
        devices.setOption(option);
      }
      return devices;
    },

    /**
     * Retrieves a device by its ID.
     * @param {!string} id The device id to be found.
     * @return {Device} The device of the specific ID.
     */
    getDeviceById: function(id) {
      var idx = this.getdeviceIdx(id);
      return (idx >= 0) ? this.devices[this.getdeviceIdx(id)] : null;
    },

    /**
     * Retrieves a set of device by joint.
     * @param {!string} joint The joint of interest.
     * @return {!ChordSelection} The devices that match the joint.
     */
    getDeviceByJoint: function(joint) {
      var matchedDevices = [];
      for (var i = 0, device; device = this.devices[i]; i++) {
        if (device.joint === joint) {
          matchedDevices.push(device);
        }
      }
      return new ChordSelection(null, matchedDevices);
    },

    /**
     * Retrieves a set of device by type.
     * @param {!string} type The device type of interest.
     * @return {!ChordSelection} The devices that match the type.
     */
    getDeviceByType: function(type) {
      var matchedDevices = [];
      for (var i = 0, device; device = this.devices[i]; i++) {
        if (device.type === type) {
          matchedDevices.push(device);
        }
      }
      return new ChordSelection(null, matchedDevices);
    },

    /**
     * Retrieves a list of devices that match the selector.
     * @param {!Object} selector The device selector.
     * @return {!Array<Device>} A list of devices that match the selector.
     */
    getDevices: function(selector) {
      var matchedDevices = [];
      for (var i = 0, device; device = this.devices[i]; i++) {
        if (this.deviceSupports(device, selector)) {
          matchedDevices.push(device);
        }
      }
      return matchedDevices; // TODO: sorting
    },

    /**
     * Retrieves the index of a device by its ID.
     * @param {!string} id The device id to be found.
     * @return {!number} The device index on the device list,
     *     or -1 if the device doesn't exist.
     */
    getdeviceIdx: function(id) {
      for (var i = this.devices.length - 1; i >= 0; i--) {
        if (this.devices[i].id === id) {
          return i;
        }
      }
      return -1;
    },

    /**
     * Returns the service (application) name by service ID.
     * @param {!string} appID The service ID.
     * @return {!string} The service name.
     */
    getServiceName: function(appID) {
      return (this.services[appID] !== undefined) ?
          this.services[appID].name : 'Error: no service exists';
    },

    /**
     * Returns the current username.
     * @return {!string} The current username.
     */
    getUserName: function() {
      return this.username;
    },

    /**
     * Return the full list of usernames.
     * @return {!Array<string>} Full list of usernames.
     */
    getUsers: function() {
      return this.allUsers;
    },

    /**
     * Parses the device selector string.
     * @param {!string} selectorStr The device selector.
     * @return {!Object} The structured selector by capabilities and criteria.
     */
    parseSelector: function(selectorStr) {
      var finalSelector = {'selectorStr': selectorStr};
      if ([undefined, 'none'].indexOf(selectorStr) >= 0) {
        return finalSelector;
      }
      else if (['all', 'any'].indexOf(selectorStr) >= 0) {
        finalSelector['*'] = {};
        return finalSelector;
      }
      // Break into the top level nodes.
      // e.g. '.showable[size="small"][joint="wrist"],.touchable'
      // => '.showable[size="small"][joint="wrist"]' and ',.touchable'
      selectorStr = selectorStr.replace(/ /g, ''); // remove all spaces
      var selectList = [];
      var orGroups = selectorStr.split(/(?=,\.|,\*|,\#|,:)/g);
      for (var i = 0; i < orGroups.length; i++) {
        var capGroup = orGroups[i];
        if (capGroup[0] === ',') {
          capGroup = capGroup.substring(1, capGroup.length);
        }
        var subCapGroups = capGroup.split('.');
        var selector = {};
        for (var j = 0; j < subCapGroups.length; j++) {
          var subCapGroup = subCapGroups[j];
          if (subCapGroup !== '') {
            var strings = subCapGroup.match(/[*\w\-:]+/g);
            var subCap = strings[0]; // showable
            var ruleSet = {};
            var attributes = subCapGroup.match(/\w+="[\w,]+"/g); // size="small"
            for (var k = 0; attributes && k < attributes.length; k++) {
              var attr = attributes[k].replace(/\"/g, '').split('=');
              var val = attr[1];
              ruleSet[attr[0]] = {}; // size
              if (val.indexOf(',') >= 0) {
                ruleSet[attr[0]]['or'] = val.split(','); // small, medium
              } else {
                ruleSet[attr[0]]['and'] = [val]; // small
              }
            }
            if (subCapGroup.indexOf('#') >= 0) {
              ruleSet['name'] = subCapGroup.split('#')[1]; // #moto360
              subCap = '*';
            }
            if (!(subCap.slice(0, 1) === ':')) {
              selector[subCap] = ruleSet;
            } else {
              ruleSet['type'] = {and: [subCap.replace(/:/g, '')]};
              selector['*'] = ruleSet;
            }
          }
        }
        selectList.push(selector);
      }
      finalSelector[orGroups.length > 1 ? 'or' : 'and'] = selectList;
      return finalSelector;
    },

    /**
     * Determines if the device fulfills the selector criteria.
     * @param {!Device} device The device to be examined.
     * @param {!Object} selector The device selector.
     * @return {boolean} Whether the device fulfills the selector criteria.
     */
    deviceSupports: function(device, selector) {
      if (typeof selector === 'string') {
        selector = parseSelector(selector);
      }
      var list = selector.and || selector.or;
      var matched = true;
      for (var i = 0, l; l = list[i]; i++) {
        for (var key in l) { // showable
          var conditions = l[key]; // [shape="round"][size="small"]
          var totalCondition = Object.keys(conditions).length;
          var matchedCondition = 0;
          if ((key === '*' && !deviceHasProperties(device, conditions)) ||
              (key !== '*' && device.capability[key] === undefined) ||
              (key !== '*' && !(totalCondition === 0 ||
              deviceSupportConstraints(device, conditions,
                 device.capability[key])))) {
            matched = false;
            if (selector.and) break;
          } else {
            matched = true;
          }
        }
        if (!matched && selector.and) return false;
        if (matched && selector.or) return true;
      }
      return matched;

      function deviceHasProperties(device, selector) {
        var matched = true;
        for (var cap in selector) {
          var vals = selector[cap].and || selector[cap].or || [selector[cap]];
          for (var i = 0, v; v = vals[i]; i++) {
            if (device[cap] !== v) {
              if (selector[cap].and || selector[cap].or === undefined) {
                return false;
              }
              else if (i === 0) {
                matched = false;
              }
            } else {
              matched = true;
            }
          }
        }
        return matched;
      }

      /**
       * Determines if the device fulfills the general selector criteria.
       * @param {!Device} device The device to be examined.
       * @param {!Object} selector The device selector.
       * @param {Object=} cap The device capability.
       * @return {boolean} Whether the device fulfills the selector criteria.
       */
      function deviceSupportConstraints(device, selector, capability) {
        var matched = true;
        for (var cap in selector) { // shape
          var val = selector[cap]; // or: round,square
          var values = val.and || val.or;
          for (var i = 0, v; v = values[i]; i++) {
            if (capability === undefined || capability[cap] !== v) {
              if (val.and) return false;
              else matched = false;
            }
            else {
              matched = true;
            }
          }
        }
        return matched;
      }
    },

    /**
     * Creates a selector based on a set of devices.
     * @param {!Array<string>} deviceIds A list of device IDs to be included.
     * @param {!Array<string>} excludedIds A list of device IDs to be excluded.
     */
    createSelectors: function(deviceIds, excludedIds) {
      var suggestions = [];
      var self = this;
      if (deviceIds.length !== 0) {
        var selectedDevices = [];
        for (var i = 0, device; device = this.devices[i]; i++) {
          if (deviceIds.indexOf(device.id) >= 0)
            selectedDevices.push(device);
        }
        var cap = '*', subselector = {};
        // match general properties
        for (var i = 0, attr; attr = this.propertyList[i]; i++) {
          subselector[attr] = findCommonProperty(selectedDevices, attr);
        }
        addSuggestion(suggestSelector(cap, (function(s) {
          delete s.name;
          return s;
        })(subselector), true));
        // match capabilities
        for (var i = 0; cap = this.capabilityList[i]; i++) {
          var values = [];
          // find the common capability
          for (var j = 0; j < selectedDevices.length; j++) {
            var val = selectedDevices[j].capability[cap];
            if (val === undefined) break;
            values.push(val);
          }
          // match the capability attributes
          if (values.length === selectedDevices.length) {
            var subselector = {};
            for (var k in values[0]) {
              if (k != 'on') {
                var val = values[0][k];
                var match = true;
                for (var m = 1; m < values.length && match; m++) {
                  match = values[m][k] === val;
                }
                if (match) {
                  subselector[k] = val;
                }
              }
            }
            // match sub-attributes
            addSuggestion(suggestSelector(cap, subselector, false));
          }
        }
      }
      suggestions.sort(function(a, b) { // sort the suggestions by coverage
        return a.selection.length - b.selection.length;
      });
      if (deviceIds.length !== 0) { // add names
        addSuggestion(suggestSelector('*', {
          name: selectedDevices.map(function(e) {return e['name'];})}, true));
      }
      return suggestions;

      /**
       * Examines if all the devices in the set have the same property.
       * @param {!Array<Object>} devices The device set.
       * @param {!string} prop The target property.
       * @return {string} The common value of the target capability.
       */
      function findCommonProperty(devices, prop) {
        var vals = devices.map(function(e) {return e[prop];});
        var allVals = self.devices.map(function(e) {return e[prop];});
        var uniqueValues = vals.filter(function onlyUnique(val, idx, self) {
            return self.indexOf(val) === idx;
          });
        for (var i = 0, v; v = uniqueValues[i]; i++) {
          // vals.
        }
        return uniqueValues;
        // other properties
        return devices.map(function(e) {return e[prop]})
            .reduce(function(a, b) {
              return (a === b) ? a : null;
            });
      }

      function suggestSelector(key, subselector, mainProp) {
        if (subselector.type !== undefined) {
          key = ':' + subselector.type.join(',');
          delete subselector['type'];
        }
        if (!mainProp) key = '.' + key;
        var selectorStr = generateSelector(key, subselector, mainProp);
        var selector = self.parseSelector(selectorStr);
        var selection = self.select(selector, true);
        // selector['mainProp'] = mainProp;
        return {
          selector: selector,
          selection: selection.getdeviceIds()
        };
      }

      function generateSelector(key, subselector, mainProp) {
        var selectorStr = key;
        var matchedKeys = Object.keys(subselector);
        if (matchedKeys.length > 0) {
          for (var i = 0, k; k = matchedKeys[i]; i++) {
            if (k !== 'type') {
              selectorStr += '[' + k + '="' + subselector[k] + '"]';
            }
          }
        }
        return selectorStr;
      }

      function addSuggestion(suggestion) {
        suggestion.selection.filter(function(el) {
          return excludedIds.indexOf(el) === -1;
        });
        suggestions.push(suggestion);
      }
    },

    /**
     * Creates a Chord-capable device.
     * @param {!string} id The device id.
     * @param {!string} type The device type.
     * @param {!string} name The device name.
     * @param {!boolean} live
     *    Whether it should a physical device on the network.
     * @return {!Device} The Chord-capable device.
     */
    createDevice: function(id, type, name, live) {
      var device = this.deviceTemplates[type].cloneDevice({});
      device.id = id;
      return device;
    },

    /**
     * Removes a device from the device list by its ID.
     * @param {!string} id The device id to be removed.
     * @return {!boolean} Whether the deletion is successful.
     */
    deleteDevice: function(id) {
      var i = this.getdeviceIdx(id);
      if (i >= 0) {
        this.devices.splice(i, 1);
        return true;
      }
      return false;
    },

    /**
     * Resets all the devices.
     */
    resetDevices: function() {
      for (var i = this.devices.length - 1; i >= 0; i--) {
        this.devices[i].reset();
      }
    },

    /**
     * Creates Chord-capable device objects.
     * @param {!Object} capabilities Device capabilities by types.
     * @param {!Object} deviceList A list of chord-capable devices.
     */
    createDevices: function(capabilities, deviceList) {
      var self = this;
      this.deviceList = deviceList;
      this.deviceCapabilities = capabilities;
      createDeviceList(capabilities, deviceList);

      /**
       * Creates a list of devices, each with capabilities defined.
       * @param {!Object} capabilities Device capabilities by types.
       * @param {!Object} deviceList A list of chord-capable devices.
       */
      function createDeviceList(capabilities, deviceList) {
        self.capabilityList = [];
        self.deviceType = {};
        for (var deviceId in deviceList) {
          var info = deviceList[deviceId];
          var device = new Device(info.type, info.name, info.fullname,
              info.joint, info.id, capabilities[deviceId], false);
          // add a new device type
          if (self.deviceType[info.type] === undefined) {
            self.deviceType[info.type] = info.type;
          }
          // update info
          for (var key in info) {
            if (self.propertyList.indexOf(key) >= 0) {
              device[key.toLowerCase()] = info[key].toLowerCase();
            }
          }
          // find possible actions
          for (var cap in device.capability) {
            if (cap.indexOf('.') < 0 && self.capabilityList.indexOf(cap) < 0) {
              self.capabilityList.push(cap);
            }
            var actions = device.capability[cap].on;
            if (actions !== undefined) {
              for (var i = 0; i < actions.length; i++) {
                self.actionCapabilityMap[actions[i]] = cap;
              }
            }
          }
          if (self.deviceTemplates[device.type] === undefined) {
            self.deviceTemplates[device.type] = device;
          }
          self.fullDevices.push(device);
        }
      }
    },

    /**
     * Sets up a full list of Chord-capable devices.
     * @param {!Object} capabilities Device capabilities by types.
     * @param {!Object} deviceList A list of chord-capable devices.
     */
    setup: function(capabilities, deviceList) {
      this.createDevices(capabilities, deviceList);
      this.devices = this.fullDevices;
    },

    /**
     * Sets up devices for the web UI with emulators.
     * @param {!Object} capabilities Device capabilities by types.
     * @param {!Object} deviceList A list of chord-capable devices.
     */
    setupWeb: function(capabilities, deviceList) {
      this.createDevices(capabilities, deviceList);
      this.createEmulatedDevices();
      // this.devices = this.fullDevices; // TODO: get this back, debugging only
    },

    /**
     * Creates emulators.
     */
    createEmulatedDevices: function(callback) {
      this.devices = [];
      var emulators = Object.keys(this.numEmulatedDevices);
      if (Object.keys(this.numEmulatedDevices).length > 0) {
        for (var deviceType in this.numEmulatedDevices) {
          var val = this.numEmulatedDevices[deviceType];
          if (typeof(val) !== 'function') {
            for (var i = 0; i < val; i++) {
              var device = this.createDevice(
                  deviceType + i, deviceType, null, false);
              this.devices.push(device);
            }
          }
        }
        callback();
      }
    },

    /**
     * Sets numbers of emulators.
     * @param {!Object} numEmulatedDevices
     *    Specifies numbers of emulated devices.
     * @param {boolean=} keeplive
     *    Whether to include live devices on the network.
     */
    setEmulatedDevices: function(numEmulatedDevices, keeplive, callback) {
      if (keeplive) {
        for (var i = this.devices.length - 1; i >= 0; i--) {
          if (!this.devices[i].live) { // remove device emulators
            this.devices.splice(i, 1);
          }
        }
      }
      this.numEmulatedDevices = numEmulatedDevices;
      if (this.fullDevices.length > 0) {
        this.createEmulatedDevices(callback);
      }
    },

    /**
     * Adds a new emulator to the current emulator list.
     * @param {!string} id The device id.
     * @param {!string} type The device type.
     * @param {!string} name The device name.
     */
    addEmulatedDevices: function(id, type, name) {
      if (id === null) id = Math.random().toString(36).substring(7);
      var device = this.createDevice(id, type, name, false);
      this.devices.unshift(device);
      Log.v('Created an emulated device (' + type + ')');
    },

    /**
     * Updates the available device list.
     * @param {!boolean} newAdded Whether this is a new device to be added.
     * @param {!string} id The device id to be added.
     * @param {!string} type The device type to be added.
     * @param {!string} name The device name to be added.
     * @return {!boolean} Whether the update is successful.
     */
    updateNetworkDevices: function(newAdded, id, type, name) {
      if (newAdded) {
        for (var i = 0, d; d = this.devices[i]; i++) {
          if (d.id === id) {
            Log.e('Redundant device; ignore registration');
            return true;
          }
        }
        // prepend to the array
        var device = this.createDevice(id, type, name, true);
        this.devices.unshift(device);
        Log.v('A network device was added.');
        return true;
      } else {
        var success = this.deleteDevice(id);
        if (success) Log.v('A network device went offline');
        return success;
      }
    },

    /**
     * Records a list of HTML layouts.
     * @param {!Array<string>} layouts A list of HTML by layout IDs.
     */
    loadLayouts: function(layouts) {
      this.layouts = layouts;
      return;
    },

    /**
     * Retrieves a HTML layout by ID.
     * @param {!string} id The layout ID.
     * @return {!string} The HTML layout of the id.
     */
    getLayoutById: function(id) {
      var layout = this.layouts[id];
      return layout === undefined ? null : layout;
    }
  };

  /**
   * The selection mode.
   * @enum {number}
   */
  var SelectionMode = {
    default: 0,
    all: 1,
    combine: 2
  };

  /**
   * The class representing a Chord device selection set.
   * @param {!Object} selector The device selector.
   * @param {!Array<Device>} devices List of devices.
   * @constructor
   */
  var ChordSelection = function(selector, devices) {
    if (!(this instanceof ChordSelection))
      return new ChordSelection(selector, devices);
    var devices = devices;
    var selector = selector;
    var mode = SelectionMode.default;
    var option = {timeRange: 1000}; // default: 1 second
    var numElements = {};
    var UIelements = [];
    var id = Math.random().toString(36).substring(5);

    /**
     * Detects available Chord-capable devices in the device set.
     * @param {!string} action The action.
     * @return {!boolean} Whether there is any device available.
     */
    function canRunService(action) {
      if (devices.length <= 0) {
        Log.e('No device available to run "' + action + '"');
        return false;
      }
      return true;
    }
    function getOneDevice() {
      var liveDevices = []; // priority: live device
      for (var i = 0, device; device = devices[i]; i++) {
        if (device.live) {
          liveDevices.push(i);
        }
      }
      var idx = function(candidates) {
        // randomly choose from a list of live (if any) or all devices
        return Math.floor(Math.random() * candidates.length);
      }((liveDevices.length > 0) ?
          liveDevices :
          Array.apply(null,
              {length: devices.length - 1}).map(Number.call, Number));
      return devices[idx];
    }
    function removeByIdx(idx) {
      if (idx > -1) {
        devices.splice(idx, 1);
      }
    }
    /** utility methods **/
    this.all = function(option) {
      this.setMode(SelectionMode.all);
      if (option !== undefined) {
        this.setOption(option);
      }
      return this;
    };
    this.combine = function(option) {
      this.setMode(SelectionMode.combine);
      if (option !== undefined) {
        this.setOption(option);
      }
      return this;
    };
    this.not = function(exclusion) {
      if (exclusion instanceof Device) { // directly remove the device
        removeByIdx(devices.indexOf(exclusion));
      } else if (exclusion instanceof ChordSelection) {
        // remove a list of devices
        var exludeDevices = exclusion.getDevices();
        for (var i = 0, excluded; excluded = exludeDevices[i]; i++) {
          removeByIdx(devices.indexOf(excluded));
        }
      } else if (typeof exclusion === 'string') { // remove by selector
        var selector = chord.parseSelector(exclusion);
        var exludeDevices = new ChordSelection(selector,
            chord.getDevices(selector));
        this.not(exludeDevices);
      }
      return this;
    };
    this.append = function(otherSelection) {
      devices = devices.concat(otherSelection.getDevices());
    };
    this.setMode = function(newMode) {
      mode = newMode;
    };
    this.setOption = function(newOption) {
      option = newOption;
    };
    this.getDevices = function() {
      return devices;
    };
    this.size = function() {
      if (devices === undefined) return 0;
      return devices.length;
    };
    this.getDeviceName = function() {
      return this.getDeviceNames();
    };
    this.getDeviceNames = function() {
      var names = [];
      for (var i = 0, device; device = devices[i]; i++) {
        names.push(device.name);
      }
      return names.join(', ');
    };
    this.getdeviceIds = function() {
      var ids = [];
      for (var i = 0, device; device = devices[i]; i++) {
        ids.push(device.id);
      }
      return ids;
    };
    this.getSelector = function() {
      return selector;
    };
    this.getId = function() {
      return id;
    };
    this.getMode = function() {
      return mode;
    };
    this.getOption = function() {
      return option;
    };
    this.getDeviceHasUIById = function(id) {
      var matchedDevices = [];
      for (var i = 0, device; device = devices[i]; i++) {
        if (device.UIelements !== undefined && device.UIelements.length > 0) {
          for (var k = 0, element; element = device.UIelements[k]; k++) {
            for (var j = 0, item; item = element.members[j]; j++) {
              if (item.id === id) {
                matchedDevices.push(device);
              }
            }
          }
        }
      }
      if (matchedDevices.length === 1) {
        return matchedDevices[0];
      } else {
        return new ChordSelection(null, matchedDevices);
      }
    };
    this.updateUIAttr = function(id, attr, value) {
      var devices = this.getDeviceHasUIById(id);
      if ((devices instanceof Device)) {
        devices.updateUIAttr(id, attr, value);
      } else {
        for (var i = 0, device; device = devices[i]; i++) {
          device.updateUIAttr(id, attr, value);
        }
      }
    };
    /** action methods **/
    this.on = function(eventType, fn) {
      var selector = chord.parseSelector(eventType); // parse selector
      if (canRunService(eventType)) {
        if (mode !== SelectionMode.combine) { // default or all mode
          var eventManager = new EventManager(this, eventType, fn);
          for (var i = 0, device; device = devices[i]; i++) {
            device.on(eventType, function(event, manager) {
              manager.eventTriggered(event);
            }, eventManager);
          }
        } else { // .combine
          var eventManager = new EventManager(this, eventType, fn);
          for (var key in selector) {
            var action = (key.indexOf(':') >= 0) ?
                key.substring(0, key.indexOf(':')) : key;
            var capability = chord.actionCapabilityMap[action];
            if (capability !== undefined) {
              for (var i = 0, device; device = devices[i]; i++) {
                var newSelector = {};
                newSelector[capability] = selector[key];
                if (chord.deviceSupports(device, newSelector)) {
                  device.on(key, function(event, manager) {
                    manager.eventTriggered(event);
                  }, eventManager);
                }
              }
            }
          }
        }
      }
      return this;
    };
    this.when = function(eventType) {
      return this;
    };
    this.run = function(fn, data) {
      data !== undefined ? fn(this, data) : fn(this); // run the function
      return this;
    };
    this.show = function(html, fn) {
      if (canRunService('show')) {
        if (html) {
          if (html.indexOf('<') < 0 || !html.startsWith('<div')) {
            // html = '<div>' + html + '</div>';
          }
        }
        var analysis = uiManager.getUIElements(html);
        this.UIelements = analysis[0];
        this.numElements = analysis[1];
        switch (mode) {
          case SelectionMode.default: // pick one to show
            getOneDevice().show(html, id, fn,
              this.UIelements, this.numElements);
            break;
          case SelectionMode.all: // show the same content to all
            for (var i = 0, device; device = devices[i]; i++) {
              device.show(html, id, fn, this.UIelements, this.numElements);
            }
            break;
          case SelectionMode.combine: // distribute the UIs
            var image = this.numElements['IMG_row'];
            if (image !== undefined) { // assign image
              for (var i = 0, device; device = devices[i]; i++) {
                if ((device.UIelements === undefined ||
                    device.UIelements.length === 0) &&
                    device.capability.showable !== undefined &&
                    device.capability.showable.size !== 'small') {
                  // available to show
                  var toShow = this.UIelements[image[0]];
                  var html = uiManager.renderHTML(
                      toShow.type, toShow.members);
                  device.show(html, id, fn, [toShow], this.numElements);
                  break;
                }
              }
            }
            // assign the rest
            var html = '';
            for (var i = 0, group; group = this.UIelements[i]; i++) {
              if (group.type !== 'IMG') {
                html += uiManager.renderHTML(group.type, group.members);
              }
            }
            for (var i = 0, device; device = devices[i]; i++) {
              if (device.UIelements === undefined ||
                  device.UIelements.length === 0) {
                device.show(html, id);
                break;
              }
            }
            break;
        }
      }
      return this;
    };
    this.play = function(filepath) {
      if (devices === undefined || devices.length === 0) {
        console.log('[chord] no device available');
        return;
      }
      switch (mode) {
        case SelectionMode.default: // pick one to play
          getOneDevice().play(filepath, id);
          break;
        case SelectionMode.all: // play the same content to all
          for (var i = 0, device; device = devices[i]; i++) {
            device.play(filepath, id);
          }
          break;
        case SelectionMode.combine: // pick one to play
          getOneDevice().play(filepath, id);
          break;
      }
      return this;
    };
    this.call = function(calleeNum, fn) { // only one device to make a call
      if (canRunService()) {
        getOneDevice().call(calleeNum, id, fn);
      }
      return this;
    };
    this.wakeup = function() {
      if (canRunService('wakeup')) {
        if (mode === SelectionMode.default) { // pick one
          getOneDevice().wakeup();
        } else { // show to all or distribute
          for (var i = 0, device; device = devices[i]; i++) {
            device.wakeup();
          }
        }
      }
      return this;
    };
    this.startApp = function(appName) {
      var suc = false;
      if (canRunService('startApp')) {
        switch (mode) {
          case SelectionMode.default: // pick one
            getOneDevice().startApp(appName, id);
            suc = true;
            break;
          case SelectionMode.all: // show to all
            for (var i = 0, device; device = devices[i]; i++) {
              device.startApp(appName, id);
            }
            suc = true;
            break;
          case SelectionMode.combine: // distribute control panel
            for (var i = 0, device; device = devices[i] && !suc; i++) {
              if (device.capability['showable'].size === 'normal') {
                device.startApp(appName, id);
                suc = true;
              }
            }
            break;
        }
      }
      if (!suc) {
        Log.e('Unable to start the app ' + appName);
      }
      return this;
    };
    this.killApp = function(appName) {
      if (canRunService('killApp')) {
        if (mode === SelectionMode.default) {
          getOneDevice().killApp(appName);
        } else {
          for (var i = 0, device; device = devices[i]; i++) {
            device.killApp(appName);
          }
        }
      }
      return this;
    };
  };

  /**
   * The class representing a Chord device.
   * @param {!string} type The device type.
   * @param {!string} name The device name.
   * @param {!string} joint Human joint that the device will be operated.
   * @param {!string} id The device id.
   * @param {!Object} capabilities Device capabilities.
   * @param {!boolean} live Whether it should a physical device on the network.
   * @constructor
   */
  var Device = function(type, name, fullname, joint, id, capabilities, live) {
    if (!(this instanceof Device))
      return new Device(type, name, fullname, joint, id, capabilities, live);
    this.type = type;
    this.name = name;
    this.fullname = fullname;
    this.id = id;
    this.selectionId = null; // the selection id this device attaches to
    this.joint = joint;
    this.live = live; // on network
    this.capability = capabilities;
    // UI-related
    this.html = '';
    this.UIelements = null;
    this.UIcards = [];
    this.UIcardIdx = {
      row: 0,
      col: 0
    };
    this.panelSetup = {
      id: 'rootPanel',
      maxW: 95,
      maxH: 70,
      minH: 15,
      minW: 20,
      fontSize: 40
    };
    this.UI = null;
    this.emulator = null;
    this.init();
  };
  Device.fn = Device.prototype = {
    init: function() {
      for (var cap in this.capability) {
        if (this.capability[cap].on != undefined) {
          for (var idx = 0, evt; evt = this.capability[cap].on[idx]; idx++) {
            var handler = function(event) {};
            switch (evt) {
              case 'rotateCCW':
                handler = function(event) {
                  event.getDevice().emulator.rotateCCW(event.getDevice());
                };
                break;
              case 'rotateCW':
                handler = function(event) {
                  event.getDevice().emulator.rotateCW(event.getDevice());
                };
                break;
            }
            this.on(evt, handler);
            // if (this.capability[cap].indexOf(evt) < 0) {
            //   this.capability[cap].push(evt);
            // }
          }
        }
      }
      if (this.type === chord.deviceType.watch) {
        var self = this;
        this.on('pageChange', function(event) {
          var info = event.getValue().split(',');
          self.UIcardIdx.row = parseInt(info[0]);
          self.UIcardIdx.col = parseInt(info[1]);
          self.UI = self.emulator.showUI(self,
            self.UIcards[self.UIcardIdx.row][self.UIcardIdx.col]);
        });
      }
    }
  };
  Device.fn.attr = function(attr, val) {
    if (typeof val !== 'undefined') {
      this[attr] = val;
    } else {
      return this[attr];
    }
  };
  Device.fn.is = function(capability) {
    return this.capability[capability] !== undefined;
  };
  Device.fn.addEmulator = function(callback) {
    this.emulator = callback;
  };
  Device.fn.getDeviceName = function() {
    return this.name;
  };
  Device.fn.size = function() {
    return 1;
  };
  /** Generate UI **/
  Device.fn.renderUI = function(html, UIelements, numElements) {
    this.UIelements = UIelements;
    this.html = this.wrapHtml(html, numElements);
    if (this.type === chord.deviceType.phone) {
      return this.html;
    }
    else if (this.type === chord.deviceType.watch ||
        this.type === chord.deviceType.glass) {
      return this.UIelements;
    }
  };
  Device.fn.renderEmulatorUI = function() {
    if (this.html === '') return '';
    if (this.type === chord.deviceType.phone ||
        this.type === chord.deviceType.tablet) {
      return this.html;
    }
    this.renderEmulatorCards();
    this.UIcardIdx = {row: 0, col: 0};
    if (this.type === chord.deviceType.watch) {
      return this.UIcards[this.UIcardIdx.row][this.UIcardIdx.col];
    }
    else if (this.type === chord.deviceType.glass) {
      return this.UIcards[this.UIcardIdx.col];
    }
  };
  Device.fn.renderEmulatorCards = function() {
    this.UIcards = [];
    for (var i = 0, el; el = this.UIelements[i]; i++) {
      var newRow = [];
      for (var j = 0, member; member = el.members[j]; j++) {
        var newCard = this.renderEmulatorCardHTML(el.type, member);
        if (this.type === chord.deviceType.watch) {
          newRow.push(newCard);
        }
        else if (this.type === chord.deviceType.glass) {
          this.UIcards.push(newCard);
        }
      }
      if (newRow.length !== 0) {
        this.UIcards.push(newRow);
      }
    }
  };
  Device.fn.renderEmulatorCardHTML = function(tag, member) {
    return '<' + tag + ' value="' + (member.val || '') + '"' + ' class="' +
        (member.val || '') + '" src="' + (member.src || '') +
        '">' + member.html + '</' + tag + '>';
  };
  Device.fn.wrapHtml = function(html, numElements) {
    if (html === '') return html;
    var oriHTML = html;
    var style = '<style>';
    style += '#' + this.panelSetup.id +
        ' {height:100%;padding:5px;' +
        'font-size:20px!important;text-align:center;}';
    style += '#' + this.panelSetup.id +
        ' div {height:100%;overflow:auto;text-align:center;}';
    style += '#' + this.panelSetup.id +
        ' img {max-width:100%;max-height:100%;height:auto;}';
    var pHeight = 10;
    if (numElements.pRow > 0) { // layout p tag
      style += '#' + this.panelSetup.id +
          ' p {height:' + pHeight + '%;margin-bottom:5px;}';
    }
    if (numElements.buttonRow && numElements.buttonRow.length > 0) {
      // layout buttons
      var buttonWidth = this.panelSetup.maxW;
      var buttonHeight = this.panelSetup.maxH;
      if (numElements.pRow !== undefined) {
        buttonHeight -= numElements.pRow * pHeight;
      }
      buttonHeight = Math.max(buttonHeight / numElements.maxBtn,
          this.panelSetup.minH);
      fontSize = buttonHeight > this.panelSetup.min ?
          this.panelSetup.fontSize : 30;
      style += this.panelSetup.id + ' button {width:' + buttonWidth +
          '%;height:' + buttonHeight + '%;margin-bottom:5px;font-size:' +
          fontSize + 'px;}';
    }
    style += '</style>';
    return '<div id="' + this.panelSetup.id + '">' + style + html + '</div>';
  };
  Device.fn.updateUIAttr = function(id, attr, value) {
    var html = '', found = false;
    for (var i = 0, element; element = this.UIelements[i]; i++) {
      for (var j = 0, item; item = element.members[j]; j++) {
        if (item.id === id) {
          this.UIelements[i].members[j][String(attr)] = value;
          found = true;
          break;
        }
      }
      html += uiManager.renderHTML(
          this.UIelements[i].type, this.UIelements[i].members);
    }
    if (found) {
      this.show(html);
    }
  };
  /** action methods **/
  Device.fn.on = function(evt, fn, manager) {
    if (typeof fn == 'function') { // add listener
      if (this['on' + evt] === undefined) {
        this['on' + evt] = [];
        if (this.live) {
          chordServer.on(this.id, evt);
        }
      }
      // event bubbling: single-device event has higher priority
      this['on' + evt].push({fn: fn, manager: manager});
      this['on' + evt].sort(function compare(a, b) {
        if (a.manager === undefined || b.manager === undefined)
          return -1;
        if (a.manager.deviceNum() < b.manager.deviceNum())
          return -1;
        if (a.manager.deviceNum() > b.manager.deviceNum())
          return 1;
        return 0;
      });
      // UI event
      if (this.UI !== null && evt === 'tap:button') {
        this.UI.find('button').click({device: this}, function(event) {
          event.data.device.onUI('tap:button', $(this).attr('value'));
        });
      }
    } else { // event triggerred
      if (isWebUI) {
        this.emulator.applyClass(this.id, evt);
      }
      var newEvent = (typeof fn === 'string' || fn === undefined) ?
          new SingleDeviceEvent(this, evt, fn === '' ? null : fn) : fn;
      if (this['on' + evt] !== undefined) {
        for (var i = 0, listener; listener = this['on' + evt][i]; i++) {
          // propagation
          if (listener.manager !== undefined) { // listener by EventManager
            listener.fn(newEvent, listener.manager);
          } else {
            listener.fn(newEvent); // listener that directly hooks
          }
        }
      }
      if (evt.lastIndexOf('swipe', 0) === 0 && this.UIcards.length !== 0) {
        // for UI simulation
        if (this.type === chord.deviceType.watch) {
          switch (evt) {
            case 'swipeLeft':
              if (this.UIcardIdx.col > 0) {
                this.UIcardIdx.col--;
              }
              break;
            case 'swipeRight':
              if (this.UIcardIdx.col + 1 <
                  this.UIcards[this.UIcardIdx.row].length) {
                this.UIcardIdx.col++;
              }
              break;
            case 'swipeUp':
              if (this.UIcardIdx.row > 0) {
                this.UIcardIdx.row--;
              }
              break;
            case 'swipeDown':
              if (this.UIcardIdx.row + 1 < this.UIcards.length) {
                this.UIcardIdx.row++;
              }
              break;
          }
          this.UI = this.emulator.showUI(this,
              this.UIcards[this.UIcardIdx.row][this.UIcardIdx.col]);
        }
        else if (this.type === chord.deviceType.glass) {
          switch (evt) {
            case 'swipeLeft':
              if (this.UIcardIdx.col > 0) {
                this.UIcardIdx.col--;
              }
              break;
            case 'swipeRight':
              if (this.UIcardIdx.col + 1 <
                  this.UIcards[this.UIcardIdx.row].length) {
                this.UIcardIdx.col++;
              }
              break;
            case 'swipeUp':
              break;
            case 'swipeDown':
              break;
          }
          this.UI = this.emulator.showUI(this,
              this.UIcards[this.UIcardIdx.col]);
        }
        if (this.UI !== null && this['on' + 'tap:button'] !== undefined) {
          this.UI.find('button').click({device: this}, function(event) {
            event.data.device.onUI('tap:button', $(this).attr('value'));
          });
        }
      }
    }
    return this;
  };
  Device.fn.onUI = function(type, value) {
    switch (type) {
      case 'tap:button':
        var deviceEvent = new SingleDeviceEvent(this, type, value);
        this.on('tap:button', deviceEvent);
        break;
    }
  };
  Device.fn.run = function(fn, data) {
    data !== undefined ? fn(this, data) : fn(this); // run the function
    return this;
  };
  Device.fn.show = function(html, selectionId, fn, UIelements, numElements) {
    this.selectionId = selectionId;
    if (html.indexOf('<') < 0 || !html.startsWith('<div')) {
      // html = '<div>' + html + '</div>';
    }
    if (UIelements === undefined || numElements === undefined) {
      var analysis = uiManager.getUIElements(html);
      UIelements = analysis[0];
      numElements = analysis[1];
    }
    var toShow = this.renderUI(html, UIelements, numElements);
    this.wakeup();
    this.UI = this.emulator.showUI(this, this.renderEmulatorUI());
    if (this.live) {
      chordServer.show(this.id, toShow);
    }
    if (fn !== undefined) {
      fn(this); // when shown, callback if user specifies
    }
    return this;
  };
  Device.fn.play = function(filepath, selectionId, fn) {
    this.selectionId = selectionId;
    this.wakeup();
    if (isWebUI) {
      if (!filepath.startsWith('http')) {
        filepath = filepaths.curDir + filepath;
      }
      var audioElement = document.createElement('audio');
      audioElement.setAttribute('src', filepath);
      audioElement.setAttribute('autoplay', 'autoplay');
    }
    if (this.live) {
      chordServer.play(this.id, filepath);
    }
    // when shown, callback if user specifies
    if (fn !== undefined) {
      fn(this);
    }
    return this;
  };
  Device.fn.call = function(calleeNum, selectionId, fn) {
    this.selectionId = selectionId;
    if (isWebUI) {
      this.wakeup();
      this.emulator.call(this, calleeNum);
    }
    if (this.live) {
      chordServer.call(this.id, calleeNum);
    }
    // when shown, callback if user specifies
    if (fn !== undefined) {
      fn(this);
    }
    return this;
  };
  Device.fn.wakeup = function() {
    if (isWebUI) {
      this.emulator.wakeup(this);
    }
    if (this.live) {
      chordServer.wakeup(this.id);
    }
    return this;
  };
  Device.fn.reset = function() {
    this.show('');
    this.emulator.reset(this.id);
    this.selectionId = null;
    if (this.live) {
      chordServer.reset(this.id);
    }
    return this;
  };
  Device.fn.startApp = function(appName, selectionId) {
    if (isWebUI) {
      this.emulator.startApp(this, appName);
    } else if (this.live) {
      chordServer.startApp(this.id, appName);
    }
    return this;
  };
  Device.fn.killApp = function(appName) {
    if (isWebUI) {
      this.emulator.killApp(this, appName);
    } else if (this.live) {
      chordServer.killApp(this.id, appName);
    }
    return this;
  };
  Device.fn.cloneDevice = function() {
    var copy = new Device(this.type, this.name, this.fullname, this.joint,
        this.id, this.capabilities, this.live);
    for (var prop in this) {
      copy[prop] = this[prop];
    }
    return copy;
  };

  /**
   * The class representing a Chord event.
   * @param {!Array<Device>} devices The devices in the event.
   * @param {!SelectionMode} mode The device mode.
   * @param {!string} eventType The triggered event type.
   * @param {!Object} vals The values related to the event.
   * @constructor
   */
  var Event = function(devices, mode, eventType, vals) {
    this.devices = devices;
    this.eventType = eventType;
    this.timestamp = new Date(); // current time
    this.vals = vals;
    this.selection = new ChordSelection(null, this.devices);
    this.selection.setMode(mode);
  };
  Event.prototype.getDevices = function() {
    return this.selection;
  };
  Event.prototype.getDevice = function() {
    return this.getDevices();
  };
  Event.prototype.getEventType = function() {
    return this.eventType;
  };
  Event.prototype.getTimestamp = function() {
    return this.timestamp;
  };
  Event.prototype.getValues = function() {
    return this.vals;
  };
  Event.prototype.getValue = function() {
    return this.getValues();
  };

  /**
   * The class representing a Chord single-device event.
   * @param {!Device} device The single device in the event.
   * @param {!string} eventType The triggered event type.
   * @param {!Object} val The values related to the event.
   * @constructor
   */
  var SingleDeviceEvent = function(device, eventType, val) {
    Event.call(this, [device], SelectionMode.default, eventType, [val]);
  };
  SingleDeviceEvent.prototype = new Event();
  SingleDeviceEvent.prototype.getDevice = function() {
    return this.devices.length > 0 ? this.devices[0] : null;
  };
  SingleDeviceEvent.prototype.getValue = function() {
    return this.devices.length > 0 ? this.vals[0] : null;
  };

  /**
   * The class representing a Chord event manager.
   * @param {!ChordSelection} selection The devices to attach to the event.
   * @param {!string} eventType The triggered event type.
   * @param {!function} fn The callback function.
   * @constructor
   */
  var EventManager = function(selection, eventType, fn) {
    if (!(this instanceof EventManager)) {
      return new EventManager(selection, eventType, fn);
    }
    this.parent = selection; // ChordSelection source
    this.eventType = eventType;
    this.callbackFunc = fn; // developer callback function

    this.timestamps = []; // corresponding timestamps triggered
    this.vals = []; // corresponding event values

    this.deviceIds = []; // id of devices
    var devices = this.parent.getDevices();
    for (var i = 0, device; device = devices[i]; i++) {
      this.deviceIds.push(device.id);
      this.timestamps.push(null);
      this.vals.push(null);
    }
    this.checkTimestamps = function(event) {
      var idx = $.inArray(event.getDevice().id, this.deviceIds);
      if (idx < 0) {
        return false;
      }
      this.timestamps[idx] = event.timestamp; // mark the timestamp
      this.vals[idx] = event.val; // mark the value
      for (var i = 0; i < this.timestamps.length; i++) {
        var t = this.timestamps[i];
        if (t === null || event.timestamp - t >
            this.parent.getOption().timeRange) {
          return false;
        }
      }
      return true;
    };
  };
  EventManager.fn = EventManager.prototype = {
    init: function() {}
  };
  EventManager.fn.deviceNum = function() {
    return this.parent.getMode() === SelectionMode.default ?
        1 : this.parent.size();
  };
  EventManager.fn.eventTriggered = function(event) {
    if (this.parent.getMode() === SelectionMode.default) {
      // individual device event
      this.callbackFunc(event);
      return true;
    }
    else if (this.parent.getMode() === SelectionMode.all) { // all sync
      if (this.checkTimestamps(event)) {
        // if all within timerange,
        // callback the developer function with multi-device info
        this.callbackFunc(new Event(this.parent.getDevices(),
            this.parent.getMode(), this.eventType, this.vals));
      }
      return true;
    }
    else if (this.parent.getMode() === SelectionMode.combine) { // combine
      if (this.checkTimestamps(event) || event.eventType === 'tap:button') {
        this.callbackFunc(new Event(this.parent.getDevices(),
            this.parent.getMode(), this.eventType, event.getValues()));
      }
      return true;
    }
    return false;
  };

  /**
   * The class representing a Chord UI manager.
   * @constructor
   */
  var uiManager = {
    getUIElements: function(html) {
      var numElements = {total: 0, maxBtn: 0};
      var UIelements = [];
      if (html !== '') {
        // parse HTML to generate UI elements
        var pageObj = {};
        var preload = $('<div>').append(html).children();
        if (preload.prop('tagName') === undefined) { // string only
          var groupName = 'P', group = [];
          group.push({val: null, html: html, id: null, src: null});
        } else {
          var allElements = (preload.prop('tagName') === 'DIV') ?
              preload.find('*') : preload;
          numElements.total = allElements.length;
          var groupName = null, group = null;
          for (var i = 0, el; el = allElements[i]; i++) {
            var tagName = $(el).prop('tagName');
            if (tagName !== groupName) {
              if (groupName) {
                UIelements = this.addNewUIgroup(UIelements,
                    numElements, groupName, group);
              }
              groupName = tagName;
              group = [];
            }
            var val = $(el).attr('value') || null;
            var id = $(el).attr('id') || null;
            var src = $(el).attr('src') || null;
            group.push({val: val, html: $(el).html(), id: id, src: src});
          }
        }
        UIelements = this.addNewUIgroup(UIelements,
            numElements, groupName, group);
      }
      return [UIelements, numElements];
    },
    addNewUIgroup: function(UIelements, numElements, groupName, group) {
      if (groupName !== null && group !== null) {
        UIelements.push({type: groupName, members: group});
        var rowName = groupName + '_row';
        if (numElements[groupName + '_row'] === undefined) {
          numElements[groupName + '_row'] = [];
        }
        numElements[groupName + '_row'].push(UIelements.length - 1);
        if (groupName === 'BUTTON') {
          numElements.maxBtn = Math.max(numElements.maxBtn, group.length);
        }
      }
      return UIelements;
    },
    renderHTML: function(tag, items) {
      var html = '';
      for (var j = 0, item; item = items[j]; j++) {
        html += '<' + tag;
        if (item.id !== null) html += ' id="' + item.id + '"';
        if (item.src !== null) html += ' src="' + item.src + '"';
        if (item.val !== null) html += ' value="' + item.val + '"';
        html += '>' + item.html + '</' + tag + '>';
      }
      return html;
    }
  };

  /**
   * The class representing a Chord server module for web Authoring UI
   * to communicate with the backend server to update live devices.
   * @constructor
   */
  var ChordWebServer = function() {
    if (!(this instanceof ChordWebServer)) {
      return new ChordWebServer();
    }
    this.host = '127.0.0.1';
    this.port = 9999;
    this.socket = null;
    this.callback = {};
  };
  ChordWebServer.prototype.addCallback = function(type, fn) {
    this.callback[type] = fn;
  };
  ChordWebServer.prototype.on = function(deviceId, evt) {
    this.socket.emit('on', deviceId, evt);
  };
  ChordWebServer.prototype.show = function(deviceId, selectionId, content) {
    this.socket.emit('show', deviceId, content);
  };
  ChordWebServer.prototype.play = function(deviceId, media) {
    this.socket.emit('play', deviceId, media);
  };
  ChordWebServer.prototype.call = function(deviceId, calleeNum) {
    this.socket.emit('call', deviceId, calleeNum);
  };
  ChordWebServer.prototype.wakeup = function(deviceId) {
    this.socket.emit('wakeup', deviceId);
  };
  ChordWebServer.prototype.reset = function(deviceId) {
    this.socket.emit('reset', deviceId);
  };
  ChordWebServer.prototype.startApp = function(deviceId, appName) {
    this.socket.emit('startApp', deviceId, appName);
  };
  ChordWebServer.prototype.killApp = function(deviceId, appName) {
    this.socket.emit('killApp', deviceId, appName);
  };

  /**
   * The Chord web server.
   * @type {Object}
   */
  var chordServer = new ChordWebServer();

  chord.init();
  if (isWebUI) {
    window.chord = chord;
    window.chordServer = chordServer;
  }
  return chord;
})();
