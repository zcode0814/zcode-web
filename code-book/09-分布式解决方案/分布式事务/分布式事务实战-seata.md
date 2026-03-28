# 分布式事务最佳实践-Seata

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20221223105802595.png)

## 简介

官网：http://seata.io/zh-cn/

源码：https://github.com/seata/seata

Seata 是一款开源的分布式事务解决方案，致力于提供高性能和简单易用的分布式事务服务。Seata 将为用户提供了 AT、TCC、SAGA 和 XA 事务模式，为用户打造一站式的分布式解决方案。

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/20230907172023.png)

## 常见术语

**TC (Transaction Coordinator) - 事务协调者**

维护全局和分支事务的状态，驱动全局事务提交或回滚。

**TM (Transaction Manager) - 事务管理器**

定义全局事务的范围：开始全局事务、提交或回滚全局事务。

**RM (Resource Manager) - 资源管理器**

管理分支事务处理的资源，与TC交谈以注册分支事务和报告分支事务的状态，并驱动分支事务提交或回滚。

## seata-server

### 下载

官网：https://github.com/seata/seata/releases/tag/v1.7.0

### 修改配置文件

1.5.0之前的版本配置文件是有多个的，都位于`conf`文件夹下，如`file.conf`,`registry,conf`等。在1.5.0版本之后都整合到一个配置文件里了，即`application.yml`。以下配置项请按照自己版本查找修改。

以seata-1.7.0为例，打开`conf/application.yml`进行修改，重点修改nacos部分配置。

其中的：application.example.yml  各种注册中心，配置中心配置方式，默认是配置本地，这里以配置在nacos为例子。

```yaml
server:
  port: 7091

spring:
  application:
    name: seata-server

logging:
  config: classpath:logback-spring.xml
  file:
    path: ${user.home}/logs/seata
  extend:
    logstash-appender:
      destination: 127.0.0.1:4560
    kafka-appender:
      bootstrap-servers: 127.0.0.1:9092
      topic: logback_to_logstash

console:
  user:
    username: seata
    password: seata

seata:
  config:
    # support: nacos, consul, apollo, zk, etcd3
    type: nacos
    nacos:
      server-addr: 101.43.160.149:8848
      namespace: 9862bd7f-2dc2-47a4-9c80-c6290c5c3e2b
      group: DEFAULT_GROUP
      cluster: default
      username: nacos
      password: nacos
      context-path:
      ##if use MSE Nacos with auth, mutex with username/password attribute
      #access-key: ""
      #secret-key: ""
      data-id: seataServer.properties
  registry:
    # support: nacos, eureka, redis, zk, consul, etcd3, sofa
    type: nacos
    preferred-networks: 30.240.*
    nacos:
      application: seata-server
      server-addr: 101.43.160.149:8848
      namespace: 9862bd7f-2dc2-47a4-9c80-c6290c5c3e2b
      group: DEFAULT_GROUP
      username:
      password:
      context-path:
  store:
    # support: file 、 db 、 redis
    mode: db
    session:
      mode: db
    lock:
      mode: db
    file:
      dir: sessionStore
      max-branch-session-size: 16384
      max-global-session-size: 512
      file-write-buffer-cache-size: 16384
      session-reload-read-size: 100
      flush-disk-mode: async
#  server:
#    service-port: 8091 #If not configured, the default is '${server.port} + 1000'
  security:
    secretKey: SeataSecretKey0c382ef121d778043159209298fd40bf3850a017
    tokenValidityInMilliseconds: 1800000
    ignore:
      urls: /,/**/*.css,/**/*.js,/**/*.html,/**/*.map,/**/*.svg,/**/*.png,/**/*.ico,/console-fe/public/**,/api/v1/auth/login
```

修改成功后，意味着seata将从nacos获取配置信息，同时注册自身服务到nacos中心。

### nacos配置

上面配置项中有一项：`seata.config.data-id=seataServer.properties`，意思为要读nacos上的`seataServer.properties`配置文件，接下来去`Nacos`创建该配置文件，注意`Group`与第2步中的保持一致，这里是`SEATA_GROUP`。

```shell
# 自动将配置添加到naco
sudo sh nacos-config.sh -h 101.43.160.149 -p 8848 -g SEATA_GROUP -t 9862bd7f-2dc2-47a4-9c80-c6290c5c3e2b -u nacos -w nacos
```

配置内容从`seata-server-1.7.0/seata/script/config-center/config.txt`粘贴修改而来，这里只使用对我们有用的配置，主要是`数据库配置`信息。

```properties
#Transaction storage configuration, only for the server.
store.mode=db
store.lock.mode=db
store.session.mode=db

#These configurations are required if the `store mode` is `db`.
store.db.datasource=druid
store.db.dbType=mysql
store.db.driverClassName=com.mysql.cj.jdbc.Driver
store.db.url=jdbc:mysql://127.0.0.1:3306/seata?useSSL=false&useUnicode=true&rewriteBatchedStatements=true
store.db.user=root
store.db.password=admin
store.db.minConn=5
store.db.maxConn=30
store.db.globalTable=global_table
store.db.branchTable=branch_table
store.db.distributedLockTable=distributed_lock
store.db.queryLimit=100
store.db.lockTable=lock_table
store.db.maxWait=5000
```

### 数据库建表

在seata数据库内，执行`seata-server-1.7.0/seata/script/server/db`目录下的sql脚本（根据数据库类型），创建服务端所需的表。此处选择：mysql

