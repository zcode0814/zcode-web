## 行转列

先准备一个测试表

```sql
-- 行列转换
CREATE TABLE tb_score(
    id INT(11) NOT NULL auto_increment,
    userid VARCHAR(20) NOT NULL COMMENT '用户id',
    subject VARCHAR(20) COMMENT '科目',
    score DOUBLE COMMENT '成绩',
    PRIMARY KEY(id)
)ENGINE = INNODB DEFAULT CHARSET = utf8 comment '行列转换测试';

INSERT INTO tb_score(userid,subject,score) VALUES ('001','语文',90);
INSERT INTO tb_score(userid,subject,score) VALUES ('001','数学',92);
INSERT INTO tb_score(userid,subject,score) VALUES ('001','英语',80);
INSERT INTO tb_score(userid,subject,score) VALUES ('002','语文',88);
INSERT INTO tb_score(userid,subject,score) VALUES ('002','数学',90);
INSERT INTO tb_score(userid,subject,score) VALUES ('002','英语',75.5);
INSERT INTO tb_score(userid,subject,score) VALUES ('003','语文',70);
INSERT INTO tb_score(userid,subject,score) VALUES ('003','数学',85);
INSERT INTO tb_score(userid,subject,score) VALUES ('003','英语',90);
INSERT INTO tb_score(userid,subject,score) VALUES ('003','政治',82);


select * from tb_score;

-- 行转列
-- 1.case when then else end
select userid,sum(case subject when '语文' then score else 0 end) as '语文' from tb_score group by userid;
-- 2.if
select userid,sum(if(subject = '语文',score,0)) as '语文' from tb_score group by userid;
-- 3.GROUP_CONCAT
SELECT userid,GROUP_CONCAT(`subject`,':',score)AS 成绩 FROM tb_score GROUP BY userid;


```

**补充：UNION与UNION ALL的区别（摘）**

- 对重复结果的处理：UNION会去掉重复记录，UNION ALL不会；

- 对排序的处理：UNION会排序，UNION ALL只是简单地将两个结果集合并；

- 效率方面的区别：因为UNION 会做去重和排序处理，因此效率比UNION ALL慢很多；



## 批量替换

```sql
UPDATE `bms_bms`.cbim_ent_department
SET code = regexp_replace(code, '[[:punct:][:space:]]', '');
```



## 利用binlog恢复日志

https://blog.csdn.net/weixin_63946253/article/details/128084812



## JSON 查询

`epc_measure.measure_unit`的 json 结构

```
{"code":"CalculatingUnit_1","label":"土建","value":"土建"}
```

需要查询满足 code 在给定集合中所有数据，sql 如下：

```sql
-- 方式一
SELECT *
FROM epc_measure
WHERE JSON_EXTRACT(measure_unit, '$.code')
IN ('CalculatingUnit_1', 'CalculatingUnit_2');

-- 方式二
SELECT *
FROM (
    SELECT *, JSON_EXTRACT(measure_unit, '$.code') AS unit_code
    FROM epc_measure
) AS subquery
WHERE unit_code IN ('CalculatingUnit_1', 'CalculatingUnit_2');
```

针对方式一给出  Mybatis Plus 写法：

```java
List<String> codes = Arrays.asList("CalculatingUnit_1", "CalculatingUnit_2");
LambdaQueryWrapper<EpcMeasure> lambdaQueryWrapper = new LambdaQueryWrapper<>();
lambdaQueryWrapper.apply(
            "JSON_EXTRACT(measure_unit, '$.code') IN (" +
            codes.stream().map(code -> "'" + code + "'").collect(Collectors.joining(",")) + 
            ")"
         );
List<EpcMeasure> list = epcMeasureMapper.selectList(lambdaQueryWrapper);

// 占位符写法
measureLambdaQueryWrapper.apply(
  "JSON_CONTAINS(building_use,JSON_OBJECT('code', {0}))", 
  buildingUseCode
);

```

## no full group by

> https://mp.weixin.qq.com/s/GsRl7mcirGd3xdxfEUgbEQ

**问题描述**

在mysql 5.7.5 版本及以上版本会出现的问题。

当执行`group by`时，select 的字段不属于 group by 的字段的话，sql 语句就会报错。报错信息如下：

```
Expression #1 of SELECT list is not in GROUP BY clause and contains
nonaggregated column ‘数据库名.表名.字段名’ which is not functionally dependent
on columns in GROUP BY clause; this is incompatible with
sql_mode=only_full_group_by
```

**报错原因**

从错误信息不难看出，是 `sql_mode`的设置问题，默认就是要严格字段的匹配。

```sql
-- 查看 mysql 版本
SELECT VERSION();
-- 查看 sql_mode 模式
select @@GLOBAL.sql_mode;
```

**解决方式**

1. 使用函数[ANY_VALUE()](https://dev.mysql.com/doc/refman/5.7/en/miscellaneous-functions.html#function_any-value)包裹报错字段

```sql
SELECT ANY_VALUE(ID),USER_ID,ANY_VALUE(problems),ANY_VALUE(last_updated_date) FROM  t_iov_help_feedback GROUP BY USER_ID;
```

2. 修改 `sql_mode`

- 临时修改，重启数据库会失效：

`SET @@global.sql_mode ='STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';`

- 永久修改：

编辑my.cnf文件，文件地址一般在：/etc/my.cnf，/etc/mysql/my.cnf

使用vim命令编辑文件，找到sql-mode的位置，去掉ONLY_FULL_GROUP_BY，然后重启MySQL。

有的my.cnf中可能没有sql-mode，需要追加：`sql-mode=STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION`

修改成功后重启MySQL服务。



## 数据迁移

如果MySQL实例上有多个数据库，你可以通过修改备份和恢复的步骤，以及配置主从复制的方式来实现批量同步全部库：

1. 批量备份所有数据库：
   使用mysqldump命令备份所有数据库：
   ```shell
   mysqldump -u 用户名 -p 数据库名 > 备份文件名.sql
   mysqldump -u 用户名 -p --all-databases > 备份文件名.sql
   ```
   
2. 将备份文件传输到从服务器上：
   同样使用scp命令或其他方式将备份文件传输到从服务器上。

3. 在从服务器上恢复备份数据：
   在从服务器上恢复所有数据库的数据：
   ```shell
   mysql -u 用户名 -p 数据库名 < 备份文件名.sql
   mysql -u 用户名 -p < 备份文件名.sql
   ```
   
4. 传输文件到容器内：https://www.cnblogs.com/fsong/p/11335251.html

