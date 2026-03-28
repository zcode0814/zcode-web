> JDK源码：https://hg.openjdk.org/



![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20221213145736713.png)

## 虚拟机规范

### 参数选项

> https://juejin.cn/post/7246716050942279717

因为 JVM 只是一个规范，它有不同的实现 ，例如 HotSpot、OpenJ9、GraalVM、Azul Zing 等，所以其选项分为三种类型：

- 标准选项（standard options）：所有的 JVM 实现都会支持的这类选项就是标准选项。
- 非标准选项（non-standard options，又叫 extra-options）：
- 高级选项（advanced options）：

#### 标准选项

打开控制台，输入 `java`，你不仅能看到 `java` 命令的使用手册，还能看到你机器上默认的 JVM 所支持的所有标准选项。

Java 允许我们以 `-D<name>=<value>` 这种键值对的形式设置系统属性，例如 Sentinel 启动时设置控制台的地址：

```java
@SpringBootApplication
public class DemoApplication {
    public static void main(String[] args) {
        // VM Options:-Dcsp.sentinel.dashboard.server=localhost:8080
        System.out.println(System.getProperty("csp.sentinel.dashboard.server"));
        SpringApplication.run(DemoApplication.class, args);
    }
}
```

#### 非标准选项

可以直接通过 `java -X` 命令获取 JVM 支持的所有非标准选项，比如选项：`-Xms<size>` 和 `-Xmx<size>`。

#### 高级选项









## 字节码

java文件 &rarr; 编译成字节码文件（.class）&rarr; 虚拟机解释成机器码

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20221213163056179.png)

**前端编译器**

javac、ECJ、AspectJ

**后端编译器**

JIT（1.3之后）

### 什么是字节码

由一个字节长度（8位，256种组合）代表某种含义的`操作码`和`操作数`组成，有些指令不包含操作数。

**包装类对象缓存问题**

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20221220151723672.png)

 ```java
 public void test5(){
 
         Integer i1 = 10;
         Integer i2 = 10;
         System.out.println(i1 == i2);//true
 
         Integer i3 = 128;
         Integer i4 = 128;
         System.out.println(i3 == i4);//false
 
         Boolean b1 = true;
         Boolean b2 = true;
         System.out.println(b1 == b2);//true
     }
 ```

**堆和字符串常量池**

分析下面的代码的字节码，

```java
//String声明的字面量数据都放在字符串常量池中
    //jdk 6中字符串常量池存放在方法区（即永久代中）
    //jdk7 及以后字符串常量池存放在堆空间
    @Test
    public void test6(){
        String str = new String("hello") + new String("world");
//        str.intern();
        String str1 = "helloworld";
        System.out.println(str == str1);//false --> true (加上intern() 在str声明之前)

    }
```

> String.intern()方法是一种手动将字符串加入常量池中的native方法，原理如下：
>
> 如果在当前类的常量池中存在与调用intern()方法的字符串等值的字符串，就直接返回常量池中相应字符串的引用，
>
> 否则在常量池中复制一份该字符串（Jdk7中会直接在常量池中保存当前字符串的引用），并将其引用返回；
>
> 因此，只要是堆中等值的String对象，使用intern()方法返回的都是常量池中同一个String引用，所以，这些等值的String对象通过intern()后使用==是可以匹配的。

### class文件的结构

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20221220155546451.png)

**字节码解读案例**

```java
public class Demo {
    private int num = 1;

    public Demo() {
    }

    public int add() {
        this.num += 2;
        return this.num;
    }
}
```

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20221220160600194.png)

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20221220160810982.png)

**javap**

将0,1形式的字节码文件转成可查看的指令码文件。`javap -v Demo.class`

### 字节码指令集

- load：从局部变量表加载到操作数栈
- push：放到操作数栈
- store：存储到局部变量表
- ldc：从运行时常量池中推入项目

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20221220165516855.png)

**下面代码的指令集分析**

```java
public class InterviewTest {
    @Test
    public void test1(){
        Integer x = 128;
        int y = 128;
        // 自动拆箱
        System.out.println(x == y);//true
    }
}
```