### 启动seata-server

运行`bin`下的`bat`脚本启动服务。

访问：http://127.0.0.1:7091

默认账号与密码都是`seata`

## Seata模式使用

### XA模式

#### 概念

XA规范是X/Open组织定义的分布式事务处理(DTP)标准，XA规范描述了全局的TM与局部RM之间的接口，几乎所有主流的数据库都对XA规范提供了支持。

#### 原理

XA是一种分布式事务协议，用于在分布式环境下实现事务的一致性。它通过将本地事务（Local Transaction）与全局事务（Global Transaction）进行协调来实现分布式事务。

XA模式使用了一组标准的API（如Java中的javax.transaction包），通常包括两个阶段：事务准备（Prepare）和事务提交（Commit）。

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/20230907172112.png)



**思考：XA与2PC有啥区别？**

> 注意点：XA模式可以使用2PC协议来实现全局事务的一致性。也就是说，XA模式是2PC的一种具体实现方式，并且在XA模式中可以利用其他机制（如XA事务日志）来增强事务的持久性和可靠性。因此，可以将XA视为2PC的一个变种或扩展。

seata 的XA模式做了一些调整

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/20230907172156.png)

**操作流程:**

**第一阶段：**

1>注册全局事务

2>调用RM事务接口，注册分支事务

3>执行RM事务操作，不提交

4>往TC报告事务状态

**第二阶段：**

1>所有RM执行完本地事务，TM发起全局事务提交/回滚

2>TC检查所有RM事务状态，yes or no?

      全部yes，通知所有RM提交事务
    
      存在no，通知所有RM回滚事务

#### 代码

项目集成seata

**依赖**

所有微服务导入seata依赖

```xml
<!-- 注意一定要引入对版本，要引入spring-cloud版本seata，而不是springboot版本的seata-->
<dependency>
    <groupId>com.alibaba.cloud</groupId>
    <artifactId>spring-cloud-starter-alibaba-seata</artifactId>
    <!-- 排除掉springcloud默认的seata版本，以免版本不一致出现问题-->
    <exclusions>
        <exclusion>
            <groupId>io.seata</groupId>
            <artifactId>seata-spring-boot-starter</artifactId>
        </exclusion>
        <exclusion>
            <groupId>io.seata</groupId>
            <artifactId>seata-all</artifactId>
        </exclusion>
    </exclusions>
</dependency>
<dependency>
    <groupId>io.seata</groupId>
    <artifactId>seata-spring-boot-starter</artifactId>
    <version>1.7.0</version>
</dependency>
```

**配置文件**

在application.yml文件中配置， 每个微服务都要

```yaml
#seata客户端配置
seata:
  enabled: true
  application-id: seata_tx
  tx-service-group: seata_tx_group
  service:
    vgroup-mapping:
      seata_tx_group: default
  registry:
    type: nacos
    nacos:
      application: seata-server
      server-addr: 127.0.0.1:8848
      namespace:
      group: SEATA_GROUP
  data-source-proxy-mode: XA

```

其中`seata_tx_group`为我们自定义的事务组，名字随便起，但是下面`service.vgroup-mapping`下一定要有一个对应这个名字的映射，映射到`default`（seata默认的集群名称）。 `nacos`方面，我们仅配置注册项，即`registry`下的配置，配置内容与服务端保持一致。

**配置全局事务**

在business-service服务的purchase 方法中加上全局事务标签：@GlobalTransactional

```java
@Override
@GlobalTransactional
public void purchase(String userId, String commodityCode, int orderCount, boolean rollback) {
    String result = stockFeignClient.deduct(commodityCode, orderCount);

    if (!"SUCCESS".equals(result)) {
        throw new RuntimeException("库存服务调用失败,事务回滚!");
    }
    result = orderFeignClient.create(userId, commodityCode, orderCount);
    if (!"SUCCESS".equals(result)) {
        throw new RuntimeException("订单服务调用失败,事务回滚!");
    }

    if (rollback) {
        throw new RuntimeException("Force rollback ... ");
    }
}
```

**启动seata**

```shell
./server-startup.sh
```

#### 测试

正常：http://localhost:6102/business/purchase?rollback=false&count=2

超库存：http://localhost:6102/business/purchase?rollback=false&count=12

超余额：http://localhost:6102/business/purchase?rollback=false&count=8

#### 优缺点

优点

- 事务强一致性，满足ACID原则
- 常用的数据库都支持，实现简单，并且没有代码侵入

缺点

- 第一阶段锁定数据库资源，等待二阶段结束才释放，锁定资源过长，性能较差
- 依赖关系型数据库的实现事务



### AT模式

#### 概念

AT模式同样是分阶段提交事务模式，操作起来算是XA模式的优化版。

XA模式在第一阶段存在锁定资源的操作，时间长之后会影响性能。

AT模式在第一阶段直接提交事务，弥补了XA模式中资源锁定周期过长缺陷。

 

#### 原理

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/20230907172407.png)

**操作流程:**

第一阶段：

1>注册全局事务

2>调用RM事务接口，注册分支事务

3>执行RM事务操作，**并提交，记录undo log日志快照**

4>往TC报告事务状态

第二阶段：

1>所有RM执行完本地事务，TM发起全局事务提交/回滚

2>TC检查所有RM事务状态，yes or no?

全部yes，通知所有RM提交事务，**删除undo log日志快照**

