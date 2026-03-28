# 先看懂执行计划EXPLAIN

[B 站尚硅谷](https://www.bilibili.com/video/BV1iq4y1u7vj/?p=137)

>你给翻译翻译，什么叫惊喜，什么他妈的叫惊喜！
>
>​																											——《让子弹飞》

哈喽，大家好，我是一条，一个梦想弃码从文的程序员！

先跟大家补一个元旦快乐！新年新气象，答应大家好久的sql优化内容也该提上日程。

其实网上有很多写的很好的sql优化文章，全面细致，但是都遗漏了一个**问题**，只教了大家怎么治病，没教怎么看病，这就好比一个饱读医书的大夫，病人往这一坐，望闻问切全都不会，一身的本事不知道该用哪个？

急死个人了。

所以今天就聊聊怎么看病，也就是如何看 MySQL 的执行计划。

## EXPLAIN

>当客户端发送给服务端一条sql语句后，并不是拿过来就执行的，而是先经过优化器选取最优的方案，比如表的读取顺序，索引实际是否被使用，表之间的引用等。
>
>而优化后的执行方案就称之为**执行计划**。
>
>标⭐️重点关注

`EXPLAIN`的作用就是查看执行计划，使用起来非常简单，无论是`select insert update delete`，都是只需要在前面加`explain`。

```sql
-- items : 商品主数据表
explain select * from items;
```

执行后的结果如下（为方便查看，使用树形结构展示）：

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220102143352390.png)

左面就是执行计划的列名，我们的学习的关键就是要知道每列的含义。

右面是对应的值，在实际开发中通过分析值来诊断sql语句的问题。

## 看懂执行计划

> 数据准备参考代码脚本文档

### table

表明这一行的数据是关于哪个表。

### id

每个 `select`关键字对应一个 id，例外的情况是子查询可能会被优化：

```sql
EXPLAIN SELECT * FROM s1 WHERE key1 IN (SELECT key2 FROM s2 WHERE common_field = 'a');
# 优化成联表查询，只会有一个 id 值
```

```sql
explain select * from s1 union select * from s2;
# 全连接且去重，需要一张临时表
```

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20240227144659196.png)

`select`的执行顺序，怎么理解呢？看下面的sql：

```sql
explain select * from s1 inner join s2;
```

共有两个查询，哪个先执行呢，可以通过id来判断：

- id 越大，优先级越高，越先执行。
- id相同的情况下执行顺序是**由上到下**。
- 先执行的表称为驱动表。

验证一下：

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20240227143047233.png)

**关注点**：每个不同的 id，表示一趟独立的查询, 一个sql的查询趟数越少越好。

### select_type

观察刚才的输出结果，发现子查询的`select_type`值是不一样的，分别是什么意思呢？

顾名思义，应该是查询类型的意思，我们只要知道了某个小查询的`select_type`属性，就知道了这个小查询在整个大查询中扮演了一个什么角色。

`PRIMARY`是指查询中包含子查询，并且该查询位于最外层，而`SUBQUERY`翻译过来就是子查询。上面的`SIMPLE`则是最普通，最简单的查询。

还有一些其他的值如下：

- `DERIVED` : 表示在`from`中包含子查询
- `UNION` : 对于包含UNION或者UNION ALL的大查询来说，除了最外层的查询会被标记为`PRIMARY`，其余都会被标记为`UNION`。
- `UNION RESULT` : 表示UNION查询中的临时表。
- `MATERIALIZED`：`IN`或`EXISTS`后的查询。

>补充说明：
>
>`MATERIALIZED`翻译过来是物化的意思，即将子查询结果集中的记录保存到临时表的过程。
>
>临时表称之为物化表。正因为物化表中的记录都建立了索引（基于内存的物化表有哈希索引，基于磁盘的有B+树索引），通过索引执行`IN`语句判断某个操作数在不在子查询结果集中变得非常快，从而提升了子查询语句的性能。

### partitions

这里先介绍一下分区表的概念，和我们常说的分库分表不同。

