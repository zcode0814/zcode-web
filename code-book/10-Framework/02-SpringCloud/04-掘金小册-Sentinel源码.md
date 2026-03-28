> 基础的实战篇见 Springboot实战 - SpringCloud - Sentinel限流
>
> [小册原文](https://juejin.cn/book/7264364390806192188)

## 底层核心概念

一句话概括 Sentinel 的功能：根据配置好的**规则**对指定**资源**进行访问限制。

**资源**：可以是一个方法、一个接口或一段代码。比如 `/a/b/c` 这个接口。

**规则**：用来定义资源应该遵循的约束条件。比如 QPS 为 100 的限制就是一个规则。

其实要实现对资源的限制并不难，难点在于如何判断资源达到了限制，即对资源的访问的记录和隔离。

**那如何收集资源的这些指标呢？**

可以通过责任链模式设置一系列过滤器，让每个过滤器专注于各自的职责，同时每个资源都需要记录自己的过滤器集合，这不就是**责任链模式**吗？

那我们先定义一个资源类，其包含名称、类型、请求开始时间、请求结束时间等属性，具体看代码：

```java
public abstract class Entry {
    // 操作资源的开始时间
    private final long createTimestamp;
    // 操作资源的完成时间
    private long completeTimestamp;
    
    // 统计各项数据指标
    private Node curNode;
    
    // 异常
    private BlockException blockError;
    
    // 封装了 名称（name）、请求类型（entryType）以及资源类型（resourceType）三个字段
    protected final ResourceWrapper resourceWrapper;
    
    public Entry(ResourceWrapper resourceWrapper) {
        this.resourceWrapper = resourceWrapper;
        // 给开始时间赋值为当前系统时间
        this.createTimestamp = TimeUtil.currentTimeMillis();
    }
}
// Entry 的子类
class CtEntry extends Entry {
    // 指向上一个节点，父节点，类型为 Entry
    protected Entry parent = null;
    // 指向下一个节点，字节点，类型为 Entry
    protected Entry child = null;
    // 作用域，上下文
    protected Context context;
    // 责任链
    protected ProcessorSlot<Object> chain;
}
```

上面代码 `Node`、`Context`、`ProcessorSlot`即使 Sentinel 的核心概念的类，我们一个一个来说明。

### Context 上下文

Context 对象的用途很简单：**用于在一个请求调用链中存储关联的 Entry 信息、资源名称和其他有关请求的数据**。

也可以理解为在一个调用链上的所有资源同属于一个上下文。

```java
// 因为资源之前是有链表结构相连的，所有不需要记录所有的资源，只需要记录入口资源即可。
public class Context {
    private final String name;
    private DefaultNode entranceNode; // 上下文的入口资源
    private Entry curEntry; // 正在处理的资源
    private String origin = ""; // 来源，比如请求 IP
    private final boolean async; // 是否异步
}
```

在源码中通过`ContextUtil`来操作上下文，其维护了一个`ThreadLocal`来存储上下文，这就导致如果是异步调用，上下文就没了，需要手动通过 `ContextUtil.runOnContext(context, f)` 来变换 context。

```jade
public class ContextUtil {
    private static ThreadLocal<Context> contextHolder = new ThreadLocal<>();
    private static volatile Map<String, DefaultNode> contextNameNodeMap = new HashMap<>();
}
```

将资源设计好之后，就需要将不同的规则编排成的过滤器添加到资源上，即`ProcessorSlot`这个类。

### ProcessorSlot 处理器插槽

他是一系列过滤器的抽象，此处被称为插槽，那我们思考一下，请求过来的第一个插槽应该做什么？

我们首先需要资源收集器，也就是专门负责收集资源的路径，并将这些资源的调用路径以树状结构存储起来。

- `NodeSelectorSlot`：负责收集资源的路径，并将这些资源的调用路径以树状结构存储起来，主要用于根据调用路径来限流降级。

现在有了资源路径树，那我们的各种监控指标数据是如何采集的呢？因此，我们还需要数据收集插槽，如下：

- `ClusterBuilderSlot`：此插槽主要负责实现**集群限流**功能。在 Sentinel 中，集群限流可以帮助你实现跨多个应用实例的资源访问限制。`ClusterBuilderSlot` 将处理请求的流量信息汇报到集群的统计节点（`ClusterNode`），然后根据集群限流规则决定是否应该限制请求，此处理器槽在集群限流功能中起到了关键作用。
- `StatisticSlot`：此处理器槽负责记录资源的访问统计信息，如通过的请求数、阻塞的请求数、响应时间等。`StatisticSlot` 将每次资源访问的信息记录在资源的统计节点（`StatisticNode`）中。这些统计信息是 Sentinel 执行流量控制（如限流、熔断降级等）重要指标。

现在资源路径树和指标统计信息都有了，我们就可以根据指标信息对资源路径进行各种流控、熔断降级等功能了，因此，我们还需要设计如下几个功能性插槽。

- `SystemSlot`：实现系统保护功能，提供基于系统负载、系统平均响应时间和系统入口 QPS 的自适应降级保护策略。
- `AuthoritySlot`：负责实现授权规则功能，主要控制不同来源应用的黑白名单访问权限。
- `FlowSlot`： 实现流量控制功能，包括针对不同来源的流量限制、基于调用关系的流量控制等。
- `DegradeSlot`： 负责熔断降级功能，支持基于异常比例、异常数和响应时间的降级策略。

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/20231009093718.png)