存在no，通知所有RM回滚事务，**恢复undo log日志快照**



#### XA vs AT

- XA模式一阶段不提交事务，锁定资源； AT模式一阶段直接提交，不锁定资源
- XA模式依赖数据库实现回滚； AT利用数据快照实现数据回顾
- XA模式强一致性；AT模式最终一致(一阶段提交，此时有事务查询，就存在不一致)



#### 问题

AT模式因为在全局事务中第一阶段就提交了事务，释放资源。如果这个时，另外RM/外部事务(非RM)操作相同资源，可能存在读写**隔离问题(更新丢失问题)**。

**问题出现原理**

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/20230907172831.png)

**读写隔离问题-2个seata事务解决方案**

**加全局锁**

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/20230907172651.png)



**读写隔离问题-1个seata事务 + 非seata事务解决方案**

**全局锁+多级快照**

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/20230907172855.png)

#### **代码**

配置seata-AT相关快照/全局锁/快照表数据库

**配置数据库**

TM数据库-seata

源sql： seata-server-1.7.0/script/server/db 中



各个RM数据库

源sql： https://seata.io/zh-cn/docs/dev/mode/at-mode.html



```sql
CREATE TABLE `undo_log` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `branch_id` bigint(20) NOT NULL,
  `xid` varchar(100) NOT NULL,
  `context` varchar(128) NOT NULL,
  `rollback_info` longblob NOT NULL,
  `log_status` int(11) NOT NULL,
  `log_created` datetime NOT NULL,
  `log_modified` datetime NOT NULL,
  `ext` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ux_undo_log` (`xid`,`branch_id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8;

```

**配置文件**

在application.yml文件中配置， 每个微服务都要

```yaml
#seata客户端配置
seata:
  enabled: true
  application-id: seata_tx
  tx-service-group: seata_tx_group
  service:
    vgroup-mapping:
      seata_tx_group: default
  registry:
    type: nacos
    nacos:
      application: seata-server
      server-addr: 127.0.0.1:8848
      namespace:
      group: SEATA_GROUP
  data-source-proxy-mode: AT
```

#### 测试

正常：http://localhost:8088/businesses/purchase?rollback=false&count=2

超库存：http://localhost:8088/businesses/purchase?rollback=false&count=12

超余额：http://localhost:8088/businesses/purchase?rollback=false&count=8

#### 优缺点

**优点**

- 一阶段完成直接提交事务，释放资源，性能较好
- 利用全局锁实现读写隔离
- 没有代码侵入，框架自动完成回滚与提交

缺点

- 两阶段之间存在数据不一致情况，只能保证最终一致
- 框架的快照功能影响性能，但比XA模式要好很多



### TCC模式

#### 概念

TCC模式的seata版实现。TCC模式与AT模式非常相似，每阶段都是独立事务，不同的**TCC通过人工编码来实现数据恢复**。

- Try：资源的检测和预留
- Confirm：完成资源操作业务；要求Try 成功，Confirm 一定要能成功
- Cancel：预留资源释放，可以理解为try的反向操作

#### 原理

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/20230907173109.png)

**操作流程:**

1>注册全局事务

2>调用RM事务接口，注册分支事务

3>执行RM事务try接口，检查资源，预留资源

4>往TC报告事务状态

5>所有RM执行完本地事务，TM发起全局事务提交/回滚

2>TC检查所有RM事务状态，yes or no?

      全部yes，通知所有RM 执行confirm接口，提交事务
    
      存在no，通知所有RM  执行cancel接口，回滚事务

**案例演示**

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/20230907173157.png)

#### 问题

TCC模式中，在执行Try，执行Confirm，执行Cancel 过程中会出现意外情况，导致TCC模式经典问题：**空回滚**，**业务悬挂**，**重试幂等**问题。

**空回滚**

当某个分支事务try阶段阻塞时，可能导致全局事务超时而触发二阶段的cancel操作，RM在没有执行try操作就执行cancel操作，此时cancel无数据回滚，这就是空回滚。

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/20230907173229.png)

**业务悬挂**

当发生的空回滚之后，当阻塞的Try正常了，RM先执行空回滚(cancel)后，又收到Try操作指令，执行业务操作，并冻结资源。但是事务已经结束，不会再有confirm 或cancel了，那刚执行try操作冻结资源，就被悬挂起来了。这就是业务**悬挂**





**重试幂等**

因为网络抖动等原因，TC下达的Confirm/Cancel 指令可能出现延时，发送失败等问题，此时TC会启用重试机制，到时，RM可能收到多个confirm或cancel指令，这就要求confirm接口或者cancel接口，需要能够保证幂等性。

> 幂等性：多次执行，结果都一样



上面空回滚/业务悬挂问题解决，一般都一起实现：**引入事务状态控制表**

表字段： xid，冻结数据，事务状态(try、confirm/cancel)

以RM: account-service 中用户账户余额为例子。

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/20230907173310.png)

try：1>在状态表中记录冻结金额，与事务状态为try，

2>扣减账户余额

confirm：1>根据xid删除状态表中冻结记录

cancel：1>修改状态表冻结金额为0，事务状态改为cancel  2>恢复账户扣减

如何判断是否为空回滚：在cancel中，根据xid查询状态表，如果为不存在，说明try执行，需要空回滚

如果避免业务悬挂：try业务中，根据xid查询状态表，如果已经存在，说明已经执行过cancel已经执行过，拒绝执行try业务。

