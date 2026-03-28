## for update

### for update 是行锁还是表锁？ 

当 where 条件是索引字段且为具体值时是行锁，否则表锁。

### for update 是读锁还是写锁？ 

一旦用户对表某个行记录施加了锁，则该用户可以查询也可以更新被加锁的数据行，其它用户可以快照读，但不能当前读（for update），不能更新被加锁的数据行。

## 如何查看锁信息

### 案例介绍

这是一个线上的真实故障，起因是同事利用存储过程写了一个序列号生成器，如下：

```sql
-- 存储过程
create
    definer = cctcepc@`%` procedure initial_sequence(IN in_business_type varchar(200), IN in_rule_type varchar(100),
                                                     IN in_rule varchar(200))
BEGIN
        declare v_id int default null;
        declare v_seq int default 0;
        select id, seq_no into v_id, v_seq from epc_sequence_no where  `business_type` =in_business_type and `rule_type` = in_rule_type and `rule` = in_rule for update;
        if (v_id is null) then
           insert ignore into epc_sequence_no(`business_type`,`year`, `seq_no`,`rule_type`,`rule`)
           values( in_business_type, date_format(CURDATE(), '%Y'), 1,in_rule_type,in_rule);
        else
           update epc_sequence_no set `seq_no` = v_seq + 1 where id = v_id;
        end if;
        select v_seq + 1;
END;
```

问题就出在 `select ... for update`由于没有命中索引，导致锁了全表，进而 `insert`的时候锁等待超时。

那问题其实很好解决的，加索引将表锁变为行锁即可。

### 如何验证确实锁了全表

```sql
SHOW ENGINE INNODB STATUS;
```

查看`status`这列，返回 innodb 的各种信息，重点关注事务和锁的信息：

```sql
------------
TRANSACTIONS
------------
Trx id counter 20301410
Purge done for trx's n:o < 20301410 undo n:o < 0 state: running but idle
History list length 4
LIST OF TRANSACTIONS FOR EACH SESSION:
---TRANSACTION 422060800262144, not started
0 lock struct(s), heap size 1128, 0 row lock(s)
---TRANSACTION 422060800265376, not started
0 lock struct(s), heap size 1128, 0 row lock(s)
---TRANSACTION 422060800261336, not started
0 lock struct(s), heap size 1128, 0 row lock(s)
---TRANSACTION 422060800263760, not started
0 lock struct(s), heap size 1128, 0 row lock(s)
---TRANSACTION 422060800260528, not started
0 lock struct(s), heap size 1128, 0 row lock(s)
---TRANSACTION 422060800259720, not started
0 lock struct(s), heap size 1128, 0 row lock(s)
---TRANSACTION 20301329, ACTIVE 242 sec
2 lock struct(s), heap size 1128, 5 row lock(s)
MySQL thread id 776105, OS thread handle 140584729216768, query id 93826038 115.171.169.62 root starting
/* ApplicationName=DataGrip 2023.3.3 */ SHOW ENGINE INNODB STATUS
```

发现事务`20301329`，已激活 242 秒，有 2 个锁，锁了 5 行。

具体是哪五行呢？

```sql
-- 查看具体哪行数据被锁
-- mysql 8 以前
SELECT * FROM information_schema.innodb_locks WHERE lock_trx_id = '20301329';
-- mysql 8
SELECT * FROM performance_schema.data_locks WHERE ENGINE = 'INNODB' AND ENGINE_TRANSACTION_ID = '20301329';
```

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20240123175011803.png)

`LOCK_DATA`这列就是锁定的具体的行 `id`，上图分别是一个表锁 + 4 行行锁 + 索引最大值锁（supremum pseudo-record）

## 悲观锁

#### 



## 乐观锁





## 读锁





## 写锁





## 行锁





## 表锁





## 间隙锁