```bytecode
 0 sipush 128 放入操作数栈
 3 invokestatic #2 <java/lang/Integer.valueOf : (I)Ljava/lang/Integer;> 包装成Integer
 6 astore_1 将地址存入局部变量表
 7 sipush 128 放入栈
10 istore_2 将数值存入局部变量表
11 getstatic #3 <java/lang/System.out : Ljava/io/PrintStream;>  打印
14 aload_1 加载到栈
15 invokevirtual #4 <java/lang/Integer.intValue : ()I> 自动拆箱
18 iload_2 加载到栈
19 if_icmpne 26 (+7) 比较
22 iconst_1
23 goto 27 (+4)
26 iconst_0
27 invokevirtual #5 <java/io/PrintStream.println : (Z)V> 打印
30 return

```

**为什么把基本数据类型放入局部变量表（栈）中**

- 堆的空间大
- 栈的空间小，但是运算速度快，基本类型放入栈，是为了提高效率。

## 类加载



### 类加载的生命周期

把class文件加载到内存中，形成类，再到类使用完成后卸载出内存的过程：

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20221220172740876.png)

**装载**

将class文件加载到内存中，形成类模板对象，存放在方法区中。而真正的Class对象存放在堆中，并指向方法区中的类模板对象。

`类模板对象`是指Java类在JVM中的一个快照，保存类常量池、类名、类方法等信息，以便JVM在运行期间能获取类的各种信息，反射机制也因此可以实现。

**链接**

- 验证：检查字节码文件是否合规，如格式检查、语义检查、字节码验证、符号引用验证
- 准备：为类的静态变量分配内存，初始化其默认值
- 解析：将类接口、方法、字段等的符号引用转为直接（内存）引用。

**初始化**

为类的静态变量赋予正确的初始值，即此时开始执行代码。在字节码层面会为其生成`<clinit>（）`方法。JVM会保证一个类的该方法在多线程中正确的加锁，同步，但如果有某个比较耗时的操作，会引发`死锁`。

> static final 修饰的是常量，正常是在链接的准备环境赋值，但是如果常量值需要调用方法，就会在初始化阶段赋值，如：`private static final Integer integer = Integer.valueOf("100");`

**使用**



**卸载**

ClassLoader会维护一个集合保存由他加载的所有类，而类卸载的难点就在如何将加载器个类对象的关系切断，如果直接干掉类加载器，那么由其加载的其他类也会被干掉，所以卸载这个事就变难了。

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20221221113908599.png)

由此得出，类被回收的条件很苛刻，所以方法区会使用本地内存来防止内存溢出。

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20221221114854130.png)

**什么时候会触发类的加载**

- new或者反射创建 `Class.forName("")`
- 创建子类先加载父类或其实现的接口
- 主方法自动加载
- 调用类的静态方法或使用使用类静态字段时

> 以上可以总结为主动使用的情况，除此之外都是被动使用，被动使用不会进行初始化环节，如：
>
> - 通过数组定义类引用
> - 通过子类引用父类的静态变量，子类不会初始化
> - 引用常量不会触发类的初始化
> - 调用ClassLoader的`loadClass()`方法不会初始化

### 类加载器

类加载器只负责装载阶段，将Class文件加载到内存。我们可以显示的调用ClassLoader的`loadClass()`方法，也会在使用类的时候隐式的加载。

即使类的全路径相同，不同的加载器加载的类也是不同的。

子类可以访问父类的加载器，反之不行。

**分类**

启动类加载器 -> 扩展类加载器 -> 应用类加载器 -> 自定义加载器

**源码**





### 源码解析





### 自定义类加载器



### 相关机制



## 加载类的三种方式

java类加载之加载类的三种途径：
1、由 new 关键字创建一个类的实例（静态加载）
在由运行时刻用 new 方法载入
如：Dog dog ＝ new Dog（）；

2、调用 Class.forName() 方法
通过反射加载类型，并创建对象实例
如：Class clazz ＝ Class.forName（“Dog”）；
Object dog ＝clazz.newInstance（）；

3、调用某个 ClassLoader 实例的 loadClass() 方法

> 三者之间的区别：
> 1和2使用的类加载器是相同的，都是当前类加载器。（即：this.getClass.getClassLoader）。
> 3由用户指定类加载器。如果需要在当前类路径以外寻找类，则只能采用第3种方式。第3种方式加载的类与当前类分属不同的命名空间



### JDK9





## 内存分配

