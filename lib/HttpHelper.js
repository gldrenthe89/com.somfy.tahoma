'use strict';

const { SimpleClass, ManagerSettings, ManagerI18n } = require('homey');
const request = require('request');
const https = require('https');
const cookieJar = request.jar();

const tahomaRequest = request.defaults({
  baseUrl: 'https://www.tahomalink.com/enduser-mobile-web/enduserAPI',
  jar: cookieJar
});

let instance = null;

/**
 * Helper for managing http requests to TaHoma cloud or local API
 * @static
 * @hideconstructor
 * @example
 * const HttpHelper = require('./HttpHelper');
 * HttpHelper.get({ uri: '/url/path' })
 *   .then(data => {
 *      //process data
 *   })
 *   .catch(error => {
 *      //handle error
 *   });
 */
class HttpHelper extends SimpleClass {

  constructor() {
    if (!instance) {
      super();
      instance = this;
    }

    return instance;
  }

  /**
   * Gets the appropriate request client based on connection mode
   * @private
   * @return {Object} request client
   */
  _getRequestClient() {
    const connectionMode = ManagerSettings.get('connectionMode') || 'cloud';

    if (connectionMode === 'local') {
      const localHost = ManagerSettings.get('localHost');
      if (!localHost) {
        throw new Error('Local host not configured');
      }

      // Create local API request client with self-signed certificate support
      return request.defaults({
        baseUrl: `https://${localHost}/api/v1`,
        agentOptions: {
          rejectUnauthorized: false // Accept self-signed certificates
        },
        headers: {
          'Authorization': `Bearer ${ManagerSettings.get('localToken') || ''}`
        }
      });
    }

    // Default to cloud API
    return tahomaRequest;
  }

  /**
   * Checks if using local API mode
   * @private
   * @return {boolean}
   */
  _isLocalMode() {
    return (ManagerSettings.get('connectionMode') || 'cloud') === 'local';
  }

  /**
	 * Makes an async http get request to TaHoma
	 * @async
	 * @param {Object} options
	 * @return {Promise<Object>}
	 */
  get(options) {
    return new Promise((resolve, reject) => {
      const requestClient = this._getRequestClient();

      requestClient.get(options, (error, response, body) => {
        if (error) {
          return reject(error);
        }

        if (response.statusCode === 401 && !this._isLocalMode()) {
          //no longer authenticated -> login again (cloud mode only)
          return this.reAuthenticate('get', options)
            .then(result => resolve(result))
            .catch(error => reject(error));
        }

        if (response.statusCode === 401 && this._isLocalMode()) {
          return reject(new Error('Unauthorized: Invalid or expired token'));
        }

        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(e);
        }
      });
    });
  }

  /**
	 * Makes an async http post request to TaHoma
	 * @async
	 * @param {Object} options
	 * @return {Promise<Object>}
	 */
  post(options) {
    return new Promise((resolve, reject) => {
      const requestClient = this._getRequestClient();

      requestClient.post(options, (error, response, body) => {
        if (error) {
          return reject(error);
        }

        if (options.uri !== '/login' && response.statusCode === 401 && !this._isLocalMode()) {
          //no longer authenticated -> login again (cloud mode only)
          return this.reAuthenticate('post', options)
            .then(result => resolve(result))
            .catch(error => reject(error));
        }

        if (response.statusCode === 401 && this._isLocalMode()) {
          return reject(new Error('Unauthorized: Invalid or expired token'));
        }

        try {
          const result = (options.json) ? body : JSON.parse(body);
          resolve(result);
        } catch (e) {
          reject(e);
        }
      });
    });
  }

  /**
	 * Makes an async http delete request to TaHoma
	 * @async
	 * @param {Object} options
	 * @return {Promise}
	 */
  delete(options) {
    return new Promise((resolve, reject) => {
      const requestClient = this._getRequestClient();

      requestClient.delete(options, (error, response) => {
        if (error) {
          return reject(error);
        }

        if (options.uri !== '/login' && response.statusCode === 401 && !this._isLocalMode()) {
          //no longer authenticated -> login again (cloud mode only)
          return this.reAuthenticate('delete', options)
            .then(result => resolve(result))
            .catch(error => reject(error));
        }

        if (response.statusCode === 401 && this._isLocalMode()) {
          return reject(new Error('Unauthorized: Invalid or expired token'));
        }

        resolve(null);
      });
    });
  }

  reAuthenticate(forwardMethod, forwardOptions) {
    return new Promise((resolve, reject) => {
      const username = ManagerSettings.get('username');
      const password = ManagerSettings.get('password');
      Tahoma.login(username, password) // eslint-disable-line no-use-before-define
        .then(result => {
          if (result.success && typeof this[forwardMethod] === 'function') {
            this[forwardMethod](forwardOptions)
              .then(result => resolve(result))
              .catch(error => reject(error));
          } else {
            const message = ManagerI18n.__('errors.on_pair_login_failure');
            reject(new Error(message));
          }
        })
        .catch(error => {
          console.log(error.message, error.stack);
          reject(error);
        });
    });
  }
}

module.exports = new HttpHelper();

const Tahoma = require('./Tahoma');
