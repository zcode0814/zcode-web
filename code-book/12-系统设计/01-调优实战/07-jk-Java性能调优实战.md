

## 调优标准和策略

>- 计算并发用户数的五种方法：https://blog.csdn.net/qq_23101033/article/details/74977874
>
>- TPS和QPS：https://blog.csdn.net/a745233700/article/details/117917333

### 如何来衡量一般系统的性能

- 响应时间

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/7b9946fd1a3512ded6d2ab0e563870f7.jpg)

- 吞吐量

在测试中，我们往往会比较注重系统接口的 TPS（每秒事务处理量），因为 TPS 体现了接口的性能，TPS 越大，性能越好。

在系统中，我们也可以把吞吐量自下而上地分为两种：磁盘吞吐量和网络吞吐量。

- 资源分配使用率

通常由 CPU 占用率、内存使用率、磁盘 I/O、网络 I/O 来表示资源使用率。这几个参数好比一个木桶，如果其中任何一块木板出现短板，任何一项分配不合理，对整个系统性能的影响都是毁灭性的。

- 负载承受能力

测试出系统极限

> tps qps的区别？
>
> TPS(transaction per second)是单位时间内处理事务的数量，QPS(query per second)是单位时间内请求的数量。TPS代表用户的一个操作，可以请求多个接口。
>
> 当用户的一次操作包含了多个服务请求时，这个时候TPS作为这次用户操作的性能指标就更具有代表性了

### 高可用指标4个 9 指的是什么

全年服务可用时间

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20240710023204139.png)

### 哪些因素会影响性能

磁盘、内存、网络、cpu、

IO、异常、数据库、锁

> 创建异常对象时会调用父类Throwable的fillInStackTrace()方法生成栈追踪信息，也就是调用native的fillInStackTrace()方法去爬取线程堆栈信息，为运行时栈做一份快照，正是这一部分开销很大

### 调优策略大纲

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/f8460bb16b56e8c8897c7cf4c9f99eb8.jpg)

## 字符串的内存优化

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/b1995253db45cd5e5b7bc1ded7cbdd50.jpg)



**String.intern()**

> https://blog.csdn.net/weixin_44457062/article/details/124238809

先看代码

```java
    public static void main(String[] args) {
        String str1= "abc";                   
        String str2= new String("abc");
        String str3= str2.intern();
        System.out.println((str1 == str2));   // false
        System.out.println((str2 == str3));   // false
        System.out.println((str1 == str3));   // true
    }
```

首先明确一个字符串常量池和堆位置，字符串常量池从jdk7开始，从方法区移到了堆中，所以就导致很多不一样的情况。

首先 str1 属于直接创建，即指向常量池中的内存地址，str2 是通过先在堆中创建对象，该对象中再存一个指向常量池的地址，所以 str1 和 str2 的指向地址是不同的；

`str2.intern()`这个方法的会先判断字符串常量池中是否已经包含当前的字符串，如果没有的话，则会在字符串常量池中存放一份。在具体的实现中稍有不同。

- 在jdk6之前（包含jdk6），字符串常量池在方法区中，与堆不在同一个区域，所以字符串常量池中是拷贝了一份字符串的对象，Java堆中的String对象和字符串常量池的String对象不是同一个。
- 在jdk7之后（包含jdk7），字符串常量池转移到了堆中。当堆中有一个String对象的时候，在调用intern方法时，如果字符串常量池没有这个字符串，则会`存放堆中String对象的地址引用`，不会像jdk7之前的拷贝一份到字符串常量池中。此时，字符串常量池存放的和堆中String对象是同一个。

如果有描述不清处的欢迎大家查看《深入了解java虚拟机的》第三版的63页。字符串常量池的迁移查看46页。

看案例

```java
    public static void main(String[] args) {
        String str1 = new String("jay,cay");//会在堆中有一个，在字符串常量池中有一个
        str1.intern();//此时这行代码不会往字符串常量池中存放，因为字符串常量池中已经有一个相同值的对象
//        str1 = str1.intern();    此时str1将指向常量池中的对象，同时原来堆中的string对象因为没有引用会被回收
        String str2 = "jay,cay";
        System.out.println(str1 == str2);

        String str3 = new String("aa") + new String("bb");//字符串常量池中不会有aabb
        str3.intern();//将堆中的aabb的引用存放在字符串常量池中
        String str4 = "aabb";
        System.out.println(str3 == str4);
    }
```



**大字符串的编译优化**

编程过程中，字符串的拼接很常见。前面我讲过 String 对象是不可变的，如果我们使用 String 对象相加，拼接我们想要的字符串，是不是就会产生多个对象呢？例如以下代码：

