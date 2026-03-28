# 一、RocketMQ - 初探门径

## 1.整体认知

- 分布式、队列模型的消息中间件，阿里创建，现为阿帕奇的顶级项目，功能强大。
- 支持集群模型、负载均衡、水平扩展。
- 亿级别消息堆积能力
- 零拷贝原理，顺序写，随机读。
- API 丰富，同步 异步 顺序 延迟 事务消息都支持。
- 底层通信采用 Netty 。
- NameServer 代替 Zookeeper 。
- 消息失败重试机制、消息可查询。
- 开源社区活跃，经过双十一考研。

## 2.核心概念模型

> 

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220501175221159.png)

√ producer Group ：生产者集合。用于发送一类消息。

√ consumer Group ：生产者集合。用于发送一类消息。

√ Broker ： 用于消息存储和转发，中转角色。

## 3.源码结构解析



![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220501175938025.png)

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220501180026405.png)

![image-20220501180053081](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220501180053081.png)

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220501180113571.png)

## 4.环境搭建

### 原生安装

https://blog.csdn.net/qq_34375473/article/details/122779239

```shell
 ## 修改broker.conf 的配置，将broker注册到NameServer，DashBoard监控的是NameServer。
 namesrvAddr = 127.0.0.1:9876
 brokerIP1 = 101.43.138.173
 ## 启动broker时设置自动创建topic
 nohup sh bin/mqbroker -n 101.43.138.173:9876 -c ./conf/broker.conf autoCreateTopicEnable=true &
```

### 容器化安装

## 5.可视化控制台

https://github.com/apache/rocketmq-dashboard

<img src="https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220506124021509.png" style="zoom:25%;" />



# 二、RocketMQ - 极速入门



## 1.生产者模型使用

> 总体步骤
>
> 1. 创建生产者对象 defaultMQProducer
> 2. 设置NameServerAdd
> 3. 启动生产者服务
> 4. 创建消息并发送

```java
public class Producer {
    public static void main(String[] args) throws MQClientException, MQBrokerException, RemotingException, InterruptedException {
        DefaultMQProducer producer = new DefaultMQProducer("test_quick_producer_name");
        // 设置 NameServerAdd
        producer.setNamesrvAddr(Const.NAMESRV_ADDR_SINGLE);
        producer.start();

        for (int i = 0; i < 5; i++) {
          // 如果没设置自动创建 topic 需要先创建 topic
            Message message = new Message("test_quick_topic",    //	主题
                    "TagA", //	标签
                    "key-" + i,    // 	用户自定义的key ,唯一的标识
                    ("Hello RocketMQ" + i).getBytes()
            );
            SendResult result = producer.send(message);
            System.out.println(result);
        }

        producer.shutdown();

    }

}
```



## 2.消费者模型使用

>  总体步骤
>
> 1. 创建消费者对象 
> 2. 设置NameServerAdd及消费位置（first and last）
> 3. 进行订阅主题
> 4. 注册并监听消费



```java
public class Consumer {
    public static void main(String[] args) throws MQClientException {
        DefaultMQPushConsumer consumer = new DefaultMQPushConsumer("test_quick_consumer_name");
        consumer.setNamesrvAddr(Const.NAMESRV_ADDR_SINGLE);

        consumer.setConsumeFromWhere(ConsumeFromWhere.CONSUME_FROM_LAST_OFFSET);
        // 订阅topic
        consumer.subscribe(Const.TEST_QUICKSTART_TOPIC, "TagA"); // "*"
        // 监听
        consumer.registerMessageListener(new MessageListenerConcurrently() {
            @Override
            public ConsumeConcurrentlyStatus consumeMessage(List<MessageExt> msgList,
                                                            ConsumeConcurrentlyContext consumeConcurrentlyContext) {

                // TODO: 2022/5/6 批量发送还是单个发送 
                MessageExt messageExt = msgList.get(0);
                try {

                    System.out.println(messageExt.getProperties().toString());
                    System.out.println(new String(messageExt.getBody(), RemotingHelper.DEFAULT_CHARSET));
                    int a = 3/0;
                } catch (Exception e) {
                    // messagrDelayLevel  共重试15次
                    e.printStackTrace();
                    int reconsumeTimes = messageExt.getReconsumeTimes();
                    System.err.println("reconsumeTimes: " + reconsumeTimes);
                    if (reconsumeTimes == 3){
                        System.out.println("------重试第三次，计入日志做补偿");
                        return ConsumeConcurrentlyStatus.CONSUME_SUCCESS;
                    }
                    return ConsumeConcurrentlyStatus.RECONSUME_LATER;
                }
                return ConsumeConcurrentlyStatus.CONSUME_SUCCESS;
            }
        });

        consumer.start();
        System.err.println("consumer start...");
    }
}
```



