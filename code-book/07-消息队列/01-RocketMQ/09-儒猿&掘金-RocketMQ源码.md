> 源码，一个是看源码的技巧，一个就是从源码里提取核心业务逻辑和流程

## 环境搭建

github 拉取代码 或者百度网盘或者官网，导入idea，等待maven构建即可。

- [官网](https://dlcdn.apache.org/rocketmq/4.9.4/rocketmq-all-4.9.4-source-release.zip)
- https://github.com/apache/rocketmq

代码版本：4.3.0

**主要目录结构**

![image-20220728110525317](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220728110525317.png)

### 启动NameServer

1. 配置环境变量 ROCKETMQ_HOME 。
2. 创建namesrv 的运行目录  D:\libetter\advance\rocketmq-namesrv-run 在idea配置好。

![image-20220728111447114](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220728111447114.png)

3. 在运行目录创建conf、logs、store三个文件夹。
4. 把RocketMQ源码目录中的distrbution目录下的broker.conf、logback_namesvr.xml、logback_namesrv.xml三个配置文件拷贝到刚才新建的conf目录中去，接着就需要修改这两个配置文件。
5. 首先修改logback_namesvr.xml这个文件，修改里面的日志的目录，修改为你的rocketmq运行目录中的logs目录。里面有很多的${user.home}，你直接把这些${user.home}全部替换为你的rocketmq运行目录就可以了。
6. 修改broker.conf文件，

```xml

brokerClusterName = DefaultCluster
brokerName = broker-a
brokerId = 0
deleteWhen = 04
fileReservedTime = 48
brokerRole = ASYNC_MASTER
flushDiskType = ASYNC_FLUSH

autoCreateTopicEnable = true

# 这是nameserver的地址
namesrvAddr=127.0.0.1:9876

# 这是存储路径，
storePathRootDir=D:\\libetter\\advance\\rocketmq-namesrv-run\\store
# 这是commitLog的存储路径
storePathCommitLog=D:\\libetter\\advance\\rocketmq-namesrv-run\\store\\commitlog
# consume queue文件的存储路径
storePathConsumeQueue=D:\\libetter\\advance\\rocketmq-namesrv-run\\store\\consumequeue
# 消息索引文件的存储路径
storePathIndex=D:\\libetter\\advance\\rocketmq-namesrv-run\\store\index
# checkpoint文件的存储路径
storeCheckpoint=D:\\libetter\\advance\\rocketmq-namesrv-run\\store\\checkpoint
# abort文件的存储路径
abortFile=D:\\libetter\\advance\\rocketmq-namesrv-run\\abort

```

7. 启动namesrv

![image-20220728113402259](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220728113402259.png)

### 启动broker

1. 同样配置环境变量

2. 配置promramer variables 

   > -c D:\libetter\advance\rocketmq-namesrv-run\conf\broker.conf

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220728160608639.png)

### 启动dashbroad

下载代码：https://github.com/apache/rocketmq-dashboard

配置namesvr地址，启动

![image-20220728161430424](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220728161430424.png)

### Quick Start

1. 新建 topic
2. 配置namesvr
3. 发送一条消息

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220728160939197.png)

4. 启动consumer

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220728161124644.png)

## NameServer的启动流程

### 从Shell脚本开始

mqnamesrv.sh   ->   sh bin/runserver.sh org.apache.rocketmq.namesrv.NamesrvStartup $@           ->   runserver.sh

```shell
#===========================================================================================
# JVM Configuration
#===========================================================================================
JAVA_OPT="${JAVA_OPT} -server -Xms4g -Xmx4g -Xmn2g -XX:MetaspaceSize=128m -XX:MaxMetaspaceSize=320m"
JAVA_OPT="${JAVA_OPT} -XX:+UseConcMarkSweepGC -XX:+UseCMSCompactAtFullCollection -XX:CMSInitiatingOccupancyFraction=70 -XX:+CMSParallelRemarkEnabled -XX:SoftRefLRUPolicyMSPerMB=0 -XX:+CMSClassUnloadingEnabled -XX:SurvivorRatio=8  -XX:-UseParNewGC"
JAVA_OPT="${JAVA_OPT} -verbose:gc -Xloggc:/dev/shm/rmq_srv_gc.log -XX:+PrintGCDetails"
JAVA_OPT="${JAVA_OPT} -XX:-OmitStackTraceInFastThrow"
JAVA_OPT="${JAVA_OPT}  -XX:-UseLargePages"
JAVA_OPT="${JAVA_OPT} -Djava.ext.dirs=${JAVA_HOME}/jre/lib/ext:${BASE_DIR}/lib"
#JAVA_OPT="${JAVA_OPT} -Xdebug -Xrunjdwp:transport=dt_socket,address=9555,server=y,suspend=n"
JAVA_OPT="${JAVA_OPT} ${JAVA_OPT_EXT}"
JAVA_OPT="${JAVA_OPT} -cp ${CLASSPATH}"
```