`插槽`的用途可以用一句话概括为：**负责构建资源路径树、进行数据采集，并实施流量控制、熔断降级等规则限制**。

`ProcessorSlotChain`负责将所有的插槽连接成一个链，实现自`ProcessorSlot`接口。

目前的设计是 one slot chain per resource，因为某些 slot 是 per resource 的（比如 NodeSelectorSlot）。

解释一下上面官网的话：每个资源只会有一个插槽链，但是一个插槽链会属于多个资源，即插槽链在执行的时候需要关注线程安全和性能问题，这个会在后面初始化插槽链的时候说明。

```java
public abstract class ProcessorSlotChain extends AbstractLinkedProcessorSlot<Object> {
    public abstract void addFirst(AbstractLinkedProcessorSlot<?> protocolProcessor);
    public abstract void addLast(AbstractLinkedProcessorSlot<?> protocolProcessor);
}
```

### Node 数据统计

Node 的基本用途很简单，就是基于插槽采集的数据进行统计。

```java
public interface Node {
    // 获取总请求量
    long totalRequest();
    // 获取请求成功量
    long successRequest();
    // 获取请求失败量
    long failedRequest();
    
    // 其他可能的方法和指标...
}
```

`StatisticNode`：最为基础的统计节点，包含秒级和分钟级两个滑动窗口结构。

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/20231008172231.png)



## 深入 Context

```java
@RestController
@RequestMapping("/qps")
public class TestQpsApi {
    @GetMapping
    public String testQps() {
        try (Entry entry = SphU.entry("testQps")) {
            // 被保护的逻辑
            return "success";
        } catch (BlockException ex) {
            // 处理被流控的逻辑
            return "blocked";
        }
    }
}
```

以上只一个使用案例，其核心代码就一句`Entry entry = SphU.entry("testQps")`，









![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/20231008172731.png)

## 再提 SPI

### Java SPI

根据`META-INF`文件配置全限定类名，通过反射的方式动态的加载实现类，已实现不同的功能。

SPI 机制在开源的项目中被广泛使用，例如 SpringBoot、RocketMQ、Dubbo 以及本文介绍的 Sentinel，Dubbo 是自己实现的一套 SPI，和 Java SPI 的配置方式不同。

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/20231008173928.png)

