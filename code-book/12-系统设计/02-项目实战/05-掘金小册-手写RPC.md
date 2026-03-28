

> [zookeeper重启，线上微服务全部掉线，怎么回事？](https://juejin.cn/post/7204984033100742712)


## 设计篇

**调用流程**

client stub 和 server stub 的作用都是包装信息，这样才能在网络传输，以字节流的方式的在IO中传输。这两部分也是需要 rpc 框架来实现的部分，要做到用户对这部分是无感知的。

[[00-Daily Plan]]

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220802165024292.png)

**模块设计**

整个框架里面会有生产者、消费者、注册中心三种角色。其中生产者和消费者是一个相对而言，随机会互换的角色。

那这里可能需要解决的问题比如：

- 服务如何想注册中心注册？

- 注册中心如何存储服务信息？

- 消费者如何拉取服务信息？
- 服务信息变更时如何及时的下发到生产者和消费者？（难点）

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220802165703265.png)

**容错设计**

- 注册中心挂掉怎么办？
- 服务端的心跳监听
- 负载均衡机制的实现。

**线程池设计**

这也是一个难点部分，主要是在服务提供者端，对IO的处理、自身的工作线程等等。

- io线程和worker线程的拆分；
- 调用结果和客户端请求的唯一匹配；
- 客户端请求后的同步转异步处理；
- 单一请求队列和多请求队列的设计差异性；

**可接入**

我们看现有的RPC的框架都是开箱即用的，注解驱动，所以我们也要引入Spring的框架部分。最终的模块图如下：

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220802170621584.png)

## 预热篇

**1.BIO**

阻塞式IO，即如果当前请求没处理完，不会处理下一个。

`serverSocket.accept();`，这个方法是以阻塞的方式等待连接，如果没有客户端来连接，不会往下执行。那每个连接就作为一个任务加入线程池，通过一个循环来接收会话。

`socket.getInputStream().read(result);`，这个 read() 方法同样是阻塞的，即如果当前会话没有处理完，不能处理下一个会话。

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220803091533462.png)

**2.NIO**

那我们来看一下啊真正的非阻塞式IO——NIO。在后期版本的JDK中，开发者对read函数进行了升级，当调用read函数时，如果没有发现目标方发送过来的数据信息，则会立即返回一个数字值 -1，而并不会一直处于堵塞状态。

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220803092255381.png)

更多内容参考Netty预热内容。


**epoll**

> https://blog.csdn.net/jiankunking/article/details/90518647



## 编码篇