[当发生OOM时，进程还能处理请求吗](https://juejin.cn/post/7239187347355287609)



### 永久代为什么会变成方法区？

在Java 8之前，Java虚拟机的永久代（Permanent Generation）用于存储一些与类元数据相关的信息，例如类的结构、方法、常量池等。然而，永久代的大小是固定的，无法动态调整，而且它的垃圾回收机制与新生代和老年代不同，容易导致性能问题和内存溢出。

为了解决这些问题，自Java 8开始，永久代被元空间（Metaspace）所取代。元空间使用本地内存（Native Memory）来存储类的元数据信息，而不再依赖于Java虚拟机的堆空间。这样做的主要原因包括以下几点：

1. 动态调整：元空间的大小不再受固定限制，它可以动态地根据应用程序的需求进行调整。这使得在运行时可以更灵活地管理类的元数据。

2. 简化垃圾回收：元空间的垃圾回收机制与新生代和老年代一致，采用基于标记-清除（Mark-Sweep）算法和并发垃圾回收（Concurrent Garbage Collection）来进行垃圾回收。这样可以简化垃圾回收的实现和调优，提高了垃圾回收的效率。

3. 减轻内存压力：由于元空间使用本地内存，而不是堆内存，因此可以减少对堆内存的占用，降低了堆内存的压力。

总的来说，将永久代改为元空间是为了提高Java虚拟机的性能和可伸缩性，降低内存溢出的风险，并简化垃圾回收的实现。这是Java平台持续演进和改进的一部分，使得Java应用程序能够更好地适应不同的工作负载和内存需求。

### 对象一定分配在堆上吗？

> https://blog.csdn.net/zhaohong_bo/article/details/89419480

不一定，对于全部是局部变量的对象，会在栈上分配，即逃逸分析。





对象的内存布局

## 执行引擎



## 垃圾回收

### 参数配置

#### 打印 GC 日志

```shell
-XX:+PrintGC 或 -verbose:gc：这会将GC日志打印到标准输出。
-XX:+PrintGCDetails：详细打印GC日志，包括堆大小、对象分配、回收时间等信息。
-XX:+PrintGCDateStamps：打印GC发生的时间戳。
```

#### 配置内存大小



#### 指定垃圾回收器





### 垃圾回收算法

#### 标记复制

首先，记住内存分配模型，Eden、幸存者0、幸存者1，默认 `8:1:1` 的关系，其中有一个幸存者区会有来存放存货对象，所以可用区域为 `90%` 

当 Eden 区满就会触发 Minor GC ，将 Eden 区和幸存者区的存活对象都复制到另一个幸存者区，然后清空垃圾。

当幸存者区的空间不够存放存货对象时，借助老年代，称为**分配担保**



### 垃圾回收器

#### 发展史

1999年，jdk1.3，串行的serial dc parallel new 是 serial 的多线程版本

jdk6，默认Parallel GC；jdk9，默认G1 GC，替代CMS

jdk11，引入zgc；jdk12，增强G1，jdk13，增强Zgc

jdk14，删除CMS

#### 查看默认的垃圾回收器

```shell
java -XX:+PrintCommandLineFlags -version

# -XX:InitialHeapSize=402653184 表示设置Java虚拟机初始堆内存大小为402653184字节（384MB）。
# -XX:MaxHeapSize=6442450944 表示设置Java虚拟机堆内存的最大大小为6442450944字节（6144MB，即6GB）。
# -XX:+PrintCommandLineFlags 表示在启动时打印Java虚拟机的命令行参数和标志。
# -XX:+UseCompressedClassPointers 表示启用类指针的压缩，以减少内存空间的使用。
# -XX:+UseCompressedOops 表示启用对象指针的压缩，以减少内存空间的使用。
# -XX:+UseParallelGC 表示启用并行垃圾回收器，用于新生代和老年代的垃圾回收。
```

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/20230912112354.png)

#### CMS

**简介**

jdk 5 时期诞生，9 标记为废弃，14 正式废除。

工作在老年代，与新生代的 parNew 和 serial 配合使用。

第一款真正意义的并发收集器，大大缩短了了STW的时间，但不是完全没有，采用标记清除算法

> 为什么不用标记整理？
>
> 因为并发清理时用户线程在运行，无法移动内存空间，会导致用户线程出问题

**相关参数**

`-XX: CMSFullGCsBeforeCompaction` 在执行多少次Fu11 GC后对内有内存空间进行压缩整理。

`-XX:CMSInitiatingOccupancyFraction` 老年的占用到达多少时触发 GC，默认 占用100% 触发。

