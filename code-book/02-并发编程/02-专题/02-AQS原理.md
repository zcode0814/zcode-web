> [源码](https://learn.lianglianglee.com/%E6%96%87%E7%AB%A0/AQS%20%E4%B8%87%E5%AD%97%E5%9B%BE%E6%96%87%E5%85%A8%E9%9D%A2%E8%A7%A3%E6%9E%90.md)

## 核心

`AQS`中 维护了一个`volatile int state`（代表共享资源）和一个`FIFO`的 CLH双端队列（多线程争用资源被阻塞时会进入此队列）。

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20240225123546447.png)

## 加锁





## 释放锁

