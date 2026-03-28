# 字段注解

## 逻辑删除

```java
		/**
     * 是否有效：1-有效；0-无效
     */
    @TableLogic(value = "1", delval = "0")
    private Integer isValid;
```

- 将删除改为 56 修改
- 每次查询时自动添加`where is_valid = 1`
- 修改时自动过滤到无效的数据

**全局配置**

```yaml
mybatis-plus:
  global-config:
    db-config:
      logic-delete-field: flag  # 全局逻辑删除的实体字段名(since 3.3.0,配置后可以忽略不配置步骤2)
      logic-delete-value: 1 # 逻辑已删除值(默认为 1)
      logic-not-delete-value: 0 # 逻辑未删除值(默认为 0)

```

## id自动填充

```java
    /**
     * 主键-使用雪花算法
     */
    @TableId(type = IdType.ASSIGN_ID)
    private Long id;
```

**IdType**

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20230403112356338.png)



## 属性自动填充

**注解指定哪些值需要自动填充，及触发自动填充的操作**

```java
    /**
     * 创建时间
     */
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createDate;
    
        /**
     * 更新人名称
     */
    @TableField(fill = FieldFill.INSERT_UPDATE, jdbcType = JdbcType.VARCHAR)
    private String updateName;
```

**配置自动赋值**

```java
public class MybatisPlusMetaObjectHandler implements MetaObjectHandler {
    private static final Logger log = LoggerFactory.getLogger(MybatisPlusMetaObjectHandler.class);

    public MybatisPlusMetaObjectHandler() {
    }

    private static void fillValIfNullByName(String fieldName, Object fieldVal, MetaObject metaObject, boolean isCover) {
        if (metaObject.hasSetter(fieldName)) {
            Object userSetValue = metaObject.getValue(fieldName);
            String setValueStr = StrUtil.str(userSetValue, Charset.defaultCharset());
            if (!StrUtil.isNotBlank(setValueStr) || isCover) {
                Class<?> getterType = metaObject.getGetterType(fieldName);
                if (ClassUtils.isAssignableValue(getterType, fieldVal)) {
                    metaObject.setValue(fieldName, fieldVal);
                }

            }
        }
    }

    public void insertFill(MetaObject metaObject) {
        log.debug("mybatis plus start insert fill ....");
        LocalDateTime now = LocalDateTime.now();
        fillValIfNullByName("createDate", now, metaObject, false);
        fillValIfNullByName("updateDate", now, metaObject, false);
        fillValIfNullByName("createBy", this.getUserId(), metaObject, false);
        fillValIfNullByName("updateBy", this.getUserId(), metaObject, false);
        fillValIfNullByName("updateName", this.getUserName(), metaObject, false);
        fillValIfNullByName("createName", this.getUserName(), metaObject, false);
    }

    public void updateFill(MetaObject metaObject) {
        log.debug("mybatis plus start update fill ....");
        fillValIfNullByName("updateDate", LocalDateTime.now(), metaObject, true);
        fillValIfNullByName("updateBy", this.getUserId(), metaObject, true);
        fillValIfNullByName("updateName", this.getUserName(), metaObject, false);
        fillValIfNullByName("updateName", this.getUserName(), metaObject, false);
    }

    private String getUserName() {
        return Objects.isNull(UserContext.getUser()) ? "" : UserContext.getUser().getName();
    }

    private Long getUserId() {
        return Objects.isNull(UserContext.getUser()) ? -1L : UserContext.getUser().getId();
    }
}
```

## 枚举处理

```java
@TableField(typeHandler = EnumValuesTypeHandler.class)
private List<String> applicableVersion;
```



## 乐观锁

`@Version` 描述：乐观锁注解、标记 @Verison 在字段上。在更新的时候，它会带上该条件

```sql
线程1: update ... from xxx set version = version + 1 where version=x
线程2: update ... from xxx set version = version + 1 where version=x
```

# 拦截器(插件)

拦截sql对其动态的修改数据适用于分表场景。



# 自定义批量插入接口

哈喽，大家好，我是一条。

相信大家都用过 Mybati-Plus ，啊哈哈，属实是好用，写起来代码那叫一个丝滑。

