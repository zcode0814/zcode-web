# jstack 如何分析死锁：从线程栈到等待环

`jstack` 是 Java 线上排查死锁最常用的工具。它可以导出 JVM 当前所有线程的调用栈、线程状态、持有的锁以及正在等待的锁。分析死锁的核心不是只看线程是否 `BLOCKED`，而是看多个线程之间是否形成了“互相等待”的闭环。

一句话概括：

```text
线程 A 持有锁 1，等待锁 2；
线程 B 持有锁 2，等待锁 1；
等待关系形成闭环，死锁成立。
```

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/deadlock-wait-cycle.png)

## 一、什么是死锁？

死锁是指多个线程互相持有对方需要的资源，导致所有相关线程都无法继续执行。

典型条件包括：

- 互斥：锁一次只能被一个线程持有。
- 持有并等待：线程持有一个锁时，又去等待另一个锁。
- 不可抢占：锁不能被其他线程强制夺走，只能由持有者释放。
- 循环等待：多个线程之间形成资源等待环。

排查时最关键的是最后一点：是否存在循环等待。

## 二、如何抓取线程栈？

先找到 Java 进程 PID：

```shell
jps -l
```

假设目标进程是 `12345`，导出线程栈：

```shell
jstack -l 12345 > thread.dump
```

建议加上 `-l`，它会输出更多锁信息，例如 `Locked ownable synchronizers`，对分析 `ReentrantLock`、`ReadWriteLock` 这类 AQS 锁很有帮助。

线上排查时可以连续抓几次，避免只看到某个瞬间：

```shell
jstack -l 12345 > dump1.txt
sleep 5
jstack -l 12345 > dump2.txt
sleep 5
jstack -l 12345 > dump3.txt
```

如果服务已经严重卡死，抓 dump 前尽量先保留现场，再考虑重启、摘流量或回滚。

## 三、先看 JVM 是否自动识别死锁

打开 dump 文件后，先搜索：

```text
Found one Java-level deadlock
```

如果 JVM 检测到 Java 层面的 monitor 死锁，通常会在文件末尾输出类似内容：

```text
Found one Java-level deadlock:

"Thread-1":
  waiting to lock monitor 0x001
  which is held by "Thread-2"

"Thread-2":
  waiting to lock monitor 0x002
  which is held by "Thread-1"
```

这已经是明确证据：`Thread-1` 等 `Thread-2`，`Thread-2` 又等 `Thread-1`。

不过不要只依赖自动检测。有些锁等待、业务资源等待、外部依赖等待不会都被 JVM 判定为 Java-level deadlock，仍然需要人工分析线程栈。

## 四、看懂线程栈里的锁信息

分析 `synchronized` 死锁时，重点看两类信息：

```text
- locked <0x000000076b5a1f80>
- waiting to lock <0x000000076b5a1f90>
```

含义是：

- `locked`：当前线程已经持有的锁。
- `waiting to lock`：当前线程正在等待获取的锁。

典型线程栈：

```text
"Thread-A" prio=5 tid=... nid=... waiting for monitor entry
   java.lang.Thread.State: BLOCKED (on object monitor)
   at com.demo.DeadlockDemo.methodA(DeadlockDemo.java:25)
   - waiting to lock <0x111> (a java.lang.Object)
   - locked <0x222> (a java.lang.Object)

"Thread-B" prio=5 tid=... nid=... waiting for monitor entry
   java.lang.Thread.State: BLOCKED (on object monitor)
   at com.demo.DeadlockDemo.methodB(DeadlockDemo.java:40)
   - waiting to lock <0x222> (a java.lang.Object)
   - locked <0x111> (a java.lang.Object)
```

等待关系可以整理成：

```text
Thread-A 持有 0x222，等待 0x111
Thread-B 持有 0x111，等待 0x222
```

这就是标准的双线程死锁。

## 五、ReentrantLock 死锁怎么看？

`ReentrantLock` 底层基于 AQS，不属于传统 JVM monitor。线程栈里通常不会只出现 `waiting to lock`，而是会看到 `parking` 和 `Locked ownable synchronizers`。

典型输出：

```text
"Thread-A"
   java.lang.Thread.State: WAITING (parking)
   at jdk.internal.misc.Unsafe.park(Native Method)
   - parking to wait for <0xaaa>
   at java.util.concurrent.locks.LockSupport.park(LockSupport.java:...)
   at java.util.concurrent.locks.AbstractQueuedSynchronizer.acquire(...)

   Locked ownable synchronizers:
   - <0xbbb> (a java.util.concurrent.locks.ReentrantLock$NonfairSync)
```

含义是：

- `parking to wait for <0xaaa>`：当前线程正在等待某个 AQS 同步器。
- `Locked ownable synchronizers`：当前线程已经持有的 AQS 锁。

分析方式和 `synchronized` 一样：

