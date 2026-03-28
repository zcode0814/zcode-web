> jk-Kafka核心技术与实战

## 关于 Kafka

大部分人觉得 Kafka 是一个消息队列，但实际官方称之为实时流处理平台，即其是为大数据或数据密集型应用设计的。

AI、大数据、云计算，算是当前能看的见影子的三大热门方向，其中大数据落地实现的最好，各省健康宝就是个最简单的例子，没有太多的计算，主要就是大量数据的存储和查询，以及随机要面对的数据激增、数据变化速率快问题。

Kafka 在帮助你应对这些问题方面能起到非常好的效果。就拿数据量激增来说，Kafka 能够有效隔离上下游业务，将上游突增的流量缓存起来，以平滑的方式传导到下游子系统中，避免了流量的不规则冲击。

**学习路线**

首先是对官网案例的运行个理解，然后理解各种API，做一下实战的测试和使用。

然后就是编写一个小项目来验证成果，结合实现基本功能。

之后就是改善和提升客户端的可靠性和性能，这就需要你了解各种参数配置和一些核心源码，把这步做好就已经超过了大部分人。

然后是学习 Kafka 的高级功能，比如流处理应用开发。流处理 API 不仅能够生产和消费消息，还能执行高级的流式处理操作，比如时间窗口聚合、流处理连接等。

最后就是靠实战演练，运维管理，故障处理，神枪手都是子弹喂出来的，技术专家也是靠实战练出来的！

> 该导图需要不断完善。Stay focused and work hard！

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20221010113529610.png)



## 源码环境搭建

> 1.安装 scala 插件即可
>
> 2.gradle 环境 idea 会自动为我们安装，不再需要单独安装配置

**源码地址**

```
git clone https://github.com/apache/kafka.git
```

**导入 Idea**

导入之后会自动下载构建 gradle ，关于 gradle ，你可以认为他和 Maven 是一样的产品，想了解的更多可以以去搜索其他文章，这不是本文的重点。

构建的过程时间会比较长，请耐心等待。

**scala 插件**

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20221009101722545.png)

**工程目录**

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20221009101138049.png)

在这张图中，有几个子目录需要重点关注一下。

- core：Broker 端工程，保存 Broker 代码。
- clients：Client 端工程，保存所有 Client 代码以及所有代码都会用到的一些公共代码。
- streams：Streams 端工程，保存 Kafka Streams 代码。
- connect：Connect 端工程，保存 Kafka Connect 框架代码以及 File Connector 代码。

Kafka 源码有 50 万行之多，没有重点地进行通读，效率会特别低。所以我们要以场景驱动阅读，推荐几条最佳阅读路线：

1.从 Broker 端的代码着手

建议你先从 core 包读起，也就是先从 Broker 端的代码着手。可以按照下面的顺序进行阅读。

- log 包：log 包中定义了 Broker 底层消息和索引保存机制以及物理格式，非常值得一读。特别是 Log、LogSegment 和 LogManager 这几个类，几乎定义了 Kafka 底层的消息存储机制，一定要重点关注。
- controller 包。controller 包实现的是 Kafka Controller 的所有功能，特别是里面的 KafkaController.scala 文件，它封装了 Controller 的所有事件处理逻辑。如果你想弄明白 Controller 的工作原理，最好多读几遍这个将近 2000 行的大文件。
- coordinator 包下的 group 包代码。当前，coordinator 包有两个子 package：group 和 transaction。前者封装的是 Consumer Group 所用的 Coordinator；后者封装的是支持 Kafka 事务的 Transaction Coordinator。我个人觉得你最好把 group 包下的代码通读一遍，了解下 Broker 端是如何管理 Consumer Group 的。这里比较重要的是GroupMetadataManager 和 GroupCoordinator 类，它们定义了 Consumer Group 的元数据信息以及管理这些元数据的状态机机制。
- network 包代码以及 server 包下的部分代码。如果你还有余力的话，可以再读一下这些代码。前者的 SocketServer 实现了 Broker 接收外部请求的完整网络流程。Kafka 用的是 Reactor 模式。如果你想搞清楚 Reactor 模式是怎么在 Kafka“落地”的，就把这个类搞明白吧。

> 从总体流程上看，Broker 端顶部的入口类是 KafkaApis.scala。这个类是处理所有入站请求的总入口。

2.客户端 clients 包下

