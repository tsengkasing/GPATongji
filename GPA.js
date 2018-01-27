/**
 * @fileOverview
 *
 * Getting GPA of Undergraduate from xuanke.tongji.edu.cn
 *
 * Due to the reason that the charset of the website is gbk2312,
 * so we need to convert it to utf8 using iconv-lite.
 *
 * What's more, we use jsdom to parse the html.
 *
 * @author tsengkasing <tsengkasing@gmail.com>
 */

const http = require('http');
const md5 = require('md5');
const querystring = require('querystring');
const iconv = require('iconv-lite');
const minify = require('html-minifier').minify;
const {JSDOM} = require('jsdom');
const Raven = require('raven');

const {RAVEN_DSN} = require('./config.json');

Raven.config(RAVEN_DSN).install();

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
		this._cookie = null;
		this._token1 = token1;
		this._token2 = token2;
	}

	setCookie (cookie) {
		this._cookie = cookie;
	}

	getCookie () {
		return this._cookie;
	}

	get token1 () {
		return this._token1;
	}

	get token2 () {
		return this._token2;
	}
}

/**
 * Main Function
 * Visit xuanke.tongji.edu.cn
 * Get cookie
 * Validate Student Number & passwotd
 * Validate CAPTCHA
 * Obtain GPA Page
 * Parse GPA Page
 * Response JSON string
 *
 * @param {string} token1 Student Number
 * @param {string} token2 Password
 */
async function GPA (token1, token2) {
	Raven.setContext({
		username: token1
	});

	const store = new Store(token1, token2);

	try {
		await requestLoginPage(store);
		await requestToLogin(store);
		await requestLoginCheckCode(store);
		await requestToHome(store);
		await requestBeforeGetGPA(store);
		const html = await requestGetGPA(store);
		const gpa = parseGPA(html);
		return {status: true, data: gpa};
	} catch (e) {
		console.error(`[${new Date().toLocaleString()}] ${token1}`, e.message);
		return {status: false, data: e.message};
	}
}

/**
 * Visit xuanke.tongji.edu.cn
 * @param {any} store
 */
function requestLoginPage (store) {
	return new Promise((resolve, reject) => {
		const req = http.request({
			hostname: 'xuanke.tongji.edu.cn',
			method: 'GET',
			port: 80
		}, res => {
			const info = [];
			res.on('data', chunk => info.push(chunk));
			res.on('end', () => {
				const cookies = res.headers['set-cookie'];
				if (cookies) {
					store.setCookie(cookies.join('').split(';')[0]);
					resolve();
				} else {
					reject(new Error('连不上xuanke网了呢~~'));
				}
			});
		});

		req.on('error', (e) => {
			Raven.captureException(e);
			console.error(e.message);
			reject(new Error('连不上xuanke网了呢~~'));
		});

		req.setTimeout(10000, () => {
			Raven.captureException('超时', {tags: {location: '首页'}});
			reject(new Error('连不上xuanke网了呢~~'));
		});

		req.end();
	});
}

/**
 * Send account information
 * @param {any} store
 */
function requestToLogin (store) {
	const {token1, token2} = store;
	const opts = {
		hostname: 'tjis2.tongji.edu.cn',
		path: '/amserver/UI/Login',
		method: 'POST',
		port: 58080,
		headers: {
			'Connection': 'keep-alive',
			'Content-Type': 'application/x-www-form-urlencoded',
			'Host': 'tjis2.tongji.edu.cn:58080',
			'Referer': 'http://xuanke.tongji.edu.cn/index.jsp',
			'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.116 Safari/537.36 Edge/15.15063'
		}
	};
	const requestBody = {
		'goto': `http://xuanke.tongji.edu.cn/pass.jsp?checkCode=`,
		'gotoOnFail': `http://xuanke.tongji.edu.cn/deny.jsp?checkCode=&account=${token1}&password=${md5(token2)}`,
		'Login.Token1': token1,
		'Login.Token2': token2,
		'T3': ''
	};
	return new Promise((resolve, reject) => {
		const req = http.request(opts, (res) => {
			const info = [];
			res.on('data', chunk => info.push(chunk));
			res.on('end', () => {
				let cookies = res.headers['set-cookie'];
				let _cookie = `${store.getCookie()};`;
				for (let cookieItem of cookies) {
					_cookie += `${cookieItem.split(';')[0]};`;
				}
				store.setCookie(_cookie);

				// Failed Login
				if (/deny.jsp/.test(res.headers.location)) {
					reject(new Error('你输错学号密码啦！'));
				}

				// Successful login
				resolve(token1);
			});
		});

		req.on('error', e => {
			Raven.captureException(e);
			console.error(e.message);
			reject(new Error('有点不对劲~'));
		});
		req.write(querystring.stringify(requestBody));
		req.end();
	});
}

