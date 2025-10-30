'use strict';

/* eslint-disable no-use-before-define */

const Homey = require('homey');

/**
 * Class for communicating with the TaHoma cloud service or local API
 * @hideconstructor
 */
class Tahoma extends Homey.SimpleClass {

  /**
	 * Checks if using local API mode
	 * @private
	 * @returns {boolean}
	 */
  static _isLocalMode() {
    const { ManagerSettings } = require('homey');
    return (ManagerSettings.get('connectionMode') || 'cloud') === 'local';
  }

  /**
	 * Logs in the TaHoma service with the provided login credentials
	 * Note: Only used for cloud API mode
	 * @param {string} username - Username which is used to login in TaHoma
	 * @param {string} password - Password which is used to login in TaHoma
	 * @returns {Promise<Object>}
	 * @async
	 */
  static login(username, password) {
    if (this._isLocalMode()) {
      // Local API doesn't use login, just return success
      return Promise.resolve({ success: true });
    }

    const options = {
      uri: '/login',
      form: {
        userId: username,
        userPassword: password
      }
    };

    return HttpHelper.post(options);
  }
  /**
	 * Logout of the TaHoma service
	 * Note: Only used for cloud API mode
	 * @returns {Promise<Object>}
	 * @async
	 */
  static logout() {
    if (this._isLocalMode()) {
      // Local API doesn't use logout, just return success
      return Promise.resolve({ success: true });
    }

    const options = {
      uri: '/logout'
    };

    return HttpHelper.post(options);
  }

  /**
	 * Gets the TaHoma device setup
	 * @returns {Promise<Object>}
	 * @async
	 */
  static setup() {
    const options = {
      uri: '/setup'
    };

    return HttpHelper.get(options);
  }

  /**
	 * Gets the actionGroups from TaHoma
	 * Note: Local API uses /setup/scenarios instead of /actionGroups
	 * @returns {Promise<Object>}
	 * @async
	 */
  static getActionGroups() {
    const uri = this._isLocalMode() ? '/setup/scenarios' : '/actionGroups';
    const options = {
      uri: uri
    };

    return HttpHelper.get(options);
  }

  /**
	 * Gets the device state history from TaHoma
	 * @param {string} deviceUrl - The device url for the device as defined in TaHoma
	 * @param {string} state - The device state for which to retrieve the hisory
	 * @param {timestamp} from - The timestamp from which to retrieve the history
	 * @param {timestamp} to - The timestamp until to retrieve the history
	 * @returns {Promise<Object>}
	 * @async
	 */
  static getDeviceStateHistory(deviceUrl, state, from, to) {
    const options = {
      uri: '/setup/devices/' + encodeURIComponent(deviceUrl) + '/states/' + encodeURIComponent(state) + '/history/' + from + '/' + to
    };

    return HttpHelper.get(options);
  }

  /**
	 * Executes an action on a give device in TaHoma
	 * @param {string} name - Name of the device
	 * @param {string} deviceUrl - Url of the device
	 * @param {Object} action - An object defining the action to be executed in TaHoma
	 * @example
	 * const action = {
	 *    name: 'open',
	 *    parameters: []
	 * };
	 *
	 * Tahoma.executeDeviceAction('device name', 'url/of/the/device', action)
	 *    .then(result => {
	 *       //process result
	 *    })
	 *    .catch(error => {
	 *       //handle error
	 *    });
	 * @returns {Promise<Object>}
	 * @async
	 */
  static executeDeviceAction(name, deviceUrl, action) {
    const options = {
      uri: '/exec/apply',
      json: true,
      body: {
        label: name + ' - ' + action.name + '  - Homey',
        actions: [
          {
            deviceURL: deviceUrl,
            commands: [
              action
            ]
          }
        ]
      }
    };

    return HttpHelper.post(options);
  }

  /**
	 * Executes a TaHoma scenario
	 * Note: Local API uses /exec/apply with scenario format
	 * @param {string} scenarioId - The id of the scenario (oid in TaHoma)
	 * @returns {Promise<Object>}
	 * @async
	 */
  static executeScenario(scenarioId) {
    if (this._isLocalMode()) {
      // Local API uses /exec/apply with scenario format
      const options = {
        uri: '/exec/apply',
        json: true,
        body: {
          label: 'Scenario - Homey',
          actions: [{
            type: 1,
            group: scenarioId
          }]
        }
      };
      return HttpHelper.post(options);
    }

    // Cloud API
    const options = {
      uri: '/exec/' + scenarioId
    };

    return HttpHelper.post(options);
  }

  /**
	 * Cancels the execution of a previously defined action
	 * @param {string} executionId - The execution id of the action
	 * @returns {Promise<Object>}
	 * @async
	 */
  static cancelExecution(executionId) {
    const options = {
      uri: '/exec/current/setup/' + executionId
    };

    return HttpHelper.delete(options);
  }
}

module.exports = Tahoma;

const HttpHelper = require('./HttpHelper');
