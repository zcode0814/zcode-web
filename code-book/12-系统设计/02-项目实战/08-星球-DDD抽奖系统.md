## DDD架构

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20230504180201409.png)



**对应在抽奖系统的项目架构**

DDD结构它是一种充血模型结构，所有的服务实现都以领域为核心，应用层定义接口，领域层实现接口，领域层定义数据仓储，基础层实现数据仓储中关于DAO和Redis的操作，但同时几方又有互相的依赖。

那么这样的结构再开发独立领域提供 http 接口时候，并不会有什么问题体现出来。

但如果这个时候需要引入 RPC 框架，就会暴露问题了，因为使用 RPC 框架的时候，需要对外提供描述接口信息的 Jar 让外部调用方引入才可以通过反射调用到具体的方法提供者，那么这个时候，RPC 需要暴露出来，而 DDD 的系统结构又比较耦合，怎么进行模块化的分离就成了问题点。所以我们本章节在模块系统结构搭建的时候，也是以解决此项问题为核心进行处理的。

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20230504165540418.png)

**系统领域建设**

当各项核心的领域服务开发完成以后，则会在 application 层做服务编排流程处理的开发。例如：从用户参与抽奖活动、过滤规则、执行抽奖、存放结果、发送奖品等内容的链路处理。涉及的领域如下：

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20230505174003131.png)

**领域层项目结构**

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20230505175231712.png)

- model：vo、res、req、aggregates
- respository：和数据库的交互，不涉及业务，相当于mvc的service
- service：业务逻辑

## 表设计

一个满足业务需求的抽奖系统，需要提供抽奖活动配置、奖品概率配置、奖品梳理配置等内容，同时用户在抽奖后需要记录用户的抽奖数据，这就是一个抽奖活动系统的基本诉求。

那么为了满足这个诉求，我们可以提供表包括：

- 活动配置，activity：提供活动的基本配置
- 策略配置，strategy：用于配置抽奖策略，概率、玩法、库存、奖品
- 策略明细，strategy_detail：抽奖策略的具体明细配置
- 奖品配置，award：用于配置具体可以得到的奖品
- 用户参与活动记录表，user_take_activity：每个用户参与活动都会记录下他的参与信息，时间、次数
- 用户活动参与次数表，user_take_activity_count：用于记录当前参与了多少次
- 用户策略计算结果表，user_strategy_export_001~004：最终策略结果的一个记录，也就是奖品中奖信息的内容

### 建表语句

**lottery.sql**

见sql文件

**lottery_01.sql ~ lottery_02.sql**

见sql文件

这些库表是用于支撑起抽奖系统开发的必备表，后续可能会随着功能的开发做适当的调整。

## 抽奖策略算法

### 算法描述

**需求**

在一场营销抽奖活动玩法中，运营人员通常会配置以转盘、盲盒等展现形式的抽奖玩法。例如在转盘中配置12个奖品，每个奖品配置不同的中奖概率，当1个奖品被抽空了以后，那么再抽奖时，是剩余的奖品总概率均匀分配在11个奖品上，还是保持剩余11个奖品的中奖概率，如果抽到为空的奖品则表示未中奖。其实这两种方式在实际的运营过程中都会有所选取，主要是为了配合不同的玩法。

**设计**

那么我们在做这样的抽奖领域模块设计时，就要考虑到库表中要有对应的字段来区分当前运营选择的是什么样的抽奖策略。那么在开发实现上也会用到对应的`策略模式`的使用，两种抽奖算法可以算是不同的抽奖策略，最终提供统一的接口包装满足不同的抽奖功能调用。

### 算法实现

```
场景 A-20% B-30% C-50%
```

- 总体概率：如果A奖品抽空后，B和C奖品的概率按照 3:5 均分，相当于B奖品中奖概率由 0.3 升为 0.375

- 单项概率：如果A奖品抽空后，B和C保持目前中奖概率，用户抽奖扔有20%中为A，因A库存抽空则结果展示为未中奖。为了运营成本，通常这种情况的使用的比较多

**接口定义**

```
public interface IDrawAlgorithm {

    /**
     * SecureRandom 生成随机数，索引到对应的奖品信息返回结果
     *
     * @param strategyId 策略ID
     * @param excludeAwardIds 排除掉已经不能作为抽奖的奖品ID，留给风控和空库存使用
     * @return 中奖结果
     */
    String randomDraw(Long strategyId, List<String> excludeAwardIds);

}
```



## 抽奖流程模板

本章节最大的目标在于把抽奖流程标准化，需要考虑的一条思路线包括：

- 根据入参策略ID获取抽奖策略配置
- 校验和处理抽奖策略的数据初始化到内存
- 获取那些被排除掉的抽奖列表，这些奖品可能是已经奖品库存为空，或者因为风控策略不能给这个用户薅羊毛的奖品
- 执行抽奖算法
- 包装中奖结果