```java
List<ZoneReportPO> zoneReportPOList = zoneReportMapper.selectList(
                Wrappers.lambdaQuery(ZoneReportPO.class)
                        .eq(StringUtils.isNotBlank(reportTime), ZoneReportPO::getReportTime, reportTime));
```

配上函数式编程，美得很。

但是！它在批量插入这里有个坑：

```java
@Service
public class CommerceUserService extends ServiceImpl<CommerceUserMapper, CommerceUser> {
    
    public boolean batchInsert(List<CommerceUser> list) {
        return super.saveBatch(list);
    }
}
```

这里有一个帮我们实现好的批量插入方法，看起来挺方便哈，可仔细一看，这货还是一条一条插入的。

```java
return !CollectionUtils.isEmpty(list) && executeBatch(entityClass, log, (sqlSession) -> {
    int size = list.size();
    int i = 1;

    for(Iterator var6 = list.iterator(); var6.hasNext(); ++i) {
        E element = var6.next();
        consumer.accept(sqlSession, element);
        if (i % batchSize == 0 || i == size) {
            sqlSession.flushStatements();
        }
    }

});
```

感兴趣的同学可以看一下源码，同时有个 java8 的新函数式接口 `BiConsumer`，可以学习。

我们不跑题说正事，批量插入怎么搞?我插入1000条数据，访问1000次数据库显然是不行，还要考虑大事务。

没办法，自己写吧！开搞！

## sql注入器

这里我们可以通过继承`DefaultSqlInjector`来注入我们自定义的sql方法。

这里实现了批量插入和修改方法。

```java
public class CustomizedSqlInjector extends DefaultSqlInjector {

    @Override
    public List<AbstractMethod> getMethodList(Class<?> mapperClass) {
        //保留自带方法
        List<AbstractMethod> methodList = super.getMethodList(mapperClass);
        methodList.add(new InsertBatchMethod());
        methodList.add(new UpdateBatchMethod());
        return methodList;
    }

}
```

## InsertBatchMethod

接下来就要把这个方法实现，我觉得哈，下面代码直接复制用就行，都是sql的拼接，没什么好研究的。

注意下返回的"insertBatch"这个id，和接口方法中的方法名要对应上。

```java
@Slf4j
public class InsertBatchMethod extends AbstractMethod {

    @Override
    public MappedStatement injectMappedStatement(Class<?> mapperClass, Class<?> modelClass, TableInfo tableInfo) {
        String sql = "<script>insert into %s %s values %s</script>";
        String fieldSql = prepareFieldSql(tableInfo);
        String valueSql = prepareValuesSql(tableInfo);
        String sqlResult = String.format(sql, tableInfo.getTableName(), fieldSql, valueSql);
        SqlSource sqlSource = languageDriver.createSqlSource(configuration, sqlResult, modelClass);
        return this.addInsertMappedStatement(mapperClass, modelClass, "insertBatch", sqlSource, new NoKeyGenerator(), null, null);
    }

    private String prepareFieldSql(TableInfo tableInfo) {
        StringBuilder fieldSql = new StringBuilder();
        fieldSql.append(tableInfo.getKeyColumn()).append(",");
        tableInfo.getFieldList().forEach(x -> fieldSql.append(x.getColumn()).append(","));
        fieldSql.delete(fieldSql.length() - 1, fieldSql.length());
        fieldSql.insert(0, "(");
        fieldSql.append(")");
        return fieldSql.toString();
    }

    private String prepareValuesSql(TableInfo tableInfo) {
        final StringBuilder valueSql = new StringBuilder();
        valueSql.append("<foreach collection=\"list\" item=\"item\" index=\"index\" open=\"(\" separator=\"),(\" close=\")\">");
        valueSql.append("#{item.").append(tableInfo.getKeyProperty()).append("},");
        tableInfo.getFieldList().forEach(x -> valueSql.append("#{item.").append(x.getProperty()).append("},"));
        valueSql.delete(valueSql.length() - 1, valueSql.length());
        valueSql.append("</foreach>");
        return valueSql.toString();
    }
}
```

## 自定义Mapper

在自定义一个mapper，这样使用的时候就不再继承`BaseMapper`而是我们的`RootMapper`。

```java
public interface RootMapper<T> extends BaseMapper<T> {

    /**
     * 自定义批量插入
     */
    int insertBatch(@Param("list") List<T> list);

    /**
     * 自定义批量更新，条件为主键
     */
    int updateBatch(@Param("list") List<T> list);

}
```