/**
 * Validate CAPTCHA
 * @param {any} store
 */
function requestLoginCheckCode (store) {
	const opts = {
		hostname: 'xuanke.tongji.edu.cn',
		path: `/pass.jsp?`,
		method: 'GET',
		port: 80,
		headers: {
			'Accept': 'text/html, application/xhtml+xml, image/jxr, */*',
			'Accept-Language': 'en-US, en; q=0.8, zh-Hans-CN; q=0.5, zh-Hans; q=0.3',
			'Cookie': store.getCookie(),
			'Connection': 'keep-alive',
			'Content-Type': 'application/x-www-form-urlencoded',
			'Host': 'xuanke.tongji.edu.cn',
			'Referer': 'http://xuanke.tongji.edu.cn/index.jsp',
			'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.116 Safari/537.36 Edge/15.15063'
		}
	};
	return new Promise((resolve, reject) => {
		const req = http.request(opts, (res) => {
			const body = [];
			res.on('data', (chunk) => body.push(chunk));
			res.on('end', () => {
				// Fail validating CAPTCHA
				if (/index.jsp/.test(res.headers.location)) {
					reject(new Error('不存在的学号？'));
				}

				resolve();
			});
		});

		req.on('error', (e) => {
			Raven.captureException(e);
			console.error(e.message);
			reject(new Error('有点不对劲'));
		});

		req.end();
	});
}

/**
 * redirect to home page
 * @param {any} store
 */
function requestToHome (store) {
	const opts = {
		hostname: 'xuanke.tongji.edu.cn',
		path: '/tj_login/frame.jsp',
		method: 'GET',
		port: 80,
		headers: {
			'Accept': 'text/html, application/xhtml+xml, image/jxr, */*',
			'Accept-Language': 'en-US, en; q=0.8, zh-Hans-CN; q=0.5, zh-Hans; q=0.3',
			'Cookie': store.getCookie(),
			'Connection': 'keep-alive',
			'Content-Type': 'application/x-www-form-urlencoded',
			'Host': 'xuanke.tongji.edu.cn',
			'Referer': 'http://xuanke.tongji.edu.cn',
			'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.116 Safari/537.36 Edge/15.15063'
		}
	};

	return new Promise((resolve, reject) => {
		const req = http.request(opts, (res) => {
			const info = [];
			res.on('data', chunk => info.push(chunk));
			res.on('end', () => {
				resolve();
			});
		});

		req.on('error', e => {
			Raven.captureException(e);
			console.error(e.message);
			reject(new Error('网络不好呀~首页挂了呀'));
		});

		req.end();
	});
}

/**
 * Get the permission of visiting GPA Page
 * @param {any} store
 */
function requestBeforeGetGPA (store) {
	const opts = {
		hostname: 'xuanke.tongji.edu.cn',
		path: '/tj_login/redirect.jsp?link=/tj_xuankexjgl/score/query/student/cjcx.jsp?qxid=20051013779916$mkid=20051013779901&qxid=20051013779916&HELP_URL=null&MYXSJL=null',
		method: 'GET',
		port: 80,
		headers: {
			'Accept': 'text/html, application/xhtml+xml, image/jxr, */*',
			'Accept-Language': 'en-US, en; q=0.8, zh-Hans-CN; q=0.5, zh-Hans; q=0.3',
			'Cookie': store.getCookie(),
			'Connection': 'keep-alive',
			'Host': 'xuanke.tongji.edu.cn',
			'Referer': 'http://xuanke.tongji.edu.cn/tj_login/frame.jsp',
			'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.116 Safari/537.36 Edge/15.15063'
		}
	};

	return new Promise((resolve, reject) => {
		const req = http.request(opts, (res) => {
			const info = [];
			res.on('data', (chunk) => info.push(chunk));
			res.on('end', () => {
				resolve();
			});
		});

		req.on('error', e => {
			Raven.captureException(e);
			console.error(e.message);
			reject(new Error('网络不好呀~请求失败'));
		});

		req.end();
	});
}

