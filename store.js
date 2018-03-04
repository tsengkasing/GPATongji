const {CookieAccessInfo, CookieJar} = require('cookiejar');

/**
 * @class Store
 * Store the cookie while request
 */
class Store {
	/**
	 * initialize account
	 * @param {string} token1
	 * @param {string} token2
	 */
	constructor (token1, token2) {
		this._cookieJar = CookieJar();
		this._token1 = token1;
		this._token2 = token2;
	}

	setCookies (cookie) {
		this._cookieJar.setCookies(cookie);
	}

	getCookies (domain, path, secure, script) {
		return this._cookieJar.getCookies(CookieAccessInfo(domain, path, secure, script));
	}

	get token1 () {
		return this._token1;
	}

	get token2 () {
		return this._token2;
	}
}

module.exports = Store;
