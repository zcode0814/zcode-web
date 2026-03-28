## Netty 概述

Netty 是由 JBOSS 提供的一个 Java 开源框架。Netty 提供异步的、基于事件驱动的网络应用程序框架，用以快速开发高性能、高可靠性的网络 IO 程序。

封装了 NIO ，使其复杂的 API 简单化，同时支持多种传输协议和通信协议，基于事件驱动，使用零拷贝减少内存 IO ，同时保证传输安全性（SSL和TLS），社区活跃，不断更新。

很多开源框架 Dubbo、Kafka、ES 等都使用 Netty 作为底层通讯框架。

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20221012100544912.png)

[下载地址](https://github.com/netty/netty/archive/refs/tags/netty-4.1.84.Final.tar.gz)

目前 5.0 版本还在开发中，曾出现过严重 bug ，[官网](https://netty.io/)推荐 4.1.84 。

## Reactor 线程模型

> 不同的线程模式，对程序的性能有很大影响，目前存在的线程模型有： 
>
> - 传统阻塞 I/O 服务模型 
>
> - Reactor 模式
> - 还有一个 AIO 使用的模型

### 传统阻塞 I/O 服务模型

采用阻塞 IO 模式获取输入的数据每个连接都需要独立的线程完成数据的输入。

如果并发数很大，就会创建大量的线程，线程开销大，创建销毁也需要资源。

如果创建连接后没有数据可读，线程就会阻塞在 read 操作，造成资源浪费，线程利用率不高。

这就是预热阶段的 BIO 模式，为了解决线程过多的情况，我们引入 IO 多路复用的思想，通过一个 Selector 来统一响应建立连接，当某个连接有新的数据可以处理时，操作系统通知应 用程序，线程从阻塞状态返回，开始进行业务处理。

### Reactor 模式

> 根据 Reactor 的数量和处理资源池线程的数量不同，有 3 种典型的实现 
>
> - 单 Reactor 单线程
> - 单 Reactor 多线程
> - 主从 Reactor 多线程
>
> Netty 主要基于主从 Reactor 多线程模型做了一定的改进，其中主从 Reactor 多线程模型有多个 Reactor 。

I/O 复用结合线程池，就是 Reactor 模式基本设计思想。



## Netty 架构设计



![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20221015164047128.png)





### Netty-Simple（TCP）

> 客户端可以给服务器发消息，服务器收到消息后可以回复

[code](https://gitee.com/yitiaocoding/JavaExpert/tree/master/netty-simple/src/main/java/com/yitiao/simple/tcp)



### Task Queue

> 三种典型使用场景：
>
> - 自定义的任务
> - 定时任务
> - 利用当前 Reactor 线程调用 Channel 的各种方法，例如推送系统，需要根据用户标识找到对应的 Channel ，然后调用 Write 方法发送数据，而这个写任务会被提交到任务队列中异步消费
>
> **注意 队列中的任务是同步阻塞执行的**
>
> 思考：如何自己实现一个异步非阻塞队列 ？



**同步阻塞队列** 

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20221015164706297.png)

**自定义的任务**





**定时任务**



**广播任务**





### 异步模型

> 前面的疑问，建立连接后为什么要做监听？

先聊聊 ChannelFuture ，

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20221015170445360.png)



![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20221017010958121.png)



### Netty-Simple（HTTP）

> Netty 服务器在指定端口监听，浏览器发出请求`http://localhost:port/`
>
> 服务器可以回复消息给客户端并对特定请求资源进行过滤

[code](https://gitee.com/yitiaocoding/JavaExpert/tree/master/netty-simple/src/main/java/com/yitiao/simple/http)



### Netty 核心组件

> 对核心流程中的组件做一个梳理和扩展

**ServerBootstrap**



**ChannelOption**



**ChannelHandler**

https://www.cnblogs.com/zhengzhaoxiang/p/13973828.html





**Unpooled**

出自于`ctx.writeAndFlush(Unpooled.copiedBuffer("hello server!", CharsetUtil.UTF_8));`

是 Netty 用来操作数据缓冲区的工具类，`Unpooled.copiedBuffer` 创建一个新的大端缓冲区，其内容是在指定字符集中编码的指定字符串。新缓冲区的 readerIndex 和 writerIndex 分别为0和编码字符串的长度。

这里的 ByteBuf 类似于 Java NIO 中的 ByteBuffer 但它是 Netty 独有的，具体构成如下：

- readerIndex：
- writerIndex：

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20221023211154829.png)



### Netty-Simple（ChatRoom）

> 编写一个 Netty 群聊系统，实现服务器端和客户端之间的数据简单通讯（非阻塞）实现多人群聊。
>
> 服务器端可以监测用户上线，离线，并实现消息转发功能。
>
> 客户端通过channel 可以无阻塞发送消息给其它所有用户，同时可以接受其它用 户发送的消息(有服务器转发得到)

[code](https://gitee.com/yitiaocoding/JavaExpert/tree/master/netty-simple/src/main/java/com/yitiao/simple/chat)



### Netty-Simple（HeartBeat）

> 编写一个 Netty心跳检测机制案例
>
> - 当服务器超过3秒没有读时，就提示读空闲
>
> - 当服务器超过5秒没有写操作时，就提示写空闲 
> - 实现当服务器超过7秒没有读或者写操作时，就提示读写空闲

code



### Netty-Simple（WebSocket）

> 实现一个网页版多人聊天室

v1.1.0 效果图

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20221031112438939.png)

## 编解码

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20221024173936478.png)