```java
public interface Logger {
    void log(String message);
}
public class ConsoleLogger implements Logger{
    @Override
    public void log(String message) {
        // 直接打印到控制台
        System.out.println("[ConsoleLogger] " + message);
    }
}
public class FileLogger implements Logger {
    @Override
    public void log(String message) {
        // 将日志写入文件
        System.out.println("[FileLogger]" + message);
    }
}
```

```shell
# META-INF/services/com.yitiao.spi.Logger
com.yitiao.spi.FileLogger
```

```java
public class MainTest {
    public static void main(String[] args){
        ServiceLoader<Logger> loggerServiceLoader = ServiceLoader.load(Logger.class);
        for (Logger logger : loggerServiceLoader) {
            logger.log("Hello, Java SPI!");
        }
    }
}
// [FileLogger]Hello, Java SPI!
```

### SpringBoot SPI

`spring.factories`其实是SpringBoot提供的SPI机制，底层实现是基于SpringFactoriesLoader检索ClassLoader中所有jar（包括ClassPath下的所有模块）引入的META-INF/spring.factories文件。基于文件中的接口（或者注解）加载对应的实现类并且注册到IOC容器。

**这种方式对于@ComponentScan不能扫描到的并且想自动注册到IOC容器的使用场景十分合适，基本上绝大多数第三方组件甚至部分spring-projects中编写的组件都是使用这种方案。**

SpringBoot 2 和 3 在配置上有所区别：

**SpringBoot 2.x**

```java
// @SpringBootApplication -> @EnableAutoConfiguration -> @Import({AutoConfigurationImportSelector.class}) -> AutoConfigurationImportSelector.class -> getCandidateConfigurations()

protected List<String> getCandidateConfigurations(AnnotationMetadata metadata, AnnotationAttributes attributes) {
    List<String> configurations = SpringFactoriesLoader.loadFactoryNames(this.getSpringFactoriesLoaderFactoryClass(), this.getBeanClassLoader());
    Assert.notEmpty(configurations, "No auto configuration classes found in META-INF/spring.factories. If you are using a custom packaging, make sure that file is correct.");
    return configurations;
}
```

核心用来加载的类`SpringFactoriesLoader.class`,调用流程：

1. springApplication.run(args);
2. context = this.createApplicationContext();
3. this.getFromSpringFactories()
4. SpringFactoriesLoader.loadFactories()

**SpringBoot 3.x**

> https://www.cnblogs.com/snifferhu/p/17392410.html

```java
META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports
```

`AutoConfigurationImportSelector.class`的调用流程：

1. springApplication.run(args);
2. this.refreshContext(context);
3. invokeBeanFactoryPostProcessors(beanFactory);
4. ConfigurationClassParser parser.parse(candidates);
5.  handler.processGroupImports();
6. selector.selectImports(currentSourceClass.getMetadata());
7. getAutoConfigurationEntry(annotationMetadata)

### Dubbo SPI

> 转到 dubbo 源码解析