- org.apache.kafka.common.record 包。这个包下面是各种 Kafka 消息实体类，比如用于在内存中传输的 MemoryRecords 类以及用于在磁盘上保存的 FileRecords 类。
- org.apache.kafka.common.network 包。这个包不用全看，你重点关注下 Selector、KafkaChannel 就好了，尤其是前者，它们是实现 Client 和 Broker 之间网络传输的重要机制。如果你完全搞懂了这个包下的 Java 代码，Kafka 的很多网络异常问题也就迎刃而解了。
- org.apache.kafka.clients.producer 包。顾名思义，它是 Producer 的代码实现包，里面的 Java 类很多，你可以重点看看 KafkaProducer、Sender 和 RecordAccumulator 这几个类。
- org.apache.kafka.clients.consumer 包。它是 Consumer 的代码实现包。同样地，我推荐你重点阅读 KafkaConsumer、AbstractCoordinator 和 Fetcher 这几个 Java 文件。

> 通过 Debug 模式下打断点的方式，一步一步地深入了解 Kafka 中各个类的状态以及在内存中的保存信息，这种阅读方式会让你事半功倍。



## 组件

> broker、topic 、partition、repaliction、log、offset、segement、rpc

### Log

数据日志文件以每个分区作为一个文件夹。partition的第一个segment从0开始，后续每个segment文件名为上一个segment文件最后一条消息的offset+1。[日志目录](https://blog.csdn.net/m0_45097637/article/details/123648967)

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220928170758239.png)

**查看日志**

```shell
# kafka 2.0 之前
bin/kafka-run-class.sh kafka.tools.DumpLogSegments --files /Users/libiao/programs/data/kafka/logs/quickstart-events-0/00000000000000000000.index
# kafka 2.0 之后
bin/kafka-dump-log.sh --files /Users/libiao/programs/data/kafka/logs/quickstart-events-0/00000000000000000000.index
Dumping /Users/libiao/programs/data/kafka/logs/quickstart-events-0/00000000000000000000.index
```

**日志文件的格式**

> https://www.cnblogs.com/zxporz/p/16291859.html



```
Starting offset: 0
baseOffset: 0 lastOffset: 0 count: 1 baseSequence: -1 lastSequence: -1 producerId: -1 producerEpoch: -1 partitionLeaderEpoch: 0 isTransactional: false isControl: false position: 0 CreateTime: 1664352933558 size: 73 magic: 2 compresscodec: NONE crc: 4064763809 isvalid: true
baseOffset: 1 lastOffset: 1 count: 1 baseSequence: -1 lastSequence: -1 producerId: -1 producerEpoch: -1 partitionLeaderEpoch: 0 isTransactional: false isControl: false position: 73 CreateTime: 1664352984653 size: 70 magic: 2 compresscodec: NONE crc: 1115560187 isvalid: true
baseOffset: 2 lastOffset: 2 count: 1 baseSequence: -1 lastSequence: -1 producerId: -1 producerEpoch: -1 partitionLeaderEpoch: 0 isTransactional: false isControl: false position: 143 CreateTime: 1664353297758 size: 69 magic: 2 compresscodec: NONE crc: 1631941203 isvalid: true
```





```
offset: 0 position: 0
```





**日志压缩**



**如何通过索引定位消息**



### RPC



### Controller

从所有 Broker 中选出一个管理者作为 Controller 。

所有的节点向 zk 发送创建 `/controller` 的请求，先到先得。

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220928183045132.png)

`/controller`是一个临时节点



### 分区分配

**分区的作用**

- 负载均衡
- 可以通过增加节点来提高吞吐量
- 减少磁盘压力

**分区策略有哪些？**

> 分区策略就是指生产者将消息发送到 topic 下的哪个分区的算法。提供默认的分区策略，也可以自定义。

- 轮训策略：一个接一个分区的去投递，默认的分区策略，也是最常用的。
- 随机策略：随机选择一个分区，其均匀性若于轮询，实现代码如下

```java
List<PartitionInfo> partitions = cluster.partitionsForTopic(topic);
return ThreadLocalRandom.current().nextInt(partitions.size());
```

- 按消息键保存策略（key-ordering）：Kafka 允许为每条消息定义消息键，简称为 Key。这个 Key 的作用非常大，它可以是一个有着明确业务含义的字符串，比如客户代码、部门编号或是业务 ID 等；也可以用来表征消息元数据。特别是在 Kafka 不支持时间戳的年代，在一些场景中，工程师们都是直接将消息创建时间封装进 Key 里面的。一旦消息被定义了 Key，那么你就可以保证同一个 Key 的所有消息都进入到相同的分区里面，由于每个分区下的消息处理都是有顺序的，故这个策略被称为按消息键保序策略。**一般用在需要顺序消费的场景。**实现代码如下

