# GPATongji
A Node.js service to request and parse GPA of undergraduate from xuanke.tongji.edu.cn.

![](https://img.shields.io/badge/cheerio-need-brightgreen.svg)
![](https://img.shields.io/badge/iconv--lite-need-brightgreen.svg)
![](https://img.shields.io/badge/request-need-brightgreen.svg)
![](https://img.shields.io/badge/request--promise--native-need-brightgreen.svg)

## Usage

```shell
# running on the foreground
$ node server.js

# use pm2 to guard
$ npm install -g pm2
$ pm2 start server.js --name GPATongji
```

> default listening port: 3456    
> URL : /api/gpa    
> headers: "Content-Type:application/json;charset=utf8"    
> method: POST    
> body: {"token1": "", "token2": ""}    


Sample: ↓

```shell
curl -X POST -H "Content-Type:application/json;charset=utf8" --data '{"token1":"147", "token2":"147"}' http://localhost:3456/api/gpa
```

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

## Update

### 2018-03-04

学校切换到统一身份验证系统，抓取绩点的方式改为``GPA-OIOSAML.js``
