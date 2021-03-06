/**
 * @fileOverview
 * Create http server to listen request.
 */

const http = require('http');
const GPA = require('./lib/GPA-unified');
const GPACloud = require('./lib/GPA-cloud');
const Raven = require('raven');
const {PORT, RAVEN_DSN} = require('./config.json');

Raven.config(RAVEN_DSN).install();

http.createServer(function (request, response) {
	const {url, method, headers} = request;
	const remoteIp = headers['x-real-ip'] || '';

	switch (url) {
	case '/api/gpa':
		switch (method) {
		case 'POST':
			const body = [];
			request.on('data', chunk => body.push(chunk));
			request.on('end', () => {
				let info = Buffer.concat(body).toString();
				try {
					info = JSON.parse(info);
				} catch (e) {
					response.statusCode = 415;
					response.end('Unsupport Media Format', 'utf8');
					return;
				}
				const {token1, token2} = info;
				console.log(`[${new Date().toLocaleString()}][${remoteIp.padEnd(15)}] ${token1}`);
				if (!token1 || !token2) {
					response.end('学号或密码不能为空！', 'utf8');
				} else {
					// 测试用
					if (token1 === '147') {
						response.setHeader('Content-Type', 'application/json;charset=UTF-8');
						response.end('{"matriculation_number":"147","name":"测试","college":"软件学院","major":"软件工程","gpa":"5","selective_credit":"144.5","actual_credit":"144.5","fail_courses_count":"0","table":[{"semester":"2014-2015学年第1学期","course_list":[["002016","形势与政策(1)","优","0.5","5","Y","正常","必修","2015-01-22"]],"GPA":"5"}]}');
					} else {
						GPA(token1, token2).then(({status, data, error}) => {
							if (status) {
								response.setHeader('Content-Type', 'application/json;charset=UTF-8');
							} else if (error) {
								Raven.captureException(error);
							}
							response.end(data, 'utf8');
						});
					}
				}
			});
			break;
		default:
			response.statusCode = 405;
			response.end('Unsupport method !', 'utf8');
		}
		break;
	case '/api/cloud':
		switch (method) {
		case 'POST':
			const body = [];
			request.on('data', chunk => body.push(chunk));
			request.on('end', () => {
				let info = Buffer.concat(body).toString();
				try {
					info = JSON.parse(info);
				} catch (e) {
					response.statusCode = 415;
					response.end('Unsupport Media Format', 'utf8');
					return;
				}
				const {account, password, token} = info;
				console.log(`[${new Date().toLocaleString()}][${remoteIp.padEnd(15)}] ${account}`);
				if (!account || !password) {
					response.end('账户或密码不能为空！', 'utf8');
				} else {
					// 测试用
					if (account === '147') {
						response.setHeader('Content-Type', 'application/json;charset=UTF-8');
						response.end('{"matriculation_number":"147","name":"测试","photo_url":"/assets/tj.jpg","table":[{"school_year":"2014-2015学年","course_list":[["形势与政策(1)","0.5","优","合格","公共基础课必修"]]}]}');
					} else {
						GPACloud(account, password, token).then(({status, data, error}) => {
							if (status) {
								response.setHeader('Content-Type', 'application/json;charset=UTF-8');
							} else if (error) {
								Raven.captureException(error);
							}
							response.end(data, 'utf8');
						});
					}
				}
			});
			break;
		default:
			response.statusCode = 405;
			response.end('Unsupport method !', 'utf8');
		}
		break;
	default:
		response.statusCode = 404;
		response.end('What are you looking for ?', 'utf8');
	}
}).listen(PORT, function (err) {
	if (err) throw err;
	console.log(`[${new Date().toLocaleString()}] GPATongji Server listening on ${PORT} Good Luck! : )`);
});