```java
// Lottery/lottery-domain/src/main/java/cn/itedus/lottery/domain/strategy/service
├── algorithm
│   ├── BaseAlgorithm.java
│   ├── IDrawAlgorithm.java
│   └── impl
│       ├── EntiretyRateRandomDrawAlgorithm.java
│       └── SingleRateRandomDrawAlgorithm.java
└── draw
    ├── AbstractDrawBase.java
    ├── DrawConfig.java
    ├── DrawStrategySupport.java
    ├── IDrawExec.java
    └── impl
        └── DrawExecImpl.java
```

**模板方法**

```java
// 模板上层封装了抽象模板，同时将需要的策略配置封装起来
public abstract class AbstractDrawBase extends DrawStrategySupport implements IDrawExec {

    private Logger logger = LoggerFactory.getLogger(AbstractDrawBase.class);

    @Override
    public DrawResult doDrawExec(DrawReq req) {
        // 1. 获取抽奖策略
        StrategyRich strategyRich = super.queryStrategyRich(req.getStrategyId());
        Strategy strategy = strategyRich.getStrategy();

        // 2. 校验抽奖策略是否已经初始化到内存
        this.checkAndInitRateData(req.getStrategyId(), strategy.getStrategyMode(), strategyRich.getStrategyDetailList());

        // 3. 获取不在抽奖范围内的列表，包括：奖品库存为空、风控策略、临时调整等
        List<String> excludeAwardIds = this.queryExcludeAwardIds(req.getStrategyId());

        // 4. 执行抽奖算法
        String awardId = this.drawAlgorithm(req.getStrategyId(), drawAlgorithmGroup.get(strategy.getStrategyMode()), excludeAwardIds);

        // 5. 包装中奖结果
        return buildDrawResult(req.getuId(), req.getStrategyId(), awardId);
    }
}
```

**扣减库存**

```sql
UPDATE strategy_detail SET awardSurplusCount = awardSurplusCount - 1
        WHERE strategyId = #{strategyId} AND awardId = #{awardId} AND awardSurplusCount > 0
```

因为strategyId和awardId都不是索引列，该sql便会引起表锁，在高并发下有死锁的问题。

```sql
ALTER TABLE `lottery`.`strategy_detail`
  ADD  KEY `idx__strategyId__awardId` (`strategyId`, `awardId`) COMMENT "策略id+奖品id的索引";
```

## 发奖工厂

关于 award 发奖领域中主要的核心实现在于 service 中的两块功能逻辑实现，分别是：goods 商品处理、factory 工厂🏭

goods：包装适配各类奖品的发放逻辑，虽然我们目前的抽奖系统仅是给用户返回一个中奖描述，但在实际的业务场景中，是真实的调用优惠券、兑换码、物流发货等操作，而这些内容经过封装后就可以在自己的商品类下实现了。

factory：工厂模式通过调用方提供发奖类型，返回对应的发奖服务。通过这样由具体的子类决定返回结果，并做相应的业务处理。从而不至于让领域层包装太多的频繁变化的业务属性，因为如果你的核心功能域是在做业务逻辑封装，就会就会变得非常庞大且混乱。



## id策略

关于 ID 的生成因为有三种不同 ID 用于在不同的场景下；

- 订单号：唯一、大量、订单创建时使用、分库分表
- 活动号：唯一、少量、活动创建时使用、单库单表
- 策略号：唯一、少量、活动创建时使用、单库单表





## 分库分表

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20230506101414065.png)

**一个数据库路由设计要包括哪些技术知识点呢？**

是关于 AOP 切面拦截的使用，这是因为需要给使用数据库路由的方法做上标记，便于处理分库分表逻辑。
数据源的切换操作，既然有分库那么就会涉及在多个数据源间进行链接切换，以便把数据分配给不同的数据库。
数据库表寻址操作，一条数据分配到哪个数据库，哪张表，都需要进行索引计算。在方法调用的过程中最终通过 ThreadLocal 记录。
为了能让数据均匀的分配到不同的库表中去，还需要考虑如何进行数据散列的操作，不能分库分表后，让数据都集中在某个库的某个表，这样就失去了分库分表的意义。

综上，可以看到在数据库和表的数据结构下完成数据存放，我需要用到的技术包括：AOP、数据源切换、散列算法、哈希寻址、ThreadLocal以及SpringBoot的Starter开发方式等技术。而像哈希散列、寻址、数据存放，其实这样的技术与 HashMap 有太多相似之处，那么学完源码造火箭的机会来了 如果你有过深入分析和学习过 HashMap 源码、Spring 源码、中间件开发，那么在设计这样的数据库路由组件时一定会有很多思路的出来。接下来我们一起尝试下从源码学习到造火箭！

自定义AOP注解，拦截所有分库分表方法，经数据源设置到ThreadLocal中，记得清除

同时继承路由类，来切换当前的数据源

```java
public class DynamicDataSource extends AbstractRoutingDataSource {

    @Override
    protected Object determineCurrentLookupKey() {
        return "db" + DBContextHolder.getDBKey();
    }

}
```

对于需要分表的操作，使用mybatis拦截器动态修改表名

