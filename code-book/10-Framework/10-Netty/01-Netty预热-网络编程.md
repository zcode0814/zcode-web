> mk-javaio



![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220719193747754.png)





## 网络基础

**DNS解析**

www.baidu.com.root  root 被省略了，从跟节点到顶级域名、一级域名、二级域名，三级域名从右往左解析，本质是一个树形机构，所以在查找时分为递归查找和迭代查找。

**网络分层**

- 应用层   ——  应用到应用   HTTP FTP SMTP 
- 传输层   ——  端口到端口  TCP UDP
- 网络层   ——  主机到主机   IP
- 数据链路层  ——  网卡到网卡    以太网  广播模式：通知到子网络中的所有网卡，根据mac地址判断。
- 物理层  ——   电信号到数字信号   

**数据包格式**

自底向上的一个拆包的过程

物理层：0 1 这样的电信号，它要做的是知道发给哪一个 网卡，

链路层：讲物理的 0 1 包装成 帧 一帧最多 1518 字节，其中有18字节存放 mac 地址 称为 header。

网络层：从头中拆出 IP 地址

传输层：拆出 端口号。

应用层：发送到具体应用。

> 装包的时候如果数据过大，会先分成不同的 数据帧 分开传输，所以就会有丢帧问题、乱序问题。

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220824101011170.png)

## 

**网络编程的本质是线程间的通信**

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220824104331032.png)

**通信的基础是 IO 模型**

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220824104546235.png)

数据源可以是多种多样的，比如 文件、对象、字符串。

由此可得，IO 是一很广泛的概念，只要有数据传输就是 IO ，java.io 包也包含很多内容。

**java.io 里的装饰器模式**

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220824110231379.png)

```java
// 继承被装饰类
public class BufferedInputStream extends FilterInputStream {
	// 构造器传入被装饰类，并调用父类构造方法，同时在本构造器添加新的功能
        public BufferedInputStream(InputStream in, int size) {
        super(in);
        if (size <= 0) {
            throw new IllegalArgumentException("Buffer size <= 0");
        }
        // 创建缓冲区
        buf = new byte[size];
    }
}
```

**特殊数据源——Socket**

如何理解这个 Socket ，困惑很多人，翻译成中文叫 套接字，这就更误导了很多人。

Socket 是网络通信的端点。

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220824112005115.png)

**Unix中的 Socket 是什么？**

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220824112220864.png)

利用 Socket 通信时，应用先创建一个 Socket 同时将代表自己的（ip + 端口确定）Socket 注册到网卡，之后应用发信息就先和 Socket 通信，Socket 再和网卡通信。

**异步同步、阻塞非阻塞**

情景：男生对女生表白。

- 同步，女生直接给出结果。
- 异步，女生思考一下，等过段时间再告诉男生结果，这次对话结束。
- 阻塞，女生没结果，男生一直等，茶不思饭不想。
- 非阻塞，即使没结果，继续吃饭睡觉改bug。

排列组合

- 

**并发请求处理**

情景：银行窗口

一个业务员（线程）只能同时处理一个客户（请求），现有多个客户排队。如何提高效率：

- 增加业务员（即多线程处理）



## 聊天室案例

**Socket 和 ServerSocket**

ServerSocket流程：

- bind：绑定一个端口
- accept：等待连接，阻塞当前线程，持续等待客户端的连接。

Socket 流程：

- connect：连接到服务器

进行 IO 通信，结束后一定要关闭。

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220824151613408.png)



```java
public class Server {
    public static void main(String[] args) throws Exception {
        ServerSocket server = new ServerSocket(8888);
        System.out.println("server is established:[8888]");

        Socket socket = server.accept();
        System.out.printf("connect to client:[%s]%n", socket.getPort());

        // 读取客户端的消息
        BufferedReader reader = new BufferedReader(new InputStreamReader(socket.getInputStream()));   // 装饰器模式
        // 给客户端发消息
        BufferedWriter writer = new BufferedWriter(new OutputStreamWriter(socket.getOutputStream()));

        String line = reader.readLine();
        if (line != null) {
            System.out.printf("client[%s] send message is:[%s]%n%n", socket.getPort(), line);
            // 自动回复
            writer.write("server back:[" + line + "]\n");
            writer.flush();
        }

        socket.close();

    }
}
```