分区表是指将数据文件在磁盘上进行分区，将一个大文件分成多个小文件。可以优化查询性能，特别是对于`count`查询可以并发统计，还可以通过指定分区快速删除废弃数据。

分区类型：

- `RANGE`分区：根据给定一个连续的区间进行分区。在删除旧数据时特别有用。
- `LIST`分区：根据具体数值分区。假设某商品销售在华东，华中，华北三个战区，按照战区分区，在`where`查询时只需要指定分区即可。
- `HASH`分区：根据对固定整数取模来分区，这就要求数据分布比较平均。`Hash`分区也存在与传统`Hash`分表一样的问题，可扩展性差。`MySQL`也提供了一个类似于一致性`Hash`的分区方法－线性`Hash`分区，只需要在定义分区时添加`LINEAR`关键字。
- `KEY`分区：与`Hash`分区很相似，只是`Hash`函数不同。

看一个创建分区表的示例：

```sql
 -- 创建user表
 create table user_partitions (
   id int auto_increment, 
   name varchar(12),
   primary key(id)
 )
 -- 按照id分区，id<100 p0分区，其他p1分区
 partition by range(id)(
     partition p0 values less than(100),
     partition p1 values less than maxvalue
 );
```

回到执行计划，`partitions`这列表明数据在哪个分区。

### type⭐️

代表访问类型，即如何查找数据，结果值从最好到最坏依次是：

> system > const > eq_ref > ref > fulltext > ref_or_null > index_merge > unique_subquery > index_subquery> range > index>all

可以只记住简化版的：

> system > const > eq_ref > ref > range > index>all 

生产环境一般需要达到`ref`或`range` 级别。依次给大家介绍下：

**system**

表中只有一行记录，

**const**

通过索引一次就找到了。

示例：

```sql
explain select * from s1 where id = 10002;
```

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20240227150108901.png)

**eq_ref**

在联表查询时，被驱动表使用主键索引或唯一索引进行等值匹配。

```sql
explain select * from s1 inner join s2 on s1.id = s2.id;
```

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20240227161231555.png)

**ref**

非唯一索引扫描，返回匹配某个单独值的所有行。

```sql
explain select * from s1 where key3 = 'xECcBC'; # 普通索引
explain select * from s1 where key2 = '10036'; # 唯一索引
```

和 `const`区别在于匹配的值是否唯一。

**index_merge**

```sql
explain select * from s1 where key1 = 'a' or key3 = 'a';
# 将 key1 和 key3 的索引合并使用
```

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20240227161710344.png)

**range**

通过索引进行范围筛选时

```sql
explain select * from s1 where key2 > 1 and key2 < 10;
```

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20240227163414294.png)

**index**

可以使用索引覆盖，且需要扫描全部索引记录时

```sql
explain select s1.key_part2 from s1 where key_part3 = 'a';
```

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20240227163113400.png)

**all**

全表扫描

**null**

是不是没想到还会有空的时候，空的意思是我都不需要查表，只需要查索引就能搞定，比如：

```sql
explain select min(id) from items;
```

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220102171548459.png)

`table`也是空，说明只查了索引。

### possible_keys

翻译一下就是可能用到的key，但不一定真正会用到，有可能是因为MySQL认为有更合适的索引，也可能因为数据量较少，MySQL认为索引对此查询帮助不大，选择了全表查询。

如果想强制使用或不使用某个索引，可以在查询中使用 `force index`、`ignore index`。

### key

真正用到的索引。

通过对比`possible_keys`和`key`,可以观察所建的索引书否被使用，即索引是否合理，从而进行优化。

索引不是建的越多越好，可能使用的索引越多，查询优化器计算查询成本时就得花费更长时间，所以如果可以的话，尽量删除那些用不到的索引。

对于线上已经存在大量数据的表，不要轻易增加索引，因为会增大数据库的压力。

### key_len

表示索引实际使用的字节数，通过这个值可以算出具体使用了索引中的哪些列。

帮助我们检查是否充分利用到了联合索引的各个列，值越大越好。

```sql
explain select * from s1 where key_part1 = 'a' and key_part2 = 'b';
```

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20240227165755267.png)

