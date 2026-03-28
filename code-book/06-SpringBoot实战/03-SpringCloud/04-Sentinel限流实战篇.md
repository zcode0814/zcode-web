Sentinel配置持久化到Nacos实现流控熔断

## 控制台

> jar 下载：https://github.com/alibaba/Sentinel/releases

**启动参数**

```shell
# 将控制台自身接入到sentinel
nohup java -jar -Dproject.name=sentinel-dashboard -Dcsp.sentinel.dashboard.server=localhost:8181 sentinel-dashboard-1.8.5.jar --server.port=8181 &> sentinel.log &
# -Dsentinel.dashboard.auth.username=sentinel 
# -Dsentinel.dashboard.auth.password=sentinel 
```

```java
public static void main(String[] args) {
    // VM Options:-Dcsp.sentinel.dashboard.server=localhost:8080
    System.out.println(System.getProperty("csp.sentinel.dashboard.server"));
    SpringApplication.run(DemoApplication.class, args);
}
```



**控制台页面**

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220818091235212.png)

**心跳时间**

通过多次刷新页面，发现默认每隔10秒发送一次心跳。

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220818091538282.png)

**规则下发**

端口配置会在应用对应的机器上启动一个 **Http Server** ，该 Server 会与 **Sentinel 控制台** 做交互。

比如 Sentinel 控制台添加了一个限流规则，会把规则数据 push 给这个 Http Server 接收，Http Server 再将规则注册到 Sentinel 中。

## 接入Nacos

**pom**

```xml
<!-- spring cloud alibaba nacos discovery 依赖 -->
        <dependency>
            <groupId>com.alibaba.cloud</groupId>
            <artifactId>spring-cloud-starter-alibaba-nacos-discovery</artifactId>
            <version>2.2.3.RELEASE</version>
        </dependency>

        <dependency>
            <groupId>com.alibaba.cloud</groupId>
            <artifactId>spring-cloud-starter-alibaba-sentinel</artifactId>
            <version>2021.1</version>
        </dependency>
        
```



**yaml**

```yaml
spring:
  application:
    name: cloud-alibaba-sentinel
  cloud:
    nacos:
      discovery:
        enabled: true
        server-addr: 101.43.160.149:8848
        namespace: 9862bd7f-2dc2-47a4-9c80-c6290c5c3e2b
        metadata:
          management:
            context-path: ${server.servlet.context-path}/actuator
      config:
        enabled: false
#        namespace:
#        group:
    sentinel:
      transport:
        # 101.43.138.173
        dashboard: localhost:8181
        port: 8182
#        clientIp: localhost
```

> 本地连接服务器的sentinel，能注册上但是没有实时监控也没有链路，换了版本也不行。
>
> 最后还是用的本地sentinel，如果有知道解决方法的可以评论。

## 流控案例

**名词解释**

- 资源名 ：唯一名称，默认请求路径。资源是 Sentinel 的关键概念。它可以是 Java 应用程序中的任何内容，例如，由应用程序提供的服务，或由应用程序调用的其它应用提供的服务，甚至可以是一段代码。这里的 `/test-a` 接口url就是资源。
- 针对来源 ：就是调用者。Sentinel 可以针对调用者进行限流，这里填写微服务名，默认default就是不区分来源。
- 阈值类型、 单机阈值：这里区分 QPS和 并发线程数。
  - **QPS** ：Query Per Second，每秒请求的数量，当调用该请求API每秒请求的数量达到配置的 `阈值` 的时候，进行限流。
  - **并发线程数** ： 当调用该请求API的线程数量达到配置的 `阈值` 的时候，进行限流。