## 3.四种集群环境

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220506222548604.png)

1.单点模式

以上部署模式，练习使用

2.主从模式

从节点只消费，不接受生产者推送，主要防止消息丢失，不支持主从切换。

3.双主模式

主流，无从节点的数据同步耗时

4.双主双从

实战使用，**同步双写，异步复制。**

## 4.主从环境

主从模式保证消息的即时性和可靠性。

如何演练：

- 发送一条消息，关闭主节点，能否发送（**同步输盘 or 异步刷盘**）？
- 从几点可以提供消费者消费，但无法接收。
- 主节点恢复后，需要与从节点同步 offset，避免重复消费。

```shell
## 关闭 rockerMQ
./mqshutdown broker
./mqshutdown namesrv

## 主从配置  使用2m-2s-async/broker-a-s.properties  broker-a.properties
## 1.配置NameServer集群 ；隔开
## 2.从节点brokerID 大于 0 
## 3.brokerRole SLAVE
## 4.brokerIP1 = 101.43.138.173  ## 一定要配 坑
```

![image-20220506235527098](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220506235527098.png)



## 5.高可用故障演练

演练失败，考虑原因为 **异步刷盘** 需要写入数据超过页大小才会触发。

后续研究。

# 三、RocketMQ - 生产者核心

## 1.配置参数讲解

1.ProduceGroup 生产者组



2.createTopicKey



3.defaultTopicQueueNums 默认为4



4.sendMessageTimeOut 超时时间 毫秒



5.compressMsgBodyOverHowmuch默认压缩字节 4096



6.retryTimesWhenSendFailed 重试次数



7.retryAnthorBrokerWhenNotStoreOK 默认 false



8.maxMessageSize 默认 128k



> 可在配置文件配置，也可以在 api 设置

```java
DefaultMQProducer producer = new DefaultMQProducer("test_quick_producer_name");
        // 设置 NameServerAdd
        producer.setNamesrvAddr(Const.NAMESRV_ADDR_MASTER_SLAVE);
        
        // 生产者参数配置
        producer.setRetryTimesWhenSendFailed();
        producer.start();
```

## 2.主从同步机制解析

同步信息：元数据 + 消息内容

元数据同步：Broker 进行角色识别 ，Slaver 则启动同步任务，基于 netty 定时任务。

消息内容：通过 commitLog 进行同步，基于 socket。

**commit log**：源码位于 rocket-store 下，HAServer 400 行左右

通过 offset 判断是否同步一致

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220508234025662.png)

## 3.同步/异步消息发送

> 核心代码位于 DefaultMQProducerImpl 类中。

**同步**

```java
SendResult result = producer.send(message);

public SendResult send(Message msg,
        long timeout) throws MQClientException, RemotingException, MQBrokerException, InterruptedException {
  // callback 传 null
        return this.sendDefaultImpl(msg, CommunicationMode.SYNC, null, timeout);
    }
```

**异步**

需要一个 callback

```java
@Deprecated
    public void send(final Message msg, final SendCallback sendCallback, final long timeout)
        throws MQClientException, RemotingException, InterruptedException {
        final long beginStartTime = System.currentTimeMillis();
        ExecutorService executor = this.getAsyncSenderExecutor();
        try {
            executor.submit(new Runnable() {
                @Override
                public void run() {
                    long costTime = System.currentTimeMillis() - beginStartTime;
                    if (timeout > costTime) {
                        try {
                            sendDefaultImpl(msg, CommunicationMode.ASYNC, sendCallback, timeout - costTime);
                        } catch (Exception e) {
                            sendCallback.onException(e);
                        }
                    } else {
                        sendCallback.onException(
                            new RemotingTooMuchRequestException("DEFAULT ASYNC send call timeout"));
                    }
                }

            });
        } catch (RejectedExecutionException e) {
            throw new MQClientException("executor rejected ", e);
        }

    }
```

