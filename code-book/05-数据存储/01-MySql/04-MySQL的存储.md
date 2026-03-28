## 行记录

> 数据页结构
> 行记录部分，前面是记录头信息，后面是真实数据
> 记录头信息标志是否删除，不是直接删除，而是可以通过主键id复用空间，用一个链表存储
> 行记录之间用链表相连，指向真实数据的起点。同时每天记录按照id大小编号
> 预先有两条记录，最大和最小，编号heap no 为0 1

## 数据页

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20221122150309587.png)

- 基本大小16kb
- 分为7个部分，数据行位于User Record部分
- 在数据页初始化的时候，并没有User Record，每当插入新的数据，会将Free Space的空间划给User Record，当Free Space的空间用完之后，就需要开辟新的数据页。

画个图来看一下多条行记录是如何存储的，下图行记录格式为`compact`，共三列，前两列数字，后两列字符串，第一列为主键。

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20221122150723283.png)

1.先看`delete_mask`，代表该行记录是否被删除，innodb的删除操作并不是立即从磁盘删除，因为删除后对剩余记录重新排顺序是要耗时的，所以先标记为已删除，同时维护一个删除链表，在空闲的时候由后台线程异步删除。

2.`heap_no`表示该行记录的位置，从2开始，那0和1去哪了呢？他们就是上面表格中的最大记录和最小记录，每条记录都会按照主键大小排好序。

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20221122151557295.png)

3.`record_type`表示记录的类型，我们插入的数据都是普通类型，用0表示。

4.`next_record`表示当前记录到下一条记录的**真实数据**的偏移量，这不难想到行记录之间是类似链表的形式存储的，那是单向还是双向呢？从最小记录到我们插入的行按照主键从小到大排序再到最大记录，组成了一个单向链表。最大记录的next_recoed是0。

5.为什么要指向真实数据的地址而不是头信息的地址，因为真实数据的地址在一个行记录的中间，进可攻退可守，提高读取的速率。

> 暂时总结一下一个删除操作在行记录间都发生了什么？
>
> - 修改delete_mask,标记为已删除
> - 从单向链表中移除
> - 修改heap_no
>
> 当删除之后再插入相同的id，会复用之间的空间吗？———— 会的





>  Innodb是如何管理这些行记录的呢？

1.文件头部

## 索引













## .ibd文件

innodb的每个表在物理磁盘上的存储包括两个文件：

- .ibd：存放表的数据和索引文件
- .frm：存放表的元数据文件

首先查看文件保存的位置，可以看到以每个数据库命名的文件夹，使用`tree`命令看一下整体结构

```sql
show variables like 'datadir';    
-- datadir,/var/lib/mysql/
```

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20230220101606914.png)

what？`.frm`文件哪去了，表结构信息存哪了？

**.frm 失踪之谜**

8.0版本之后不再单独提供.frm文件，而是合并在.ibd文件中，通过解析Mysql8的`.ibd`文件，可以证明这个事情。

Oracle官方将frm文件的信息以及更多信息移动到叫做序列化字典（Serialized Dictionary Information，SDI），SDI倍写在ibd文件内部。为了从IBD文件中提取SDI信息，Oracle提供了一个应用程序`ibd2sdi`，MySQL8自带了这个工具。

```shell
ibd2sdi --dump-file=sys_user.txt sys_user.ibd 
```

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20230220101325295.png)

**文件结构**