## 内存溢出怎么办？

你以为这就完事大吉了？并不是，因为我们要把所有数据拼接一个 sql，那字符串就会非常的长，内存溢出必不可少了，怎么解决呢？

对于特别大量的数据，我们还是要分多次的批量插入。

引入一个工具类

```xml
<dependency>
    <groupId>com.google.guava</groupId>
    <artifactId>guava</artifactId>
    <version>28.1-jre</version>
</dependency>
```

分组批量插入

```java
List<List<TestBean>> splistList = Lists.partition(testBeans,200);
splistList.forEach(itemList->testMapper.insertBatch(itemList));
```

## 最后

其实这个问题困扰了我很久，如果遇到数据量大，又要实时插入，效率、性能、内存溢出、大事务。都是需要考虑的。

大家还是要要看需求选择合适的方案。



# MyBatis-Plus-Join联表查询

> [官方文档](https://mybatisplusjoin.com/)

## 关键步骤

- 
- 确定主表，基于主表的 sql 去



## pom依赖

```xml
<dependency>
    <groupId>com.github.yulichang</groupId>
    <artifactId>mybatis-plus-join-boot-starter</artifactId>
    <version>1.4.5</version>
</dependency>
```

## Mapper 定义

```java
// 直接继承 MPJBaseMapper 而不再是 BaseMapper
public interface MyMapper  extends MPJBaseMapper<EpcEbomEngine> {

}

public interface MPJBaseMapper<T> extends BaseMapper<T> {
  
}
```

## 案例一

```sql
SELECT t1.material_code,t1.material_name,t1.object_type_code,t.id,t.material_id,t.vendor_id,t.contract_id,t.measure_unit_name,t.measure_unit_code,t.price_unit_name,t.price_unit_code,t.unit_price,t.tax_rate,t.engineering_quantity,t.total_price,t.expense_notes,t.publish_status,t.has_been_published,t.create_date,t.update_date,t.create_by,t.create_name,t.update_by,t.update_name,t.is_valid 
FROM 
epc_supply_material_price_contract t INNER JOIN epc_supply_material t1 
ON (t1.id = t.material_id) 
WHERE (t1.object_type_code LIKE 'MS-%') LIMIT 1
```



```java
MPJLambdaWrapper<MaterialPriceContract> wrapper = JoinWrappers.lambda(MaterialPriceContract.class)
                .select(SupplyMaterial::getMaterialCode, SupplyMaterial::getMaterialName, SupplyMaterial::getObjectTypeCode)
                .selectAll(MaterialPriceContract.class)
                .innerJoin(SupplyMaterial.class, SupplyMaterial::getId, MaterialPriceContract::getMaterialId)
                .likeRight(SupplyMaterial::getObjectTypeCode, queryParam.getObjectTypeCode())
                .like(StrUtil.isNotBlank(nameOrCode), SupplyMaterial::getMaterialCode, nameOrCode)
                .or()
                .like(StrUtil.isNotBlank(nameOrCode), SupplyMaterial::getMaterialName, nameOrCode);
        return priceContractMapper.selectJoinPage(new Page<>(queryParam.getPageNum(), queryParam.getPageSize()),
                MaterialContractPriceVO.class, wrapper);
```



![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20230518111346474.png)









# 多数据源动态切换

如何用 Mybatis-Plus 优雅的实现多数据源动态切换？

哈喽，大家好，我是一条。

今天聊聊如何动态切换数据源，简单点说，就是一个服务配置多个数据库，在读写分离，分库分表都有应用。

假设有个用户表，，根据 id 水平分库分表，id为偶数，存在一个库，id为奇数存在另一个库，如何实现根据id查询用户详细的接口？

一块来看一下吧！

## 准备工作

1.一个 SpringBoot + Mybatis-Plus 的项目，我是用以前的联手项目改造的。本文不赘述建项目的过程。

2.准备两个库和用户表，sql 如下:

```sql
create table t_commerce_user
(
    id          bigint auto_increment comment '自增主键'
        primary key,
    username    varchar(64)   default ''                    not null comment '用户名',
    password    varchar(256)  default ''                    not null comment 'MD5 加密之后的密码',
    extra_info  varchar(1024) default ''                    not null comment '额外的信息',
    create_time datetime      default '0000-01-01 00:00:00' not null comment '创建时间',
    update_time datetime      default '0000-01-01 00:00:00' not null comment '更新时间',
    balance     bigint        default 0                     not null comment '余额',
    constraint username
        unique (username)
)
    comment '用户表_分表_1' charset = utf8;
    
INSERT INTO cloud_commerce_0.t_commerce_user (id, username, password, extra_info, create_time, update_time, balance) VALUES (2, 'test2', 'test', '{}', '2022-06-20 17:23:18', '2022-06-20 17:23:18', 0);
INSERT INTO cloud_commerce_0.t_commerce_user (id, username, password, extra_info, create_time, update_time, balance) VALUES (4, 'test4', 'test', '{}', '2022-06-20 17:23:18', '2022-06-20 17:23:18', 0);
INSERT INTO cloud_commerce_0.t_commerce_user (id, username, password, extra_info, create_time, update_time, balance) VALUES (6, 'test6', 'test', '{}', '2022-06-20 17:23:18', '2022-06-20 17:23:18', 0);
INSERT INTO cloud_commerce_0.t_commerce_user (id, username, password, extra_info, create_time, update_time, balance) VALUES (8, 'test8', 'test', '{}', '2022-06-20 17:23:18', '2022-06-20 17:23:18', 0);
INSERT INTO cloud_commerce_0.t_commerce_user (id, username, password, extra_info, create_time, update_time, balance) VALUES (10, 'test10', 'test', '{}', '2022-06-20 17:23:18', '2022-06-20 17:23:18', 0);
```

运行完成这个样子就行：

![image-20220817165049961](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220817165049961.png)

## 配置和依赖

Mybatis-Plus 的多数据源需要再添加一个依赖：

```xml
 <!--动态数据源-->
        <dependency>
            <groupId>com.baomidou</groupId>
            <artifactId>dynamic-datasource-spring-boot-starter</artifactId>
            <version>3.5.1</version>
        </dependency>
```

数据源配置

```yml
server:
  port: 6001
  servlet:
    context-path: /commerce-user
spring:
  application:
    name: cloud-commerce-user
  datasource:
    # 动态数据源
    dynamic:
      primary: master
      strict: false
      datasource:
        master:
          url: jdbc:mysql://1.0.0.0:3306/cloud_commerce?autoReconnect=true&useUnicode=true&characterEncoding=utf8&useSSL=false
          username: root
          password: 123
          type: com.zaxxer.hikari.HikariDataSource
          driver-class-name: com.mysql.cj.jdbc.Driver
        slave0:
          url: jdbc:mysql://1.0.0.0:3306/cloud_commerce_0?autoReconnect=true&useUnicode=true&characterEncoding=utf8&useSSL=false
          username: root
          password: 23
          type: com.zaxxer.hikari.HikariDataSource
          driver-class-name: com.mysql.cj.jdbc.Driver
        slave1:
          url: jdbc:mysql://1.0.0.0:3306/cloud_commerce_1?autoReconnect=true&useUnicode=true&characterEncoding=utf8&useSSL=false
          username: root
          password: 123
          type: com.zaxxer.hikari.HikariDataSource
          driver-class-name: com.mysql.cj.jdbc.Driver
    # 连接池
    hikari:
      maximum-pool-size: 8
      minimum-idle: 4
      idle-timeout: 30000
      connection-timeout: 30000
      max-lifetime: 45000
      auto-commit: true
      pool-name: ImoocEcommerceHikariCP


mybatis-plus:
  configuration:
    log-impl: org.apache.ibatis.logging.stdout.StdOutImpl
  mapper-locations: classpath:*/mapper/*.xml
```

master、slave0、slave1 可以自己定义名字。

## 基于注解的切换

Mybatis-Plus 提供了非常好用的注解来切换数据源，可以加在类或方法上。`@DS("dsName")`

- 测试空格 宽度 556 非常宽

**UserService**

做数据源策略和业务逻辑代码

```java
@Service
@Slf4j
@RequiredArgsConstructor
public class UserService {
    private final CommerceUserMapper userMapper;

    private final UserDsService userDsService;

    public CommerceUser getUserById(String id) {
      
        return Long.parseLong(id) % 2 == 0
                ? userDsService.getUserByIdWithDbKey0(id)
               : userDsService.getUserByIdWithDbKey1(id);

    }
}
```

**UserDsService**

真正切换数据源的类

```java
@Service
@Slf4j
@RequiredArgsConstructor
public class UserDsService {

    private final CommerceUserMapper userMapper;

    @DS("slave0")
    public CommerceUser getUserByIdWithDbKey0(String id) {
        return userMapper.selectById(id);
    }

    @DS("slave1")
    public CommerceUser getUserByIdWithDbKey1(String id) {
        return userMapper.selectById(id);
    }
}
```

> 注意：这两个类一定要分开，类似事务注解，采用的代理，不分开会失效。

## 测试

启动项目，先看下日志的变化：

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220817171510034.png)

