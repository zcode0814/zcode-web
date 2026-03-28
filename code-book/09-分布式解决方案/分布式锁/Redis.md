全网挖的最深的Redis分布式锁

由库存超卖业务来讲解分布式锁，从单机到多实例再到集群。https://www.xffjs.com/f/article/186.html

> https://ljlazyl.blog.csdn.net/article/details/107891560
>
> TPS QPS 吞吐量

## 单机锁

### 环境搭建

> https://jmeter.apache.org/download_jmeter.cgi   jmeter 下载地址

商品微服务，添加商品表

```sql
-- auto-generated definition
create table t_commerce_goods
(
    id                bigint auto_increment comment '自增主键'
        primary key,
    goods_category    varchar(64)   default ''      not null comment '商品类别',
    brand_category    varchar(64)   default ''      not null comment '品牌分类',
    goods_name        varchar(64)   default ''      not null comment '商品名称',
    goods_pic         varchar(256)  default ''      not null comment '商品图片',
    goods_description varchar(512)  default ''      not null comment '商品描述信息',
    goods_status      int           default 0       not null comment '商品状态',
    price             int           default 0       not null comment '商品价格',
    supply            bigint        default 0       not null comment '总供应量',
    inventory         bigint        default 0       not null comment '库存',
    goods_property    varchar(1024) default ''      not null comment '商品属性',
    create_time       datetime      default (now()) not null comment '创建时间',
    update_time       datetime      default (now()) not null comment '更新时间'
)
    comment '商品表' charset = utf8;


```

### JVM 锁

不和数据库交互，模拟库存扣减。并发测试 100 个线程，访问50次。

```java
private void jvmLock() {
    lock.lock();
    try {
        goods.setInventory(goods.getInventory()-1);
        log.info(goods.getInventory().toString());
    }finally {
        lock.unlock();
    }
}
```

不加锁出现并发问题，因为扣减和 set 不是原子操作，多个线程几乎同时拿到变量，多次扣减其实只减了一次。

> 用 voliate 能解决问题吗？不能，不保证原子性。

```java
    private void mysqlLock() {
        CommerceGoods good = goodsMapper.selectOne(Wrappers.lambdaQuery(CommerceGoods.class)
                .eq(CommerceGoods::getGoodsName, "lock-test")
                .select()
        );
        good.setInventory(good.getInventory()-1);
        goodsMapper.updateById(good);
        log.info(good.getInventory().toString());
    }
```

毫无疑问，同样会出现超卖现象。加锁解决，这是肉眼可见的并发量和吞吐量下降。



### 直接修改

```sql
update table set inventory = (inventory - 1) where id = 1 ;
```

锁范围：行级锁还是表级锁？

- 查询或更新的条件必须是索引字段。
- 查询或更新字段条件必须是具体值。

无法记录日志

无法解决一条商品有多条库存记录

### for udpate 悲观锁

```sql
select * from table where name = productName for update;
```

解决无法记录日志的问题

效率不高，避免使用表锁，出现死锁问题

对多条数据加锁，顺序要一致

> 两个客户端，都开启事务，A先对 id = 1 的记录加锁，B 再对 id = 2 的记录加锁。
>
> A 再对 id = 2 的记录加锁，这时需要等待 B 释放锁。
>
> 而 B 再对 id  = 1 的记录加锁，A，B开始互相等待，造成死锁。

### CAS 乐观锁

```sql
update table set surplus = newQuantity where id = 1 and surplus = oldQuantity ;
```

```java
    private void casLock() {
        int result = 0;
        while (result==0){
            CommerceGoods good = goodsMapper.selectOne(Wrappers.lambdaQuery(CommerceGoods.class)
                    .eq(CommerceGoods::getGoodsName, "lock-test")
                    .select());
            Long inventory = good.getInventory();
            int version = good.getVersion;
            good.setInventory(good.getInventory()-1);
            good.setVersion(version + 1);
            result = goodsMapper.update(good,Wrappers.lambdaUpdate(CommerceGoods.class)
                    .eq(CommerceGoods::getInventory,inventory)
                    //.eq(CommerceGoods::getVersion,good.getVersion)
                 );
        }
    }
```

以上代码存在ABA问题，需要引入 版本号。`.eq(CommerceGoods::getVersion,good.getVersion)`。

高并发下因为一直循环等待且访问数据库，吞吐量极低，浪费 CPU 资源。

读写分离情况下，乐观下不可靠。（主的 binlog 复制到从的 relay（中继） 日志，4次 IO 操作，延迟比较大，无法做到全同步） 

