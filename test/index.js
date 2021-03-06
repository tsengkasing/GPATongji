/**
 * @fileOverview
 * Test Fetch GPA Method
 */

const { performance } = require('perf_hooks');

(async function () {
	const testToken = {token1: 'xxx', token2: 'xxx'};
	const testGPAMethod = require('../lib/GPA-unified');

	const testCases = [
		{func: testTime, name: '测试统一身份验证的时间'},
		{func: testSuccess, name: '查询绩点成功'},
		{func: testFailed, name: '密码输入错误'},
	];

	let testResult = await Promise.all(testCases.map(async ({func, name}) => ({name, result: await func(testGPAMethod, testToken)})));
	testResult = testResult.map(({name, result}) => `Case ${name} => ${result ? 'passed √' : 'failed X'}`).join('\n');

	console.info(testResult);
})();

async function testTime (GPA, {token1, token2}) {
	performance.mark('oiosaml start');
	const { status } = await GPA(token1, token2);
	performance.mark('oiosaml end');

	if (!status) return false;

	performance.measure('oiosaml', 'oiosaml start', 'oiosaml end');

	const {duration: oiosamlTime} = performance.getEntriesByName('oiosaml')[0];

	console.info('==========================================');
	console.info(`oiosaml: ${oiosamlTime} ms`);
	console.info('==========================================');

	return true;
}

async function testSuccess (GPA, {token1, token2}) {
	const { data: gpa } = await GPA(token1, token2);
	try {
		/* eslint camelcase : off */
		const {matriculation_number} = JSON.parse(gpa);
		return matriculation_number === token1;
	} catch (e) { return false; }
}

async function testFailed (GPA, {token1, token2}) {
	const { status, data } = await GPA(token1, 'xxx');
	console.info(`[info] ${status} - ${data}`);
	return status === false && data === '你输错学号密码啦!';
}