重试幂等：需要引入唯一标识，比如第一次操作成功留下，唯一标识，下次来识别这个标识。



#### 代码

在AT模式基础上做代码TCC改造就行。

**account-service服务**

新增：IAccountTCCService接口与实现

```java
package cn.wolfcode.tx.account.service;


import io.seata.rm.tcc.api.BusinessActionContext;
import io.seata.rm.tcc.api.BusinessActionContextParameter;
import io.seata.rm.tcc.api.LocalTCC;
import io.seata.rm.tcc.api.TwoPhaseBusinessAction;

/**
 * TCC 二阶段提交业务接口
 */
@LocalTCC
public interface IAccountTCCService {
    /**
     * try-预扣款
     */
    @TwoPhaseBusinessAction(name="tryReduce", commitMethod = "confirm", rollbackMethod = "cancel")
    void tryReduce(@BusinessActionContextParameter(paramName = "userId") String userId,
                   @BusinessActionContextParameter(paramName = "money") int money);
    /**
     * confirm-提交
     * @param ctx
     * @return
     */
    boolean confirm(BusinessActionContext ctx);
    /**
     * cancel-回滚
     * @param ctx
     * @return
     */
    boolean cancel(BusinessActionContext ctx);
}

```

```java
package cn.wolfcode.tx.account.service.impl;

import cn.wolfcode.tx.account.domain.Account;
import cn.wolfcode.tx.account.mapper.AccountMapper;
import cn.wolfcode.tx.account.service.IAccountService;
import cn.wolfcode.tx.account.service.IAccountTCCService;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import io.seata.rm.tcc.api.BusinessActionContext;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.awt.*;

@Service
public class AccountTCCServiceImpl  implements IAccountTCCService {
    @Autowired
    private AccountMapper accountMapper;
    @Override
    public void tryReduce(String userId, int money) {
        System.err.println("-----------tryReduce-------------");
        Account one = accountMapper.selectOne(new LambdaQueryWrapper<Account>().eq(Account::getUserId, userId));
        if(one != null && one.getMoney() < money){
            throw new RuntimeException("Not Enough Money ...");
        }
        LambdaUpdateWrapper<Account> wrapper = new LambdaUpdateWrapper<>();
        wrapper.setSql("money = money - " + money);
        wrapper.eq(Account::getUserId, userId);
        accountMapper.update(null, wrapper);
    }

    @Override
    public boolean confirm(BusinessActionContext ctx) {
        System.err.println("-----------confirm-------------");
        return true;
    }
    @Override
    public boolean cancel(BusinessActionContext ctx) {
        System.err.println("-----------cancel-------------");
        return true;
    }
}

```

controller改动

```java
package cn.wolfcode.tx.account.controller;

import cn.wolfcode.tx.account.domain.Account;
import cn.wolfcode.tx.account.service.IAccountService;
import cn.wolfcode.tx.account.service.IAccountTCCService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("accounts")
public class AccountController {

    //@Autowired
    //private IAccountService accountService;
    @Autowired
    private IAccountTCCService accountTCCService;

    @GetMapping(value = "/reduce")
    public String reduce(String userId, int money) {
        try {
            accountTCCService.tryReduce(userId, money);
        } catch (Exception exx) {
            exx.printStackTrace();
            return "FAIL";
        }
        return "SUCCESS";
    }

}

```



**order-service服务**

新增：IOrderTCCService接口与实现

```java
package cn.wolfcode.tx.order.service;

import cn.wolfcode.tx.order.domain.Order;
import com.baomidou.mybatisplus.extension.service.IService;
import io.seata.rm.tcc.api.BusinessActionContext;
import io.seata.rm.tcc.api.BusinessActionContextParameter;
import io.seata.rm.tcc.api.LocalTCC;
import io.seata.rm.tcc.api.TwoPhaseBusinessAction;

/**
 * TCC 二阶段提交业务接口
 */
@LocalTCC
public interface IOrderTCCService {
    /**
     * try-预扣款
     */
    @TwoPhaseBusinessAction(name="tryCreate", commitMethod = "confirm", rollbackMethod = "cancel")
    void tryCreate(@BusinessActionContextParameter(paramName = "userId") String userId,
                   @BusinessActionContextParameter(paramName = "commodityCode") String commodityCode,
                   @BusinessActionContextParameter(paramName = "orderCount") int orderCount);

    /**
     * confirm-提交
     * @param ctx
     * @return
     */
    boolean confirm(BusinessActionContext ctx);

    /**
     * cancel-回滚
     * @param ctx
     * @return
     */
    boolean cancel(BusinessActionContext ctx);

}

```