看一个案例：

新建一个联合索引

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220102203857044.png)

执行如下sql

```sql
explain
    select * from items where sell_counts=300;
```

看一下结果

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220102204656619.png)

显然是用到了联合索引，但是具体用到那一列呢，发现`ken_len`是4，正好是一个`int`类型的长度，也是就只使用了`sell_counts`这列。

修改一下sql

```sql
explain
    select * from items where sell_counts=300 and item_name='好吃蛋糕甜点蒸蛋糕';
```

执行结果

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220102205152438.png)

索引不变，`ken_len`变为`134`，怎么来的呢？

需要先看一下`item_name`的长度是`32`。

还需要知道字符编码是是什么？`show variables like 'character%';`

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220104151821236.png)

`utf8mb4`是个啥呢，简单说就是它才是MySQL中真正的`utf8`,而MySQL中的`utf8`是一种“专属的编码”，它能够编码的`Unicode`字符并不多。

这其实MySQL的一个bug，`utf8mb4`是用来修复的。

言归正传，用字段长度*编码占字节=总的字节数。即`32*4=128`。（`latin1 `占用一个字节，`gbk `占用两个字节，`utf-8` 占用三个字节）。

但是这还每完，因为`varchar`是可变长度的，还需要两位存储真正的长度。这样加上`int`的四个字节，刚好`134`，由此推断出用到了`sell_conts`和`item_name`两列（`128+2+4=134`）。

另外由于字符串是可以存储空值的，所以还需要一个标志位来存储是否为空，但是在本例中，`item_name`是非空列，所以不再加一。

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220104153334463.png)

### ref

展示与索引列作等值匹配的对象信息，比如一个常数或者是某个列。

```sql
explain
    select * from items i where id = 'cake-1001';
```

这样是一个常数

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220104170340791.png)

```sql
explain
    select * from items i left join category c
    on c.id = i.cat_id;
```

这样是一个列

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220104170440843.png)

### rows⭐️

预估所需要读取的行数，越少越好。

如果查询优化器决定使用全表扫描的方式对某个表执行查询时，代表预计需要扫描的行数。

如果使用索引来执行查询时，就代表预计扫描的索引记录行数。

```sql
explain
    select * from items i where sell_counts >  100;
```

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220104170743376.png)

### filtered

表经过搜索条件过滤后剩余记录的百分比，越高越好。

只有联表查询才需要关注，`filtered * rows`决定了被驱动表需要执行的次数。

```sql
EXPLAIN SELECT * FROM s1 INNER JOIN s2 ON s1.key1 = s2.key1 WHERE s1.common_field = 'a';
```

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20240227173910089.png)

### Extra⭐️

顾名思义，Extra列是用来说明一些额外信息的，我们可以通过这些额外信息来更准确的理解MySQL到底将如何执行给定的查询语句，也是很重要的一列。主要有以下值：

- `Using index`：查询的列被索引覆盖，也就是使用了覆盖索引，会很快。
- `Using where`：表明使用了 where 过滤。
- `Using where Using index`：查询的列被索引覆盖，但是不是索引的前导列（第一列）。
- `NULL`：查询的列未被索引覆盖，并且where筛选条件是索引的前导列。即用到了索引，但还不够，需要回表（先拿到id，通过id再查一遍）
- `Using index condition`：查询的列不完全被索引覆盖，where条件中是一个前导列的范围
- `Using temporary`：用到了临时表，比如去重，分组。
- `Using filesort`：排序列未创建索引。
- `Using join buffer (Block Nested Loop)`：关联查询时，当被驱动表没有索引时，MySQL一般会为其分配一块名叫`join buffer`的内存块来加快查询速度，也就是我们所讲的基于块的嵌套循环算法。

> 哈希连接适用于大型数据集的连接操作，性能较高，但消耗内存较多；
>
> 而循环嵌套连接适用于内存有限或小型数据集的情况，性能可能更好。

```sql
EXPLAIN SELECT * FROM s1 INNER JOIN s2 ON s1.common_field = s2.common_field;

# 默认 256kb
SET SESSION join_buffer_size = size;
```

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20240227192221429.png)