### Redis 乐观锁

基于 Redis watch + 事务(multi exec discard)实现。

> watch : 监听一个或多个 key 的值，如果在事务执行之前 key 的值发生变化，则取消事务的执行。

```java
private void redisWatchLock() {
        redisTemplate.execute(new SessionCallback<Object>() {
            @Override
            public  Object execute(RedisOperations redisOperations) throws DataAccessException {
                redisOperations.watch(LOCK_TEST);

                Long count = (Long) redisTemplate.opsForValue().get(LOCK_TEST);
                if (count!=null && count >0){
                    count = count-1;
                    redisOperations.multi();
                    redisOperations.opsForValue().set(LOCK_TEST,count);
                    List exec = redisOperations.exec();
                    if (CollectionUtil.isEmpty(exec)){
                        redisWatchLock();
                    }
                }
                return null;
            }
        });

    }

```

效率比较低。

### Redis 原子操作

不用加锁就不会出现超卖，而且吞吐量很高。

```java
    private void redisAtomic() {
        redisTemplate.opsForValue().decrement(LOCK_TEST);
        Long count = (Long) redisTemplate.opsForValue().get(LOCK_TEST);
        assert count != null;
        log.info(count.toString());
    }
```

### 本地锁失效

1.多例模式

synchronized 只锁当前对象，信息存放在对象头里。

> spring 默认使用 jdk 的动态代理，spring boot 2.0 以后默认使用 cglid 动态代理。

```java
@Scope(value = "prototype",proxyMode = ScopedProxyMode.TARGET_CLASS)
```

2.事务

提交事务和执行锁的顺序：

```
1、开启事务(Aop)
2、加锁(进入synchronized方法)
3、释放锁(退出synchronized方法)
4、提交事务(Aop)
```

在可重复读隔离级别下，释放锁之后切换到另一个线程来读，无法读到未提交的事务。

解决：在`controller`层加锁。

3.多实例

只要不是在 Mysql 加的锁，都无法解决多实例的问题，如 jvm 锁，redis 原子操作，要解决多实例问题，就需要引入分布式锁。

## 多机

### 多实例+网关搭建

这里用 GateWay 做负载均衡，集合 Nacos 做动态负载均衡，（这部分之前的文章有）

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220831170828846.png)

测试看一下效果`http://localhost:5001/commerce-goods/stock/de`

500 次请求，库存从 5000 变为 4748。

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220831173654293.png)

### 基础分布式锁

> 跨进程、跨服务、跨服务器。独占排它。
>
> 用于超卖问题，==缓存击穿==：一个热点 key 过期，大量请求进入数据库，有了分布式锁，只有抢到锁的请求才能访问数据库。
>
> 分布式锁的关键不是如何加锁，而是如何释放锁？避免出现死锁、释放他人锁等问题。
>

**一个简单的分布式锁实现**

setnx：当 key 不存在时才设置新建，存在时不做任何操作，这是一个原子操作。

setxx: 存在时才修改。

SETEX key seconds value: 设置过期时间。

```java
    private void distributeLockWithRedis() {
        Boolean absent = redisTemplate.opsForValue().setIfAbsent("lock", "good");
        try {
            if (absent!=null&&!absent){
                Thread.sleep(1000);
                distributeLockWithRedis(); // 用循环重试更好，避免栈溢出
            }else {
                Integer count = (Integer) redisTemplate.opsForValue().get(LOCK_TEST);
                if (count!=null && count >0){
                    count = count-1;
                    redisTemplate.opsForValue().set(LOCK_TEST,count);
                }
            }
        }finally {
            redisTemplate.delete("lock");
        }
    }
```

**添加过期时间防止死锁**

解决获取到锁后，还没来得及是方便就挂掉，其他进程就无法再获取锁。

所以获取到锁后需要给 key 设置过期时间，且获取锁和设置过期不能被打断，应该为原子操作。

```shell
set lock value ex 3 nx    # 单位为 秒
```

```java
redisTemplate.opsForValue().setIfAbsent("lock", "good",5000, TimeUnit.MILLISECONDS);
```

那这里就会有一个究极难题，过期时间到底设置多少合适，如果到了过期时间，业务还没执行完怎么办？这就引出了自动续期机制。

### 看门狗自动续期



### 防误删

> 为了防止手动释放锁失败造成死锁，我们会为每个锁设置过期时间，假如进程 A 获取锁，在它没执行完自己的逻辑时，锁到达过期时间自定释放，这时进程 B 获取锁执行自己逻辑，在 B 没结束也没到达过期时间时，A 业务执行完毕，手动释放锁，**这时 A 就释放了 B 的锁**，可以在每个进程加锁时添加一个随机数作为唯一标识，解锁时检验随机数。