```java
    public static void main(String[] args) {
        String str= "ab" + "cd" + "ef";
        String str7 = new StringBuilder("ja").append("va").toString();
        String str3 = new String("aa") + new String("bb");
    }
```

这些代码在常量池中都会有哪些对象呢？这光靠分析是不行的，从字节码文件中可以看出端倪：

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20230207142201454.png)

简单说一下`ldc`的含义：Push item from run-time constant pool（从运行时常量池中推送项）

可以看到对于`“+”`的拼接，编译器自动会帮我们优化，常量池中只生成拼接后的字符串。

```java
String str = "abcdef";

for(int i=0; i<1000; i++) {
      str = str + i;
}
```

上面这种情况，编译器会优化为`StringBuilder`，会产生很多`StringBuilder`对象，所以我们最好是显式的使用StringBuilder，高并发下使用StringBuffer。

```java

String str = "abcdef";

for(int i=0; i<1000; i++) {
     str = (new StringBuilder(String.valueOf(str))).append(i).toString();
}
```

**常量池字符串的重复利用**

```java
String a =new String("abc").intern();
String b = new String("abc").intern();
        
if(a==b) {
    System.out.print("a==b");
}
// a==b
```

在一开始字符串"abc"会在加载类时，在常量池中创建一个字符串对象。 

创建 a 变量时，调用 new Sting() 会在堆内存中创建一个 String 对象，String 对象中的 char 数组将会引用常量池中字符串。在调用 intern 方法之后，会去常量池中查找是否有等于该字符串对象的引用，有就返回引用。 

创建 b 变量时，同上。

而在堆内存中的两个对象，由于没有引用指向它，将会被垃圾回收，节省内存。而 a 和 b 引用的是同一个常量池对象，重复利用。

## 正则表达式的回溯

Split() 方法使用了正则表达式实现了其强大的分割功能，而正则表达式的性能是非常不稳定的，使用不恰当会引起回溯问题，很可能导致 CPU 居高不下。 

所以我们应该慎重使用 Split() 方法，我们可以用 String.indexOf() 方法代替 Split() 方法完成字符串的分割。如果实在无法满足需求，你就在使用 Split() 方法时，对回溯问题加以重视就可以了。

**正则的原理**

而这里的正则表达式引擎就是一套核心算法，用于建立状态机。 目前实现正则表达式引擎的方式有两种：DFA 自动机（Deterministic Final Automaton 确定有限状态自动机）和 NFA 自动机（Non deterministic Finite Automaton 非确定有限状态自动机）

那么 NFA 自动机到底是怎么进行匹配的呢？以下面的字符和表达式来举例说明。

```
text=“aabcab”
regex=“bc”
```

NFA 自动机会读取正则表达式的每一个字符，拿去和目标字符串匹配，匹配成功就换正则表达式的下一个字符，反之就继续和目标字符串的下一个字符进行匹配。

## ArrayList和LinkedList

### ArrayList

**属性**

```java
  //默认初始化容量
    private static final int DEFAULT_CAPACITY = 10;
    //对象数组
    transient Object[] elementData; 
    //数组长度
    private int size;
```

从 ArrayList 属性来看，它没有被任何的多线程关键字修饰，但 elementData 被关键字 transient 修饰了,transient 关键字修饰该字段则表示该属性不会被序列化，但 ArrayList 其实是实现了序列化接口，这到底是怎么回事呢？ 

这还得从“ArrayList 是基于数组实现“开始说起，由于 ArrayList 的数组是基于动态扩增的，所以并不是所有被分配的内存空间都存储了数据。 

如果采用外部序列化法实现数组的序列化，会序列化整个数组。ArrayList 为了避免这些没有存储数据的内存空间被序列化，内部提供了两个私有方法 writeObject 以及 readObject 来自我完成序列化与反序列化，从而在序列化与反序列化数组时节省了空间和时间。

**新增元素**

在添加元素之前，都会先确认容量大小，如果容量够大，就不用进行扩容；如果容量不够大，就会`按照原来数组的 1.5 倍大小进行扩容，在扩容之后需要将数组复制到新分配的内存地址`。

如果我们在初始化时就比较清楚存储数据的大小，就可以在 ArrayList 初始化时指定数组容量大小，并且在添加元素时，只在数组末尾添加元素，那么 ArrayList 在大量新增元素的场景下，性能并不会变差，反而比其他 List 集合的性能要好。

### LinkedList

LinkedList 是基于双向链表数据结构实现的，LinkedList 定义了一个 Node 结构，Node 结构中包含了 3 个部分：元素内容 item、前指针 prev 以及后指针 next

```java
 private static class Node<E> {
        E item;
        Node<E> next;
        Node<E> prev;

        Node(Node<E> prev, E element, Node<E> next) {
            this.item = element;
            this.next = next;
            this.prev = prev;
        }
    }
```