- 流控模式 ：资源的调用关系，流控模式分为 直连 、关联、链路
  - **直连模式** ：请求的API（比如此时的 `/test-a` ）达到限流条件（配置的阈值）时，直接进行限流；
  - **关联模式** ：当关联的资源达到配置的 `阈值` 时，就限流自己，比如 `/test-a` 需要读取数据 `c` ， `/test-b` 则是更改数据 `c` ，他们之间有个 `争抢资源` 的关系，如果放任这两个操作 争抢资源，则 `争抢` 本身带来的开销会降低整体的 **吞吐量** 。此时对 `/test-a` 设置限流规则流控模式为关联，关联资源为 `/test-b` ， 那么当 `/test-b` 写数据 `c` 的操作过于频繁时，则限制 `/test-a` 读取 `c` 的操作。
  - **链路模式** ：Sentinel 记录着资源之间的调用链路，这些资源通过调用关系，相互之间构成一棵调用树。`链路模式` 就是只关心这颗树上 **指定的一条链路** 上是否达到阈值而进行限流，不关心其他调用路径上的调用。
- 流控效果：控制的效果，有 快速失败 、冷启动（或称 预热 、Warm Up）、 排队等待。流控效果只在阈值类型为QPS时才有效，阈值类型为线程数的流控效果是如果超出阈值，新的请求会被立即拒绝。
  - **快速失败** ：默认的流量控制方式，当QPS超过任意规则的阈值后，新的请求就会被立即拒绝，拒绝方式为抛出 `FlowException` 。
  - **Warm Up** ：预热/冷启动方式。根据 `codeFactor`（冷加载因子，默认3）的值，请求 `QPS` 从 阈值/codeFacotor阈值/codeFacotor阈值/codeFacotor 开始，经 `预热时长` 逐渐升至设定的 `QPS` 阈值。
  - **排队等待** ：这种方式会严格控制请求通过的间隔时间，也即是让请求以均匀的速度通过。

**流控测试**

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220818124436004.png)





![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220818124307022.png)





## 熔断案例

来看一下熔断规则的这些字段：

- `资源名` ：唯一名称，默认请求路径。
- `熔断策略` ：包括 **慢调用比例** ， **异常比例** ， **异常数** 。
- `最大RT` ：RT 就是响应时间，这里设置 **最大响应时间** 。熔断策略配置为 `慢调用比例` 时，必须设置该字段，用来确定哪些请求时慢调用。
- `比例阈值` ：配置 `慢调用比例` 时该值为慢调用占所有请求的比例上限；配置 `异常比例` 时为请求异常所占比例的上限。取值范围：0 ~ 1。
- `异常数` ：就是请求的异常数量。注意：Sentinel 中异常降级的统计是仅针对 **业务异常** ，Sentinel 进行降级时本身的异常（`BlockException`）是不生效的。
- `熔断时长` ：熔断经过该值后恢复到 **HALF-OPEN** 状态。HALF-OPEN 状态：熔断后经过熔断时长后的第一个请求成功而没有错误则恢复正常结束熔断，否则继续熔断。
- `最小请求数` ：请求数目大于该值时才会根据配置的熔断策略进行降级。
- `统计时长` ：应该和上面几个字段联合起来理解：当 `单位统计时长` 内满足请求数目大于 `最小请求数` 时才会根据配置的熔断策略进行降级。



![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220818125201538.png)

该配置将要达到的效果是： **1秒（1000ms）内达到10个请求以上，当响应时长超过0.5秒的请求数量大于1（10 * 0.1）个的时候进行熔断，熔断5秒后变成 Half Open 状态，即5秒后的第一个请求若没有问题则恢复正常，否则继续熔断。** 这是一个 `慢调用比例` 的熔断策略。



## 配置持久化

在 `Sentinel DashBoard` 上配置的规则只存在缓存中，当项目重启，这些规则就消失了。如何持久化配置信息呢？

Sentinel 提供多种不同的数据源来持久化规则配置，包括 `File` ，`Redis` 、`Nacos` 、`ZooKeeper` 等。

**pom**