简化为

> java -server -Xms4g -Xmx4g -Xmn2g org.apache.rocketmq.namesrv.NamesrvStartup

![image-20220728170139593](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220728170139593.png)

### 加载哪些配置？

```java
public static NamesrvController main0(String[] args) {
        try {
            NamesrvController controller = createNamesrvController(args);
            start(controller);
            return controller;
        } catch (Throwable e) {
            e.printStackTrace();
            System.exit(-1);
        }
        return null;
    }
```

1. createNamesrvController

通过名字，可以猜想一下，NamesrvController这个组件，很可能就是NameServer中专门用来接受Broker和客户端的网络请求的一个组件。

那就看看NamesrvController是怎么被创建出来的吧，点进去：

> 阅读源码的一个技巧：哪些需要细看，哪些可以暂时先跳过.
>
> - 看不到懂的地方不要死扣
> - 日志里会有些信息告诉你在干什么
> - 从名字判断功能。

首先我们是一些和 commandLine相关的分支语句，猜测是解析我们命令行输入的一些参数，比如 -c -p，可以跳过。

关键在这里：

![image-20220729105826360](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220729105826360.png)

首先是namesrv的一些配置，然后Netty配置监听端口9876，即所以broker和Namesrv的交互都是9876端口，这是一个在代码写死的端口。

我们再看看为NameSrv配置了什么，这就和我们的命令行参数相关了。

![image-20220729110730906](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220729110730906.png)

### 配置是怎么加载的呢？

![image-20220729111240241](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220729111240241.png)

读取完配置信息之后，会做一些校验和日志打印，然后就可以构建nameserverController了。

![image-20220729111717145](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220729111717145.png)

记住所有配置防止丢失，注册到配置中心，同时需要加读写锁。

如此，NamesrvController 就创建完了，下一步就是启动netty通信。

### 如何启动Netty服务器

2. start(controller);

这里就做了两件事，先初始化，再启动。先进入到controller.initilize()方法内部：

![image-20220729113154227](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220729113154227.png)

new 了一个Netty服务器，并在下面开始配置。netty server的构造方法核心就是`this.serverBootstrap = new ServerBootstrap();`，在netty章节展开。

![image-20220729113638734](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220729113638734.png)

nettyremoteserver是如何启动的呢？`controller.start();`

核心就是网络端口的绑定和网络信息的配置。

![image-20220729141232084](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220729141232084.png)

### 总结

NameServer启动最核心的就是基于Netty实现了一个网络服务器，然后监听默认的9876端口号，可以接收Broker和客户端的网络请求。

后面我们就要研究一下NameServer启动好之后，

- Broker是如何启动的，
- 如何向NameServer进行注册，如何进行心跳，
- NameServer是如何管理Broker的。

## Broker启动流程

```
~/programs/data/rocketmq/ROCKETMQ_HOME/store/config
├── consumerFilter.json
├── consumerOffset.json
├── delayOffset.json
├── subscriptionGroup.json
├── topics.json
```



![image-20220729144316173](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220729144316173.png)

和NameSrv一样，都是先创建BrokerController，用来处理通信。

然后不用看，肯定还是通过命令行的参数读取配置文件，那就直接到我们熟悉的这里：

### 为核心配置类解析和填充信息

![image-20220729145141639](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220729145141639.png)

是不是很熟悉，这里多了一个NettyClientConfig，说明broker既会充当服务端，也会充当客户端，而nameServer一直是服务端，即他不会注定从和别人通信，都是broker向他注册信息、发送心跳。producer来拉取broker配置。

同样的监听一个端口10911，不同的是多了一个MessageStoreConfig，用来配置消息存储信息。