/**
 * Get GPA Page
 * @param {any} store
 */
function requestGetGPA (store) {
	const opts = {
		hostname: 'xuanke.tongji.edu.cn',
		path: '/tj_xuankexjgl/score/query/student/cjcx.jsp?qxid=20051013779916&mkid=20051013779901',
		method: 'GET',
		port: 80,
		headers: {
			'Accept': 'text/html, application/xhtml+xml, image/jxr, */*',
			'Accept-Language': 'en-US, en; q=0.8, zh-Hans-CN; q=0.5, zh-Hans; q=0.3',
			'Cookie': store.getCookie(),
			'Connection': 'keep-alive',
			'Host': 'xuanke.tongji.edu.cn',
			'Referer': 'http://xuanke.tongji.edu.cn/tj_login/frame.jsp',
			'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.116 Safari/537.36 Edge/15.15063'
		}
	};

	return new Promise((resolve, reject) => {
		const req = http.request(opts, (res) => {
			const info = [];
			res.on('data', chunk => info.push(chunk));
			res.on('end', () => {
				if (info.length <= 0) reject(new Error('出了点问题...请重试'));
				const buffers = Buffer.concat(info);
				// 转换字母编码
				const decodedInfo = iconv.decode(buffers, 'gb2312');
				// 压缩HTML去掉换行
				const minifiedInfo = minify(decodedInfo, {
					minifyJS: true,
					collapseWhitespace: true,
					removeComments: true
				});
				resolve(minifiedInfo);
			});
		});

		req.on('error', (e) => {
			Raven.captureException(e);
			console.error(e.message);
			reject(new Error('网络不好呀~看不到绩点了'));
		});

		req.end();
	});
}

/**
 * Parse HTML to JSON
 * @param {string} html
 */
function parseGPA (html) {
	try {
		const document = new JSDOM(html).window.document;
		let table = document.querySelector('#T1').firstElementChild;

		let lineInfo = table.firstElementChild.firstElementChild.firstElementChild;
		let lineCredit = table.childNodes[1].firstElementChild;
		let _GPA = {
			matriculation_number: lineInfo.childNodes[3].wholeText.trim(),
			name: lineInfo.childNodes[5].wholeText.trim(),
			college: lineInfo.childNodes[7].wholeText.trim(),
			major: lineInfo.childNodes[9].wholeText.trim(),

			gpa: lineCredit.childNodes[1].innerHTML.trim(),
			selective_credit: lineCredit.childNodes[3].innerHTML.trim(),
			actual_credit: lineCredit.childNodes[5].innerHTML.trim(),
			fail_courses_count: lineCredit.childNodes[7].innerHTML.trim(),

			table: []
		};

		let semesters = table.querySelectorAll('td[colspan="9"] div[align="center"]');

		for (let semester of semesters) {
			let GPASemester = {
				semester: null,
				course_list: null,
				GPA: null
			};
			GPASemester.semester = semester.innerHTML;

			let GPACourseNode = semester.parentNode.parentNode.nextSibling.nextSibling;
			GPASemester.course_list = [];
			while (GPACourseNode.firstElementChild.getAttribute('colspan') === null) {
				let GPACourse = [];
				for (let textNode of GPACourseNode.childNodes) {
					let text = textNode.firstElementChild.firstElementChild.innerHTML;
					GPACourse.push(text);
				}
				GPASemester.course_list.push(GPACourse);
				GPACourseNode = GPACourseNode.nextSibling;
			}
			GPASemester.GPA = GPACourseNode.firstElementChild.firstElementChild.innerHTML;

			_GPA.table.push(GPASemester);
		}

		return JSON.stringify(_GPA);
	} catch (e) {
		Raven.captureException(e, {extra: {html: html}});
		console.error(`[${new Date().toLocaleString()}] Parsing HTML Failed.`);
		return new Error('出了点问题,不如再试一遍？');
	}
}

module.exports = GPA;