> 本篇主要如下几个模块的内容：
>
> - 代理层：负责对底层调用细节的封装；
> - 注册中心：关注服务的上下线，以及一些权重，配置动态调整等功能；
> - 路由层：负责在集群目标服务中的调用筛选策略；
> - 序列化层：负责将不同的序列化技术嵌套在框架中；
> - 责任链模式（重难点）
> - 队列和多线程
> - 容错层：当服务调用出现失败之后需要有容错层的兜底辅助；
> - 支持Spring的注解
> - 框架性能调优
>
> [码云](https://gitee.com/IdeaHome_admin/irpc-framework):本部分对应从 lession-02 分支开始。

### 工程搭建

此处只列出pom文件，引入的依赖主要为netty、slf4j、fastjson、序列化依赖，后续可能还要引入spring和一些工具类。

此处只包含一个moudle——`irpc-framework-core`

```xml
<properties>
        <!--方便查看版本-->
        <maven.compiler.source>8</maven.compiler.source>
        <maven.compiler.target>8</maven.compiler.target>
        <netty.version>4.1.78.Final</netty.version>
        <fastjson.version>1.2.76</fastjson.version>
        <jboss-marshalling-river.version>1.4.11.Final</jboss-marshalling-river.version>
        <jboss-marshalling-serial.version>1.4.11.Final</jboss-marshalling-serial.version>
        <slf4j-api.version>1.7.36</slf4j-api.version>
        <javassist.version>3.21.0-GA</javassist.version>
    </properties>

    <dependencies>

        <dependency>
            <groupId>org.javassist</groupId>
            <artifactId>javassist</artifactId>
            <version>${javassist.version}</version>
        </dependency>

        <dependency>
            <groupId>io.netty</groupId>
            <artifactId>netty-all</artifactId>
            <version>${netty.version}</version>
        </dependency>

        <dependency>
            <groupId>org.slf4j</groupId>
            <artifactId>slf4j-api</artifactId>
            <version>${slf4j-api.version}</version>
        </dependency>

        <dependency>
            <groupId>com.alibaba</groupId>
            <artifactId>fastjson</artifactId>
            <version>${fastjson.version}</version>
        </dependency>

        <!--序列化 接收方工具-->
        <dependency>
            <groupId>org.jboss.marshalling</groupId>
            <artifactId>jboss-marshalling-river</artifactId>
            <version>${jboss-marshalling-river.version}</version>
        </dependency>

        <!--序列化 处理工具-->
        <dependency>
            <groupId>org.jboss.marshalling</groupId>
            <artifactId>jboss-marshalling-serial</artifactId>
            <version>${jboss-marshalling-serial.version}</version>
        </dependency>

    </dependencies>
```

### 代理层

> - 服务端和客户端的启动功能，
> - 为解决netty粘包设计的自定义协议。
> - 通过本地代理来实现的远程调用
> - 异步调用线程

**服务端基础框架**

服务端的启动，本质就是启动一个netty服务，需要注意这个的线程配置会是后面性能调优需要修改的地方。

代码不全部展示，截取服务注册的方法如下：

```java
    // 向服务端注册信息
    public void registryService(Object serviceBean) {
        if (serviceBean.getClass().getInterfaces().length == 0) {
            throw new RuntimeException("service must had interfaces!");
        }
        Class[] classes = serviceBean.getClass().getInterfaces();
        if (classes.length > 1) {
            throw new RuntimeException("service must only had one interfaces!");
        }
        Class interfaceClass = classes[0];
        //需要注册的对象统一放在一个MAP集合中进行管理
        PROVIDER_CLASS_MAP.put(interfaceClass.getName(), serviceBean);
    }
```

处理接收到消息时，先解析出需要执行的目标类，再通过反射执行对应的方法，最后将执行结果返回，代码如下

```java
/**
     * 从RpcProtocol中拿到调用的service类信息，手动的调用其方法
     */
    @Override
    public void channelRead(ChannelHandlerContext ctx, Object msg) throws Exception {
        RpcProtocol rpcProtocol = (RpcProtocol) msg;
        String json = new String(rpcProtocol.getContent(), 0, rpcProtocol.getContentLength());
        RpcInvocation rpcInvocation = JSONObject.parseObject(json, new TypeReference<RpcInvocation>() {});
        // 获取目标对象
        Object targetService = CommonServerCache.PROVIDER_CLASS_MAP.get(rpcInvocation.getTargetServiceName());
        Method[] methods = targetService.getClass().getMethods();
        for (Method method: methods) {
            if (method.getName().equals(rpcInvocation.getTargetMethod())){
                // 执行目标方法
                Object response = method.invoke(targetService, rpcInvocation.getArgs());
                rpcInvocation.setResponse(response);
            }
        }
        // 将结果返回
        RpcProtocol respRpcProtocol = new RpcProtocol(JSONObject.toJSONString(rpcInvocation).getBytes());
        ctx.writeAndFlush(respRpcProtocol);
    }
```



**客户端基础框架**

> TODO - 关于此处动态代理的作用
>
> 客户端首先需要通过一个代理工厂获取**被调用对象的代理对象**，然后通过代理对象将数据放入发送队列，最后会有一个异步线程将发送队列内部的数据一个个地发送给到服务端，并且等待服务端响应对应的数据结果。

同样的，也是一个Netty客户端，值得思考的是发送消息的方式，同步还是异步？阻塞还是非阻塞？

本例采用异步阻塞方式，优缺点如下：

```java
    /**
     * <h3>使用异步单线程来发送调用请求</h3>
     * <p>单线程的阻塞模式保证发送的顺序性</p>
     * <p>使用阻塞队列来保存发送内容</p>
     * <p>问题：每个服务端启一个线程，服务端很多怎么办？</p>
     */
    private void startClient(ChannelFuture channelFuture) {
        new Thread(() -> {
            while (true) {
                try {
                    //阻塞模式
                    RpcInvocation data = CommonClientCache.SEND_QUEUE.take();
                    //将RpcInvocation封装到RpcProtocol对象中，然后发送给服务端
                    String json = JSONObject.toJSONString(data);
                    RpcProtocol rpcProtocol = new RpcProtocol(json.getBytes());

                    //netty的通道负责发送数据给服务端
                    channelFuture.channel().writeAndFlush(rpcProtocol);
                } catch (InterruptedException e) {
                    e.printStackTrace();
                }
            }
        }).start();
    }

```

客户端处理类，处理的是服务端执行完方法后返回的数据，这里通过uuid进行请求和响应的绑定。

```java
public void channelRead(ChannelHandlerContext ctx, Object msg) throws Exception {
        RpcProtocol protocol = (RpcProtocol) msg;
        String json = new String(protocol.getContent(), 0,protocol.getContentLength());
        RpcInvocation invocation = JSONObject.parseObject(json, new TypeReference<RpcInvocation>() {});
        if (CommonClientCache.RESP_MAP.containsKey(invocation.getUuid())){
            CommonClientCache.RESP_MAP.put(invocation.getUuid(),invocation);
        }else {
            log.error("response uuid[{}] not matched",invocation.getUuid());
        }
        ReferenceCountUtil.release(msg);  // todo
    }
```

到目前我们还不到uuid是在什么时候设置的？请求调用信息是在什么时候被放入队列的？以及客户端是如何等待返回信息的？

其实这都在之前提到的代理工厂中实现。

```java
    /**
     * 核心之处：在创建代理对象的过程中将请求发出去，同时在此等待，如果调用成功，直接返回服务端返回的代理对象
     * todo：等待逻辑待优化
     */
    public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
        RpcInvocation rpcInvocation = new RpcInvocation();
        rpcInvocation.setArgs(args);
        rpcInvocation.setTargetMethod(method.getName());
        rpcInvocation.setTargetServiceName(clazz.getName());
        //这里面注入了一个uuid，对每一次的请求都做单独区分
        rpcInvocation.setUuid(UUID.randomUUID().toString());
        CommonClientCache.RESP_MAP.put(rpcInvocation.getUuid(), OBJECT);
        //这里就是将请求的参数放入到发送队列中
        CommonClientCache.SEND_QUEUE.add(rpcInvocation);
        long beginTime = System.currentTimeMillis();
        //客户端请求超时的一个判断依据
        // 此时被阻塞，即需要等待当前rpc调用处理完，才能继续往队列里添加任务，被服务的端的消费消费线程消费
        while (System.currentTimeMillis() - beginTime < 3*1000) {
            Object object = CommonClientCache.RESP_MAP.get(rpcInvocation.getUuid());
            // 请求返回，我们之前设置的 object 已经被覆盖成 RpcInvocation
            if (object instanceof RpcInvocation) {
                return ((RpcInvocation)object).getResponse();
            }
        }
        throw new TimeoutException("client wait server's response timeout!");
    }

```

> 思考：远程调用的顺序性、幂等性、最终一致性都如何保证？

### 注册中心

>实现代理层之后，思考如下问题：
>
>- 如果同一个服务有10台不同的机器进行提供，那么客户端该从哪获取这10台目标机器的ip地址信息呢？
>- 随着调用方的增加，如何对服务调用者的数据进行监控呢？
>- 服务提供者下线了，该如何通知到服务调用方？

假设我们新增一个第三方平台，每个服务暴露的时候，将相关信息“记录”到这个中间平台。

当有调用方订阅服务的时候，也需要预先到这个中间平台上进行“登记”。

当服务提供者下线的时候，需要到该平台去将之前的记录移除，然后再由这个中间平台告知相应的服务调用方。

这样就能很好地将服务的上下线信息进行良好的管理。

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20221121195758769.png)