```java
List<PartitionInfo> partitions = cluster.partitionsForTopic(topic);
return Math.abs(key.hashCode()) % partitions.size();
```

- 其他策略，比如按地理位置分区，就可以将 ip 转换成南方或北方的地理位置作为 key ，那根据 key - ordering策略，南方和北方的消息就会自动被分到不同的分区。`consumer.assign()`直接消息指定分区。

**如何自定义分区策略?**

如果要自定义分区策略，你需要显式地配置生产者端的参数`partitioner.class`。这个参数该怎么设定呢？方法很简单。

在编写生产者程序时，你可以编写一个具体的类实现`org.apache.kafka.clients.producer.Partitioner`接口。只要你自己的实现类定义好了 `partition()` 方法，同时设置`partitioner.class`参数为你自己实现类的`Full Qualified Name`，那么生产者程序就会按照你的代码逻辑对消息进行分区。

比如上面的地理位置分区：

```java
List<PartitionInfo> partitions = cluster.partitionsForTopic(topic);
return partitions.stream().filter(p -> isSouth(p.leader().host())).map(PartitionInfo::partition).findAny().get();
```







## 生产者

### 消息压缩





## 消费者





## Kafka 基石

> IO 多路复用
>
> 零拷贝
>
> 批量消息





## 线上运维

> 本部分内容主要包括线上参数配置、调优，故障处理，生产实践等。

### 磁盘配置

Kafka 是一个将数据存储在磁盘的，其分身的分区副本机制提供了很好的可靠性，而磁盘本身的性能、价格、容量也是需要我们考虑的点。

**磁盘类型选择**

我们所熟知的磁盘有机械硬盘和固态硬盘，其实还有一种叫磁盘阵列（RAID）。

- 机械硬盘：便宜，随机读写慢。
- 固态硬盘：贵，读写性能好。
- 磁盘阵列：分布式存储，负载均衡，某一块损坏依然可以读出数据。

我们在实际部署的时候要知道不是性能越高越好，性能高往往意味着成本高，Kafka 本身在软件层面做了分区副本机制，而且是顺序读取，所以在一些需要控制成本的小公司，选择机械硬盘就可以，财力雄厚的大公司，可以选择固态硬盘甚至磁盘阵列。

**磁盘大小选择**

这就不能拍脑袋了，看一个案例该如何计算。

假设你所在公司有个业务每天需要向 Kafka 集群发送 1 亿条消息，每条消息保存两份以防止数据丢失，另外消息默认保存两周时间。

现在假设消息的平均大小是 1KB，那么你能说出你的 Kafka 集群需要为这个业务预留多少磁盘空间吗？我们来计算一下：

每天 1 亿条 1KB 大小的消息，保存两份且留存两周的时间，那么总的空间大小就等于 1 亿 * 1KB * 2 / 1000 / 1000 = 200GB。

一般情况下 Kafka 集群除了消息数据还有其他类型的数据，比如索引数据等，故我们再为这些数据预留出 10% 的磁盘空间，因此总的存储容量就是 220GB。

既然要保存两周，那么整体容量即为 220GB * 14，大约 3TB 左右。

Kafka 支持数据的压缩，假设压缩比是 0.75，那么最后你需要规划的存储空间就是 0.75 * 3 = 2.25TB。

> 总之在规划磁盘容量时你需要考虑下面这几个元素：
>
> - 新增消息数
> - 消息留存时间
> - 平均消息大小
> - 备份数
> - 是否启用压缩

### 带宽配置

> 带宽主要有两种：1Gbps 的千兆网络和 10Gbps 的万兆网络，特别是千兆网络应该是一般公司网络的标准配置了,所以我们要做的是在带宽固定的情况下，计算需要多少台服务器。
>
> 假设你公司的机房环境是千兆网络，即 1Gbps，现在你有个业务，其业务目标或 SLA 是在 1 小时内处理 1TB 的业务数据。那么问题来了，你到底需要多少台 Kafka 服务器来完成这个业务呢？