### Netty 自带编解码器





### Protobuf

> http + json --> tcp + protobuf (dubbo)

如果使用 Protobuf ，我们将无法像原来一样编写实体类，需要我们使用 protoc.exe 将 *.proto 转换成 *.java 文件，如下图：

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20221024174308171.png)

对于 windows 系统，直接使用 exe 文件即可，Mac 系统需要通过 homebrew 安装：

```shell
brew install automake
brew install libtool
brew install protobuf
```

查看版本，这个版本号要记下来

```   
protoc --version  # libprotoc 3.21.5
```

安装好以后需要添加 pom 依赖：

```xml
 				<dependency>
            <groupId>com.google.protobuf</groupId>
            <artifactId>protobuf-java</artifactId>
            <!--版本号与本地安装的编译器要一致-->
            <version>3.21.5</version>
        </dependency>
```

编写 Student.proto 

```protobuf
syntax = "proto3"; //版本
option java_outer_classname = "StudentPOJO";//生成的外部类名，同时也是文件名
message Student {
  int32 id = 1;  // 1,2 是指序号，不是赋值
  string name = 2;
}
```

进入命令行编译

```shell
protoc --java_out=./ Student.proto
```

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20221027141439412.png)

### Netty-Simple（Protobuf）

略

## Handler 调用链

### Channel 执行流程

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20221025105246646.png)

- 客户端连上netty服务器后，马上调用handlerAdded方法完成channel的添加操作(所谓channel可以理解为一个客户端)
- 添加操作执行完成以后立马调用channelRegistered方法将channel注入到netty中管理起来
- 注册好以后调用服务器端的channelActive方法，让其处于激活状态
- 调用channelRead0方法完成客户端数据的读取和相应
- 调用完成以后curl主动断开服务器的链接，并通知服务器端，服务器端就会调用channelInactive方法处理回调事件
- 最后从netty的注册中将该channel删除掉



### 入站和出站

ChannelPipeline提供了ChannelHandler链的容器。

以客户端应用程序为例，如果事件的运动方向是从客户端到服务端的，那么我们称这些事件为出站的，即
客户端发送给服务端的数据会通过pipeline中的一系列ChannelOutboundHandler，并被这些Handler处理，反之则称为入站的。

`站`是指 socket ，出和入是看 socket 和 handler 的流向。

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20221031125228594.png)

**出入站对应的编解码器**

出站 -> 