回到 Sentinel ，开发者可以在用同一个 `sentinel-core` 的基础上自行扩展接口实现，从而可以方便地根据业务需求给 Sentinel 添加自定义的逻辑。目前 Sentinel 提供如下的扩展点：[官网](https://github.com/alibaba/Sentinel/wiki/Sentinel-%E6%A0%B8%E5%BF%83%E7%B1%BB%E8%A7%A3%E6%9E%90#spi-%E6%89%A9%E5%B1%95)

- 初始化过程扩展：提供 `InitFunc` SPI接口，可以添加自定义的一些初始化逻辑，如动态规则源注册等。
- Slot/Slot Chain 扩展：用于给 Sentinel 功能链添加自定义的功能并自由编排。
- 指标统计扩展（StatisticSlot Callback）：用于扩展 StatisticSlot 指标统计相关的逻辑。
- Transport 扩展：提供 CommandHandler、CommandCenter 等接口，用于对心跳发送、监控 API Server 进行扩展。
- 集群流控扩展：可以方便地定制 token client/server 自定义实现，可参考[对应文档](https://github.com/alibaba/Sentinel/wiki/集群流控#扩展接口设计)
- 日志扩展：用于自定义 record log Logger，可用于对接 slf4j 等标准日志实现。

## 应用 Java SPI 初始化责任链

在初始化资源的时候，跟随着要初始化 `Context`、`ProcessorSlot` 两个重要属性，上下文在「深入 Context」小节已经讲过，那本节的内容就是关于插槽责任链的**初始化**和**执行**，对应代码中的以下内容：

```java
private Entry entryWithPriority(ResourceWrapper resourceWrapper, int count, boolean prioritized, Object... args)
    throws BlockException {
    
    // 省略创建 Context 的代码

    // 初始化责任链
    ProcessorSlot<Object> chain = lookProcessChain(resourceWrapper);
    try {
        // 执行每一条责任链的方法
        chain.entry(context, resourceWrapper, null, count, prioritized, args);
    } catch (BlockException e1) {
        e.exit(count, args);
        throw e1;
    }
}
```

### 初始化责任链

> 回顾插槽链和资源的对应关系，重点关注线程安全和性能问题。

先看一下方法的注释提到的三个点：

- 获取每个资源的插槽链，如果没有就新建
- 相同的资源（根据ResourceWrapper中的name判断）会在全局共享插槽链，不管在哪个上下文，即此处不考虑上下文维度。
- 插槽的数量数量不能超过最大限制 6000

```java
public final static int MAX_CONTEXT_NAME_SIZE = 2000;
public final static int MAX_SLOT_CHAIN_SIZE = 6000;
```

针对第一点，使用`HashMap`缓存了资源和插槽的对象关系：`Map<ResourceWrapper, ProcessorSlotChain> chainMap`，如果没获取到，需要加锁开始新建插槽链。

```java
// 降低锁的粒度，不能直接在方法加锁
synchronized (LOCK) {
  // 双端检锁
  chain = chainMap.get(resourceWrapper);
  if (chain == null) {
      // Entry size limit.
      if (chainMap.size() >= Constants.MAX_SLOT_CHAIN_SIZE) {
          return null;
      }
      chain = SlotChainProvider.newSlotChain();
      // 是解决 HashMap 全局缓存线程不安全的问题，写时复制，读写分离
      Map<ResourceWrapper, ProcessorSlotChain> newMap = new HashMap<ResourceWrapper, ProcessorSlotChain>(
          chainMap.size() + 1);
      newMap.putAll(chainMap);
      newMap.put(resourceWrapper, chain);
      chainMap = newMap;
  }
}
```

除去注释部分，重要的方法就是`SlotChainProvider.newSlotChain()`，在这里我们就能看到 SPI 的身影。

```java
    public static ProcessorSlotChain newSlotChain() {
        if (slotChainBuilder != null) {
            return slotChainBuilder.build();
        }
        // Resolve the slot chain builder SPI.
        slotChainBuilder = SpiLoader.of(SlotChainBuilder.class).loadFirstInstanceOrDefault();
        return slotChainBuilder.build();
    }

    /**
     * Load the first-found Provider instance,if not found, return default Provider instance
     */
    public S loadFirstInstanceOrDefault() {
        load();
        for (Class<? extends S> clazz : classList) {
          // 可扩展的关键
            if (defaultClass == null || clazz != defaultClass) {
                return createInstance(clazz);
            }
        }
        return loadDefaultInstance();
    }
```

这里的`SpiLoader`和前面案例中的`ServiceLoader.load(Logger.class);`是一样的，传参为`SlotChainBuilder`这个类，那必定有相关的配置文件，在 core 包下，不难发现如下配置，因为先加载的是 builder 类，其配了一个默认的构造器`DefaultSlotChainBuilder`，这个类具体的`build()`方法我们后面再看。

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/20231009105429.png)

更重点的地方在`loadFirstInstanceOrDefault()`，到底是如何实现扩展的？

这个`if (defaultClass == null || clazz != defaultClass)`是关键，因为 Sentinel 懒加载的缘故，启动项目后，需要访问资源才会进入断点，不难发现 defaultClass 就是源码里提供的 DefaultSlotChainBuilder ，而一旦有不同于默认即我们自定义的类时，就会进入创建实例。

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/20231009111915.png)