数据源都添加进来了，看看能不能切换呢？

查询个奇数，再查个偶数，都有结果，说明 ert 可以切换：

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220817171721200.png)

## 如何更优雅？

看到这是不是以为本文已经结束了。

现在思考，假如我们有10个库（夸张了有点），UserService 一共10个方法，都需要分库，以前只需要写10个方法，现在得多写100个方法，这也太不优雅了，这得把人逼疯。

怎么解决呢？

不写注解就好了，全部动态编码，不管多少库，还是一个service，只是加一段逻辑判断。

简单点说就是把注解做的事，我们 在代码里自己写。

## @DS做了什么

这里简单说下背后的原理。

首先，项目启动的时候，把配置文件里数据源配置加载进来，存在一个map里，key就是我们自定义的master、slave0。

再真正执行查询前，会有一个拦截器，把注解的value，也就是数据源的key，存储到一个ThreadLocal里，用栈存储。

获取数据库连接的时候，直接拿栈顶的数据集配置，这样就正好是我们配置的。

最后记得清空ThreadLocal，防止内存泄漏。

先看代码：

```java
public CommerceUser getUserById(String id) {

        DynamicDataSourceContextHolder.push(String.format("slave%s", Long.parseLong(id) % 2));
        CommerceUser user = userMapper.selectById(id);
        DynamicDataSourceContextHolder.clear();

        return user;
    }
```

