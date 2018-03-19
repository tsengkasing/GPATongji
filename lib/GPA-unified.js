/**
 * @fileOverview
 * 使用统一身份验证登录 xuanke 网并抓取 GPA
 */

const cheerio = require('cheerio');
const iconv = require('iconv-lite');
const request = require('request-promise-native');
const fetch = request.defaults({
	jar: request.jar(),
	timeout: 10000,
	simple: false
});

/**
 * Main Function
 * @param {string} token1
 * @param {string} token2
 */
async function GPA (token1, token2) {
	try {
		const gpa = await fetchGPA(token1, token2);
		return {status: true, data: gpa};
	} catch (e) {
		console.error(`[${new Date().toLocaleString()}] ${token1}`, e.message);
		const msg = /ETIMEDOUT/.test(e.message) ? '与 xuanke 网失联了。' : e.message;
		return {status: false, data: msg};
	}
}

/**
 * Make http request to get GPA
 * @param {string} token1
 * @param {string} token2
 */
async function fetchGPA (token1, token2) {
	let html, uri, $;

	// 从首页跳转到 oiosaml 方式登录
	html = await fetch.get('http://xuanke.tongji.edu.cn:443/oiosaml/saml/login');

	// 从 html 头部 meta 信息取出要跳转的 url
	uri = /url=(.*)"></.exec(html)[1];
	html = await fetch.get(uri);

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
			submit: 'Login'
		},
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
	});
	if (/Login failed, please try again/.test(html)) throw new Error('你输错学号密码啦!');

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
	return parseGPA(html);
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