```java
package cn.wolfcode.tx.order.service.impl;

import cn.wolfcode.tx.order.domain.Order;
import cn.wolfcode.tx.order.feign.AccountFeignClient;
import cn.wolfcode.tx.order.mapper.OrderMapper;
import cn.wolfcode.tx.order.service.IOrderService;
import cn.wolfcode.tx.order.service.IOrderTCCService;
import com.alibaba.nacos.shaded.org.checkerframework.checker.units.qual.A;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import io.seata.rm.tcc.api.BusinessActionContext;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OrderTCCServiceImpl  implements IOrderTCCService {

    @Autowired
    private AccountFeignClient accountFeignClient;

    @Autowired
    private OrderMapper orderMapper;

    @Override
    public void tryCreate(String userId, String commodityCode, int count) {
        System.err.println("---------tryCreate-----------");
        // 定单总价 = 订购数量(count) * 商品单价(100)
        int orderMoney = count * 100;
        // 生成订单
        Order order = new Order();
        order.setCount(count);
        order.setCommodityCode(commodityCode);
        order.setUserId(userId);
        order.setMoney(orderMoney);
        orderMapper.insert(order);

        // 调用账户余额扣减
        String result = accountFeignClient.reduce(userId, orderMoney);
        if (!"SUCCESS".equals(result)) {
            throw new RuntimeException("Failed to call Account Service. ");
        }
    }

    @Override
    public boolean confirm(BusinessActionContext ctx) {
        System.err.println("---------confirm-----------");
        return true;
    }

    @Override
    public boolean cancel(BusinessActionContext ctx) {
        System.err.println("---------cancel-----------");
        return true;
    }
}

```

controller改动

```java
package cn.wolfcode.tx.order.controller;

import cn.wolfcode.tx.order.domain.Order;
import cn.wolfcode.tx.order.service.IOrderService;
import cn.wolfcode.tx.order.service.IOrderTCCService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("orders")
public class OrderController {

    @Autowired
    private IOrderTCCService orderTCCService;

    @GetMapping(value = "/create")
    public String create(String userId, String commodityCode, int orderCount) {
        try {
            orderTCCService.tryCreate(userId, commodityCode, orderCount);
        } catch (Exception exx) {
            exx.printStackTrace();
            return "FAIL";
        }
        return "SUCCESS";
    }
}

```



**stock-service服务**

新增：IStockTCCService接口与实现

```java
package cn.wolfcode.tx.stock.service;

import cn.wolfcode.tx.stock.domain.Stock;
import com.baomidou.mybatisplus.extension.service.IService;
import io.seata.rm.tcc.api.BusinessActionContext;
import io.seata.rm.tcc.api.BusinessActionContextParameter;
import io.seata.rm.tcc.api.LocalTCC;
import io.seata.rm.tcc.api.TwoPhaseBusinessAction;

/**
 * TCC 二阶段提交业务接口
 */
@LocalTCC
public interface IStockTCCService  {
    /**
     * try-预扣款
     */
    @TwoPhaseBusinessAction(name="tryDeduct", commitMethod = "confirm", rollbackMethod = "cancel")
    void tryDeduct(@BusinessActionContextParameter(paramName = "commodityCode") String commodityCode,
                   @BusinessActionContextParameter(paramName = "count") int count);

    /**
     * confirm-提交
     * @param ctx
     * @return
     */
    boolean confirm(BusinessActionContext ctx);

    /**
     * cancel-回滚
     * @param ctx
     * @return
     */
    boolean cancel(BusinessActionContext ctx);
}

```

```java
package cn.wolfcode.tx.stock.service.impl;

import cn.wolfcode.tx.stock.domain.Stock;
import cn.wolfcode.tx.stock.mapper.StockMapper;
import cn.wolfcode.tx.stock.service.IStockService;
import cn.wolfcode.tx.stock.service.IStockTCCService;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import io.seata.rm.tcc.api.BusinessActionContext;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class StockTCCServiceImpl implements IStockTCCService {

    @Autowired
    private StockMapper stockMapper;

    @Override
    public void tryDeduct(String commodityCode, int count) {
        System.err.println("---------tryDeduct-----------");
        Stock one = stockMapper.selectOne(new LambdaQueryWrapper<Stock>().eq(Stock::getCommodityCode, commodityCode));
        if(one != null && one.getCount() < count){
            throw new RuntimeException("Not Enough Count ...");
        }
        stockMapper.update(null, new LambdaUpdateWrapper<Stock>()
                .setSql("count = count-" + count)
                .eq(Stock::getCommodityCode, commodityCode));

    }

    @Override
    public boolean confirm(BusinessActionContext ctx) {
        System.err.println("---------confirm-----------");
        return true;
    }

    @Override
    public boolean cancel(BusinessActionContext ctx) {
        System.err.println("---------cancel-----------");
        return true;
    }
}

```

controller改动

```java
package cn.wolfcode.tx.stock.controller;

import cn.wolfcode.tx.stock.service.IStockService;
import cn.wolfcode.tx.stock.service.IStockTCCService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("stocks")
public class StockController {


    @Autowired
    private IStockTCCService stockTCCService;

    @GetMapping(value = "/deduct")
    public String deduct(String commodityCode, int count) {
        try {
            stockTCCService.tryDeduct(commodityCode, count);
        } catch (Exception exx) {
            exx.printStackTrace();
            return "FAIL";
        }
        return "SUCCESS";
    }
}

```



**上面操作，在理想情况下是没有问题的，但是一旦出现需要回滚操作，就出问题了，无法进行数据回补。此时就需要使用到事务状态表实现数据回补，同时实现空回滚，避免业务悬挂。**



**account-service**

在seata-account 新增事务状态表

```sql
CREATE TABLE `t_account_tx` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键',
  `tx_id` varchar(100) NOT NULL  COMMENT '事务id',
  `freeze_money` int DEFAULT NULL COMMENT '冻结金额',
  `state` int DEFAULT NULL COMMENT '状态 0try 1confirm 2cancel',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
```

新增domain：AccountTX

