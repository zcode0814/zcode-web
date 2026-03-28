# 小册篇

> 掘金小册——基于Nacos 1.4.1 的源码讲解，后续补充了2.2版本
>
> https://github.com/alibaba/nacos/issues/5363

## 为什么看Nacos源码

- 代码简单清晰
- 涉及的分布式设计理念很多
- 工作中最常用

## 架构图

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20230227142909347.png)

带着疑问看源码：

- Nacos的启动过程做了什么？
- 客户端如何注册到nacos？
- 心跳检测机制如何实现的？
- CAP如何设计的？
- 如何做的配置刷新？
- 如何做的服务下线？
- 如何结合的dubbo、spring cloud？

## 源码环境

github下载 1.4.1 源码，导入Idea，设置好jdk和maven，先编译在启动。

```
# vm options 以单机模式启动
-Dnacos.standalone=true
```



```java
# 主启动类
package com.alibaba.nacos;
public class Nacos {
    public static void main(String[] args) {
        SpringApplication.run(Nacos.class, args);
    }
}
```



![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20230227144648386.png)

## 客户端如何注册，如何发送心跳

### 何时自动注册

**主线任务：Nacos 客户端项目启动为什么会自动注册服务？**

首先我们从导入的客户端依赖开始，查看其`spring.factories`文件自动装配了哪些类,根据名字猜测一个和自动注册有关的类，如下：

```
com.alibaba.cloud.nacos.registry.NacosServiceRegistryAutoConfiguration,
```

进入该类发现往容器里放入了三个`bean`，分别进入三个类查看，第一次看到了注册方法`register()`，那我们此时应该关注何时何地调用了该方法，查找其`usage`，引出`AbstractAutoServiceRegistration`，根据方法往上找发现`onApplicationEvent()`方法，得出其是基于spring事件监听机制的调用方式，关于事件机制的演示案例：

```java
@Slf4j
@Component
public class SpringStartListener implements ApplicationListener<WebServerInitializedEvent> {
    @Override
    public void onApplicationEvent(WebServerInitializedEvent webServerInitializedEvent) {
        log.info("Listening to spring start successfully,then to do something");
    }
}
```



![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20230227170451888.png)

### 通过什么方式注册

**此次主线任务：Nacos 客户端到底通过什么方式，往服务端发起注册的？**





![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20230227182522970.png)















![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20230301115033208.png)

## 服务注册变更，推还是拉

https://mp.weixin.qq.com/s/vCwfI5spW57X-tG8C7a87Q

那么，真实情况下，Nacos cleint 究竟是如何从 server 端获取到服务列表的呢？也不卖关子了，直接给结论

- 在 Nacos 1.x 中，Nacos 采用的是定时拉 + udp 推送的机制。客户端会启动一个定时器，每 10s 拉取一次服务，确保服务端服务版本一致，为了解决 10s 间隔内服务更新了，客户端却没有及时收到通知的这一问题，Nacos 还在服务端服务更新时，触发了一次 udp 推送，失败后重试两次。

- 在 Nacos 2.x 中，Nacos 采用的是服务端 tcp 推送的机制。客户端启动时会跟服务端建立一条 tcp 长连接，服务端服务变更后，会复用客户端建立的这条连接进行数据推送。

所以在回答，Nacos 到底是推模型还是拉模型时，需要区分版本来回答。



## Raft协议