还会有比如`No tables used`（没有from子句）等等。

### 总结

ok，EXPLAIN的所有列就已经聊完了，小结一下：

| 列名               | 含义             |
| :----------------- | :--------------- |
| **id**             | 执行顺序         |
| **select\_type**   | 查询类型         |
| **table**          | 用到的表         |
| **partitions**     | 用到的分区       |
| **type**           | 访问类型         |
| **possible\_keys** | 可能用到的索引   |
| **key**            | 真实用到的索引   |
| **key\_len**       | 索引用到的字节数 |
| **ref**            | 与索引列匹配的值 |
| **rows**           | 估计扫描的行数   |
| **filtered**       | 筛选比           |
| **Extra**          | 额外补充信息     |

## 最后

![image-20220102140049223](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220102140049223.png)



# Mysql调优那点事儿

大家好，我是一条，一个梦想弃码从文的程序员。

上篇文章，我们聊了如何看懂MySQL的执行计划，不知道大家还记得多少，忘了的赶紧去复习一下。

本篇文章开始上正菜，聊聊SQL优化那点事。

总的来说，优化方向有以下几点：

1. 数据库设计优化

2. 索引优化

3. sql查询优化

4. 分库分表优化

5. 集群架构优化

6. 服务配置优化

其成本和对应的效果如下图所示：

   ![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/20230831154320.png)

## 数据库设计优化

>说白了就是表怎么建，即使最简单的crud，表建的不好，写起来也是贼恶心，接口超时也是经常发生。
>
>经济基础决定上层建筑，但是在实际开发中，建表一般都由组长完成，少了很多练手的机会，所以就拿出来和大家聊聊。

### int(2)是占两个字节吗

https://blog.csdn.net/a517690655/article/details/82767629

### varchar(50)、varchar(500)、char 的区别





#### 数据类型

- 整数：`tinyint、int、bigint`

  选择格式的类型，`int(2)`是没有用的

- 实数：`float、double、decimal`

  精度

- 字符串

  

- 时间：`datatime、timestamp`

  时区、范围

- 日期：`data、time`

timestamp 

1970-01-01~2038-01-19



实例数据库库下载：https://downloads.mysql.com/docs/sakila-db.zip 

## 索引优化



## SQL语句优化

   



### join 优化

> join 优化仅限于百万以下的表，目前实际开发一个表的数据很容易就超过百万，所以都强制单表查询，所以实际用到的不多，但需要了解。

**优化思路**

总结一句话：**小结果集驱动大结果集**。

- 结果集：满足查询条件的记录行数。
- 驱动表：主表，内连接时由 Mysql  的优化器自主选择，这个会收到联接字段上的索引的影响，因为主表需要按行扫描，索引就无意义，所以不会选择有索引的表作为驱动表。

**join 算法**

循环嵌套联接算法：





**join buffer**

默认 256 k，诞生于 MySQL 8 以后，通过缓存区一次性读多条数据进行遍历。

```sql
-- 设置 buffer 大小

```





### order by 分组优化



### group by 分组优化

分组优化的思路：

```sql
select @@version;
```



### 怎样避免写出慢sql

https://b.geekbang.org/member/course/detail/211555

**定量认识 MySQL**

理论上一台 MySQL 数据库，大致处理能力的极限是，每秒一万条左右的简单 SQL，这里的“简单 SQL”，指的是类似于主键查询这种不需要遍历很多条记录的 SQL。根据服务器的配置高低，实际的 TPS 还要上下浮动。

实际生产，一般一台 MySQL 服务器，平均每秒钟执行的 SQL 数量在几百左右，就已经是非常繁忙了，即使看起来 CPU 利用率和磁盘繁忙程度没那么高，你也需要考虑给数据库“减负”了。

到底多慢的 SQL 才算慢 SQL？

你在编写一条查询语句的时候，可以依据你要查询数据表的数据总量，估算一下这条查询大致需要遍历多少行数据。如果遍历行数在百万以内的，只要不是每秒钟都要执行几十上百次的频繁查询，可以认为是安全的。