## HashMap

当程序将一个 key-value 对添加到 HashMap 中，程序首先会根据该 key 的 hashCode() 返回值，再通过 hash() 方法计算出 hash 值，再通过 putVal 方法中的 (n - 1) & hash 决定该 Node 的存储位置。

```java
 public V put(K key, V value) {
        return putVal(hash(key), key, value, false, true);
    }

 static final int hash(Object key) {
        int h;
        return (key == null) ? 0 : (h = key.hashCode()) ^ (h >>> 16);
    }

  if ((tab = table) == null || (n = tab.length) == 0)
            n = (tab = resize()).length;
        //通过putVal方法中的(n - 1) & hash决定该Node的存储位置
        if ((p = tab[i = (n - 1) & hash]) == null)
            tab[i] = newNode(hash, key, value, null);
```

我们先来了解下 hash() 方法中的算法。如果我们没有使用 hash() 方法计算 hashCode，而是直接使用对象的 hashCode 值，会出现什么问题呢？

假设要添加两个对象 a 和 b，如果数组长度是 16，这时对象 a 和 b 通过公式 (n - 1) & hash 运算，也就是 (16-1)＆a.hashCode 和 (16-1)＆b.hashCode，15 的二进制为 0000000000000000000000000001111，假设对象 A 的 hashCode 为 1000010001110001000001111000000，对象 B 的 hashCode 为 0111011100111000101000010100000，你会发现上述与运算结果都是 0。这样的哈希结果就太让人失望了，很明显不是一个好的哈希算法。 

但如果我们将 hashCode 值右移 16 位（h >>> 16 代表无符号右移 16 位），也就是取 int 类型的一半，刚好可以将该二进制数对半切开，并且使用位异或运算（如果两个数对应的位置相反，则结果为 1，反之为 0），这样的话，就能避免上面的情况发生。这就是 hash() 方法的具体实现方式。简而言之，就是尽量打乱 hashCode 真正参与运算的低 16 位。 

我再来解释下 (n - 1) & hash 是怎么设计的，这里的 n 代表哈希表的长度，哈希表习惯将长度设置为 2 的 n 次方，这样恰好可以保证 (n - 1) & hash 的计算得到的索引值总是位于 table 数组的索引之内。例如：hash=15，n=16 时，结果为 15；hash=17，n=16 时，结果为 1。 

在获得 Node 的存储位置后，如果判断 Node 不在哈希表中，就新增一个 Node，并添加到哈希表中，整个流程我将用一张图来说明：

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/ebc8c027e556331dc327e18feb00c7d9.jpg)



## 网络通信优化

**如何解决高并发下I/O瓶颈**

优化向主要有两个：

- 磁盘IO时的多次复制问题
- 网络IO的线程阻塞问题

所以诞生了NIO、AIO、IO多路复用、零拷贝等技术。

**那阻塞到底发生在套接字（socket）通信的哪些环节呢？**

- connect阶段涉及到TCP的三次握手，这是一个阻塞过程，
- accept等待连接线程也是阻塞的，
- read、write时如果没有数据，也会阻塞。

**非阻塞IO的演化**

如果想让读请求不阻塞，那即使没数据也会立即返回，这就需要客户端不断的轮询去查有没有数据，这是非常耗CPU的，

所有有了IO复用概念，Linux 提供了 I/O 复用函数 `select/poll/epoll`，进程将一个或多个读操作通过系统调用函数，阻塞在函数操作上。这样，系统内核就可以帮我们侦测多个读操作是否处于就绪状态。

I/O多路复用其实就相当于用了一个专门的线程来监听多个注册的事件。

















## JVM监控及调优

### 即时编译（JIT）

初始化完成后，类在调用执行过程中，执行引擎会把字节码转为机器码，然后在操作系统中才能执行。在字节码转换为机器码的过程中，虚拟机中还存在着一道编译，那就是即时编译。

**热点探测** 

在 HotSpot 虚拟机中的热点探测是 JIT 优化的条件，热点探测是基于计数器的热点探测，采用这种方法的虚拟机会为每个方法建立计数器统计方法的执行次数，如果执行次数超过一定的阈值就认为它是“热点方法” 。

**编译优化技术**

1.方法内联

JVM 会自动识别热点方法，并对它们使用方法内联进行优化。方法内联的优化行为就是把目标方法的代码复制到发起调用的方法之中，避免发生真实的方法调用。

2.内存逃逸

逃逸分析如果发现一个对象只在方法中使用，就会将对象分配在栈上。

3.锁消除

在局部方法中创建的对象只能被当前线程访问，无法被其它线程访问，这个变量的读写肯定不会有竞争，这个时候 JIT 编译会对这个对象的方法锁进行锁消除。

4.标量替换

