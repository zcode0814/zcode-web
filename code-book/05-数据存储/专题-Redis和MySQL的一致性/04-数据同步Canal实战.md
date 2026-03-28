# Canal

>canal译意为水道/管道/沟渠，主要用途是基于 MySQL 数据库增量日志解析，提供增量数据订阅和消费。
>
>- 服务端：负责解析MySQL的binlog日志，传递增量数据给客户端或者消息中间件
>- 客户端：负责解析服务端传过来的数据，然后定制自己的业务处理。

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/640-20230129092131647.png)

## Docker安装

### canal-admin

```shell
docker pull canal/canal-admin

## 获取启动启动脚本
wget https://raw.githubusercontent.com/alibaba/canal/master/docker/run_admin.sh
## 执行建表sql,用户密码以数据库为准
wget https://github.com/alibaba/canal/blob/master/admin/admin-web/src/main/resources/canal_manager.sql
## 执行脚本
run_admin.sh -e server.port=8089 \
        -e canal.adminUser=admin \
        -e canal.adminPasswd=123456\
        -e spring.datasource.address=101.43.160.149 \
        -e spring.datasource.database=canal_manager \
        -e spring.datasource.username=root \
        -e spring.datasource.password=Libiao@123
        
## 
docker run -it --name canal-admin  \
-e spring.datasource.address=101.43.160.149:3306 \
-e spring.datasource.database=canal_manager \
-e spring.datasource.username=root \
-e spring.datasource.password=Libiao@123 \
-p 8089:8089 canal/canal-admin
```

以上用docker启动过程中出现内存不足的情况，所以尝试用原生方式安装

[下载压缩包](https://github.com/alibaba/canal/releases/download/canal-1.1.6/canal.admin-1.1.6.tar.gz)

解压修改配置文件，主要修改数据库信息

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20230124212621747.png)

修改启动脚本的jvm配置，都设置为512m

```shell
./startup.sh 
```

[访问页面](http://101.43.138.173:8089/#/canalServer/canalInstances)

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20230124212739595.png)

### canal-server

> 大坑：修改配置后重启server端必须删除`conf/example/meta.bat`。

```shell
docker pull canal/canal-server
## 先启动获取到配置文件复制到本地，在挂载本地配置文件
docker run --name canal -d canal/canal-server
docker cp canal:/home/admin/canal-server/conf/canal.properties /data/opt/canal/canal-server
docker cp canal:/home/admin/canal-server/conf/example/instance.properties /data/opt/canal/canal-server
docker cp canal:/home/admin/canal-server/bin/startup.sh /data/opt/canal/canal-server

docker run --name canal -p 9100:9100 -p 11110:11110 -p 11111:11111 -p 11112:11112 \
-v /data/opt/canal/canal-server/instance.properties:/home/admin/canal-server/conf/example/instance.properties \
-v /data/opt/canal/canal-server/canal.properties:/home/admin/canal-server/conf/canal.properties \
-v /data/opt/canal/canal-server/startup.sh:/home/admin/canal-server/bin/startup.sh \
-e canal.admin.manager=101.43.138.173:8089 \
-e canal.admin.port=11110 \
-e canal.admin.user=admin \
-e canal.admin.passwd=4ACFE3202A5FF5CF467898FC58AAB1D615029441 \
-d canal/canal-server

docker run --name canal -p 11111:11111  \
-v /data/opt/canal/canal-server/instance.properties:/home/admin/canal-server/conf/example/instance.properties \
-v /data/opt/canal/canal-server/canal.properties:/home/admin/canal-server/conf/canal.properties \
-v /data/opt/canal/canal-server/startup.sh:/home/admin/canal-server/bin/startup.sh \
-d canal/canal-server

```

**修改配置文件**

一个 Server 可以配置多个实例监听 ，Canal 功能默认自带的有个 example 实例，本篇就用 example 实例 。如果增加实例，复制 example 文件夹内容到同级目录下，然后在 canal.properties 指定添加实例的名称。

`instance.properties`

```properties
# url
canal.instance.master.address=101.43.160.149:3306
# username/password
canal.instance.dbUsername=canal
canal.instance.dbPassword=canal@123

# 监听的数据库，表，可以指定，多个用逗号分割，这里正则是监听所有
canal.instance.filter.regex=.*\\..*
```

`canal.properties`

```properties
# 默认端口 11111
# 默认输出model为tcp, 这里根据使用的mq类型进行修改
# tcp, kafka, RocketMQ
canal.serverMode = tcp

# canal可以有多个instance,每个实例有独立的instance.properties配置文件，
# 默认带有一个example实例,如果需要处理多个mysql数据的话，可以复制出多个example,对其重新命名，
# 命令和配置文件中指定的名称一致。然后修改canal.properties 中的 canal.destinations
# canal.destinations=实例 1，实例 2，实例 3
canal.destinations = example

```

**启动server**

> 需要先完成Mysql的binlog配置

```shell
./bin/startup.sh   # 如果内存不充裕，需要修改启动的JVM参数，亲测256m够用
```

查看`canal.log`，启动成功

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20230129094557193.png)