简直太tm优雅了！

> 关于这块详细的源码分析参考：https://blog.csdn.net/labulaka24/article/details/125957908



# 用Redis作为Mybatis的二级缓存

如何优雅的用Redis作为Mybatis的二级缓存？

哈喽，大家好，我是一条。

今天在开发时发现一个奇怪的问题，我手动改完数据库竟然不生效，反复确认环境无误后猜测是缓存的问题，因为是新接手的项目，代码还不熟悉，仔细一看，是开启了二级缓存，并且存入Redis。

那今天就聊聊怎么优雅的用Redis作为Mybatis的二级缓存。

## 要优雅就选择Mybatis-Plus

关于Mybatis-Plus的基础设置就不多做介绍了，只说和二级缓存有关的。

首先在配置文件开启二级缓存。

```yml
mybatis-plus:
  configuration:
    log-impl: org.apache.ibatis.logging.stdout.StdOutImpl
    cache-enabled: true   # 开启二级缓存
  mapper-locations: classpath:*/mapper/*.xml
```

## Redis配置

这部分就是Redis的基本用法：

```yml
  redis:
    host: 101.411.160.111
    database: 0
    port: 6311
    password: 1111111
```

配置RedisTemplate

```java
@Configuration
public class RedisConfig {
    /**
     * 设置系列化方式、事务等配置
     */
    @Bean
    public RedisTemplate<String, Serializable> redisTemplate(LettuceConnectionFactory lettuceConnectionFactory)
    {
        RedisTemplate<String,Serializable> redisTemplate = new RedisTemplate<>();

        redisTemplate.setConnectionFactory(lettuceConnectionFactory);
        //设置key序列化方式string
        redisTemplate.setKeySerializer(new StringRedisSerializer());
        //设置value的序列化方式json
        redisTemplate.setValueSerializer(new GenericJackson2JsonRedisSerializer());

        redisTemplate.setHashKeySerializer(new StringRedisSerializer());
        redisTemplate.setHashValueSerializer(new GenericJackson2JsonRedisSerializer());

        redisTemplate.afterPropertiesSet();

        return redisTemplate;
    }
}

```