注册中心需要满足两个条件：

- 能够存储注册信息，类似一个数据库的功能
- 能和客户端和服务端通信，监听其变化

综上，zookeeper 无疑是最佳选择，其天生的节点存储功能和监听机制正适合我们。其本身保证高一致性，支持顺序、非顺序，临时、持久化的存储，社区活跃，解决方案丰富。

**注册节点的结构设计**

先参考一下dubbo在nacos中的配置（dubbo+zk模式还没有实战过）

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20221122100708047.png)

简单分析一下，包含调用的service的全路径、消费者还是生产者、应用名、服务地址，对应到zk的设计如下：

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20221122101059693.png)

**注册层设计**

> - 抽象的注册接口
> - 将服务信息封装成`URL.class`
> - 对zk的操作工具类
> - 订阅通知的实现（难点）

首先，抽象的注册接口，包括注册、下线、订阅、取消订阅四个功能，其中订阅目前是觉得可有可无的，解释为：

订阅某个服务，通常是客户端在启动阶段需要调用的接口。客户端在启动过程中需要调用该函数，从注册中心中提取现有的服务提供者地址，从而实现服务订阅功能。

目的在于一旦订阅了某个服务,就不需要每次都从注册中西拉取数据，同时注册中心的数据有变动，也要通知订阅者。

