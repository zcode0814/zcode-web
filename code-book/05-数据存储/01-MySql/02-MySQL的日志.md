> 开发者客栈——[MySQL 日志 15 连问](https://www.developers.pub/wiki/1002310/526)
>
> - 日志的作用
> - 刷盘机制
> - 二阶段提交保证数据一致

## binlog

```mysql
show variables like 'log_%';
```

| Variable\_name     | Value                       |
| :----------------- | :-------------------------- |
| log\_bin           | ON                          |
| log\_bin\_basename | /var/lib/mysql/binlog       |
| log\_bin\_index    | /var/lib/mysql/binlog.index |

**查看文件内容**

- 命令行方式

```mysql
show binlog events; # 只查看第一个binlog文件的内容 
show binlog events in 'binlog.000004'; #查看指定binlog文件的内容 
show binary logs; #获取binlog文件列表 
show master status; #查看当前正在写入的binlog文件
```

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20230109152830413.png)

- mysqlbinlog

```shell
find / -name "mysqlbinlog"  # /usr/bin/mysqlbinlog
/usr/bin/mysqlbinlog binlog.000004 
/usr/bin/mysqlbinlog -v binlog.000004 
```

**如何看懂binlog**



**三种格式**

- ROW
- STATEMENT
- MIXED



## slowlog

```
/usr/sbin/mysqld, Version: 8.0.28 (MySQL Community Server - GPL). started with:
Tcp port: 3306  Unix socket: /var/lib/mysql/mysql.sock
Time                 Id Command    Argument
# Time: 2023-05-24T08:59:25.494729Z
# User@Host: root[root] @  [124.65.189.198]  Id: 288891
# Query_time: 11.000258  Lock_time: 0.000000 Rows_sent: 1  Rows_examined: 1
use test;
SET timestamp=1684918754;
/* ApplicationName=DataGrip 2021.1.3 */ select sleep(11);
```

```sql
SELECT * FROM mysql.slow_log;
SHOW VARIABLES LIKE 'slow_query_log%';
show variables like '%log_output%';

SET GLOBAL slow_query_log = 1;
set global log_output = 'TABLE';
# SET GLOBAL slow_query_log_file = '/data/opt/mysql/log/slow_log.log';
# /var/lib/mysql/VM-24-10-centos-slow.log
SET GLOBAL long_query_time = 10;

select sleep(11);
```



