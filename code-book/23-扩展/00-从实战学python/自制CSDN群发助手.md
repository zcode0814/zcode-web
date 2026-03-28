>哈喽，大家好，我是一条。
>
>今天做一个造福大家的事。
>
>自制csdn群发助手

## 效果展示

![image-20210605171521041](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20210605171521041.png)

## selenium

`selenium`是爬虫常用的一款自动化测试插件，它不用于传统爬虫基于网络协议，而是相当于人的**自动化操作**

所以不会被察觉到ip，适当使用也不会对服务器造成压力，但却能大大提高效率。

## 浏览器驱动

`seleium`的使用需要浏览器驱动的支持，谷歌浏览器的下载镜像如下，对照浏览器版本下载。

http://chromedriver.storage.googleapis.com/index.html

![image-20210605170431727](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20210605170431727.png)

## 获取粉丝列表

1.打开主页，`F12`

![image-20210605170119100](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20210605170119100.png)

2.将链接在浏览器打开，得到粉丝的json串。

![image-20210605170508499](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20210605170508499.png)

3.简单处理一下json串，拿到`nickname`。

此处留给大家去练习，不贴源码。

拿到后建议存在`txt`文件里。

## 发送信息

不难发现，发私信的页面`https://im.csdn.net/chat/{nickname}`

所以只需`->`访问私信页面`->`输入要发送内容`->`回车

登录可以选择账号密码登录，也可以微信登录，设置一个`input()`等待登录操作，成功后回车，程序继续执行。

## 代码

```python
from selenium import webdriver
import time
import re

from selenium.webdriver.common.keys import Keys
sendtext="【白话设计模式】23种设计模式一句话通俗讲解，女朋友都能听懂（导航篇）\n https://blog.csdn.net/skylibiao/article/details/117596850?spm=1001.2014.3001.5501 \n 以上信息来自CSDN群发服务"
# 此处需根据文件内粉丝列表的格式自己修改
print("开始解析用户信息")
userlist=[]
with open("user",'r+') as f:
    s=str(f.readlines())
    news=re.sub(r'[{}""''\n]',"",s)
    ss=news.split(",")
    for i in range(1,len(ss),5):
        key=ss[i].split(":")[0]
        value=ss[i].split(":")[1]
        if(key=="fans"):
            userlist.append(value)
    print(userlist,len(userlist))
print("用户信息解析完成")

allnameid=[]
browser = webdriver.Chrome()
print("进入登录页面")
# browser.get("https://me.csdn.net/qq_16146103")
browser.get("https://passport.csdn.net/login?code=public")
btn=browser.find_element_by_link_text("账号密码登录").click()
time.sleep(1)
# browser.find_element_by_name("all").send_keys("账号")
# browser.find_element_by_name("pwd").send_keys("密码")
# browser.find_element_by_xpath("//*[@id='app']/div/div/div[1]/div[2]/div[5]/div/div[6]/div/button").click()
time.sleep(1)
input("登录成功后回车")
for i in range (0,len(userlist)):
    browser.get("https://im.csdn.net/chat/{}".format(userlist[i]))
    text=browser.find_element_by_id("messageText")
    text.send_keys(sendtext)
    text.send_keys(Keys.ENTER)
print("success")
```

## 嘱咐

切记不要过分使用，小心`官方制裁`

---

我是**一条**，一个在互联网摸爬滚打的程序员。

**道阻且长，行则将至**。大家的 **【点赞，收藏，关注】** 就是一条创作的最大动力，我们下期见！

注：关于本篇博客有任何问题和建议，欢迎大家留言！