```java
@Data
@TableName("t_account_tx")
public class AccountTX {

    public static final int STATE_TRY = 0;
    public static final int STATE_CONFIRM = 1;
    public static final int STATE_CANCEL = 2;

    @TableId(type = IdType.AUTO)
    private Integer id;
    private String txId;
    private int freezeMoney;
    private int state = STATE_TRY;
}

```

新增mapper：AccountTXMapper

```java
package cn.wolfcode.tx.account.mapper;

import cn.wolfcode.tx.account.domain.AccountTX;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;

public interface AccountTXMapper extends BaseMapper<AccountTX> {
}
```

修改：AccountTCCServiceImpl

```java
package cn.wolfcode.tx.account.service.impl;

import cn.wolfcode.tx.account.domain.Account;
import cn.wolfcode.tx.account.domain.AccountTX;
import cn.wolfcode.tx.account.mapper.AccountMapper;
import cn.wolfcode.tx.account.mapper.AccountTXMapper;
import cn.wolfcode.tx.account.service.IAccountService;
import cn.wolfcode.tx.account.service.IAccountTCCService;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import io.seata.core.context.RootContext;
import io.seata.rm.tcc.api.BusinessActionContext;
import org.checkerframework.checker.units.qual.A;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.awt.*;

@Service
public class AccountTCCServiceImpl  implements IAccountTCCService {
    @Autowired
    private AccountMapper accountMapper;
    @Autowired
    private AccountTXMapper accountTXMapper;
    @Override
    public void tryReduce(String userId, int money) {
        System.err.println("-----------tryReduce-------------" + RootContext.getXID());
        //业务悬挂
        AccountTX accountTX = accountTXMapper.selectOne(new LambdaQueryWrapper<AccountTX>().eq(AccountTX::getTxId, RootContext.getXID()));
        if (accountTX != null){
            //存在，说明已经canel执行过类，拒绝服务
            return;
        }
        Account one = accountMapper.selectOne(new LambdaQueryWrapper<Account>().eq(Account::getUserId, userId));
        if(one != null && one.getMoney() < money){
            throw new RuntimeException("Not Enough Money ...");
        }
        LambdaUpdateWrapper<Account> wrapper = new LambdaUpdateWrapper<>();
        wrapper.setSql("money = money - " + money);
        wrapper.eq(Account::getUserId, userId);

        accountMapper.update(null, wrapper);


        AccountTX tx = new AccountTX();
        tx.setFreezeMoney(money);
        tx.setTxId(RootContext.getXID());
        tx.setState(AccountTX.STATE_TRY);

        accountTXMapper.insert(tx);

    }

    @Override
    public boolean confirm(BusinessActionContext ctx) {
        System.err.println("-----------confirm-------------");
        //删除记录
        int ret = accountTXMapper.delete(new LambdaQueryWrapper<AccountTX>().eq(AccountTX::getTxId, ctx.getXid()));
        return ret == 1;

    }
    @Override
    public boolean cancel(BusinessActionContext ctx) {
        System.err.println("-----------cancel-------------");
        String userId = ctx.getActionContext("userId").toString();
        String money = ctx.getActionContext("money").toString();

        AccountTX accountTX = accountTXMapper.selectOne(new LambdaQueryWrapper<AccountTX>().eq(AccountTX::getTxId, ctx.getXid()));
        if (accountTX == null){
            //为空， 空回滚
            accountTX = new AccountTX();
            accountTX.setTxId(ctx.getXid());
            accountTX.setState(AccountTX.STATE_CANCEL);
            if(money != null){
                accountTX.setFreezeMoney(Integer.parseInt(money));
            }
            accountTXMapper.insert(accountTX);
            return true;
        }
        //幂等处理
        if(accountTX.getState() == AccountTX.STATE_CANCEL){
            return true;
        }

        //恢复余额
        accountMapper.update(null, new LambdaUpdateWrapper<Account>()
                        .setSql("money = money + " + money)
                .eq(Account::getUserId, userId));

        accountTX.setFreezeMoney(0);
        accountTX.setState(AccountTX.STATE_CANCEL);
        int ret = accountTXMapper.updateById(accountTX);
        return ret == 1;
    }
}

```



**order-service**

在seata-order 新增事务状态表

```sql
CREATE TABLE `t_order_tx` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键',
  `tx_id` varchar(100) NOT NULL  COMMENT '事务id',
  `state` int DEFAULT NULL COMMENT '状态 0try 1confirm 2cancel',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
```

新增domain：OrderTX

```java
package cn.wolfcode.tx.order.domain;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

@Data
@TableName("t_order_tx")
public class OrderTX {

    public static final int STATE_TRY = 0;
    public static final int STATE_CONFIRM = 1;
    public static final int STATE_CANCEL = 2;

    @TableId(type = IdType.AUTO)
    private Integer id;
    private String txId;
    private int state = STATE_TRY;
}

```

新增mapper：OrderTXMapper

```java
package cn.wolfcode.tx.order.mapper;

import cn.wolfcode.tx.order.domain.OrderTX;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;

public interface OrderTXMapper extends BaseMapper<OrderTX> {
}

```

修改：OrderTCCServiceImpl

