const http = require('http');
const https = require('https');
const url = require('url');
const querystring = require('querystring');
const iconv = require('iconv-lite');
const minify = require('html-minifier').minify;
const {JSDOM} = require('jsdom');

const Store = require('./store');

/**
 * @function GPA
 * @param {string} token1 Matriculation Number
 * @param {string} token2 Password
 */
async function GPA (token1, token2) {
	const store = new Store(token1, token2);
	try {
		const gpa = await fetchGPA(store);
		return {status: true, data: gpa};
	} catch (e) {
		console.error(`[${new Date().toLocaleString()}] ${token1}`, e.message);
		return {status: false, data: e.message};
	}
}

/**
 * Visit xuanke.tongji.edu.cn
 * Login using unified identity authentication
 * Parsing HTML
 * Marshal the JSON Object
 * @param {Store} store
 */
async function fetchGPA (store) {
	/**
	 * 跳转登录
	 */
	let {cookies: cookie1, body: html1} = await request({
		protocol: 'http',
		method: 'GET',
		hostname: 'xuanke.tongji.edu.cn',
		port: 9321,
		path: '/oiosaml/saml/login',
		parsebody: true
	});
	let samlUrl = /url=(.*)"></.exec(html1.toString())[1];
	const {path: samlUri} = url.parse(samlUrl);
	store.setCookies(cookie1);

	/**
	 * 跳转
	 */
	let {cookies: cookie2, body: html2} = await request({
		protocol: 'https',
		method: 'GET',
		hostname: 'ids.tongji.edu.cn',
		port: 8443,
		path: samlUri,
		parsebody: true
	});
	samlUrl = /action="(.*)"></.exec(html2.toString())[1];
	store.setCookies(cookie2);

	/**
	 * 访问统一身份验证登录页面
	 */
	await request({
		protocol: 'https',
		method: 'POST',
		hostname: 'ids.tongji.edu.cn',
		port: 8443,
		path: samlUrl,
		headers: { cookie: store.getCookies('ids.tongji.edu.cn', '/nidp/', true, false).toValueString() }
	});

	/**
	 * 输入学号密码登录
	 */
	let {cookies: cookie3, body: html3} = await request({
		protocol: 'https',
		method: 'POST',
		hostname: 'ids.tongji.edu.cn',
		port: 8443,
		path: '/nidp/saml2/sso?sid=0&sid=0',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			cookie: store.getCookies('ids.tongji.edu.cn', '/nidp/', true, false).toValueString()
		},
		parsebody: true,
		postData: {
			option: 'credential',
			Ecom_User_ID: store.token1,
			Ecom_Password: store.token2,
			submit: 'Login'
		}
	});
	if (/Login failed, please try again/.test(html3.toString())) throw new Error('你输错学号密码啦!');
	store.setCookies(cookie3);

	/**
	 * 跳转
	 */
	const {body: samlResponseHTML} = await request({
		protocol: 'https',
		method: 'GET',
		hostname: 'ids.tongji.edu.cn',
		port: 8443,
		path: '/nidp/saml2/sso?sid=0',
		headers: { cookie: store.getCookies('ids.tongji.edu.cn', '/nidp/', true, false).toValueString() },
		parsebody: true
	});
	const samlResponse = /name="SAMLResponse" value="(.*)"\/>/.exec(samlResponseHTML.toString())[1];

	/**
	 * SAML Assertion
	 */
	const {location: redirectUrl} = await request({
		protocol: 'http',
		method: 'POST',
		hostname: 'xuanke.tongji.edu.cn',
		port: 9321,
		path: '/oiosaml/saml/SAMLAssertionConsumer',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			cookie: store.getCookies('xuanke.tongji.edu.cn', '/oiosaml').toValueString() + `; oiosaml-fragment=`
		},
		postData: { SAMLResponse: samlResponse }
	});

	const {hostname: redirectHostname, path: redirectPath, port: redirectPort} = url.parse(redirectUrl);
	const {cookies: cookie4} = await request({
		protocol: 'http',
		method: 'GET',
		hostname: redirectHostname,
		port: redirectPort,
		path: redirectPath,
		headers: { cookie: '; oiosaml-fragment=' }
	});
	store.setCookies(cookie4);

	/**
	 * 访问 Home 页面
	 */
	await request({
		protocol: 'http',
		method: 'GET',
		hostname: 'xuanke.tongji.edu.cn',
		path: '/tj_login/frame.jsp',
		headers: { cookie: store.getCookies('xuanke.tongji.edu.cn', '/').toValueString() }
	});

	/**
	 * Get the permission of visiting GPA Page
	 */
	await request({
		protocol: 'http',
		method: 'GET',
		hostname: 'xuanke.tongji.edu.cn',
		path: '/tj_login/redirect.jsp?link=/tj_xuankexjgl/score/query/student/cjcx.jsp?qxid=20051013779916$mkid=20051013779901&qxid=20051013779916&HELP_URL=null&MYXSJL=null',
		headers: { cookie: store.getCookies('xuanke.tongji.edu.cn', '/').toValueString() }
	});

	/**
	 * Get GPA Page
	 */
	const {body: gpaHtml} = await request({
		protocol: 'http',
		method: 'GET',
		hostname: 'xuanke.tongji.edu.cn',
		path: '/tj_xuankexjgl/score/query/student/cjcx.jsp?qxid=20051013779916&mkid=20051013779901',
		headers: { cookie: store.getCookies('xuanke.tongji.edu.cn', '/').toValueString() },
		parsebody: true
	});

	// 转换字母编码
	const decodedInfo = iconv.decode(gpaHtml, 'gb2312');
	// 压缩HTML去掉换行
	const minifiedInfo = minify(decodedInfo, {
		minifyJS: true,
		collapseWhitespace: true,
		removeComments: true
	});

	return parseGPA(minifiedInfo);
};

/**
 * @function 发送网络请求
 */
function request ({
	protocol = 'http',
	hostname = '',
	method = 'GET',
	port = 80,
	path = '/',
	headers = {},
	parsebody = false,
	postData = null
}) {
	const _protocol = protocol === 'https' ? https : http;
	return new Promise(function (resolve, reject) {
		const _request = _protocol.request({ hostname, method, port, path, headers }, response => {
			/* eslint no-useless-computed-key: off */
			let {['set-cookie']: cookies, location} = response.headers;
			cookies = cookies ? cookies.map(cookie => `${cookie};Domain=${hostname};`) : '';
			if (parsebody) {
				const chunks = [];
				response.on('data', chunk => chunks.push(chunk));
				response.on('end', function () {
					const body = Buffer.concat(chunks);
					// TODO: print when debugging
					// console.log(`=======================================\n${method} ${response.statusCode} ${hostname}:${port}${path}\n`);
					// console.log(body.toString());
					// console.log('=======================================');
					resolve({ cookies, location, body });
				});
			} else resolve({ cookies, location });
		});

		/* POST request with body */
		if (method === 'POST' && postData) _request.write(querystring.stringify(postData));

		_request.on('error', (e) => {
			console.error(e.message);
			reject(new Error('xuanke网失联了。'));
		});
		_request.setTimeout(10000, () => reject(new Error('xuanke网失联了。')));

		_request.end();
	});
}

/**
 * @function ParseHTMLtoJSON
 * @param {string} html
 */
function parseGPA (html) {
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
}

module.exports = GPA;