![image-20220729155642977](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220729155642977.png)

同步刷盘or异步刷盘，熟悉吧，就是在这配置的。

![image-20220729160015175](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220729160015175.png)

设置好之后就是一段打印日志的代码，可以跳过。

四个配置都有了，就可以创建我们的BrokerController了。和NameServer类似的操作。

![image-20220729160151618](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220729160151618.png)

### 如何理解BrokerController

BrokerController，如果一定要用中文来表达出这个组件的含义的话，你应该把他叫做是“Broker管理控制组件”。

我们来一看一下BrokerController的构造方法：

Broker有很多功能，比如对offset的管理，topic的管理，每个功能都由一个组件去实现。

而要实现这一功能还需要各种线程池。这也就组成了brokercontroller。

![image-20220729170741162](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220729170741162.png)



### 初始化和启动Netty

初始化，准备netty服务器，注册线程池。

启动Netty服务器，就是绑定端口，同时通过一个固定频率的线程池像 NameServer 注册心跳。

![image-20220801160708541](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220801160708541.png)

### 注册心跳到NameServer

先进行TopicConfig的配置，再判断是否需要配置。需要配置进入doRegisterBrokerAll()方法。

通过 RequestHeader 和 RequestBody 构建请求，并异步的发送到所有的NameServer，使用CountDownLaunnch保证所有请求都发送完，再往下走。

### NameServer如何处理Broker注册请求？

`registerProcessor()` 请求处理器.

下面我们先在图里给大家体现一下RouteInfoManager这个路由数据管理组件，实际Broker注册就是通过他来做的。

其维护了存储Broker信息的数据结构（Map），同时用 ReadWriteLock 来解决并发修改的问题。

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220801174625157.png)

### Broker如何定时发送心跳的？

Broker是如何定时发送心跳到NameServer，让NameServer感知到Broker一直都存活着，然后如果Broker一段时间没有发送心跳到NameServer，那么NameServer是如何感知到Broker已经挂掉了。

定时发送是用的ScheduleFixRate（）。

NameServer负责处理心跳的部分依然在RouterInfoManager。

- 通过Set为每一个Cluster维护一个BrokerName集合。
- 通过brokerAddrTable这个Map来维护每个broker的信息，并以此来判断是否是第一次注册。
- 

![image-20220803174438331](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220803174438331.png)

### NameServer如何发现没有心跳的Broker

重新回到NamesrvController的initialize()方法里去，里面有一个代码是启动了RouteInfoManager中的一个定时扫描不活跃Broker的线程。

从BrokerLIveInfo里获取最近一次的心跳时间和当前时间做对比，如果超过默认的120s，认为已经挂掉了。

![image-20220803180511298](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220803180511298.png)



## Producter的构建

```java
DefaultMQProducer producer = new DefaultMQProducer("order_producer_group");
producer.setNamesrvAddr("localhost:9876");
producer.start();
```

这段代码的关键部分在哪呢？

前两行new了一个组件，配置好信息，很简单。关键在于如何start()的。

很多核心的逻辑，包括Topic路有数据拉取，MessageQueue选择，以及跟Broker建立网络连接，通过网络连接发送消息到Broker去，这些逻辑都是在Producer发送消息的时候才会有。并不是启动时就加载好的。





## 发送消息流程





## 存储消息流程

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220804164312863.png)

### CommitLog

CommitLog文件会存储所有的Message，存储目录是在${ROCKETMQ_HOME}/store/commitlog下的，里面会有很多的CommitLog文件，每个文件默认是1GB大小，一个文件写满了就创建一个新的文件，文件名的话，就是文件中的第一个偏移量，如下面所示。文件名如果不足20位的话，就用0来补齐就可以了。

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220804165948683.png)

具体什么时候才会把内存里的数据刷入磁盘，其实要看我们配置的刷盘策略，这个我们后续会讲解，另外就是不管是同步刷盘还是异步刷盘，假设你配置了主从同步，一旦你写入完消息到CommitLog之后，接下来都会进行主从同步复制的。

### ConsumeQueue和IndexFile

Broker启动的时候会开启一个线程，ReputMessageService，他会把CommitLog更新事件转发出去，然后让任务处理器去更新ConsumeQueue和IndexFile，