```java
package cn.wolfcode.tx.order.service.impl;

import cn.wolfcode.tx.order.domain.Order;
import cn.wolfcode.tx.order.domain.OrderTX;
import cn.wolfcode.tx.order.feign.AccountFeignClient;
import cn.wolfcode.tx.order.mapper.OrderMapper;
import cn.wolfcode.tx.order.mapper.OrderTXMapper;
import cn.wolfcode.tx.order.service.IOrderService;
import cn.wolfcode.tx.order.service.IOrderTCCService;
import com.alibaba.nacos.shaded.org.checkerframework.checker.units.qual.A;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import io.seata.core.context.RootContext;
import io.seata.rm.tcc.api.BusinessActionContext;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OrderTCCServiceImpl  implements IOrderTCCService {

    @Autowired
    private AccountFeignClient accountFeignClient;

    @Autowired
    private OrderMapper orderMapper;

    @Autowired
    private OrderTXMapper orderTXMapper;

    @Override
    public void tryCreate(String userId, String commodityCode, int count) {
        System.err.println("---------tryCreate-----------");

        //业务悬挂
        OrderTX orderTX = orderTXMapper.selectOne(new LambdaQueryWrapper<OrderTX>().eq(OrderTX::getTxId, RootContext.getXID()));
        if (orderTX != null){
            //存在，说明已经canel执行过类，拒绝服务
            return;
        }

        // 定单总价 = 订购数量(count) * 商品单价(100)
        int orderMoney = count * 100;
        // 生成订单
        Order order = new Order();
        order.setCount(count);
        order.setCommodityCode(commodityCode);
        order.setUserId(userId);
        order.setMoney(orderMoney);
        orderMapper.insert(order);

        OrderTX tx = new OrderTX();
        tx.setTxId(RootContext.getXID());
        tx.setState(OrderTX.STATE_TRY);
        orderTXMapper.insert(tx);

        // 调用账户余额扣减
        String result = accountFeignClient.reduce(userId, orderMoney);
        if (!"SUCCESS".equals(result)) {
            throw new RuntimeException("Failed to call Account Service. ");
        }
    }

    @Override
    public boolean confirm(BusinessActionContext ctx) {
        System.err.println("---------confirm-----------");

        //删除记录
        int ret = orderTXMapper.delete(new LambdaQueryWrapper<OrderTX>().eq(OrderTX::getTxId, ctx.getXid()));
        return ret == 1;
    }

    @Override
    public boolean cancel(BusinessActionContext ctx) {
        System.err.println("---------cancel-----------" );
        String userId = ctx.getActionContext("userId").toString();
        String commodityCode = ctx.getActionContext("commodityCode").toString();
        OrderTX orderTX = orderTXMapper.selectOne(new LambdaQueryWrapper<OrderTX>().eq(OrderTX::getTxId, ctx.getXid()));
        if (orderTX == null){
            //为空， 空回滚
            orderTX = new OrderTX();
            orderTX.setTxId(ctx.getXid());
            orderTX.setState(OrderTX.STATE_CANCEL);
            orderTXMapper.insert(orderTX);
            return true;
        }
        //幂等处理
        if(orderTX.getState() == OrderTX.STATE_CANCEL){
            return true;
        }

        //恢复余额
        orderMapper.delete(new LambdaQueryWrapper<Order>().eq(Order::getUserId, userId).eq(Order::getCommodityCode, commodityCode));

        orderTX.setState(OrderTX.STATE_CANCEL);
        int ret = orderTXMapper.updateById(orderTX);
        return ret == 1;
    }
}

```



**stock-service**

在seata-stock 新增事务状态表

```sql
CREATE TABLE `t_stock_tx` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键',
  `tx_id` varchar(100) NOT NULL  COMMENT '事务id',
   `count` int DEFAULT NULL COMMENT '冻结库存',
  `state` int DEFAULT NULL COMMENT '状态 0try 1confirm 2cancel',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
```

新增domain：StockTX

```java
package cn.wolfcode.tx.stock.domain;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

@Data
@TableName("t_stock_tx")
public class StockTX {

    public static final int STATE_TRY = 0;
    public static final int STATE_CONFIRM = 1;
    public static final int STATE_CANCEL = 2;

    @TableId(type = IdType.AUTO)
    private Integer id;
    private String txId;
    private int count;
    private int state = STATE_TRY;
}

```

新增mapper：StockTXMapper

```java
package cn.wolfcode.tx.stock.mapper;

import cn.wolfcode.tx.stock.domain.StockTX;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;

public interface StockTXMapper extends BaseMapper<StockTX> {
}

```

修改：StockTCCServiceImpl

