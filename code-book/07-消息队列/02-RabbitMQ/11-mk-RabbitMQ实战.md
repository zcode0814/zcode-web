> mk-新版RabbitMQ精讲

## Docker 安装

```shell
docker pull rabbitmq
docker run -d --name rabbit03 -p 5675:5672 -p 15675:15672 --hostname rabbit-host3 -e RABBITMQ_DEFAULT_USER=yitiao -e RABBITMQ_DEFAULT_PASS=yitiao --link rabbit01:rabbit-host1 rabbitmq
 # -v /Users/libiao/programs/data/rabbitmq/plugins:/plugins
 docker exec -it rabbit01 /bin/bash
 rabbitmq-plugins enable rabbitmq_management    # 安装控制台插件
```



![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20221019154756315.png)



创建桥接网络

```shell
# (局域网，路由器，ip)
docker create network rabbit-network  
--net=rabbit-network
```





## Quick Start

> https://blog.csdn.net/zyq025/article/details/126826639

### 生产消费测试



此处显示的是队列内的消息，一旦消息被消费，此便不再显示。

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20221020175429580.png)

### 常见问题

**解决Stats in management UI are disabled on this node问题**

```shell
# 进入容器修改配置文件 重启
docker exec -it rabbit /bin/bash
cat /etc/rabbitmq/conf.d/management_agent.disable_metrics_collector.conf   # ->  false

# cd  /etc/rabbitmq/conf.d/
echo management_agent.disable_metrics_collector = false > /etc/rabbitmq/conf.d/management_agent.disable_metrics_collector.conf
exit

docker restart rabbit
```

**无法通过队列查看消息**

```
405 RESOURCE_LOCKED - cannot obtain exclusive access to locked queue 'amq.gen-HmHROC48_JJy-_EHTUbT3g' in vhost '/'. It could be originally declared on another connection or the exclusive property value does not match that of the original declaration.
```

MQ生产者创建队列时，属性 exclusive 设置成 true 会导致监听不到队列。

`exclusive`，是否排外的，有两个作用:

- 当连接关闭时connection.close()该队列是否会自动删除
- 该队列是否是私有的private，如果不是排外的，可以使用两个消费者都访问同一个队列，没有任何问题，如果是排外的，会对当前队列加锁，其他通道channel是不能访问的，如果强制访问会报异常

### 消息追踪插件

```
# 进入容器
rabbitmq-plugins list
rabbitmq-plugins enable rabbitmq_tracing
rabbitmqctl trace_on
rabbitmqctl trace_on -p myhost  # myhost:虚拟主机名称

## 添加完成后我们的虚拟地址下面将多出一个trace交换机,后续所有该虚拟地址下的消息都会在该交换机上进行记录。
```

**配置 trace log**

在Admin>Tracing 目录下添加trace追踪文件信息。添加完成后右侧出现相应的追踪信息文件。

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20221020171848796.png)

**发一条消息测试**

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20221020172018797.png)



## 高可用集群

### 普通集群

> 数据只存放在一个节点上，各节点间只同步元数据。
>
> 一旦一个 RabbitMQ 实例挂了，消息就没法访问了，如果消息队列做了持久化，那么等 RabbitMQ 实例恢复后，就可以继续访问了；如果消息队列没做持久化，那么消息就丢了。

基于erlang cookie原生安装

```shell
cat /var/lib/rabbit/.erlang.cookie
# 通过scp复制将三台机器的cookie修改成同一个值
# .erlang.cookie 的权限一定要在使用后修改为 400
systemctl start rabbitmq-server.service
rabbitmqctl stop_app
# 启动mq后再停止其application，进入准备集群配对模式
rabbitmqctl join_cluster rabbit@hostname
# 进入控制台（主节点ip）查看,创建用户赋予管理员权限
rabbitmqctl add_user test test
rabbitmqctl set_user_tags test administrator
```



### 镜像集群

> Broker会将消息实体在各节点间同步，保存多份，实现高可用。
>
> 该模式带来的副作用也很明显，降低系统性能，集群内部的网络带宽将会被大量消耗。