![image-20220804171315452](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220804171315452.png)

### 同步刷盘和异步刷盘

写入CommitLog的数据进入到MappedFile映射的一块内存里之后，后续会执行刷盘策略比如是同步刷盘还是异步刷盘，如果是同步刷盘，那么此时就会直接把内存里的数据写入磁盘文件，如果是异步刷盘，那么就是过一段时间之后，再把数据刷入磁盘文件里去。

![image-20220804172030022](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220804172030022.png)

handleDishFlush()，是用于决定如何进行刷盘的。

handleHA()是用于决定如何把消息同步给Slave Broker的。



## Broker的磁盘清理

broker不停的接收数据，然后磁盘上的数据越来越多，但是万一磁盘都放满了，那怎么办呢？消息堆积也会引起磁盘满了，如果不及时解决，消息就会丢失。

broker是如何把磁盘上的数据给删掉的？

默认broker会启动后台线程，这个后台线程会自动去检查CommitLog、ConsumeQueue文件，因为这些文件都是多个的，比如CommitLog会有多个，ConsumeQueue也会有多个。然后如果是那种比较旧的超过72小时的文件，就会被删除掉，也就是说，默认来说，broker只会给你把数据保留3天而已，当然你也可以自己通过fileReservedTime来配置这个时间，要保留几天的时间。

这个定时检查过期数据文件的线程代码，在DefaultMessageStore这个类里，他的start()方法中会调用一个addScheduleTask()方法，里面会每隔10s定时调度执行一个后台检查任务。

![image-20220804173406637](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220804173406637.png)



在清理文件的时候，他会具体判断一下，如果当前时间是预先设置的凌晨4点，就会触发删除文件的逻辑，这个时间是默认的；

或者是如果磁盘空间不足了，就是超过了85%的使用率了，立马会触发删除文件逻辑。

上面两个条件，第一个是说如果磁盘没有满 ，那么每天就默认一次会删除磁盘文件，默认就是凌晨4点执行，那个时候必然是业务低峰期，因为凌晨4点大部分人都睡觉了，无论什么业务都不会有太高业务量的。

第二个是说，如果磁盘使用率超过85%了，那么此时可以允许继续写入数据，但是此时会立马触发删除文件的逻辑；

如果磁盘使用率超过90%了，那么此时不允许在磁盘里写入新数据，立马删除文件。这是因为，一旦磁盘满了，那么你写入磁盘会失败，此时你MQ就彻底故障了。所以一旦磁盘满了，也会立马删除文件的。

在删除文件的时候，无非就是对文件进行遍历，如果一个文件超过72小时都没修改过了，此时就可以删除了，哪怕有的消息你可能还没消费过，但是此时也不会再让你消费了，就直接删除掉。

这就是RocketMQ的一整套文件删除的逻辑和机制。



## 消费消息

平时创建的一般都是DefaultMQPushConsumerImpl，然后会调用他的start()方法来启动他。

Consumer一旦启动，必然是要跟Broker去建立长连接的，底层绝对也是基于Netty去做的，建立长连接之后，才能不停的通信拉取消息所以这个MQClientFactory底层直觉上就应该封装了Netty网络通信的东西，

### 消费重平衡

假设你的ConsumerGroup里加入了一个新的Consumer，那么就会重新分配每个Consumer消费的MessageQueue，如果ConsumerGroup里某个Consumer宕机了，也会重新分配MessageQueue，这就是所谓的重平衡。

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220805113508102.png)

RebalancerImpl重平衡组件是如何将多个MessageQueue均匀的分配给一个消费组内的多个Consumer的呢？





### 消费记录的管理和存储

OffsetStore：存储和管理Consumer消费进度offset的一个组件。

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220805114116126.png)

首先Consumer刚启动，必须依托Rebalancer组件，去进行一下重平衡，自己要分配一些MessageQueue去拉取消息。接着拉取消息，必须要依托PullAPI组件通过底层网络通信去拉取。

在拉取的过程中，必然要维护offset消费进度，此时就需要OffsetStore组件。万一要是ConsumerGroup里多了Consumer或者少了Consumer，又要依托Rebalancer组件进行重平衡了。

### 消息队列的分配




## 延迟消息



## 事务消息



## 自动创建TOPIC

https://blog.csdn.net/qq_34679704/article/details/120102203

