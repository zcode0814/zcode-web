> [mk原链接](https://coding.imooc.com/class/821.html)
>
> 思维导图：https://flowus.cn/aa79ec59-6ae3-423e-81e0-679121280826



# 准备篇

## 消息持久化

> 用 java 代码实现，写入 page cache 和强刷到磁盘

![image-20241110173622996](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20241110173622996.png)

### 异步通知

### 阻塞队列缓冲 buffer

### 攒批处理



## 复杂消息功能

### 重试机制

> 规定时间内消费无 ack，重新投递

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20241110175204371.png)

### 延迟消息

> 多层时间轮



### 事务消息

> 基于半消息机制和本地消息表实现投递端的事务，利用消费端的重试机制保障数据的最终一致性



### 内存映射（mmap）

将内核缓冲区映射到用户缓存区的一块内存区域，少一次 CPU 拷贝

<img src="https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20241206014505120.png" style="zoom:50%;" />

**映射的内存空间写满怎么办？**

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20241206015250585.png)

# 实战篇

## broker

### mmap 工具类

```java
public static void main(String[] args) throws Exception {
        MMapUtil mMapUtil = new MMapUtil();
        // 实际作用是为了等待 arthas连接
        Scanner input = new Scanner(System.in);
        int size = input.nextInt();
        		        mMapUtil.loadFileInMMap("/Users/libiao/IdeaProjects/lightmq/data/broker/store/order_cancel_topic/00000000", 0, size * 1024 * 1024);
        System.out.println("映射 " + size + "m 内存");
        // 通过 arthas dashboard 观察 mapped 大小
        TimeUnit.SECONDS.sleep(5);

        System.out.println("释放内存");
        mMapUtil.clean();
        TimeUnit.SECONDS.sleep(10000);
    }
```

arthas dashboard 测试结果

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20241208170828456.png)
