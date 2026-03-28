## 什么是图数据库

基于图论实现的一种 Nosql 数据库，用于存储更多的关系数据，广泛用于社交、电商领域。

图论：用点代表事物，用线代表事物间的关系。







## mac本地安装

```shell
brew install neo4j
# 等待约 3 分钟
```

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20240711023841397.png)

```
 To start neo4j now and restart at login:
  brew services start neo4j
Or, if you don't want/need a background service you can just run:
  /opt/homebrew/opt/neo4j/bin/neo4j console
```

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20240711023911949.png)

访问 http://localhost:7474/，初始账号密码为`neo4j`，建议首次登录后修改密码

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20240711024116294.png)