> [Raft协议相关论文](https://raft.github.io/raft.pdf)
>
> [Raft详细流程演示网站](https://thesecretlivesofdata.com/raft/)

AP 架构很好理解，那在 CP 架构中，是如何做到数据保证一致性的呢？这个就是 Raft 协议定义要做的事情。

`Raft协议就是在分布式架构下，多节点保证数据一致性协议`。

### Raft协议讲解

在Raft理论中，它把每一个集群节点定义了`三种状态`。

- Follower 追随者：默认状态，所有的集群节点一开始都是 Follower 状态。

- Candidate 候选者：当某集群节点开始发起投票选举 Leader 的时候，首先会投给自己一票，这个时候就会从 Follower 变成 Candidate。

- Leader 领导者：当某集群节点获得了大多数集群节点的投票，那么就会变成 Leader。

Raft协议中不仅仅定义了节点的三种状态，而是一整套来保证数据一致性的流程，那么我们先来了解一下，Raft是如何处理一次数据写入请求。

**Raft 数据同步流程**

> 在Raft协议中，只有Leader节点可以处理请求，其他节点会将接收到的请求都转发给 Leader 节点。
>
> 使用`两阶段提交`，来保证数据正确地写入成功，即数据的写入一共有两个状态：uncommit、commit。

假设有三个节点，开始时都是 Follower 状态，当其收不到来自 Leader 的心跳时，转变为 Candidate 状态。

候选者便会请求其他节点投票，其他节点返回投票结果，候选者变为 Leader。

Leader 会处理所有客户端端请求，并将每一个变化以 entry 的形式保存到日志中，此时日志是 uncommit 状态，当大部分节点都已经到同步完数据的变化后，Leader 才会提交数据，然后再通知 Follower 节点，数据已提交。

以上称为`日志复制`



**选举流程**

在Raft中，有两个控制选举的超时设置：

- 选举超时：Follower 成为 Candidate 的等待时间，是一个在 150ms 和 300ms 之间的随机值。

当 Follower 变为候选者时，会先给自己投一票，然后发请求给其他节点拉票，如果其他节点在这一轮中还没有投票，那么它就会投给候选者并重置其选举超时。

一旦一个候选者获得超过半数的投票，就会成为 Leader 并开始向 Follower 发送 Append Entries 信息，这些消息的发送间隔由心跳超时来决定：

- 心跳超时：

这个选举期限将持续到一个追随者停止接受心跳并成为候选人为止。

如果两个候选者同时发出拉票申请，那么将会开启新的一轮选举。

## 客户端如何感知配置变更





# 复盘篇

> 本篇主要是对 2.2 版本源码的补充梳理及前一部分的复盘和重学。

## 温故知新

### 架构图

首先后顾架构图，理清源码的几大模块及其作用。

- naming 服务发现和注册
- config 配置中心
- core 核心模块
- consistency 一致性
- distribution 集群
- console 页面控制台

### 单模块启动

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/20230628175042.png)

### 服务注册发现



SpringApplicationRunListeners 是 Spring Boot 中的一个接口，用于在应用程序启动过程中监听和处理事件。它可以让开发人员在应用程序启动的不同阶段执行自定义的逻辑。
 要基于 SpringApplicationRunListeners 扩展功能，可以按照以下步骤进行操作：

  1. 创建一个实现 SpringApplicationRunListener 接口的类，该类将负责处理应用程序启动过程中的事件。可以通过实现接口的各个方法来定义自己的逻辑。
  2. 在 Spring Boot 应用程序的 META-INF/spring.factories 文件中，添加以下配置：

    org.springframework.boot.SpringApplicationRunListener=com.example.YourSpringApplicationRunListener
    其中，com.example.YourSpringApplicationRunListener 是你创建的类的全限定名。
  3. 在 YourSpringApplicationRunListener 类中，实现接口的各个方法，根据需要执行自定义的逻辑。例如，在 starting() 方法中可以处理应用程序启动前的逻辑，在 environmentPrepared() 方法中可以处理环境准备的逻辑，在 contextPrepared() 方法中可以处理上下文准备的逻辑等等。
     通过上述步骤，你可以基于 SpringApplicationRunListeners 接口来扩展 Spring Boot 应用程序的功能，并在应用程序启动的不同阶段执行自定义的逻辑。



好的，下面是使用 SpringApplicationRunListeners 打印自定义的启动横幅的案例：
1. 创建一个实现 SpringApplicationRunListener 接口的类，我们称之为 CustomBannerListener。以下是一个示例实现：
import org.springframework.boot.SpringApplication;
import org.springframework.boot.SpringApplicationRunListener;
import org.springframework.context.ConfigurableApplicationContext;
 public class CustomBannerListener implements SpringApplicationRunListener {
     public CustomBannerListener(SpringApplication application, String[] args) {
        // 构造函数实现
    }
     @Override
    public void starting() {
        // 在应用程序启动前打印自定义横幅
        System.out.println("自定义横幅：欢迎使用我的应用程序");
    }
     // 实现其他方法...
 }
2. 在 Spring Boot 应用程序的 META-INF/spring.factories 文件中，添加以下配置：
org.springframework.boot.SpringApplicationRunListener=com.example.CustomBannerListener
其中，com.example.CustomBannerListener 是你创建的类的全限定名。
3. 在你的项目中，创建一个启动类，并在 main 方法中调用 SpringApplication.run() 方法启动应用程序。例如：
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
 @SpringBootApplication
public class YourApplication {
     public static void main(String[] args) {
        SpringApplication.run(YourApplication.class, args);
    }
 }
当你启动应用程序时，CustomBannerListener 中的 starting() 方法将会被调用，并打印自定义的启动横幅。
