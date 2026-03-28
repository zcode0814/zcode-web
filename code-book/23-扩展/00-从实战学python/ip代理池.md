



【python实战】爬虫封你ip就不会了？ip代理池安排上

>哈喽，大家好，我是一条。
>
>在线旅游这个行业，价格是永恒不变的战略，获取对方价格的有效手段就是爬虫。
>
>有爬虫就有反爬虫，最直接的就是封你ip，大门一关，”闭关锁国“。
>
>这时候找个替身无疑是最好的办法，用个障眼法躲过对方的排查。
>
>代理ip就是专门干这个的，先把请求发给代理ip，让代理ip替我们访问目标服务器。
>
>今天就教大家怎么打造自己的ip代理池。

## 代理ip网站

以下代理网站均免费，所以质量你懂的

|   代理名称   |  状态  |  更新速度 |  可用率  |  地址 |    代码   |
| ---------   |  ---- | --------  | ------  | ----- |   ------- |
| 米扑代理     |  ✔    |     ★     |   *     | [地址](https://proxy.mimvp.com/)   | `freeProxy01`  |
| 66代理      |   ✔   |     ★★     |   *    | [地址](http://www.66ip.cn/)         |  `freeProxy02` |
| Pzzqz       |  ✔    |     ★     |   *     | [地址](https://pzzqz.com/)          | `freeProxy03`  |
| 神鸡代理     |  ✔    |    ★★★    |   *     | [地址](http://www.shenjidaili.com/) | `freeProxy04`  |
| 快代理       |  ✔    |     ☆     |   *     | [地址](https://www.kuaidaili.com/)  | `freeProxy05`  |
| 极速代理     |  ✔    |    ★★★    |   *     | [地址](https://proxy.coderbusy.com/)| `freeProxy06`  |
| 云代理       |  ✔    |     ★     |   *     | [地址](http://www.ip3366.net/)      |  `freeProxy07` |
| 小幻代理     |  ✔    |     ★★    |    *    | [地址](https://ip.ihuan.me/)        | `freeProxy08`   |
| 免费代理库   |  ✔    |      ☆    |    *    | [地址](http://ip.jiangxianli.com/)  |   `freeProxy09` |
| 89代理      |  ✔    |      ☆     |   *    | [地址](https://www.89ip.cn/)         | `freeProxy13` |
| 西拉代理    |  ✔     |     ★★    |   *     | [地址](http://www.xiladaili.com/)   | `freeProxy14` |

## 实现思路

1.利用`requests`获取对应地址的`respond`

2.`xpath`解析返回值

3.访问指定网址（比如百度）判断ip是否可用

4.将可用的ip存入文件

5.将脚本放到服务器，设置定时任务，每天爬取最新可用ip

## 部分代码

>完整代码微信搜【一条IT】

```python
# -*- coding: utf-8 -*-
# Date: 2021/6/5 11:14
# Author: libiao
# wechat: 一条IT
# Software: PyCharm
import re
import time
import requests
from webRequest import WebRequest

def getHtml(proxy):
    # ....
    retry_count = 1
    while retry_count > 0:
        try:
            html = requests.get('http://www.baidu.com', proxies={"http": "http://{}".format(proxy)})
            # 使用代理访问
            print(html)
        except Exception as e:
            print(e)
        retry_count -= 1
def freeProxy01():
    """
    米扑代理 https://proxy.mimvp.com/
    :return:
    """
    url_list = [
        'https://proxy.mimvp.com/freeopen',
        'https://proxy.mimvp.com/freeopen?proxy=in_tp'
    ]
    iplist=[]
    port_img_map = {'DMxMjg': '3128', 'Dgw': '80', 'DgwODA': '8080',
                    'DgwOA': '808', 'DgwMDA': '8000', 'Dg4ODg': '8888',
                    'DgwODE': '8081', 'Dk5OTk': '9999'}

    for url in url_list:
        html_tree = WebRequest().get(url).tree
        for tr in html_tree.xpath(".//table[@class='mimvp-tbl free-proxylist-tbl']/tbody/tr"):
            try:
                ip = ''.join(tr.xpath('./td[2]/text()'))
                port_img = ''.join(tr.xpath('./td[3]/img/@src')).split("port=")[-1]
                port = port_img_map.get(port_img[14:].replace('O0O', ''))
                if port:
                    ipPort=ip+":"+port
                    print(time.strftime("%Y-%m-%d %H:%M:%S", time.localtime()),ipPort)
                    getHtml(ipPort)
            except Exception as e:
                print(e)

def freeProxy02():
    """
    代理66 http://www.66ip.cn/
    :return:
    """
    url = "http://www.66ip.cn/mo.php"
    resp = WebRequest().get(url, timeout=10)
    proxies = re.findall(r'(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d{1,5})', resp.text)
    for proxy in proxies:
        print(time.strftime("%Y-%m-%d %H:%M:%S", time.localtime()),proxy)
        getHtml(proxy)
def freeProxy04():
    """
    神鸡代理 http://www.shenjidaili.com/
    :return:
    """
    url = "http://www.shenjidaili.com/product/open/"
    tree = WebRequest().get(url).tree
    for table in tree.xpath("//table[@class='table table-hover text-white text-center table-borderless']"):
        for tr in table.xpath("./tr")[1:]:
            proxy = ''.join(tr.xpath("./td[1]/text()")).strip()
            print(time.strftime("%Y-%m-%d %H:%M:%S", time.localtime()),proxy)
            getHtml(proxy)
if __name__ == '__main__':
    # freeProxy02()
    with open("proxyPool"，"a+") as f:
        iplist=f.readlines()
    for ip in iplist:
        print(ip)
        getHtml(ip.strip())
```

## linux定时任务

```shell
crontab -e  编辑定时任务 按i进入编辑

crontab -l  查询所有的定时任务

crontab文件格式：

  *      *       *      *       *        filename

minute   hour    day   month   week      filename

分          时         天      月        星期       脚本文件

如果想每分钟都执行一次的话就采用默认的 * * * * *
如果想每五分钟执行一次可以 */5 * * * * 
如果是每两个小时执行一次的话就是 *  */2 * * *来
```

**示例**

![img](https://img-blog.csdnimg.cn/20190827165316773.png)

上图的意思是每天9：20执行 /gis/home/syncScripts/gs_zb.sh脚本

## 最后

以上，代理ip池构建完成，放在服务器上每天重跑。没有服务器的同学可参考这篇

[阿里云服务器购买及SSH免密登录](https://blog.csdn.net/skylibiao/article/details/109729785)

---

*感谢各位粉丝的支持，一条最近工作上遇到些困难，更新可能会比较慢，大约半个月后会恢复正常。*

我是**一条**，一个在互联网摸爬滚打的程序员。

**道阻且长，行则将至**。大家的 **【点赞，收藏，关注】** 就是一条创作的最大动力，我们下期见！

注：关于本篇博客有任何问题和建议，欢迎大家留言！