逃逸分析证明一个对象不会被外部访问，如果这个对象可以被拆分的话，当程序真正执行的时候可能不创建这个对象，而直接创建它的成员变量来代替。



### 垃圾回收

**GC性能衡量指标**

吞吐量：这里的吞吐量是指应用程序所花费的时间和系统总运行时间的比值。我们可以按照这个公式来计算 GC 的吞吐量：系统总运行时间 = 应用程序耗时 +GC 耗时。

如果系统运行了 100 分钟，GC 耗时 1 分钟，则系统吞吐量为 99%。GC 的吞吐量一般不能低于 95%。 

停顿时间：指垃圾收集器正在运行时，应用程序的暂停时间。对于串行回收器而言，停顿时间可能会比较长；而使用并发回收器，由于垃圾收集器和应用程序交替运行，程序的停顿时间就会变短，但其效率很可能不如独占垃圾收集器，系统的吞吐量也很可能会降低。 

垃圾回收频率：多久发生一次指垃圾回收呢？通常垃圾回收的频率越低越好，增大堆内存空间可以有效降低垃圾回收发生的频率，但同时也意味着堆积的回收对象越多，最终也会增加回收时的停顿时间。所以我们只要适当地增大堆内存空间，保证正常的垃圾回收频率即可。



### 内存分配

**方法区、永久代、元空间**

永久代和元空间都是方法区的一种实现方式，方法区是java规范中定义的，只是一个逻辑结构，不是物理结构。

之所以叫它永久代是因为垃圾回收效果很差，大部分的数据会一直存在直到程序停止运行。

永久代里面一般存储类相关信息，比如类常量、字符串常量、方法代码、类的定义数据等，如果要回收永久代的空间，需要将类卸载，而类卸载的条件非常苛刻，所以空间一般回收很难。当程序中有大量动态生成类时，这些类信息都要存储到永久代，很容易造成方法区溢出。

在java8里面，元空间替代了永久代，原来存放于永久代的类信息现在放到了元空间。

`永久代和元空间最大区别`是：元空间并不在虚拟机中，而是使用本地内存。因此，默认情况下，元空间的大小仅受本地内存限制，但可以通过以下参数来指定元空间的大小：

- XX:MetaspaceSize，初始空间大小，达到该值就会触发垃圾收集进行类型卸载，同时GC会对该值进行调整：如果释放了大量的空间，就适当降低该值；如果释放了很少的空间，那么在不超过MaxMetaspaceSize时，适当提高该值。
- XX:MaxMetaspaceSize，最大空间，默认是没有限制的，也就是说内存有多大，元空间就由多大。
- 

除了上面两个指定大小的选项以外，还有两个与 GC 相关的属性：

- XX:MinMetaspaceFreeRatio，当进行过Metaspace
  GC之后，会计算当前Metaspace的空闲空间比，如果空闲比小于这个参数，那么虚拟机将增长Metaspace的大小。设置该参数可以控制Metaspace的增长的速度，太小的值会导致Metaspace增长的缓慢，Metaspace的使用逐渐趋于饱和，可能会影响之后类的加载。而太大的值会导致Metaspace增长的过快，浪费内存。
- XX:MaxMetaspaceFreeRatio，当进行过Metaspace GC之后，
  会计算当前Metaspace的空闲空间比，如果空闲比大于这个参数，那么虚拟机会释放Metaspace的部分空间。在本机该参数的默认值为70，也就是70%。
- XX:MaxMetaspaceExpansion：Metaspace增长时的最大幅度。
- XX:MinMetaspaceExpansion：Metaspace增长时的最小幅度。

因为类的信息存放在元空间，所以如果元空间设置的过小，而系统需要加载很多类，那么还是会造成元空间内存溢出，比如会报如下异常：

`Caused by: java.lang.OutOfMemoryError: Metaspace`

元空间是按照类加载器分配空间的，也就是说类加载器加载了一个类，元空间分配给这个类的空间其实是分配给的类加载器，不同的类加载器占用不同的空间，它们之间不共享类信息。

如果程序中有大量的类加载器，而它们加载的类非常少，那么有可能会造成大量的空间浪费，而且还有可能造成java频繁GC而无法回收内存的现象。

如果发现类加载器已经失效了（加载的所有类对象都没有引用），java可以直接将该类加载器对应的空间整体回收，不过类加载器一直存活的话，该类加载器加载的类所占据的空间不会被回收。

### 问题排查

我想你肯定遇到过内存溢出，或是内存使用率过高的问题。碰到内存持续上升的情况，其实我们很难从业务日志中查看到具体的问题，那么面对多个进程以及大量业务线程，我们该如何精准地找到背后的原因呢？

**linux top**

```
top -Hp pid  #查看某个进程下线程的具体信息
```