**异步消息实战**

```java
// 异步发送  是用的策略模式吗？
            producer.send(message, new SendCallback() {
                @Override
                public void onSuccess(SendResult sendResult) {
                    System.err.println("msgId: " + sendResult.getMsgId() + ", status: " + sendResult.getSendStatus());
                }

                @Override
                public void onException(Throwable e) {
                    e.printStackTrace();
                    System.err.println("------发送失败");
                }
            });
```

**消息发送大致流程**

> 1.检验producer处于运行状态
>
> 2.检验消息格式
>
> 3.记录发送时间和消息编号
>
> 4.从 hashmap 缓存中查找 topic （从 NameServe 拉取 topic 信息）
>
> 5.选择发送的队列
>
> 6.发送的次数
>
> 7.核心发送方法（**sendKernelImpl**）
>
> 8.发送完成记录时间
>
> 9.更新 broker 的信息

**核心发送消息方法**

```java
private SendResult sendKernelImpl(final Message msg,
        final MessageQueue mq,
        final CommunicationMode communicationMode,
        final SendCallback sendCallback,
        final TopicPublishInfo topicPublishInfo,
        final long timeout){
  			// 消息复制 压缩
  			// 事务
  			// 构建请求 netty
  			// 发送
  			
        }
```

## 4.底层Netty通信

位于 rocket-remoting 包下。

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220509004254687.png)

**Netty 编解码**

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220509005012988.png)

消息长度：4字节

序列化类型及头部长度：4字节

消息头数据：序列化后的数据，fastjson

主体数据：二进制数据

参考 NettyEncoder NettyDeocder 方法

## 5.消息返回的状态

1.SEND_OK

2.FLUSH_DISK_TIMEOUT 刷盘超时，有丢失风险

3.FLUSH_SLAVE_TIMEOUT 同步从节点超时，有丢失风险

4.SLAVE_NOT_AVAILABLE 从节点不可用，有丢失风险

## 6.延迟消息投递

消息发送到 Broker 之后 ，特定时间才会被消费，由 Broker 实现。

支持固定精度的消息。会影响消息排序和定时任务。

MessageStoreConfig 配置。setDelayTimeLevel 设置。

 ```java
  message.setDelayTimeLevel();
 
 public void setDelayTimeLevel(int level) {
         this.putProperty("DELAY", String.valueOf(level));
     }
 
 private Map<String, String> properties;
 ```



## 7.自定义消息发送规则

1.指定队列 

```java
SendResult result = producer.send(message, new MessageQueueSelector() {
                @Override
                public MessageQueue select(List<MessageQueue> mqs, Message msg, Object arg) {
                    return mqs.get((Integer) arg);
                }
            },1);
// 1 是队列编号
```







# 四、RocketMQ - 消费者核心

## 1.配置参数讲解

1.ConsumeFromWhere 

2.AllocateMessageQueueStrategy 队列策略，

3.subscribe  String topic, String fullClassName, String filterClassSource

4.Offset

……

## 2.集群与广播模式

集群模式：groupName 把多个Consumer组织到一起。相同groupName的consumer只会消费一部分，达到自然的负载均衡。

广播模式：一条消息会被每一个消费者消费。

```java
consumer.setMessageModel(MessageModel.CLUSTERING);
consumer.setMessageModel(MessageModel.BROADCASTING);
```



## 3.消息存储核心 - Offset 解析

- Offset 是消费进度的核心

- 某个topic下的一条消息在某个messageQueue的位置。
- 通过offset可以定位到这条消息。
- offset的存储分为远程文件类型和本地文件类型

remoteBrokerOffsetStore：默认集群模式用远程文件存储offset，因为每个消费者只消费主题的一部分（负载均衡），需要broker控制offset的值。

LocalFileOffsetStore：广播模式，每个消费者都会收到消息且消费，互相不干扰，独立线程消费。

## 4.消费者底层解析与实践



## 5.消息推拉模式解析

pull or push？推荐 pull 

如何保证消息及时收到？

本地如何记录offset？

**长轮询模式** long pull

