### Netty 的为什么有多种 NIO 实现

虽然 command 实现在 linux 也是用的 epoll ，但是 linux 模式自己实现的更好，更多的可控参数，更少的垃圾回收。

### 如何创建的 channel

通过工厂模式+反射创建，`clazz.getConstrucer().newInstance();`。

### 何时 accept 的连接

`NioEventLoop.doReadMessage()`