/**
 * @fileOverview
 * 使用统一身份验证登录 xuanke 网并抓取 GPA
 */

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const iconv = require('iconv-lite');
const request = require('request-promise-native');

let proxyList = [];
try {
	const content = fs.readFileSync(path.join(__dirname, '..', 'extra', 'proxy.json')).toString();
	proxyList = JSON.parse(content);
} catch (err) {
	console.error(err);
}

/**
 * Main Function
 * @param {string} token1
 * @param {string} token2
 */
async function GPA (token1, token2) {
	let proxy = '';
	if (proxyList.length > 0) {
		proxy = proxyList[Math.floor(Math.random() * (proxyList.length - 1))];
		proxy = `http://${proxy}`;
	}

	try {
		const {ok, data, error} = await fetchGPA(token1, token2, proxy);
		error && console.error(`[${new Date().toLocaleString()}] ${token1} ${error}`);
		return {status: ok, data, error};
	} catch (e) {
		console.error(`[${new Date().toLocaleString()}] ${token1} Using PROXY ${proxy}`, e.message);
		return {status: false, data: '出了一些问题，请稍后再试', error: e.message};
	}
}

/**
 * Make http request to get GPA
 * @param {string} token1
 * @param {string} token2
 * @param {string} proxy
 */
async function fetchGPA (token1, token2, proxy) {
	let html, uri, $;
	const fetch = request.defaults({
		jar: request.jar(),
		timeout: 10000,
		simple: false,
		proxy: proxy,
		headers: {
			'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3282.140 Safari/537.36 Edge/18.17763'
		}
	});

	// 从首页跳转到 oiosaml 方式登录
	html = await fetch.get('http://xuanke.tongji.edu.cn:443/oiosaml/saml/login');

	// 从 html 头部 meta 信息取出要跳转的 url
	uri = /url=(.*)"></.exec(html);
	if (!uri) return {ok: false, data: '无法正常登录，请稍后再试', error: '登录流程不通'};
	html = await fetch.get(uri[1]);

	// 从 html body 的表单中取出要跳转的 url ，再次跳转
	$ = cheerio.load(html, { normalizeWhitespace: true });
	uri = $('form').prop('action');
	html = await fetch.post(`https://ids.tongji.edu.cn:8443${uri}`, {
		headers: { 'content-type': 'application/x-www-form-urlencoded' }
	});

	// 到达统一身份验证登录页面
	// 输入学号和密码，提交表单登录
	$ = cheerio.load(html, { normalizeWhitespace: true });
	uri = $('form[name=IDPLogin]').prop('action');
	html = await fetch.post(uri, {
		form: {
			option: 'credential',
			Ecom_User_ID: token1,
			Ecom_Password: token2,
			Txtidcode: Math.random().toString(36).slice(2, 6)
		},
		headers: {
			'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
			'Cache-Control': 'no-cache',
			'Content-Type': 'application/x-www-form-urlencoded',
			'DNT': 1,
			'Host': 'ids.tongji.edu.cn:8443',
			'Origin': 'https://ids.tongji.edu.cn:8443',
			'Pragma': 'no-cache',
			'Upgrade-Insecure-Requests': 1,
			'Referer': 'https://ids.tongji.edu.cn:8443/nidp/saml2/sso?id=5791&sid=0&option=credential&sid=0',
			'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/71.0.3578.98 Safari/537.36'
		}
	});
	if (/Login failed, please try again/.test(html)) return {ok: false, data: '学号密码错误'};

	// 从 html 中取出需要跳转的 href 进行跳转
	uri = /href='(.*)';/.exec(html)[1];
	html = await fetch.get(uri);

	// 再次提交一个表单，带有一个巨大的 SAMLResponse 字符串参数
	$ = cheerio.load(html);
	uri = $('form').prop('action');
	await fetch.post(uri, {
		form: { SAMLResponse: $('form input[name=SAMLResponse]').val() },
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		followAllRedirects: true // 允许从 POST 跳到 GET
	});

	// 到达此处，已经跳转到 xuanke 网首页了

	// 获取绩点页面
	html = await fetch.get(
		'http://xuanke.tongji.edu.cn' +
		'/tj_login/redirect.jsp?link=/tj_xuankexjgl/score/query/student/cjcx.jsp?' +
		[
			'qxid=20051013779916$mkid=20051013779901',
			'qxid=20051013779916',
			'HELP_URL=null',
			'MYXSJL=null'
		].join('&'),
		{ encoding: null }
	);

	// 转换字母编码
	html = iconv.decode(html, 'gb2312');
	return {ok: true, data: parseGPA(html)};
}

/**
 * 解析绩点页面
 * @param {string} html
 * @returns {string} 绩点 JSON 格式字符串
 */
function parseGPA (html) {
	const $ = cheerio.load(html, { normalizeWhitespace: true });
	const $table = $('table#T1');

	const studentInfo = [];
	const $studentInfo = $('tr td[colspan=9] font[size=3] b', $table);
	$studentInfo.each((i, ele) => {
		const line = `${$(ele).text()}${$(ele.next).text()}`;
		const [, value] = /:(.*)/.exec(line);
		studentInfo.push(value.trim());
	});

	const gpaInfo = [];
	const $gpaInfo = $('tr > td[colspan=9] > font[color=red]', $table.children());
	$gpaInfo.each((i, ele) => gpaInfo.push($(ele).text().trim()));

	const table = [];
	const $semester = $('tr > td[colspan=9] > div[align=center]', $table);
	$semester.each((i, ele) => {
		const $ele = $(ele);

		// 学期 -> 20XX-20XX学年第X学期
		const semesterName = $ele.text().trim();

		// 课程具体成绩信息 -> ['0XXXXX', '形势与政策', '优'...]
		const courses = [];
		let $courses;
		for ($courses = $ele.parents('tr').next().next();
			!$('td', $courses).prop('colspan');
			$courses = $courses.next()
		) {
			const course = [];
			const $course = $('div[align=center] > font', $courses);
			$course.each((i, ele) => course.push($(ele).text().trim()));
			courses.push(course);
		}

		// 学期平均绩点 -> 5.0
		const gpa = $('td > font', $courses).text().trim();

		table.push({ semester: semesterName, course_list: courses, GPA: gpa });
	});

	const [matriculationNumber, name, college, major] = studentInfo;
	const [gpa, selectiveCredit, actualCredit, failCoursesCount] = gpaInfo;

	return JSON.stringify({
		'matriculation_number': matriculationNumber,
		'name': name,
		'college': college,
		'major': major,
		'gpa': gpa,
		'selective_credit': selectiveCredit,
		'actual_credit': actualCredit,
		'fail_courses_count': failCoursesCount,
		'table': table
	});
}

module.exports = GPA;