```shell
java -XX:+PrintFlagsFinal -version | grep CMSInitiatingOccupancyFraction
```

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/20230912103403.png)

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/20230912103440.png)































![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/20230912102751.png)

并发标记和并发清除耗时最长，重新标记是为了清楚上一阶段产生的浮动垃圾。

- hjhj
- 好久









#### G1

**简介**

1.7 启用，1.9 默认，可在新生代和老年代使用。

G1 的特点是在可配置的停顿时间（默认 200ms ）内，清除回收价值最大的垃圾，即 `Garbage First` 。

采用化整为零的思想，把整个堆内存划分为一个一个的 `region`，每个区域单独处理。其中 H 区存放超过 Region 大小一半的大对象，未利用的白色区域可以转换为任务类型的区域。

在回收之前，G1 首先分析整个堆内存的使用情况，并确定哪些区域的垃圾最多，回收价值对大。然后，在新生代使用标记复制

**Region**

首先查看 openjdk 源码中 [heapRegion.cpp](https://hg.openjdk.org/jdk7/jdk7/hotspot/file/9b0ca45cd756/src/share/vm/gc_implementation/g1/heapRegion.cpp) 文件，规定了 Region 最大 32MB，最小 1MB，默认的数量 2048 ，那**如何计算一个 Region 到底多大呢？**

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/20230913090558.png)



`G1HeapRegionSize`

-XX:MaxGCPauseMillis 200ms













![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/20230912112335.png)











![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20230607132447403.png)

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20230209170836186.png)



**如何查看默认GC**

- `-XX:+PrintCommandLineFlags`
- jinfo -flag 相关垃圾回收参数  进程ID

**详细说明**

1.serial

分为serial和serial old，对应工作在新生代和老年代

因新生代的垃圾回收频繁，需要较高的效率，所以采用标记复制算法，这也就有了幸存者0区和1区

老年代采用标记整理，避免内存碎片，其还有作为CMS在老年代的后备收集方案

两者相同之处在于抢占串行，在回收阶段会暂停用户线程——STW

一般用在客户端内存不大的情况下用:`-XX:+UseSerialGC`

2.parNew

serial的多线程版本，只能在新生代，可配和CMS使用

虽然是多线程，但是需要在多核CPU下才能发挥作用，单核效率不一定比串行高

使用`-XX:+UserParNewGC`,`-XX:ParallelGCThreads`限制线程数量，默认开启和CPU核数相同的线程。

3.parallel GC(java8默认)

并行吞吐量优先，在老年代是parallel old

同样的新生代标记复制，老年代标记整理，在回收阶段STW

其目标是达到一个可控制的吞吐量，适合在服务端做后台计算批处理，因为不关注延迟性

其另一大特点是自适应调节策略，会自动调节伊甸区和幸存者0,1的比例，不是固定的`8:1:1`

使用参数：

- `-XX:+UseParallelGC`、`-XX:+UseParallelOldGC`，两个互相激活
- `-xx:ParallelGCThreads` 设置线程数量
- `-XX:MaxGCPauseMillis`最大停顿时间
- `-XX:GCTimeRatio`垃圾收集占总时间的比例，取值范围（0,100）默认99，即垃圾收集的时间不超过1%
- `-XX:+UseAdaptiveSizePolicy`自适应策略配置





![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20230210141517926.png)







## 调优案例

调优不是让我去优化JVM，去发现JVM的bug，我们首先应该关注自己的代码，进而可能该需要关注一些参数配置，如堆空间、新生代的大小，垃圾回收器的选择等等，以及合理的利用硬件资源，去尽可能的减少full gc，避免OOM。

其次，调优一定要和业务场景强联系，不同的场景对吞吐量和延迟的要求都不一样。

调优的时间，需要在上线前就进行压测，线上做好监控和备用方案，打印好日志，以备出问题时及时发现，方便排查。

### 生产环境可能有哪些问题

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20230211194144458.png)

### 一般步骤

> 在调优过程中，我们可以依靠的东西主要是：运行日志、GC日志、异常堆栈信息、线程快照、堆快照

1. 熟悉业务场景
2. 性能监控、发现问题

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20230213115022049.png)

3. 排查问题，通过堆日志和dump文件的分析，以及通过命令行监控cpu、内存的使用情况、Arthas等综合定位问题
4. 解决问题，即性能调优，调整代码或者参数、增加机器节点、设置线程数、或者用消息队列缓存等中间件等