让我们来计算一下，由于带宽是 1Gbps，即每秒处理 1Gb 的数据，假设每台 Kafka 服务器都是安装在专属的机器上，也就是说每台 Kafka 机器上没有混布其他服务，毕竟真实环境中不建议这么做。通常情况下你只能假设 Kafka 会用到 70% 的带宽资源，因为总要为其他应用或进程留一些资源。

根据实际使用经验，超过 70% 的阈值就有网络丢包的可能性了，故 70% 的设定是一个比较合理的值，也就是说单台 Kafka 服务器最多也就能使用大约 700Mb 的带宽资源。

稍等，这只是它能使用的最大带宽资源，你不能让 Kafka 服务器常规性使用这么多资源，故通常要再额外预留出 2/3 的资源，即单台服务器使用带宽 700Mb / 3 ≈ 240Mbps。需要提示的是，这里的 2/3 其实是相当保守的，你可以结合你自己机器的使用情况酌情减少此值。

好了，有了 240Mbps，我们就可以计算 1 小时内处理 1TB 数据所需的服务器数量了。根据这个目标，我们每秒需要处理 2336Mb 的数据，除以 240，约等于 10 台服务器。如果消息还需要额外复制两份，那么总的服务器台数还要乘以 3，即 30 台。

### 小结

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20221009113835344.png)

### 集群参数配置

**Broker 端参数**

首先 Broker 是需要配置存储信息的，即 Broker 使用哪些磁盘。那么针对存储信息的重要参数有以下这么几个：

- `log.dirs`：这是非常重要的参数，指定了 Broker 需要使用的若干个文件目录路径。要知道这个参数是**没有默认值**的，这说明什么？这说明它必须由你亲自指定。
- `log.dir`：注意这是 dir，结尾没有 s，说明它只能表示单个路径，它是补充上一个参数用的。

> 这两个参数应该怎么设置呢？
>
> 很简单，你只要设置log.dirs，即第一个参数就好了，不要设置log.dir。
>
> 而且更重要的是，在线上生产环境中一定要为log.dirs配置多个路径，具体格式是一个 CSV 格式，也就是用逗号分隔的多个路径，比如`/home/kafka1,/home/kafka2,/home/kafka3`这样。如果有条件的话你最好**保证这些目录挂载到不同的物理磁盘**上。这样做既可以提升读写性能，又可以负载均衡，故障转移。

**什么是故障转移？**

在以前，只要 Kafka Broker 使用的任何一块磁盘挂掉了，整个 Broker 进程都会关闭。

但是自 1.1 开始，这种情况被修正了，坏掉的磁盘上的数据会自动地转移到其他正常的磁盘上，而且 Broker 还能正常工作。

这是我们舍弃 RAID 方案的基础：没有这种 Failover 的话，我们只能依靠 RAID 来提供保障。



**Broker 连接相关**

客户端程序或其他 Broker 如何与该 Broker 进行通信的设置。有以下三个参数：

- `listeners`：学名叫监听器，其实就是告诉外部连接者要通过什么协议访问指定主机名和端口开放的 Kafka 服务。
- `advertised.listeners`：和 listeners 相比多了个 advertised。Advertised 的含义表示宣称的、公布的，就是说这组监听器是 Broker 用于对外发布的。
- `host.name/port`：列出这两个参数就是想说你把它们忘掉吧，压根不要为它们指定值，毕竟都是过期的参数了。

监听器从构成上来说，它是若干个逗号分隔的三元组，每个三元组的格式为<协议名称，主机名，端口号>。

这里的协议名称可能是标准的名字，比如 PLAINTEXT 表示明文传输、SSL 表示使用 SSL 或 TLS 加密传输等；也可能是你自己定义的协议名字，比如`CONTROLLER: //localhost:9092`。

经常有人会问主机名这个设置中我到底使用 IP 地址还是主机名。这里我给出统一的建议：**最好全部使用主机名**，即 Broker 端和 Client 端应用配置中全部填写主机名。

![server.properties](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20221010143927651.png)



**与 ZooKeeper 相关的设置**

> ZooKeeper 是做什么的呢？它是一个分布式协调框架，负责协调管理并保存 Kafka 集群的所有元数据信息，比如集群都有哪些 Broker 在运行、创建了哪些 Topic，每个 Topic 都有多少分区以及这些分区的 Leader 副本都在哪些机器上等信息。