>  那注册具体逻辑该如何实现呢？更新zk的操作是异步还是同步(数据如何持久化？)，心跳检测如何实现？

- 用一个抽象的注册类，就可以将更多的方法留给子类去扩展，方便扩展不同的注册中心。
- `CuratorZookeeperClient.class`一个zk客户端，类似jdbcTemplate。
- 基于时间机制的监听通知实现（难点）

因为zk节点的消息通知其实是只具有一次性的功效，所以可能会出现第一次修改节点之后发送一次通知，之后再次修改节点不再会发送节点变更通知操作。

这里引入了一些事件的设计思路，**当监听到某个节点的数据发生更新之后，会发送一个节点更新的事件，然后在事件的监听端对不同的行为做不同的事件处理操作**。

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20221122141825533.png)

1.定义一个抽象事件

```java
public interface IRpcEvent {

    Object getData();

    IRpcEvent setData(Object data);
}
```

2.定义一个节点更新的具体事件

```

```

3.定义一个监听器





**注册中心测试**

服务端改造

```java
public void exposeService(Object serviceBean){
        Class beanInterface = getBeanInterface(serviceBean);
        // 放入本地注册表
        CommonServerCache.PROVIDER_CLASS_MAP.put(beanInterface.getName(), serviceBean);
        if (registryService == null) {
            registryService = new ZookeeperRegister(serverConfig.getRegisterAddr());
        }
        URL url = new URL();
        url.setApplicationName(serverConfig.getApplicationName());
        url.setServiceName(beanInterface.getName());
        url.addParameter("host", NetUtil.getLocalhostStr());
        url.addParameter("port",String.valueOf(serverConfig.getPort()));
        // 放入本地注册表,
        CommonServerCache.PROVIDER_URL_SET.add(url);
    }

/**
     * 异步的注册到注册中心
     */
    public void batchExposeUrl(){
        new Thread(() -> {
            try {
                Thread.sleep(2500);
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
            for (URL url : CommonServerCache.PROVIDER_URL_SET) {
                registryService.register(url);
            }
        }).start();
    }

		/**
     * v2 - 测试注册中心
     */
    public static void main(String[] args) throws InterruptedException {
        ServerConfig serverConfig = new ServerConfig();
        serverConfig.setPort(9090);
        serverConfig.setApplicationName("irpc-provider");
        serverConfig.setRegisterAddr("101.43.138.173:2181");
        Server server = new Server();
//        server.initServerConfig();
        server.setServerConfig(serverConfig);
        server.exposeService(new DataServiceImpl());
        server.startApplication();
    }
```

测试结果

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20221128101524164.png)

**客户端测试**



```java
public static void main(String[] args) throws Throwable {
        ClientConfig clientConfig = new ClientConfig();
        clientConfig.setPort(9090);
        clientConfig.setServerHost("localhost");
        clientConfig.setApplicationName("irpc-consume");
        clientConfig.setRegistryAddr("101.43.138.173:2181");
        Client client = new Client();
        client.setClientConfig(clientConfig);

        RpcReference rpcReference = client.startClientApplication();
        DataService dataService = rpcReference.get(DataService.class);
        client.doSubscribeService(DataService.class);
        client.doConnectServer();
        for (int i = 0; i < 10; i++) {
            try {
                String result = dataService.sendData("test");
                System.out.println(result);
                Thread.sleep(1000);
            }catch (Exception e){
                e.printStackTrace();
            }
        }
    }
```



![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20221201142153887.png)

**小结**

- 基于zookeeper作为注册中心进行了统一的访问接口封装与实现，并且能够支持日后其他注册中心的拓展。
- 当服务提供方发生变更的时候，借助注册中心通知到客户端做本地调用表的一个更新操作。
- 当服务订阅的时候需要告知注册中心修改节点数据，方便日后可以针对调用者做一些数据统计与监控的功能。
- 统一将节点的更新后的相关操作通过事件的机制来实现代码解偶。
- 将项目中常用的一些缓存数据按照服务端和客户端两类角色进行分开管理。
- 将对于netty连接的管理操作统一封装在了ConnectionHandler类中，以及将之前硬编码的配置信息都迁移到了properties配置文件中，并设计了PropertiesBootst rap类进行管理。

### 路由层（负载均衡）





### 容错层

> cbim：优化调用链路过长导致的问题追踪过慢，同时接口没有限流机制
>
> 服务端异常返回给到调用方展示 
> 客户端调用可以支持超时重试
> 服务提供方进行接口`限流`

