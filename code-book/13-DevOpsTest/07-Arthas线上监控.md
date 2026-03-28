https://blog.csdn.net/weixin_37650458/article/details/123561000

```shell
curl -O https://arthas.aliyun.com/arthas-boot.jar
curl -O https://arthas.aliyun.com/math-game.jar
## 启动
java -jar arthas-boot.jar 
## 也可以直接下载全量安装包，比如内网环境无法访问阿里云的地址。
https://arthas.aliyun.com/download/latest_version?mirror=aliyun 
```

http://localhost:3658/

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20221205153817417.png)



**dashboard**

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20230516100801705.png)

- code_cache 40M       41M       240M     16.96%  





## 在Docker中使用

https://blog.csdn.net/qq_43895252/article/details/128171898



## idea插件

Arthas 官方的工具还不够足够的简单，需要记住一些命令，特别是一些扩展性特别强的高级语法，比如ognl获取spring context 为所欲为，watch、trace 不够简单，需要构造一些命令工具的信息，因此只需要一个能够简单处理字符串信息的插件即可使用。当在处理线上问题的时候需要最快速、最便捷的命令，因此插件还是有存在的意义和价值的。

https://www.yuque.com/arthas-idea-plugin/help/pe6i45

## 实战案例

如何系统的学习arthas? - 技术王的回答 - 知乎 https://www.zhihu.com/question/624945901/answer/3241638354