查看`example.log`，发现连接数据库失败`java.io.IOException: caching_sha2_password Auth failed`

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20230129095940401.png)

解决方案：

> myql8.0版本的密码加密方式为caching_sha2_password，所以修改为mysql_native_password 就行。

```sql
ALTER USER 'canal'@'%' IDENTIFIED WITH mysql_native_password BY 'canal@123';
FLUSH PRIVILEGES; #刷新权限
```

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20230129100048666.png)

## canal客户端

**Canal封装的数据结构**

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20230129175613131.png)

**Java客户端**

```xml
<dependency>
            <groupId>com.alibaba.otter</groupId>
            <artifactId>canal.client</artifactId>
            <version>1.1.5</version>
        </dependency>
        <!-- Message、CanalEntry.Entry等来自此安装包 -->
        <dependency>
            <groupId>com.alibaba.otter</groupId>
            <artifactId>canal.protocol</artifactId>
            <version>1.1.5</version>
        </dependency>
```

## Mysql同步到Es

**mysql配置**

```sql
# 是否开启binlog，ROW模式
show variables like 'log_bin%';
show variables like 'binlog_format%';
show variables like '%server_id%';
```

`/mysql.conf.d/mysqld.cnf`中配置如下：

```
[mysqld]
log-bin=mysql-bin # 开启 binlog
binlog-format=ROW # 选择 ROW 模式
server_id=1 # 配置 MySQL replaction 需要定义，不要和 canal 的 slaveId 重复
binlog-do-db=yitiao_admin # binlog-do-db 指定具体数据库，如果不配置则表示所有数据库均开启Binlog
```

**创建cannl用户并授权**

```sql
CREATE USER canal IDENTIFIED BY 'canal@123';
GRANT SELECT, REPLICATION SLAVE, REPLICATION CLIENT ON *.* TO 'canal'@'%';
FLUSH PRIVILEGES;
```

**服务端配置**

```properties
# conf/example/instances.properties
# table regex
canal.instance.filter.regex=yitiao_admin\\.code_note
```

**监听到的binlog**

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20230130104142535.png)

**处理binlog到Es**

```java
@Component
@Slf4j
public class CanalClientHandler {

    @Resource
    private CodeNoteService noteService;

    @SneakyThrows
    public void run() {
        log.info("canal-client started");
        // 获取连接
        CanalConnector canalConnector = CanalConnectors.newSingleConnector(
                new InetSocketAddress("101.43.138.173", 11111), "example", "", "");
        // 连接
        canalConnector.connect();
        // 订阅数据库
        canalConnector.subscribe();
        while (true) {
            Thread.sleep(1000);
            // 获取数据
            Message message = canalConnector.get(100);
            // 获取Entry集合
            List<CanalEntry.Entry> entries = message.getEntries();
            // 判断集合是否为空
            if (CollectionUtil.isNotEmpty(entries)) {
                // 遍历entries，单条解析
                for (CanalEntry.Entry entry : entries) {
                    //1.获取表名
                    String tableName = entry.getHeader().getTableName();
                    //2.获取类型
                    CanalEntry.EntryType entryType = entry.getEntryType();
                    //3.获取序列化后的数据
                    ByteString storeValue = entry.getStoreValue();
                    //4.判断当前entryType类型是否为ROWDATA
                    if (CanalEntry.EntryType.ROWDATA.equals(entryType)) {
                        //5.反序列化数据
                        CanalEntry.RowChange rowChange = CanalEntry.RowChange.parseFrom(storeValue);
                        //6.获取当前事件的操作类型
                        CanalEntry.EventType eventType = rowChange.getEventType();
                        //7.获取数据集
                        List<CanalEntry.RowData> rowDataList = rowChange.getRowDatasList();
                        //8.遍历rowDataList，并打印数据集
                        for (CanalEntry.RowData rowData : rowDataList) {
                            JSONObject beforeData = new JSONObject();
                            List<CanalEntry.Column> beforeColumnsList = rowData.getBeforeColumnsList();
                            for (CanalEntry.Column column : beforeColumnsList) {
                                beforeData.put(column.getName(), column.getValue());
                            }
                            JSONObject afterData = new JSONObject();
                            List<CanalEntry.Column> afterColumnsList = rowData.getAfterColumnsList();
                            for (CanalEntry.Column column : afterColumnsList) {
                                afterData.put(column.getName(), column.getValue());
                            }
                            //数据打印
                            log.info("Table:" + tableName + ",EventType:" + eventType + ",Before:" + beforeData + ",After:" + afterData);
                            if (eventType.equals(CanalEntry.EventType.INSERT)){
                                noteService.saveNoteToEs(JSONObject.toJavaObject(afterData, EsCodeNote.class));
                            }else if (eventType.equals(CanalEntry.EventType.DELETE)){
                                noteService.delNoteFromEs(JSONObject.toJavaObject(beforeData, EsCodeNote.class));
                            }else if (eventType.equals(CanalEntry.EventType.UPDATE)){
                                noteService.updateNoteFromEs(JSONObject.toJavaObject(afterData, EsCodeNote.class));
                            }
                        }
                    }
                }
            }

        }
    }
}
```