## 整合 Log4j



## TCP 粘包和拆包

> TCP是面向连接的，面向流的，提供高可靠性服务。收发两端（客户端和服务器端） 都要有一一成对的socket，因此，发送端为了将多个发给接收端的包，更有效的发 给对方，使用了优化方法（Nagle算法），将多次间隔较小且数据量小的数据，合 并成一个大的数据块，然后进行封包。这样做虽然提高了效率，但是接收端就难于 分辨出完整的数据包了，因为面向流的通信是无消息保护边界的。

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20221101164312391.png)

### 产生原因

- 应用程序 write 写入的字节大小 大于 套接口发送缓冲区大小
- 进行 MSS 大小的TCP分段
- 以太网帧的playload 大于MTU 进行了IP分片

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20230524115124269.png)

### 常见解决方案

对于粘包和拆包问题，常见的解决方案有四种：

- 客户端在发送数据包的时候，每个包都固定长度，比如1024个字节大小，如果客户端发送的数据长度不足1024个字节，则通过补充空格的方式补全到指定长度；
- 客户端在每个包的末尾使用固定的分隔符，例如\r\n，如果一个包被拆分了，则等待下一个包发送过来之后找到其中的\r\n，然后对其拆分后的头部部分与前一个包的剩余部分进行合并，这样就得到了一个完整的包；
- 将消息分为头部和消息体，在头部中保存有当前整个消息的长度，只有在读取到足够长度的消息之后才算是读到了一个完整的消息；
- 通过自定义协议进行粘包和拆包的处理。

### Netty处理粘包和拆包

#### FixedLengthFrameDecoder

解码：定长读取，如果当前读取到的消息不足指定长度，那么就会等待下一个消息到达后进行补足。

编码：不足的用空格补足

#### LineBasedFrameDecoder

解码：以换行符（\n或者\r\n）读取

编码：用户自行拼接换行符

#### DelimiterBasedFrameDecoder

通过用户指定的分隔符对数据进行粘包和拆包处理。

#### LengthFieldBasedFrameDecoder与LengthFieldPrepender

它们处理粘拆包的主要思想是在生成的数据包中添加一个长度字段，用于记录当前数据包的长度。

LengthFieldBasedFrameDecoder会按照参数指定的包长度偏移量数据对接收到的数据进行解码，从而得到目标消息体数据；

LengthFieldPrepender则会在响应的数据前面添加指定的字节数据，这个字节数据中保存了当前消息体的整体字节数据长度。

关于LengthFieldBasedFrameDecoder，对其构造函数参数进行介绍：

- maxFrameLength：指定了每个包所能传递的最大数据包大小；
- lengthFieldOffset：指定了长度字段在字节码中的偏移量；
- lengthFieldLength：指定了长度字段所占用的字节长度；
- lengthAdjustment：对一些不仅包含有消息头和消息体的数据进行消息头的长度的调整，这样就可以只得到消息体的数据，这里的lengthAdjustment指定的就是消息头的长度；
- initialBytesToStrip：对于长度字段在消息头中间的情况，可以通过initialBytesToStrip忽略掉消息头以及长度字段占用的字节。

#### 自定义编解码器

`MessageToByteEncoder`

### Netty-Simple（粘包和拆包）







## 源码解析

> 了解 Netty 如何对 NIO 进行封装及其事件处理机制，熟练其设计模式（责任链模式等）的使用

### 环境搭建



**java: 程序包io.netty.util.collection不存在**

```shell
# 在 netty-common 下执行
mvn clean install -DskipTests=true -Dcheckstyle.skip=true
```



![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20221107140839060.png)

### 启动过程源码

> 做好连接的准备（布置好前台）
>
> - 创建 selector （NioEventLoop）
> - 创建并初始化 server socket channel
>
> - 注册 server socket channel 到 selector （NioEventLoop）
> - 绑定端口启动
> - 注册接受链接事件到 selector 

**EventLoop**