## 自定义Mybatis缓存

我们只需要实现`Cache`这个接口。

```java
@Slf4j
public class MybatisRedisCache implements Cache {
    private static final String COMMON_CACHE_KEY = "mybatis";
    // 读写锁
    private final ReadWriteLock readWriteLock = new ReentrantReadWriteLock(true);

    private final RedisTemplate<String, Object> redisTemplate;

    private final String nameSpace;

    public MybatisRedisCache(String nameSpace) {
        if (nameSpace == null) {
            throw new IllegalArgumentException("Cache instances require an ID");
        }
        redisTemplate = SpringUtil.getBean("redisTemplate");
        this.nameSpace = nameSpace;
    }

    @Override
    public String getId() {
        return this.nameSpace;
    }

    private String getKeys() {

        return COMMON_CACHE_KEY + "::" + nameSpace + "::*";
    }

    private String getKey(Object key) {
        return COMMON_CACHE_KEY + "::" + nameSpace + "::" + DigestUtils.md5Hex(String.valueOf(key));
    }

    @Override
    public void putObject(Object key, Object value) {
        redisTemplate.opsForValue().set(getKey(key), value, 10, TimeUnit.MINUTES);
    }

    @Override
    public Object getObject(Object key) {
        try {
            return redisTemplate.opsForValue().get(getKey(key));
        } catch (Exception e) {
            e.printStackTrace();
            log.error("缓存出错 ");
        }
        return null;
    }

    @Override
    public Object removeObject(Object o) {
        Object n = redisTemplate.opsForValue().get(getKey(o));
        redisTemplate.delete(getKey(o));
        return n;
    }

    @Override
    public void clear() {
        Set<String> keys = redisTemplate.keys(getKeys());
        if (CollectionUtil.isNotEmpty(keys)) {
            assert keys != null;
            redisTemplate.delete(keys);
        }
    }

    @Override
    public int getSize() {
        Set<String> keys = redisTemplate.keys(getKeys());
        if (CollectionUtil.isNotEmpty(keys)) {
            assert keys != null;
            return keys.size();
        }
        return 0;
    }

    @Override
    public ReadWriteLock getReadWriteLock() {
        return this.readWriteLock;
    }
}
```

## 测试

1.第一次查询，走数据库，并写入缓存。

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/20230619103430.png)

看看Redis的记录：

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/20230619103430.png)

2.第二次查询，直接走缓存

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/20230619103430.png)

3.重启项目，依然可以直接查缓存

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/20230619103430.png)

## 缓存命中率（Cache Hit Ratio）

不知道有没有细心的同学注意到这样一行日志：

```
Cache Hit Ratio [com.yitiao.mapper.ArticleMapper]: 0.5
```

最后这个0.5就是缓存命中率，代表一共查询两次，命中一次缓存一次。

## 一级缓存和二级缓存

**一级缓存**

一级缓存 Mybatis 的一级缓存是指 SQLSession，一级缓存的作用域是 SQlSession , Mabits 默认开启一级缓存。 在同一个SqlSession中，执行相同的SQL查询时；第一次会去查询数据库，并写在缓存中，第二次会直接从缓存中取。 当执行SQL时候两次查询中间发生了增删改的操作，则SQLSession的缓存会被清空。

每次查询会先去缓存中找，如果找不到，再去数据库查询，然后把结果写到缓存中。 Mybatis的内部缓存使用一个HashMap，key为hashcode+statementId+sql语句。Value为查询出来的结果集映射成的java对象。 SqlSession执行insert、update、delete等操作commit后会清空该SQLSession缓存。

**二级缓存**

二级缓存 二级缓存是 mapper 级别的，Mybatis默认是没有开启二级缓存的。 第一次调用mapper下的SQL去查询用户的信息，查询到的信息会存放到该 mapper 对应的二级缓存区域。 第二次调用 namespace 下的 mapper 映射文件中，相同的sql去查询用户信息，会去对应的二级缓存内取结果。

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/20230619103430.png)

## 什么时候该开启二级缓存

说实话，我遇到开启二级缓存的时候并不多，因为缓存有利也有弊。

我的建议是如果发现接口耗时严重，可以在线上开启二级缓存，开发环境关掉，为什么呢？

就拿今天我遇到的事来说，开发直接改库不能立即生效，就很烦。