镜像集群有以下三种模式：

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/2064084-20221102160901602-1700852786.png)

节点类型：

RAM node：内存节点将所有的队列、交换机、绑定、用户、权限和 vhost 的元数据定义存储在内存中，好处是可以使得交换机和队列声明等操作速度更快。
Disk node：将元数据存储在磁盘中，单节点系统只允许磁盘类型的节点，防止重启 RabbitMQ 的时候，丢失系统的配置信息
RabbitMQ 要求在集群中至少有一个磁盘节点，所有其他节点可以是内存节点，当节点加入或者离开集群时，必须要将该变更通知到至少一个磁盘节点。如果集群中唯一的一个磁盘节点崩溃的话，集群仍然可以保持运行，但是无法进行其他操作（增删改查），直到节点恢复。为了确保集群信息的可靠性，或者在不确定使用磁盘节点还是内存节点的时候，建议直接用磁盘节点。

**基于docker安装镜像集群**

创建三个容器 rabbit01 rabbit02 rabbit03，注意用`--link rabbit01:rabbit-host1`连接到同一网络，同时使用不同端口

下面配置cookie一直，通过启动日志查找home dir，cookie即在次目录下，记得修改其权限

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20230214145022765.png)

```shell
chmod 600 /var/lib/rabbitmq/.erlang.cookie
```

将文件先复制到物理机在复制02 03容器内

```shell
docker cp rabbit01:/var/lib/rabbitmq/  ~/programs/data/rabbitmq/cookie
docker cp ~/programs/data/rabbitmq/cookie/.erlang.cookie rabbit02:/var/lib/rabbitmq/
```

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20230214145357487.png)

重启rabbit02 rabbit03

1.普通集群模式

重启后进入容器将rabbit02 rabbit03的节点加入rabbit01中创建普通集群

```
rabbitmqctl stop_app
rabbitmqctl reset  // 重置集群
rabbitmqctl join_cluster --ram rabbit@rabbit-host1    //myRabbit1为rabbit01的hostname
rabbitmqctl start_app
rabbitmqctl cluster_status  // 查看集群状态
```

修改存储类型

```shell
rabbitmqctl change_cluster_node_type disc
```

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20230214161429654.png)

2.镜像集群

```shell
rabbitmqctl set_policy [-p Vhost] Name Pattern Definition [Priority]
-p Vhost： 可选参数，针对指定vhost下的queue进行设置
Name: policy的名称
Pattern: queue的匹配模式(正则表达式)
Definition：镜像定义，包括三个部分ha-mode, ha-params, ha-sync-mode
        ha-mode:指明镜像队列的模式，有效值为 all/exactly/nodes
            all：表示在集群中所有的节点上进行镜像
            exactly：表示在指定个数的节点上进行镜像，节点的个数由ha-params指定
            nodes：表示在指定的节点上进行镜像，节点名称通过ha-params指定
        ha-params：作为参数，为ha-mode的补充
        ha-sync-mode：进行队列中消息的同步方式，有效值为automatic和manual
priority：可选参数，policy的优先级

rabbitmqctl set_policy ha-all "^" '{"ha-mode":"all"}' --apply-to all
```



![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20230215094101529.png)



![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20230215094032333.png)



![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20230214162215197.png)

查看队列详情，01镜像到了02

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20230215094543870.png)



### 高可用集群

**客户端负载均衡**

基于springboot的配置文件配置多个mq地址,与每个节点都建立连接

```yml
spring:
  rabbitmq:
    addresses: localhost:5673,localhost:5674,localhost:5675
```



**服务端负载均衡**

通过在mq外部包一层代理，客户端连接代理层，由代理层做负载均衡，常用的代理像nginx，haproxy。

在mq的集群架构中，使用的是haproxy，因为其适合大负载，支持数以万计的并发，性能好轻量。

下面演示使用haproxy4层代理的方式