如果你有两套 Kafka 集群，假设分别叫它们 kafka1 和 kafka2，那么两套集群的zookeeper.connect参数可以这样指定：`zk1:2181,zk2:2181,zk3:2181/kafka1和zk1:2181,zk2:2181,zk3:2181/kafka2`。

切记 chroot 只需要写一次，而且是加到最后的。



**关于 Topic 管理**

- `auto.create.topics.enable`：是否允许自动创建 Topic。生产环境不建议开启，以免出现模糊不清的主题。
- `unclean.leader.election.enable`：是否让那些落后太多的副本竞选 Leader。如果设置 False ，一旦保存较多数据的副本都挂了，分区就不可用了，因为只有 Leader副本才可以对外提供服务。反之，从不完整的副本中选取一个 Leader ，就会出现丢数据的情况。
- `auto.leader.rebalance.enable`：设置它的值为 true 表示允许 Kafka 定期地对一些 Topic 分区进行 Leader 重选举，一般设置为 False 。



**关于数据留存**

- `log.retention.{hour|minutes|ms}`：这是个“三兄弟”，都是控制一条消息数据被保存多长时间。从优先级上来说 ms 设置最高、minutes 次之、hour 最低。一般都设置 hour：`log.retention.hours=168` ，表示保存 7 天。
- `log.retention.bytes`：这是指定 Broker 为消息保存的总磁盘容量大小。值默认是 -1，表明你想在这台 Broker 上保存多少数据都可以。
- `message.max.bytes`：控制 Broker 能够接收的最大消息大小。默认的 1000012 太少了，还不到 1MB，因此在线上环境中设置一个比较大的值还是比较保险的做法。

**Topic 级别参数**

Kafka 支持为不同的 Topic 设置不同的参数值，如果同时设置了 Topic 级别参数和全局 Broker 参数，Topic 级别参数会覆盖全局 Broker 参数的值。

设置方式：

- 创建 Topic 时进行设置`bin/kafka-topics.sh--bootstrap-serverlocalhost:9092--create--topictransaction--partitions1--replication-factor1--configretention.ms=15552000000--configmax.message.bytes=5242880`
- 修改 Topic 时设置` bin/kafka-configs.sh--zookeeperlocalhost:2181--entity-typetopics--entity-nametransaction--alter--add-configmax.message.bytes=10485760`

下面这组参数是非常重要的：

- `retention.ms`：规定了该 Topic 消息被保存的时长。默认是 7 天，即该 Topic 只保存最近 7 天的消息。一旦设置了这个值，它会覆盖掉 Broker 端的全局参数值。
- `retention.bytes`：规定了要为该 Topic 预留多大的磁盘空间。和全局参数作用相似，这个值通常在多租户的 Kafka 集群中会有用武之地。当前默认值是 -1，表示可以无限使用磁盘空间。

**JVM 参数**

- 堆大小设置为 6G 最佳，默认 1G 有点小。
- Java7 使用 CMS 收集器，Java8 使用 G1 收集器。

```shell
$> export KAFKA_HEAP_OPTS=--Xms6g  --Xmx6g
$> export  KAFKA_JVM_PERFORMANCE_OPTS= -server -XX:+UseG1GC -XX:MaxGCPauseMillis=20 -XX:InitiatingHeapOccupancyPercent=35 -XX:+ExplicitGCInvokesConcurrent -Djava.awt.headless=true
$> bin/kafka-server-start.sh config/server.properties
```

**操作系统参数**

- 文件描述符限制：任何一个 Java 项目最好都调整下这个值。通常情况下将它设置成一个超大的值是合理的做法，比如ulimit -n 1000000。不设置的话后果很严重，比如你会经常看到“Too many open files”的错误。
- 文件系统类型的选择：这里所说的文件系统指的是如 ext3、ext4 或 XFS 这样的日志型文件系统。生产环境最好还是使用 XFS。
- swap 的调优：将 swappniess 配置成一个接近 0 但不为 0 的值，比如 1。一旦设置成 0，当物理内存耗尽时，操作系统会触发 OOM killer 这个组件，它会随机挑选一个进程然后 kill 掉，即根本不给用户任何的预警。
- Flush 落盘时间：向 Kafka 发送数据只要数据被写入到操作系统的页缓存（Page Cache）上就可以了，随后操作系统根据 LRU 算法会定期将页缓存上的“脏”数据落盘到物理磁盘上。这个定期就是由提交时间来确定的，默认是 5 秒，可以适当地增加提交间隔来降低物理磁盘的写操作。（会丢消息）