```text
当前线程持有什么锁？
当前线程正在等什么锁？
它等待的锁被哪个线程持有？
这些等待关系是否形成闭环？
```

## 六、死锁和普通阻塞的区别

看到 `BLOCKED`、`WAITING` 不一定就是死锁。

普通阻塞可能是：

```text
Thread-B 等 Thread-A 释放锁；
Thread-A 正在执行，稍后会释放锁。
```

这种情况只是锁竞争。

死锁必须存在闭环：

```text
Thread-A 等 Thread-B
Thread-B 等 Thread-C
Thread-C 等 Thread-A
```

所以判断死锁的核心标准是：

```text
等待关系是否形成环，而不是线程是否处于阻塞状态。
```

## 七、实战分析步骤

推荐按下面顺序看：

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/jstack-deadlock-analysis-flow.png)

```text
1. jps -l 找到目标 Java 进程。
2. jstack -l <pid> 导出线程栈。
3. 搜索 Found one Java-level deadlock。
4. 搜索 BLOCKED、waiting to lock、parking to wait for。
5. 查看 locked 和 Locked ownable synchronizers。
6. 用锁地址 <0x...> 建立“线程 -> 等待锁 -> 持有线程”的关系。
7. 判断等待关系是否形成闭环。
8. 回到业务代码堆栈，定位具体类、方法和行号。
```

真正要修的地方通常在堆栈最上面的业务代码，例如：

```text
at com.example.order.OrderService.updateOrder(OrderService.java:88)
at com.example.stock.StockService.lockStock(StockService.java:42)
```

如果多个 dump 中同一批线程一直停在相同位置，并且锁等待关系形成闭环，基本可以确认死锁。

## 八、常见死锁原因

常见原因包括：

- 多个线程加锁顺序不一致。
- 嵌套调用中隐式获取了另一个锁。
- `synchronized` 方法之间互相调用。
- 持有锁时调用外部服务、数据库或回调代码。
- 多个 `ReentrantLock` 获取后没有在异常路径释放。
- 锁粒度过大，业务逻辑和资源操作混在同一个临界区。

最典型的是加锁顺序不一致：

```java
// Thread-A
synchronized (lock1) {
    synchronized (lock2) {
        // do something
    }
}

// Thread-B
synchronized (lock2) {
    synchronized (lock1) {
        // do something
    }
}
```

`Thread-A` 先拿 `lock1` 再等 `lock2`，`Thread-B` 先拿 `lock2` 再等 `lock1`，就可能死锁。

## 九、如何修复和预防？

修复思路：

- 统一加锁顺序，所有线程都按相同顺序获取多个锁。
- 减小锁范围，只把真正需要互斥的代码放进临界区。
- 避免持有锁时执行 RPC、SQL、文件 IO、消息发送等慢操作。
- 使用 `tryLock(timeout)`，获取失败后释放已持有的锁并重试。
- 使用 `finally` 确保 `ReentrantLock.unlock()` 一定执行。
- 拆分锁或改用无锁、队列化、串行化模型降低互相等待概率。

`ReentrantLock` 推荐写法：

```java
lock.lock();
try {
    // protected code
} finally {
    lock.unlock();
}
```

需要同时获取多个锁时，可以用超时避免永久等待：

```java
if (lock1.tryLock(100, TimeUnit.MILLISECONDS)) {
    try {
        if (lock2.tryLock(100, TimeUnit.MILLISECONDS)) {
            try {
                // protected code
            } finally {
                lock2.unlock();
            }
        }
    } finally {
        lock1.unlock();
    }
}
```

## 十、面试回答模板

可以这样回答：

> 我会先用 `jps -l` 找到 Java 进程，再用 `jstack -l pid` 导出线程栈。拿到 dump 后先搜索 `Found one Java-level deadlock`，如果 JVM 已经识别出死锁，就直接看它列出的线程和锁关系。如果没有自动识别，我会重点看 `BLOCKED`、`waiting to lock`、`parking to wait for`、`locked` 和 `Locked ownable synchronizers`。分析时不是只看线程是否阻塞，而是根据锁地址整理出“哪个线程持有哪些锁、正在等哪些锁、这些锁被谁持有”，如果等待关系形成闭环，就能确认死锁。最后根据线程栈中的业务类、方法和行号定位代码，通常通过统一加锁顺序、缩小锁范围、避免持锁调用外部资源、使用 `tryLock` 超时和 `finally unlock` 来修复。

## 总结

`jstack` 分析死锁的本质是还原等待关系：

```text
线程状态说明它为什么停住；
locked 说明它已经持有什么；
waiting to lock / parking to wait for 说明它正在等什么；
锁地址可以串起线程之间的依赖关系。
```

只要等待关系形成闭环，就可以确认死锁。排查时重点不是背命令，而是看懂线程、锁和业务代码之间的关系。