- 消费者主动发请求到去broker拉消息
- 如果没有消息会阻塞15秒，并不是立即返回。即等待15秒。
- 提高了及时性，同时减轻broker压力。
- consumer调优

代码 long-pulling



pull主要做了三件事：

- 获取message queue 并遍历
- 维护offset
- 根据消息状态做不同的处理

代码 consumer-pull



# 五、RocketMQ - 原理解析

## 1.消息存储结构解析

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220515133129687.png)

Commit Log：

顺序读，随机写。



## 2.同步/异步刷盘解析

消息存储：内存+磁盘

同步刷盘：落盘之后再返回，数据强安全机制

异步刷盘：存入内存就返回，后台线程写入磁盘

## 3.同步/异步复制解析

发生在主从之间。

同一组broker有maste-slave角色

异步复制：master写盘成功之后直接返回

同步复制：slave写盘之后才返回，同时成功，同时失败，保证原子性。

线上配置方案推荐：

同步刷盘，异步复制。

## 4.高可用机制解析

主从模式,读写分离。

brokerId 为 0是 master.

## 5.NameServer 协调者解析

为什么需要 NameServer？

管理节点、注册中心、状态服务器。

NameServer多个部署，相互独立，每个节点都需要向多个NameServer注册。

为什么不用Zookeeper？

zk功能过于复杂，不适用Rocket。

NameServer主要维护的信息：

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220515140144179.png)



# 六、RocketMQ - 集群实战



## 1.组件高性能MQ服务



## 2.集群拓扑图解析



## 3.配置文件最优设置



## 4.双主双从环境构建与调优



# 七、RocketMQ - 高并发场景分析



## 1.加入购物车

缓存设计：根据业务维度设计

添加商品操作：根据路由key路由到不同的Redis集群

集群不宜过大：一主两从

数据同步问题：参考mysql binlog 配合RDB+AOF

## 2.用户下单

根据业务维度请求不同的SET化服务器进行处理

高并发问题：流控、降级、兜底

订单与库存一致性问题：数据库结构设计，接口幂等性，分布式锁。

## 3.用户支付

A账户-money B账户+money

传统方式：微服务同步调用强一致性

MQ方式：拆分复杂业务，保证可靠性投递+补偿机制

## 4.高并发抗压方案解析

- 前端DNS解析/软硬负载均衡设施进行分流/限流

- 缓存的业务维度拆分

- 微服务流控（RateLImiter / 信号量 / hystrix）

- 微服务熔断 降级

- 接口幂等性保障 分布式锁

- 分库分表策略

- 冷热数据 读写分离

- 数据过滤 业务解耦 微服务拆分

- 顺序消息机制，局部顺序

- 分布式事务



# 八、微服务基础架构搭建

## 1.理解 Dubbo 与 Zookeeper

dubbo：基于netty的嵌入式（spi）rpc调用。

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220515153051443.png)

注册中心：Redis ZK 默认内存

Zookeeper：分布式协调框架，实现集群间节点的协调。

树形文件结构，保证数据在集群间的一致性。

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220515153446742.png)

下载地址：https://archive.apache.org/dist/zookeeper/

用 3.4 版本

集群搭建：https://zhuanlan.zhihu.com/p/377136658

```
server.1=101.43.138.173:2881:3881 
server.2=101.43.138.173:2882:3882
server.3=101.43.138.173:2883:3883
```

集群搭建失败。

## 2.整合 mybatis



## 3.整合 Dubbo + springboot



## 4.数据库表结构设计



# 九、高并发抗压策略设计与实战



## 1. 前端组件分流/限流策略



## 2.多集群缓存，路由策略设计



## 3.Hystrix 断路器详解



## 4.下单与库存扣减抗压实战



# 十、分布式事务消息讲解



## 1.分布式事务消息理解



## 2.RocketMQ事务消息机制分析



## 3.支付场景去重机制



## 4.支付场景下的分布式事务实战



# 十一、微服务解耦，高性能消费币讲解



## 1.顺序消息思想与场景分析



## 2.RocketMQ顺序消息讲解



## 3.支付通知回调实战



## 局部顺序消息投递实战



# 十二、性能优化与提升讲解



## 1.Tag 方式进行消息过滤



## 2.SQl表达式进行消息过滤



## 3.Filter Server 组件进行消息过滤



## 4.多生产者发送，OnyWay 发送