回过头看一眼默认的 `build()`方法，依然是通过 SPI 加载，然后将 slot 添加到末尾，如果想自定义顺序，可以通过注解`@Spi`的`order`属性来指定。

```java
public ProcessorSlotChain build() {
    ProcessorSlotChain chain = new DefaultProcessorSlotChain();
    List<ProcessorSlot> sortedSlotList = SpiLoader.of(ProcessorSlot.class).loadInstanceListSorted();
    for (ProcessorSlot slot : sortedSlotList) {
        // 构建单向链表，其实点进去看就是 slot.next = next;
        chain.addLast((AbstractLinkedProcessorSlot<?>) slot);
    }
    return chain;
}
```

整体的逻辑完成之后，我们在细化一下 SPI 是如何加载并创建类实例的，即`load()`和`createInstanceList(sortedClassList)/createInstance(clazz)`。

为什么 Sentinel 的 SPI 机制不用 JDK 内置的 ServiceLoader 呢？因为需要一些定制化逻辑，比如 @Spi 注解，不仅有 value 属性还有 order 属性，在实例化类时可以按照指定顺序进行以及是否是单例的类等。

具体的过程如下：

- 通过类名和前缀拼接出文件路径，并读取文件内的全限定类名
- `Class.forName(String name)`获取类信息
- 将类放入集合并按 order 排序，放入 sortedClassList 
- 根据注解的是否单例来判断是读缓存还是直接创建。
- 通过`clazz.newInstance()`创建出实例并返回。



### 执行每一条责任链的方法

https://juejin.cn/book/7264364390806192188/section/7265214273670873145

如何查看每个责任链插槽的代码逻辑呢？

`ProcessorSlot`接口的`entry()` 方法就是入口，`fireEntry()` 的含义是执行下一个插槽，和责任链模式一样。

#### NodeSelectorSlot

构建资源树，先回顾一下 Context 创建的时候，为其赋予一个`EntranceNode`来统计该上下文中所有资源的数据，

```java
protected static Context trueEnter(String name, String origin) {
    // 创建 EntranceNode 对象
    node = new EntranceNode(new StringResourceWrapper(name, EntryType.IN), null);
    // 将新建的 EntranceNode 添加到 ROOT 中，ROOT 就是每个 Node 的根结点。
    Constants.ROOT.addChild(node);
    // 初始化 Context，将刚创建的 EntranceNode 放到 Context 中
    context = new Context(node, name);
}
// 结合下一段代码，此时 context.getLastNode() 就是 new 的 EntranceNode
```

而 `NodeSelectorSlot` 要做的事就是为这个颗树添加枝叶，即 `DefaultNode` ，其有属性`Set<Node> childList = new HashSet<>();`，注意`EntranceNode`为`DefaultNode`的子类，保证了两个 Node 都可以是这棵树上的节点，这要是设计的精妙之处。

```java
// context.getLastNode() 获取 EntranceNode，然后将 DefaultNode 当作子节点add进去 （addChild）
((DefaultNode) context.getLastNode()).addChild(node);
// 为了下次 getLastNode() 时获取的是叶子结点
context.setCurNode(node);
```

#### ClusterBuilderSlot

不在同一个上下文的资源共享一个 ClusterNode 来统计数据。

```java
ClusterNode clusterNode = new ClusterNode(resourceWrapper.getName(), 
DefaultNode.setClusterNode(clusterNode);
```

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/20231010111807.png)

#### LogSlot

记录日志，只在`catch(){}`中打印异常日志，无异常直接执行下一个插槽。

#### StatisticSlot

非常关键的一个插槽，