**UUID**

```java
    @SneakyThrows
    private void distributeLockWithRedis() {
        String uid = UUID.randomUUID().toString();
        Boolean absent = redisTemplate.opsForValue().setIfAbsent("lock", uid,5000, TimeUnit.MILLISECONDS);
        try {
            if (absent!=null&&!absent){
                Thread.sleep(1000);
                distributeLockWithRedis();  // 栈溢出问题
            }else {
                Integer count = (Integer) redisTemplate.opsForValue().get(LOCK_TEST);
                if (count!=null && count >0){
                    count = count-1;
                    redisTemplate.opsForValue().set(LOCK_TEST,count);
                }
            }
        }finally {
            Object lock = redisTemplate.opsForValue().get("lock");
            if (lock!=null&&lock.toString().equals(uid)){
                redisTemplate.delete("lock");
            }
        }
    }
```

由于上面的判断和删除不是原子操作，依然有可能进程 A 刚判断完是自己的锁，还没来得及删，锁就失效，进程 B 获取锁，这时 A 再往下走，就把 B 的锁删掉了。

Redis 并没有相应的原子指令，不过我们可以使用 Lua 脚本来实现原子操作。（在 Redis 限流章节也介绍过 Lua 脚本的使用）

**如何编写 Lua 脚本？**

> [Lua](https://www.runoob.com/lua/lua-tutorial.html) 是一种轻量小巧的脚本语言，用标准 C 语言编写并以源代码形式开放， 其设计目的是为了嵌入应用程序中，从而为应用程序提供灵活的扩展和定制功能。

Redis 自带对 Lua 脚本的支持，相当于一次发送多条指令，因为 Redis 的单线程执行，指令就会一个接一个的执行下去，不会被打断。

Redis 指令：`EVAL script numkeys key [key ...] arg [arg ...]`

```shell
> eval "local a=5 return a" 0
5
```

**用 Lua 防止误删**

lock.lua

```lua
local key = KEYS[1]
local myUid = ARGV[1]
local uid = redis.call("get",key)

if uid == myUid
then
    return redis.call("del",key)
else
    return 0
end
```

加载 Lua 脚本

```java
@Configuration
public class LockLuaLoader {
    @Bean
    public DefaultRedisScript<Long> limitScript() {
        DefaultRedisScript<Long> redisScript = new DefaultRedisScript<>();
        redisScript.setScriptSource(new ResourceScriptSource(new ClassPathResource("lua/lock.lua")));
        redisScript.setResultType(Long.class);
        return redisScript;
    }
}
```

执行脚本（加锁和解锁）

```java
    @SneakyThrows
    private void distributeLockWithRedis() {
        String uid = UUID.randomUUID().toString();
        Boolean lock = getLock(uid);
        try {
            while (lock!=null&&!lock){
                log.info("[{}]-wait lock",Thread.currentThread().getName());
                Thread.sleep(500);
                lock = getLock(uid);
            }
            CommerceGoods good = goodsMapper.selectOne(Wrappers.lambdaQuery(CommerceGoods.class)
                    .eq(CommerceGoods::getGoodsName, LOCK_TEST)
                    .select()
            );
            good.setInventory(good.getInventory() - 1);
            goodsMapper.updateById(good);
            log.info(good.getInventory().toString());
        }catch (Exception e){
            e.printStackTrace();
        }finally {
            // 防误删
//            unLock(uid);
            unLockWithLua(uid);
        }
    }

    private Boolean getLock(String uid) {
        return redisTemplate.opsForValue().setIfAbsent("lock", uid, 2, TimeUnit.SECONDS);
    }

    private void unLockWithLua(String uid) {
        redisTemplate.execute(lockScript, Collections.singletonList("lock"), uid);
    }
```

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220905163911663.png)

### 可重入锁

> 锁依赖（死锁）问题：
>
> 有两个方法 A 和 B ，请求先进入 A 方法获取到锁，而 A 的方法体里面要执行 B ，而 B 的执行又需要 A 释放锁，由此陷入循环等待，造成死锁。

**ReentrantLock 的可重入锁实现**

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220906095844910.png)

解锁时对 state 次数减1，如果减完 1 是0，说明解锁成功，否则返回 false。

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220906100020265.png)

**基于 Lua 的可重入分布式锁实现**

lock.lua