```java
package cn.wolfcode.tx.stock.service.impl;

import cn.wolfcode.tx.stock.domain.Stock;
import cn.wolfcode.tx.stock.domain.StockTX;
import cn.wolfcode.tx.stock.mapper.StockMapper;
import cn.wolfcode.tx.stock.mapper.StockTXMapper;
import cn.wolfcode.tx.stock.service.IStockService;
import cn.wolfcode.tx.stock.service.IStockTCCService;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import io.seata.core.context.RootContext;
import io.seata.rm.tcc.api.BusinessActionContext;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class StockTCCServiceImpl implements IStockTCCService {

    @Autowired
    private StockMapper stockMapper;
    @Autowired
    private StockTXMapper stockTXMapper;

    @Override
    public void tryDeduct(String commodityCode, int count) {
        System.err.println("---------tryDeduct-----------");
        //业务悬挂
        StockTX stockTX = stockTXMapper.selectOne(new LambdaQueryWrapper<StockTX>().eq(StockTX::getTxId, RootContext.getXID()));
        if (stockTX != null){
            //存在，说明已经canel执行过类，拒绝服务
            return;
        }
        Stock one = stockMapper.selectOne(new LambdaQueryWrapper<Stock>().eq(Stock::getCommodityCode, commodityCode));
        if(one != null && one.getCount() < count){
            throw new RuntimeException("Not Enough Count ...");
        }
        stockMapper.update(null, new LambdaUpdateWrapper<Stock>()
                .setSql("count = count-" + count)
                .eq(Stock::getCommodityCode, commodityCode));

        StockTX tx = new StockTX();
        tx.setCount(count);
        tx.setTxId(RootContext.getXID());
        tx.setState(StockTX.STATE_TRY);

        stockTXMapper.insert(tx);

    }

    @Override
    public boolean confirm(BusinessActionContext ctx) {
        System.err.println("---------confirm-----------");
        //删除记录
        int ret = stockTXMapper.delete(new LambdaQueryWrapper<StockTX>().eq(StockTX::getTxId, ctx.getXid()));
        return ret == 1;

    }

    @Override
    public boolean cancel(BusinessActionContext ctx) {
        System.err.println("---------cancel-----------");
        String count = ctx.getActionContext("count").toString();
        String commodityCode = ctx.getActionContext("commodityCode").toString();
        StockTX stockTX = stockTXMapper.selectOne(new LambdaQueryWrapper<StockTX>().eq(StockTX::getTxId, ctx.getXid()));
        if (stockTX == null){
            //为空， 空回滚
            stockTX = new StockTX();
            stockTX.setTxId(ctx.getXid());
            stockTX.setState(StockTX.STATE_CANCEL);
            if(count != null){
                stockTX.setCount(Integer.parseInt(count));
            }
            stockTXMapper.insert(stockTX);
            return true;
        }
        //幂等处理
        if(stockTX.getState() == StockTX.STATE_CANCEL){
            return true;
        }
        //恢复余额
        stockMapper.update(null, new LambdaUpdateWrapper<Stock>()
                .setSql("count = count + " + count)
                .eq(Stock::getCommodityCode, commodityCode));

        stockTX.setCount(0);
        stockTX.setState(StockTX.STATE_CANCEL);
        int ret = stockTXMapper.updateById(stockTX);
        return ret == 1;
    }
}

```



#### 测试

正常：http://localhost:8088/businesses/purchase?rollback=false&count=2

超库存：http://localhost:8088/businesses/purchase?rollback=false&count=12

超余额：http://localhost:8088/businesses/purchase?rollback=false&count=8

#### 优缺点

**优点**

- 一阶段完成直接提交事务，释放数据库资源，性能好
- 相比AT模型，无需生成快照，无需使用全局锁，性能最强
- 不依赖数据库事务，而是依赖补偿操作，可以用于非事务性数据库

**缺点**

- 代码侵入，需要认为编写try，confirm和cancel接口，麻烦
- 没提交/回滚事务前数据是不一致的，事务属于最终一致
- 需要考虑confirm 和cancel失败情况，要做好幂等处理



### SAGA模式[扩展]

#### 概述

Saga模式是SEATA提供的长事务解决方案，在Saga模式中，业务流程中每个参与者都提交本地事务，当出现某一个参与者失败则补偿前面已经成功的参与者，一阶段正向服务和二阶段补偿服务都由业务开发实现。

简单理解：

saga模式也分为2个阶段

一阶段： 直接提交本地事务(所有RM)

二阶段：一阶段成功了，啥都不做，如果存在某个RM本地事务失败，则编写补偿业务(反向操作)来实现回滚

#### 原理

![Saga模式示意图](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/20230907145430.png)

左边是所有参与者事务，右边是补偿反向操作

正常执行顺序： T1--T2--T3--TN

需要回滚执行顺序：T1--T2--T3--TN---回滚---TN---T3---T2---T1

#### 优缺点

**优点**

- 事务参与者可以居于事件驱动实现异步调用，吞吐量高
- 一阶段直接提交事务，无锁，性能好
- 不用编写TCC中的三哥阶段，实现简单

**缺点**

- 一阶段到二阶段时间不定，时效性差
- 没有锁，没有事务隔离，会有脏写可能



### 模式选择

|          | XA                             | AT                                           | TCC                                            | SAGA                                                         |
| -------- | ------------------------------ | -------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------ |
| 一致性   | 强一致                         | 弱一致                                       | 弱一致                                         | 最终一致                                                     |
| 隔离性   | 完全隔离                       | 基于全局锁                                   | 基于资源预留隔离                               | 无隔离                                                       |
| 代码侵入 | 无                             | 无                                           | 有，编写3个接口                                | 有，编写状态机和补偿业务                                     |
| 性能     | 差                             | 好                                           | 非常好                                         | 非常好                                                       |
| 场景     | 对一致性、隔离性有高要求的业务 | 居于关系型数据库的大部分分布式事务场景都可以 | 对性能要求较高的事务，有非关系型数据参与的事务 | 业务流程长，业务流程多，参与者包含其他公司或者遗留系统服务，无法提供TCC模式要求的是3个接口 |



## 扩展

1：尝试实现若依集成Seata分布式事务

http://doc.ruoyi.vip/ruoyi-cloud/cloud/seata.html#%E5%9F%BA%E6%9C%AC%E4%BB%8B%E7%BB%8D

2：尝试研究一下居于MQ 的分布式事务