遍历数据行数在几百万的，查询时间最少也要几秒钟，你就要仔细考虑有没有优化的办法。

遍历行数达到千万量级和以上的，我只能告诉你，这种查询就不应该出现在你的系统中。当然我们这里说的都是在线交易系统，离线分析类系统另说。

**分析 SQL 执行计划**





### 如何优化超大的分页查询

https://zhuanlan.zhihu.com/p/279863859



### 批量插入

```properties
rewriteBatchedStatements=true  
# JDBC 会将尽可能多的查询打包到单个网络数据包中，从而降低网络开销。

# 举例
jdbc:mysql://数据库地址/数据库名?useUnicode=true&characterEncoding=UTF8&allowMultiQueries=true&rewriteBatchedStatements=true
```

## 分库分表优化

## 集群架构优化

## 服务配置优化





## 总结

>- 优化更需要优化的sql
>- 定位性能瓶颈
>- 用explain查看执行计划
>
>
>
>- 永远用小结果集驱动大结果集
>
>大于百万级别的表不适用于join。
>
>什么是驱动表：筛选出的行数少的表
>
>Nest Loop join 循环嵌套算法
>
>减少外层循环的次数
>
>内层增加索引
>
>增大 join buffer
>
>- 禁用复杂的join和子查询
>- 尽可能在索引中排序
>- 慎用order by、group by、distinct
>- 只取自己需要的列
>- 使用最有效的过滤条件
>- 合理设计并使用索引，避免失效
>
>









# 企业开发规范

**命名规范**

数据库，表，字段名采用小写字母，数字，下划线，名称必须具有实际意义

数据库，表，字段名不允许使用MySQL关键字

数据库，表，字段名长度不超过30个字符

临时表以tmp_表名_日期命名

备份表以bak_表名_日期命名

索引名必须以idx_字段名命名，唯一索引以uk_字段名命名，联合索引多个字段以"_"分割

主键字段名必须为id

不同MySQL实例的数据库名不能相同（不包含系统库）

不同表中存储相同数据的字段名和类型必须一致

数据库名称应该能区分不同环境

**设计规范**

使用innodb存储引擎

使用utf8mb4字符集，字符集在实例级设置，创建库、表不需要指定字符集

表必须有主键，主键字段名称id，数据类型int，自增，不允许联合主键

表，字段必须有注释

所有字段建议设置not null

使用varchar存储字符类型数据，长度建议不超过500

使用datetime存储日期时间类型数据

使用decimal或int存储金额类数据，不允许使用double或float

不建议使用text/blob类型，如确有需求，应单独建立扩展表

不允许使用ENUM类型

不允许使用外键

不允许建立预留字段

不允许使用视图，存储过程，触发器等

不建议使用唯一索引，由程序保证唯一性

不建议使用分区表，使用水平分表方式替代

建议单个实例库数量不超过10个（不包含系统库）

建议单个库表数量不超过200

建议单张表字段数不超过50

建议单张表上索引数量不超过6个，联合索引不超过4个字段

避免冗余索引，重复索引

频繁更新的列不建议建立索引

连接不同库要使用不同账号，禁止跨库权限

数据库账号一般只赋予select，update，insert，delete权限

**操作规范**

禁止select *，必须指定字段

禁止insert select 方式

insert语句必须带有字段列表

禁止不带where条件的select，update，delete，where条件字段必须有索引，建议通过主键id进行操作

不允许3张表以上的join

join字段必须有索引

禁止like '%%' 模糊查询

不允许使用存储过程

where条件中字段不允许使用表达式或函数，避免索引失效

where条件中=两端数据类型必须一直，避免隐式转换

避免大事务操作，每个事务更新行数限制在200行以内

避免使用不等于、not

union all代替union

同一列使用in替代or，in操作的数值不超过200个

非必要不使用order by，排序字段应有索引

使用join替代子查询

拆分复杂大SQL为多个小SQL

禁止线下连接线上数据库
禁止程序代码中运行ddl
禁止在数据库中存储明文密码
数据库只负责存取数据，禁止数据库中处理业务逻辑



