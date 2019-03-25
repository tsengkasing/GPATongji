/**
 * @fileoverview
 * Main Logic
 */

function __main__() {
	const table = document.getElementById('GPA_tables');

	const token1 = document.getElementById('token1').value;
	const token2 = document.getElementById('token2').value;

	displayLoadingSpinner(true);

	window.fetch('/api/gpa', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json;charset=UTF-8'
		},
		body: JSON.stringify({token1, token2})
	}).then(
		response => {
			console.log(response);
			return response.text();
		}
	).then(data => {
		displayLoadingSpinner(false);
		try {
			let gpa = JSON.parse(data);
			console.log(gpa);
			table.innerHTML = `课程名太长可以左右滑动哦<br/>${displayGPAOfSemester(gpa.table)}`;
		} catch (e) {
			console.error(e);
			table.innerHTML = `出错啦!<br/>${data}`;
		}
	}).catch(err => {
		window.alert(err);
	});
}

/**
 * loading
 * @param {string} visible block | none
 */
function displayLoadingSpinner(visible) {
	document.getElementById('spinner').style.display = visible ? 'block' : 'none';
}

/**
 * 按课程展示
 * @param {Array<{}>} courseList
 */
function displayGPAOfCourse(courseList) {
	let _html = [];
	for (let course of courseList) {
		_html.push(
			`<tr>
				<!--<td class="mdl-data-table__cell&#45;&#45;non-numeric">{course[0]}</td>-->
				${course.reduce((html, text) => (`${html}<td>${text}</td>`), '')}
			</tr>`);
	}
	return _html.join('');
}

/**
 * 按学期展示
 * @param {Array<>} courseTable
 */
function displayGPAOfSemester(courseTable) {
	let _html = [];
	for (let semester of courseTable) {
		_html.push(
			`<div class="GPA-table-border">
				<table class="mdl-data-table mdl-js-data-table mdl-shadow--2dp GPA-table">
					<thead>
						<tr>
							<td colspan="9" style="text-align: center;">
								${semester.semester}
								均绩: <span class="GPA-avg">${semester.GPA}</span>
							</td>
						</tr>
					</thead>
					<thead>
						<tr>
							<th>课号</th>
							<th style="text-align: end" class="mdl-data-table__cell--non-numeric">课名</th>
							<th>成绩</th>
							<th>学分</th>
							<th>绩点</th>
							<th>是否通过</th>
							<th>成绩性质</th>
							<th>选修必修</th>
							<th>更新时间</th>
						</tr>
					</thead>
					<tbody id="GPA-table">
						${displayGPAOfCourse(semester.course_list)}
					</tbody>
				</table>
			</div>`);
	}
	return _html.join('');
}
