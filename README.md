# GPATongji
A Node.js service to request and parse GPA of undergraduate from xuanke.tongji.edu.cn.

## Usage

```shell
# running on the foreground
$ node server.js

# use pm2 to guard
$ npm install -g pm2
$ pm2 start server.js --name GPATongji
```

> default listening port: 3456

## Format

```javascript
{
    "matriculation_number": "147",
    "name": "测试",
    "college": "软件学院",
    "major": "软件工程",
    "gpa": "5",
    "selective_credit": "144.5",
    "actual_credit": "144.5",
    "fail_courses_count": "0",
    "table": [
        {
            "semester": "2014-2015学年第1学期",
            "course_list": [
                [
                    "002016",
                    "形势与政策(1)",
                    "优",
                    "0.5",
                    "5",
                    "Y",
                    "正常",
                    "必修",
                    "2015-01-22"
                ]
            ],
            "GPA": "5"
        }
    ]
}
```