```java
@Intercepts({@Signature(type = StatementHandler.class, method = "prepare", args = {Connection.class, Integer.class})})
public class DynamicMybatisPlugin implements Interceptor {
  
}
```

### 分库分表下的事务问题

这里选择了一个较低的成本的解决方案，就是把数据源的切换放在事务处理前，而事务操作也通过编程式编码进行处理。

对应场景，用户参加活动，需要记录在表

**编程式事务**

对标基于注解的声明式事务

```java
protected Result grabActivity(PartakeReq partake, ActivityBillVO bill) {
        try {
            dbRouter.doRouter(partake.getuId());
            return transactionTemplate.execute(status -> {
                try {
                    // 扣减个人已参与次数
                    int updateCount = userTakeActivityRepository.subtractionLeftCount(bill.getActivityId(), bill.getActivityName(), bill.getTakeCount(), bill.getUserTakeLeftCount(), partake.getuId(), partake.getPartakeDate());
                    if (0 == updateCount) {
                        status.setRollbackOnly();
                        logger.error("领取活动，扣减个人已参与次数失败 activityId：{} uId：{}", partake.getActivityId(), partake.getuId());
                        return Result.buildResult(Constants.ResponseCode.NO_UPDATE);
                    }

                    // 插入领取活动信息
                    Long takeId = idGeneratorMap.get(Constants.Ids.SnowFlake).nextId();
                    userTakeActivityRepository.takeActivity(bill.getActivityId(), bill.getActivityName(), bill.getTakeCount(), bill.getUserTakeLeftCount(), partake.getuId(), partake.getPartakeDate(), takeId);
                } catch (DuplicateKeyException e) {
                    status.setRollbackOnly();
                    logger.error("领取活动，唯一索引冲突 activityId：{} uId：{}", partake.getActivityId(), partake.getuId(), e);
                    return Result.buildResult(Constants.ResponseCode.INDEX_DUP);
                }
                return Result.buildSuccessResult();
            });
        } finally {
            dbRouter.clear();
        }
    }
```

## 流程编排



![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20230506163043063.png)



## 规则引擎

使用组合模式搭建用于量化人群的规则引擎，用于用户参与活动之前，通过规则引擎过滤性别、年龄、首单消费、消费金额、忠实用户等各类身份来量化出具体可参与的抽奖活动。通过这样的方式控制运营成本和精细化运营。

```java
@Resource
private Map<String, LogicFilter> logicFilterMap;
// 按照类名首字母小写自动注入map，可以在注解中指定bean的名字
@Component("userAge")
```



```json
请求参数：{"treeId":2110081902,"userId":"fustack","valMap":{"gender":"man","age":"25"}}
测试结果：{"nodeId":112,"nodeValue":"100002","success":true,"treeId":2110081902,"userId":"fustack"}
```





## 门面封装

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20230506195505831.png)

### 性能对比

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20230506195554680.png)

- BeanUtils.copyProperties 是大家代码里最常出现的工具类，但只要你不把它用错成 Apache 包下的，而是使用Spring 提供的，就基本还不会对性能造成多大影响。
- 但如果说性能更好，可替代手动get、set的，还是 MapStruct 更好用，因为它本身就是在编译期生成get、set代码，和我们写get、set一样。
- 其他一些组件包主要基于 AOP、ASM、CGlib，的技术手段实现的，所以也会有相应的性能损耗。



```yml
server:
  port: 8080

# 多数据源路由配置
mini-db-router:
  jdbc:
    datasource:
      dbCount: 2
      tbCount: 4
      default: db00
      routerKey: uId
      list: db01,db02
      db00:
        driver-class-name: com.mysql.cj.jdbc.Driver
        url: jdbc:mysql://101.43.160.149:3306/lottery?useUnicode=true
        username: root
        password: Libiao@123
      db01:
        driver-class-name: com.mysql.cj.jdbc.Driver
        url: jdbc:mysql://101.43.160.149:3306/lottery_01?useUnicode=true
        username: root
        password: Libiao@123
      db02:
        driver-class-name: com.mysql.cj.jdbc.Driver
        url: jdbc:mysql://101.43.160.149:3306/lottery_02?useUnicode=true
        username: root
        password: Libiao@123

mybatis:
  mapper-locations: classpath:/mybatis/mapper/*.xml
  config-location:  classpath:/mybatis/config/mybatis-config.xml

# Dubbo 广播方式配置，如果调用不稳定可以修改为直连模式：https://codechina.csdn.net/KnowledgePlanet/Lottery/-/issues/1
dubbo:
  application:
    name: Lottery
    version: 1.0.0
    parameters:
      unicast: false
  registry:
    address: multicast://224.5.6.7:1234
  protocol:
    name: dubbo
    port: 20880
  scan:
    base-packages: cn.itedus.lottery.rpc
```





































## 运维部署



![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20230504173721010.png)





![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/75&e=1688140799&s=tvymyyjttvvvyyy&token=kIxbL07-8jAj8w1n4s9zv64FuZZNEATmlU_Vm6zD:mCOH966KvQykH_Z1ZrwBfmhEPoU=-20230504173747404.jpeg)