```java
public class Client {
    public static void main(String[] args) throws Exception {
        Socket client = new Socket("127.0.0.1", 8888);

        BufferedReader reader = new BufferedReader(new InputStreamReader(client.getInputStream()));   // 装饰器模式
        BufferedWriter writer = new BufferedWriter(new OutputStreamWriter(client.getOutputStream()));

        // 等待用户的信息
        BufferedReader systemReader = new BufferedReader(new InputStreamReader(System.in));

        String line = systemReader.readLine();
        if (line!=null){
            writer.write(line+"\n");
            writer.flush();
        }

        String back = reader.readLine();
        System.out.println(back);

        client.close();

    }
}
```

## 多人聊天室

- 基于 BIO/NIO/AIO 模型
- 支持多人在线聊天
- 每个人的发言能被所有人看到（群聊）

> 一个服务端，只负责接收信息和转发信息。
>
> 所有客户端连接到服务端，向服务端发送消息，服务端接收到消息后，将消息转发到当前聊天室内所有的成员。
>
> 连接信息用`Map<String,List<BufferWriter>`存储。

### BIO版

Acceptor 并不真实处理请求，而是创建一个 handler 线程去和 Client 通信。每个 Client 占用一个线程。

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220824170149204.png)

**阻塞的地方**

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220825140020937.png)

### NIO版

- 使用 Channel 代替 Stream，提供非阻塞式双向读写
- Selector 监控多条 Channel
- 可以在一个线程处理多个 IO

**Channel 和 Buffer**

Buffer读写模式的切换，依赖3个指针：position、limit、capacity和三个函数 （clear、flip、compact）。

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220825142857075.png)

**几个重要的 Channel 类**

- FileChannel
- SocketServerChannel
- SocketChannel

**文件拷贝案例**



**Selector**

事件轮询API，首先 Channel 会注册到 Selector ，Selector 来监控每个 Channel 上的accept read write connect事件。

**深入到内核层面**

阻塞式IO

<img src="https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220829092527076.png" style="zoom:50%;" />

非阻塞式 IO 

<img src="https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220829092648028.png" style="zoom:50%;" />

IO多路复用

select ：事件轮询 API ，用来知道什么时候有消息。对应 Java NIO 。

<img src="https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220829092913965.png" style="zoom:50%;" />

异步 IO

<img src="https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220829093233119.png" style="zoom:50%;" />

我们去请求数据，数据没有准备好，我们没有被阻塞，而是直接返回了。在应用程序层面，虽然我们没有再发起新的请求，但是在系统后台，会监听这个我们请求数据的状态，当我们需要的数据已经准备好了，并且已经存在于系统内核缓存区中了，系统后台还会将这个数据拷贝到我们的应用程序缓存区中，到这里，系统内核会递交给我们一个信号，告诉你，你之前想要的这个数据，已经准备好给你了，你可以进行使用了。

它的异步体现在：我们程序只对数据发起了一次请求，没有请求到，就直接返回了，而之后，当这个数据已经准备好的时候，系统回来通知我们，而不需要我们再次发起请求，就能获取到这个数据，这就体现了异步的特点。A就是asynchronous，也就是异步的意思

### AIO版

**通过Future **

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220829094429624.png)

**通过CompletetionHandler**

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220829094541649.png)

**AsyncChannelGroup**

这个通道组，其实是被多个异步通道共享的资源群组，这里边我们之前提到过，有一个非常重要的资源：线程池，系统会利用线程池中的线程，来处理一些handler请求。

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220906164244212.png)

## 简易服务器

**请求静态资源**

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220907093702143.png)

**请求动态资源**

> 随着请求方、请求时间、参数等因素的变化的资源，比如阅读量。服务器会通过一个**容器**获取动态资源。

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220907094709676.png)

**Tomcat**

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220907094840033.png)

外层 Server ：负责运行服务器，加载资源和环境变量。

Service 组件：一个 Serve 可以有多个 Service ，一个 Service 可以有多个 Connector ，但只能有一个 Engine 。

Connector ：和客户端进行通信的端点，接受请求，返回响应。

Processor ：处理和分发请求，Connector 和 Processor 一般都以线程池的形式存在，并配合队列。

Engine、Host：内部容器，用来解析请求，Engine 根据 ip 将请求分发到不同的 Host 。

Context：最核心组件，代表一个 Web Application ，应用资源管理，类加载，Servlet 管理。

Wrapper：包裹 Servlet 实例，负责 Servlet 的生命周期。

**服务器实战**

> 主要实现 Connector 部分。