> 二层负载均衡（mac）
> 用于虚拟mac地址方式，外部对虚拟mac地址请求，负载均衡接收后分配给后端实际的mac地址响应。
>
> 三层负载均衡（ip）
> 一般用于虚拟ip地址的方式，外部对虚拟ip地址请求，负载均衡接收后分配给后端实际的ip地址响应。
>
> 四层负载均衡（tcp）
> 在三层负载均衡的基础上，用ip+port接收请求，在转发到对应的机器上。
> 产品大概有：F5，lvs，nginx，haproxy…
>
> 七层负载均衡（http）
> 根据虚拟的url或者ip，主机名接收请求，在转发到相应的处理服务器上。
> 产品大概有：haproxy，nginx，apache，mysql proxy…
>
> HTTP负载均衡和TCP负载均衡是网络负载均衡中的两种不同类型，它们的区别如下：
>
> - 协议层次不同：HTTP负载均衡工作在应用层，而TCP负载均衡工作在传输层。
>
> - 负载均衡方式不同：HTTP负载均衡是基于HTTP协议的负载均衡，通过检查HTTP报文中的信息来进行请求转发；而TCP负载均衡则是基于IP地址和端口号的负载均衡，通过检查传输层的TCP头部信息来进行请求转发。
>
> - 粒度不同：HTTP负载均衡通常是基于URL或者请求头等细节进行负载均衡，粒度更细；而TCP负载均衡通常是基于IP地址和端口号进行负载均衡，粒度相对较粗。
>
> - 需要的硬件资源不同：由于HTTP负载均衡需要对HTTP报文进行解析和处理，因此通常需要更强大的硬件资源来支持；而TCP负载均衡只需要对传输层进行处理，因此需要的硬件资源相对较少。
>
> - 对网络性能的影响不同：由于HTTP负载均衡需要对HTTP报文进行解析和处理，因此对网络性能的影响相对较大；而TCP负载均衡对网络性能的影响相对较小。
>
> 需要注意的是，在实际应用中，HTTP负载均衡和TCP负载均衡通常会一起使用，以实现更好的负载均衡效果。



[下载haproxy](http://www.haproxy.org/#down%20)，选择版本后下载器snapshot源文件，再进行编译

```shell
make TARGET=osx
sudo make install
haproxy -version
# HAProxy version 2.7.3-1065b10 2023/02/14 - https://haproxy.org/
# Status: stable branch - will stop receiving fixes around Q1 2024.
# Known bugs: http://www.haproxy.org/bugs/bugs-2.7.3.html
```

**http转发配置测试**

新建`conf/haproxy.cfg`

```cfg
global
    daemon
    maxconn 256

defaults
    mode http
    timeout connect 5000ms
    timeout client 50000ms
    timeout server 50000ms
    
# 监听15670端口，代理到15673
listen http-in
    bind *:15670
    server server1 127.0.0.1:15673 maxconn 32
```

启动haproxy：`haproxy -f ./conf/haproxy.cfg -d`，访问http://localhost:15670测试，跳转到15673的页面。

**http负载均衡配置**

```
global
    daemon
    maxconn 256

defaults
    mode http
    stats enable
    stats uri /haproxy-stats
    stats refresh 10s
    monitor-uri /haproxy-test
    balance roundrobin
    option httpclose
    option forwardfor
    timeout connect 5000ms
    timeout client 50000ms
    timeout server 50000ms

listen my-web-cluster1
    bind *:9000
    server server1 127.0.0.1:80
    server server2 192.168.1.14:80
```

上面的配置表示，访问http://localhost:9000/时，会转发到127.0.0.1:80或192.168.1.14:80中的一台

另外，访问 http://localhost:9000/haproxy-stats 还能看到一个统计页面， http://localhost:9000/haproxy-test 用于测试haproxy工作是否正常

**tcp负载均衡**

回到rabbitmq，我们需要配置tcp负载均衡，这也是rabbitmq要求的

```
global
    daemon
    # nbproc 1 nbproc is not supported any more since HAProxy 2.5. 
defaults
    mode tcp
    retries 3    # 重试三次
    option redispatch
    option abortonclose
    maxconn 4096  # 最大连接数
    timeout connect 5000ms
    timeout client 30000ms
    timeout server 30000ms
    log 127.0.0.1 local0 notice err

listen rabbitmq-cluster
    bind *:5670
    mode tcp
    balance roundrobin   # 轮询
    server mq01 localhost:5673 check inter 5000 rise 2 fall 3 weight 1
    server mq02 localhost:5674 check inter 5000 rise 2 fall 3 weight 1
    server mq03 localhost:5675 check inter 5000 rise 2 fall 3 weight 1
listen monitor
    bind :8190
    mode http
    option httplog
    stats enable
    stats uri /rabbitmq
    stats refresh 5s
```

> 关闭linux内核限制：`sudo setsebool -P haproxy_connect_any=1`

启动haproxy，查看rabbitmq集群的状态，并停掉03节点测试http://localhost:8190/rabbitmq

![image-20230215111809205](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20230215111809205.png)

haproxy到此搭建完成，下面开始keeplived的部分

现在haproxy为单点部署，一旦它挂了，整个集群也就废了，为了解决这一问题，有两种方案：

- 通过域名解析的方式动态切换ip，这种需要自己搭建DNS解析服务器，比较麻烦
- 使用虚拟IP技术，用到keeplived来生成VIP

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20230215114227703.png)