### 监控诊断测试工具

**jps** 先找到Java程序对应的进程

```
jps -l   # -l 显示详细信息
```

**top** 显示该进程下的线程,，监测对cpu和内存的占用

```
jps -Hp 24240  
printf '%x\n' tid  # 将线程id转为16进制
```

**jstack** 查询该线程堆栈

```
jstack -l 24240 | grep 5EB0 -A 20
```

**jmap** 

显示堆中对象的统计信息

```
jmap -histo:live 24240 > test.log

less test.log
```

打印内存占用情况

```
jmap -heap pid
```

**jstat**

```
jstat -gc 93170 1000 10   # 打印gc信息 每个1000ms打印一次，共打印10次
## 0：幸存者0区，1：幸存者0区 E:伊甸区 O：老年代 M：元空间 YGC：年轻代GC FGC：老年代GC
```

**jinfo**

```
jinfo -flag {param} pid # 查看某个进程的jvm参数的配置
```

### GC日志

`-Xms60m -Xmx60m -XX:SurvivorRatio=8 -XX:+PrintGCDetails`

```java
public class GCLogTest {
    public static void main(String[] args) {
        ArrayList<byte[]> list = new ArrayList<>();
        for (int i = 0; i < 500; i++) {
            byte[] arr = new byte[1024 * 100];//100KB
            list.add(arr);
            try {
                Thread.sleep(10);
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
        }
    }
}
```



![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20230210143937557.png)

回收前->回收后(总大小)     [[新生代]堆]    [[新生代] [老年代] [元空间]]

`-Xloggc:./logs/gc.log` 生成日志文件的位置，[gceasy](https://gceasy.io/),在线的gc日志可视化，图表含义讲解：[csdn](https://blog.csdn.net/qq_40093255/article/details/115376746)

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20230210150824365.png)

### 案例：堆溢出

```java
    /**
     * 案例1：模拟线上环境OOM
     */
    @RequestMapping("/add")
    public void addObject(){
        System.err.println("add"+peopleSevice);
        ArrayList<People> people = new ArrayList<>();
        while (true){
            people.add(new People());
        }
    }
```

获取JVM的dump文件的两种方式　　

　　1. JVM启动时增加两个参数:

```
#出现 OOME 时生成堆 dump: 
-XX:+HeapDumpOnOutOfMemoryError
#生成堆文件地址：
-XX:HeapDumpPath=/home/liuke/jvmlogs/
```

　　2. 发现程序异常前通过执行指令，直接生成当前JVM的dmp文件，6214是指JVM的进程号

```
jmap -dump:format=b,file=/home/admin/logs/heap.hprof 6214
```

获得heap.hprof以后，就可以使用jvisiuvm分析你的java线程里面对象占用堆内存的情况了。

第一种方式只能是一种事后处理，需要等待当前JVM出现问题后才能生成dmp文件

第二种方式只能在执行时用，JVM是暂停服务的，所以对线上的运行会产生影响

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20230210161418382.png)



### 案例：方法区（元空间）溢出

```java
/**
     * 案例2:模拟元空间OOM溢出
     */
    @RequestMapping("/metaSpaceOom")
    public void metaSpaceOom(){
        ClassLoadingMXBean classLoadingMXBean = ManagementFactory.getClassLoadingMXBean();
        while (true){
            Enhancer enhancer = new Enhancer();
            enhancer.setSuperclass(People.class);
//            enhancer.setUseCache(false);
            enhancer.setUseCache(true);
            enhancer.setCallback((MethodInterceptor) (o, method, objects, methodProxy) -> {
                System.out.println("我是加强类，输出print之前的加强方法");
                return methodProxy.invokeSuper(o,objects);
            });
            People people = (People)enhancer.create();
            people.print();
            System.out.println(people.getClass());
            System.out.println("totalClass:" + classLoadingMXBean.getTotalLoadedClassCount());
            System.out.println("activeClass:" + classLoadingMXBean.getLoadedClassCount());
            System.out.println("unloadedClass:" + classLoadingMXBean.getUnloadedClassCount());
        }
    }
```



### 如何合理配置堆大小

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20230217150540642.png)



如何估算GC的频率

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20230217154759231.png)

### 案例：CPU占用高如何排查

jps - top - jstack - jmap 

 