```java
// Boss Group（只处理连接请求） 和 Work Group（处理客户端业务） 两个核心
// 子线程 NioEventLoop  无限循环三步  接受-分发-启动

// 传参：含有的子线程(NioEventLoop)的个数，默认为 cpu 核心线程数 * 2
EventLoopGroup bossGroup = new NioEventLoopGroup(1);
EventLoopGroup workerGroup = new NioEventLoopGroup(); //16
```



默认线程数 `NettyRuntime.availableProcessors() * 2`

```java
    static {
        DEFAULT_EVENT_LOOP_THREADS = Math.max(1, SystemPropertyUtil.getInt(
                "io.netty.eventLoopThreads", NettyRuntime.availableProcessors() * 2));
    }
```

创建 selector

```java
NioEventLoop.openSelector() // 在创建 NioEventLoopGroup 时创建 Selector
```

server socket channel

```java
doBind(final SocketAddress localAddress) {
  // 初始化并注册 channel
 	final ChannelFuture regFuture = initAndRegister();
};

initAndRegister() {
  // 通过反射创建 channel
  channel = channelFactory.newChannel();  // return constructor.newInstance();  反射
  init(channel);
  
  ChannelFuture regFuture = config().group().register(channel);
}

// 初始化channel，即将handler加入pipeline
ServerBootstrap.init(channel){
        ChannelPipeline p = channel.pipeline();
//        final ChannelHandler handler = this.handler();
        p.addLast(new ChannelInitializer<Channel>() {
            @Override
            public void initChannel(final Channel ch) {
                final ChannelPipeline pipeline = ch.pipeline();
                ChannelHandler handler = config.handler();
                if (handler != null) {
                    pipeline.addLast(handler);
                }

                ch.eventLoop().execute(new Runnable() {
                    @Override
                    public void run() {
                        pipeline.addLast(new ServerBootstrapAcceptor(
                                ch, currentChildGroup, currentChildHandler, currentChildOptions, currentChildAttrs));
                    }
                });
            }
        });
    }
};

// 注册 javaChannel() 即java.nio包下的channel
selectionKey = javaChannel().register(eventLoop().unwrappedSelector(), 0, this);
// 第一次注册的并不是 accept 事件，而是 0 ，在 fireChannelActive() 时注册OP_ACCEPT
// NioEventLoop 是通过 Register 操作的执行来完成启动的。

```



**Bootstrap**

```java
ServerBootstrap server = new ServerBootstrap();
```



**bind()**

```java
ChannelFuture channelFuture = server.bind(9100).sync();
```



```java
private static void doBind0(
            final ChannelFuture regFuture, final Channel channel,
            final SocketAddress localAddress, final ChannelPromise promise) {

        // This method is invoked before channelRegistered() is triggered.  Give user handlers a chance to set up
        // the pipeline in its channelRegistered() implementation.
        channel.eventLoop().execute(new Runnable() {
            @Override
            public void run() {
                if (regFuture.isSuccess()) {
                    channel.bind(localAddress, promise).addListener(ChannelFutureListener.CLOSE_ON_FAILURE);
                } else {
                    promise.setFailure(regFuture.cause());
                }
            }
        });
    }
```



```
    @SuppressJava6Requirement(reason = "Usage guarded by java version check")
    @Override
    protected void doBind(SocketAddress localAddress) throws Exception {
        if (PlatformDependent.javaVersion() >= 7) {
            javaChannel().bind(localAddress, config.getBacklog());
        } else {
            javaChannel().socket().bind(localAddress, config.getBacklog());
        }
    }
```



**启动服务的本质**

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20221107154608203.png)



### 接受请求过程源码

**accept()**





### Pipeline Handler HandlerContext创建源码





### ChannelPipeline 调度 handler 的源码





### 心跳(heartbeat)服务源码



### 核心组件 EventLoop 源码



### 加入线程池源码



## Netty 在 RPC 的实践

### RPC基本介绍



### RPC调用流程



### 自己实现 dubbo RPC(基于Netty)







