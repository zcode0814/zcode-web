## tomcat和netty在高IO应用（例如HTTP服务器）哪个更好？

> tomcat采用线程池，一个线程对应一个请求（数据包读取，IO，业务），netty使用线程循环，但是如果要实现自己的业务的话任然需要定义线程池，那么，这两种哪种模型更适合开发HTTP服务器呢？可以从并发，性能，原理上说明一下吗？

https://www.zhihu.com/question/322233601