```xml
<!-- 引入 Sentinel 数据源 -->
<dependency>
    <groupId>com.alibaba.cloud</groupId>
    <artifactId>spring-cloud-alibaba-sentinel-datasource</artifactId>
</dependency>
<!-- Sentinel数据源之 Nacos -->
<dependency>
    <groupId>com.alibaba.csp</groupId>
    <artifactId>sentinel-datasource-nacos</artifactId>
</dependency>
```

**流量控制规则（FlowRule）**

- `resource` ：资源名，资源名是限流规则的作用对象，比如请求资源 `getUser` 。
- `grade` ：限流阈值类型，QPS 或线程数模式。0表示线程数，1表示QPS。默认为1，即 QPS 模式
- `count` ：限流阈值。比如值为2表示1秒超过2个请求就限流。
- `strategy` ：流控模式：直接、链路、关联，默认 `直接` 。0表示直接，1表示关联，2表示链路。
- `controlBehavior` ：流控效果（直接拒绝 / 排队等待 / 慢启动模式），0表示快速失败，1表示Warm Up，2表示排队等待。
- `limitApp` ：流控针对的调用来源。默认就是 `default` ，代表不区分调用来源.

**熔断降级规则 （DegradeRule）**

- `resource` ：资源名，资源名是限流规则的作用对象，比如请求资源 `getUser` 。
- `grade` ：熔断策略，支持慢调用比例/异常比例/异常数策略。1：慢调用比例，2：异常比例，3：异常数。默认为1，慢调用比例。
- `count` ：慢调用比例模式下为慢调用临界 RT（超出该值计为慢调用）；异常比例/异常数模式下为对应的阈值。
- `timeWindow` ：熔断时长，单位为秒。
- `minRequestAmount` ：熔断触发的最小请求数，请求数小于该值时即使异常比率超出阈值也不会熔断。默认为 5 。
- `statIntervalMs` ：统计时长（单位为 ms），如 60*1000 代表分钟级。默认为 1000 ms。
- `slowRatioThreshold` ：慢调用比例阈值，仅慢调用比例模式有效

**示例**

```json
[
  {
    "resource": "/user/findById",
    "limitApp": "default",
    "grade": 1,
    "count": 2,
    "strategy": 0,
    "controlBehavior": 0,
    "clusterMode": false
  }
]
```

**yaml**

```yaml
spring:
  application:
    name: cloud-commerce-user
#  zipkin:
#    #    sender:
#    #       type: kafka # 默认是 web
#    base-url: http://101.43.160.149:9411/
  cloud:
    nacos:
      discovery:
        enabled: true
        server-addr: 101.43.160.149:8848
        namespace: 9862bd7f-2dc2-47a4-9c80-c6290c5c3e2b
        metadata:
          management:
            context-path: ${server.servlet.context-path}/actuator
    sentinel:
      transport:
        # 101.43.138.173
        dashboard: localhost:8181
        port: 8182
#        clientIp: localhost
      datasource:
        nacos: # 这个名字任意起
          nacos:
            serverAddr: 101.43.160.149:8848
            groupId: DEFAULT_GROUP
            dataId: cloud-sentinel-rule
            namespace: 9862bd7f-2dc2-47a4-9c80-c6290c5c3e2b
            ruleType: flow
            data-type: json
```

发布配置之后重启项目，访问流控的资源，规则就会被拉取到 sentinel-dashbroad 。

在 nacos 更改配置，也会实时更新。

![image-20220818143110934](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220818143110934.png)

## 双向推送

大佬改造之后的 dashboard ：https://github.com/CHENZHENNAME/sentinel-dashboard-nacos



## 架构分析

> 官网：https://sentinelguard.io/zh-cn/
>
> wiki：https://github.com/alibaba/Sentinel/wiki

![image-20220821103024712](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220821103024712.png)

**官方架构图**















## 限流算法

单独一篇或汇入小册源码



## 源码深入

跳转 Framework - SpringCloud - 掘金小册-Sentinel源码





