【python实战】正义可能会迟到，但不会缺席——CSDN热榜监控，引流无所遁形

❤️<font color=orange>欢迎订阅[《从实战学python》](https://blog.csdn.net/skylibiao/category_7934680.html?spm=1001.2014.3001.5482)专栏，用python实现爬虫、办公自动化、数据可视化、人工智能等各个方向的实战案例，有趣又有用！</font>❤️无所遁形

[更多精品专栏简介点这里](https://blog.csdn.net/skylibiao/article/details/119297018?spm=1001.2014.3001.5502)

>让子弹飞一会

## 前言

近日，csdn的热榜可以说是”乌烟瘴气“，培训机构，公众号引流，打擦边球，层出不穷。作为热榜的密切关注着，决不能让这片热土毁于一旦。正义可以会迟到，但绝不会缺席。连夜写了这个热榜监控的程序。功能如下：

- 爬取热榜文章
- 分析其文章内容，一旦发现微信引流
- 通过邮件通知我
- 每小时执行一次

 话不多说，快来看如何实现吧！

## 爬取文章

>这一步还是比较简单的，发送请求就好了。

将链接在浏览器打开，得到如下json串，将作者，文章标题，文章链接解析出来。

```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "hotRankScore": "91055.0",
      "pcHotRankScore": "9.1w",
      "loginUserIsFollow": false,
      "nickName": "退休的龙叔",
      "avatarUrl": "https://profile.csdnimg.cn/9/0/1/3_zhiguigu",
      "userName": "zhiguigu",
      "articleTitle": "Pycharm常用的小技巧汇总，Python新手上路必备，快上车！",
      "articleDetailUrl": "https://blog.csdn.net/zhiguigu/article/details/119449173",
      "commentCount": "68",
      "favorCount": "528",
      "viewCount": "5745",
      "hotComment": null
    },
    ...
    ]
}
```

代码：

```python
        for i in range(2):
            res = requests.get(f"https://blog.csdn.net/phoenix/web/blog/hotRank?page={i}&pageSize=50",headers=headers).json()
            if res["code"] == 200:
                data = res["data"]
                for d in data:
                    nickName = d["nickName"]
                    articleTitle = d["articleTitle"]
                    articleDetailUrl = d["articleDetailUrl"]
                    print(articleDetailUrl)
```

## 解析文章

>上一步我们拿到了文章的url，现在就要逐一访问文章，解析其内容。老规矩，还是xpath解析。
>
>因为链接都存在于<a>标签，所以拿到所有<a>的href就可以了。

代码：

```python
request = requests.get(articleDetailUrl, headers=headers)
                    time.sleep(1)
                    html = request.text
                    # print(html)
                    content = etree.HTML(html)
                    # 使用xpath匹配阅读量
                    a_href = content.xpath('//*[@id="content_views"]//a/@href')
```



## 检测引流链接

>这里我们用正则表达式匹配微信引流连接。将检测到含有引流链接的文章信息写入文件。

代码：

```python
                    for value in a_href:
                        r = re.compile(r'http[s]?://mp.weixin.qq.com/', )
                        match = r.findall(str(value))
                        if (len(match) > 0):
                            if (is_out):
                                f.write(str(id) + '\t' + nickName + '\t' + articleTitle + '\t' + articleDetailUrl + '\n')
                                f.write("微信引流链接如下：" + '\n')
                                is_out = False
                            f.write(value + '\n')
                            print(value)
                
```

## 发送邮件

>所有文章都检测完后，将文件里的内容通过邮件发送给我。
>
>具体参考这篇：[【python实战】不玩微博，一封邮件就能知道实时热榜，天秀吃瓜](https://blog.csdn.net/skylibiao/article/details/119338445?spm=1001.2014.3001.5502)

代码：

```python
def send_mail():
    message = ""
    with open("result.txt", 'r', encoding='utf-8') as f:
        lines = f.readlines()
    for i in lines:
        message = message + i
    mail_host = 'smtp.qq.com'
    mail_user = ''
    mail_pass = ''

    # 发送方，可以自己给自己发
    sender = '@qq.com'
    # 邮件接受方邮箱地址，可多写
    receivers = ['@qq.com']

    # 邮件内容设置，将第一个参数修改成你要发送的内容即可
    message = MIMEText(message, 'plain', 'utf-8')
    # 邮件主题
    message['Subject'] = 'CSDN热榜监控'
    # 发送方信息
    message['From'] = sender
    # 接受方信息
    message['To'] = receivers[0]

    try:
        smtpObj = smtplib.SMTP_SSL(mail_host)
        # 登录到服务器
        smtpObj.login(mail_user, mail_pass)
        # 发送
        smtpObj.sendmail(
            sender, receivers, message.as_string())
        # 退出
        smtpObj.quit()
        print('success')
    except smtplib.SMTPException as e:
        print('error', e)  # 打印错误

```

## 定时执行

>为了实时的查看热榜，需要将脚本放到服务器，每小时定时执行一次。

命令

```shell
crontab -e
0 * * * * python /hot_monitor.py
```

关于`0 * * * *`这几个参数的作用，请自行百度。

关于云服务器，可以参考一条这篇文章[《阿里云服务器购买及SSH免密登录》](https://blog.csdn.net/skylibiao/article/details/109729785)进行购买和配置。



# 🌈寻宝

>⭐今天是坚持刷题更文的第**25**/100天
>
>⭐各位的<font color=orange>点赞、关注、收藏、评论、订阅</font>就是一条创作的最大动力

为了回馈各位粉丝，礼尚往来，给大家准备了一条多年积累下来的优质资源，包括<font color=orange> 学习视频、面试资料、珍藏电子书等</font>

大家可以<font color=orange>评论留言或者私信</font>我领取

![在这里插入图片描述](https://img-blog.csdnimg.cn/54bc192590174279ad876040029fdf12.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3NreWxpYmlhbw==,size_16,color_FFFFFF,t_70)