**keeplived**

高性能的服务器高可用或热备解决方案，主要防止单点故障问题，使用VRRP协议。

https://zhuanlan.zhihu.com/p/143295216

> 安装不顺利，放弃



### 集群间通信方式

> 北京洛杉矶异地机房部署的mq，如何互相通信，即北京发的消息，如何让洛杉矶的收到？
>
> 无论直连还是组异地集群，都存在较大的网络延时

**federation模式**

通过一个单独的交换机或队列将本集群的消息转发到其他集群的交换机或队列

- 单向federation
- 双向federation
- 广播federation
- 环形federation

如何设置

1.启用插件`rabbitmq-plugins enable rabbitmq_federation_management`

2.进入管控台`admin`页面设置

**shovel模式**

支持交换机到队列，更灵活，使用方式同样是插件`rabbitmq-plugins enable rabbitmq_shovel_management`

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20230215161109359.png)

### 监控和故障恢复

























## 消息存储

RabbitMQ使用自定义DB来存储消息,db通常位于:

/var/lib/rabbitmq/mnesia/rabbit@hostname/queues

https://www.codenong.com/cs109344346/




RabbitMQ是一种流行的消息队列系统，支持多种集群模式，以提高可用性和可靠性。以下是四种常见的RabbitMQ集群模式：

镜像队列（Mirrored Queues）
镜像队列是一种简单的集群模式，通过将消息队列的副本在多个节点之间复制来提高可靠性。当消息被写入队列时，所有镜像队列的副本都会被更新。这种模式非常适合于需要高可靠性的应用程序，但可能会在性能方面存在一些问题。

镜像队列加强版（Quorum Queues）
Quorum Queues 是 RabbitMQ 3.8 中引入的新功能，相对于镜像队列更加高效。在Quorum Queue中，消息队列不再是使用复制方式，而是使用Raft协议实现的分布式共识算法。这种模式通过更少的复制，更快的故障恢复时间和更好的性能提高了可靠性。

分布式队列（Federated Queues）
分布式队列是一种将多个RabbitMQ服务器连接在一起的模式，它将多个独立的消息队列连接在一起，使得它们可以像单个队列一样被使用。这种模式非常适合于需要跨多个数据中心或地理位置分布的应用程序。

集群队列（Clustered Queues）
集群队列是一种使用分布式Erlang实现的集群模式，它在RabbitMQ节点之间共享消息队列。这种模式可以提供更好的性能和可用性，因为它可以在多个节点之间负载均衡和自动故障转移。

需要注意的是，RabbitMQ集群的配置和优化需要综合考虑多个因素，包括负载均衡、故障转移、网络延迟等，以确保系统的高可用性和高性能。



## 延时消息

https://juejin.cn/post/6935338370847473671
