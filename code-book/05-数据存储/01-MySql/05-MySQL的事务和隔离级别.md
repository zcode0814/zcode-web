> 摘要：mysql的四种隔离级别，产生的数据不一致问题、MVCC版本控制、unlog链、ReadView、当前读快照读、间隙锁、共享锁排它锁
>
> 更新日志：
>
> - 20230508 -- 创建

## 隔离级别

- 读未提交：读到其他事务未提交的数据。从而产生`脏读`
- 读已提交：在当前事务读到其他事务提交的数据，导致两次查询结果不一致，产生`不可重读问题`
- 可重复读：在当前事务不会读到其他事务提交的数据，即可以重复读，注意这里并不是使用锁来控制其他事务不许修改，而是基于乐观锁诞生了MVCC，去读快照版本，其他事务可以正常修改提交。当前读依然会产生不可重复读问题。如果其他事务不是update而是insert，就叫`幻读`
- 串行读：加锁，一个一个执行。



## MVCC

基于undolog实现的版本快照链，每次快照读都会基于版本链生成一个`读视图`，在一个事务内第二次读不会生成新的`读视图`。

所以**快照读就解决了不可重复读问题，但是当前读问题依然存在**，而间隙锁只发生在当前读中，阻止其他事务在间隙内操作。

`for update、update、insert、lock in share mode、delete`都属于当前读。快照读就是普通的 `select`

以下演示事务 A ，事务 B 做的事为插入一条 user_id = 1 的记录，然后提交，在事务 A 中使用快照读是读不到新插入的数据的，使用当前读可以读到，同时 update 也是更新了 3 条记录。

```sql
mysql> SELECT * FROM orders;
+----+---------+------------+------------+
| id | user_id | product_id | order_date |
+----+---------+------------+------------+
|  1 |       1 |          3 | 2023-05-01 |
|  2 |       1 |          2 | 2023-05-02 |
|  3 |       2 |          1 | 2023-05-03 |
|  4 |       2 |          3 | 2023-05-04 |
+----+---------+------------+------------+
4 rows in set (0.00 sec)

mysql> SELECT * FROM orders WHERE user_id = 1 for update;
+----+---------+------------+------------+
| id | user_id | product_id | order_date |
+----+---------+------------+------------+
|  1 |       1 |          3 | 2023-05-01 |
|  2 |       1 |          2 | 2023-05-02 |
|  5 |       1 |          4 | 2023-05-05 |
+----+---------+------------+------------+

mysql> update orders set product_id = 9 where user_id = 1;
Query OK, 3 rows affected (0.00 sec)
Rows matched: 3  Changed: 3  Warnings: 0
```

## unlog

>  再扩展点 undolog 的生成时机及 undolog 链的维护与读取。

又来做事务执行失败时的回滚操作，每条数据的隐藏列 `roll_pointer`指向 undo log 日志，当 undo log 写完之后才可以进行修改操作，修改完之后将`roll_pointer`指向新的日志。

多次修改之后，undo log 就会形成一个版本链，那我们进行快照读时，到底应该读哪个版本呢？

这时就需要提到 `ReadView`，在每次查询时生成，记录目前正在活跃，即未提交的事务，那未提交的事务列表中最小值的前一个就是已提交的事务。

在 RC 隔离级别下，每次查询都有新建一个 ReadView ，即造成了不可重复读问题，但是在 RR 隔离级别下，ReadView 会复用。

但是快照读之后进行**当前读**，且临建锁的范围覆盖新插入的元素，ReadView 依然会新建，就造成了幻读问题。



可以使用以下SQL查询MySQL数据库的Undolog相关配置：

```sql
SHOW GLOBAL VARIABLES LIKE 'innodb_undo%';
SHOW VARIABLES LIKE 'innodb_log%'; ## redolog
SHOW VARIABLES LIKE 'datadir'; ## 找到根目录

-- undolog
[root@VM-24-10-centos ~]# cd /var/lib/mysql/
[root@VM-24-10-centos mysql]# ll
-rw-r----- 1 mysql mysql  16777216 May  8 17:45 undo_001
-rw-r----- 1 mysql mysql  16777216 May  8 17:45 undo_002

-- redolog
-rw-r----- 1 mysql mysql  50331648 May  8 17:45 ib_logfile0
-rw-r----- 1 mysql mysql  50331648 May  8 17:45 ib_logfile1


-- 查看binlog
mysqlbinlog /path/to/redo/log [--since=datetime] [--until=datetime] [--database=db_name] [--table=tbl_name]
-rw-r----- 1 mysql mysql   3723026 Jan 30 09:15 binlog.000007
-rw-r----- 1 mysql mysql  64869575 Feb 15 14:36 binlog.000008
-rw-r----- 1 mysql mysql 327191137 May  8 17:45 binlog.000009
-rw-r----- 1 mysql mysql        48 Feb 15 14:36 binlog.index
```

这将显示所有以“innodb_undo”开头的全局变量，这些变量有些是只读的，不能通过SQL语句更改。

- innodb_undo_directory  - Undo日志文件目录。

- innodb_undo_log_encrypt  - 是否使用AES进行Undo日志加密。

- innodb_undo_tablespaces  - Undo表空间数量。

- innodb_undo_logs  - 每个Undo表空间的Undo日志文件数量。

- innodb_undo_max_size  - 单个Undo日志文件的最大大小（默认为1GB）。

- innodb_purge_threads  - 执行purge线程的数量（默认为1）。









