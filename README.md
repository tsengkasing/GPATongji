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

### 2019-01-22

放弃 HTTP 代理。

免费的 HTTP 代理极其不稳定，尝试在某网站买了一些代理。
然而这些代理的有效期非常短，不到两个小时就会无效，需要重新调取，并且成本非常高（相对于在新的地域开几台服务器来说）。

在上海地域 ip 段被屏蔽后，尝试北京地域开了两台机器，撑了不到一小时，北京地域也开始出现换 ip 也无法突破屏蔽的情况（整个 ip 段被屏蔽）。


### 2019-01-21

HTTP 代理上线测试。

虽然提前开好了两台服务器，本小程序在面临 2019 年年初的期末挑战仍然失败了，在 17 周的星期一（1 月 14 日)早上 9 点 IP 马上被封禁。
临时切换 IP 之后，两分钟之内，两个 IP 再次被封，于是在尝试了若干次无果之后，战略性放弃。

随后在非高峰期，大概(1 月 14 日)下午，情况稍微好转一点。然而，再经过几天的 IP 更换之后，学校开始采取新的措施，不封禁 IP，直接超时返回(Timeout)。

随后刘畅同学提出了使用 HTTP 代理的方法，并友情提供了一些可能可以用的 HTTP 代理。

经过几天的筛选之后，先过滤出了一百个左右大概可以用(不太稳定)的 HTTP 代理，每次请求随机选一个代理使用。

### 2018-07-19

因每次高峰期都会导致 ip 被封，在刘畅同学的帮助下完成了同心云成绩查询的接口。（暂未公开）

### 2018-04-27

旧的登录接口关闭。

### 2018-03-19

登录的跳转端口从 9321 改为 443，开放到外网使用。

> (讲个笑话，走 HTTP 协议的 443)

### 2018-03-04

学校切换到统一身份验证系统，抓取绩点的方式改为``GPA-unified.js``，但是只能在校园内网使用
