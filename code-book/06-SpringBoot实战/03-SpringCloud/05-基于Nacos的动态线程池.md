> 参考[美团技术团队](https://tech.meituan.com/2020/04/02/java-pooling-pratice-in-meituan.html)

## 基本原理

- Nacos基于`@RefreshScope`注解的配置自动刷新
- Nacos基于配置更新的事件监听机制

## Nacos配置

```yml
## 只展示核心部分，该部分配置为自定义配置
thread-pool:
  core-size: 10
  max-size: 20
```

```yml
spring:
  cloud:
    nacos:
      discovery:
        enabled: true
        server-addr: 101.43.160.149:8848
        namespace: 9862bd7f-2dc2-47a4-9c80-c6290c5c3e2b
      config:
        enabled: true
        server-addr: 101.43.160.149:8848
        namespace: 9862bd7f-2dc2-47a4-9c80-c6290c5c3e2b
        group: dev
        file-extension: yml
```

## 读取配置并监听

```java
@Configuration
@Slf4j
@RefreshScope
public class DynamicThreadPool implements InitializingBean {

    private static ThreadPoolExecutor threadPoolExecutor;

    @Resource
    private NacosConfigManager nacosConfigManager;

    @Resource
    private NacosConfigProperties nacosConfigProperties;

    @Value("${thread-pool.max-size}")
    private Integer maxSize;

    @Value("${thread-pool.core-size}")
    private Integer coreSize;

    @Override
    public void afterPropertiesSet() throws Exception {
        //按照nacos配置初始化线程池
        threadPoolExecutor = new ThreadPoolExecutor(coreSize, maxSize, 10L, TimeUnit.SECONDS,
                new LinkedBlockingQueue<>(10),
                new ThreadFactoryBuilder().setNameFormat("c_t_%d").build(),
                new RejectedExecutionHandler() {
                    @Override
                    public void rejectedExecution(Runnable r, ThreadPoolExecutor executor) {
                        log.info("Rejected!");
                    }
                });

        //nacos配置变更监听
        nacosConfigManager.getConfigService().addListener("cloud-alibaba-nacos.yml", nacosConfigProperties.getGroup(),
                new Listener() {
                    @Override
                    public Executor getExecutor() {
                        return null;
                    }

                    @Override
                    public void receiveConfigInfo(String configInfo) {
                        //配置变更，修改线程池配置
                        log.info("new config is [{}]", configInfo);
                        changeThreadPoolConfig(coreSize, maxSize);
                    }
                });
    }

    /**
     * 打印当前线程池的状态
     */
    public String printThreadPoolStatus() {
        return String.format("core_size:%s\n" +
                        "max_size:%s\n" +
                        "current_size:%s\n" +
                        "queue_current_size:%s\n" +
                        "total_task_count:%s\n",
                threadPoolExecutor.getCorePoolSize(),
                threadPoolExecutor.getMaximumPoolSize(),
                threadPoolExecutor.getActiveCount(),
                threadPoolExecutor.getQueue().size(),
                threadPoolExecutor.getTaskCount());
    }

    /**
     * 给线程池增加任务
     *
     * @param count
     */
    public void dynamicThreadPoolAddTask(int count) {
        for (int i = 0; i < count; i++) {
            int finalI = i;
            threadPoolExecutor.execute(() -> {
                try {
                    System.out.println(finalI);
                    Thread.sleep(10000);
                } catch (InterruptedException e) {
                    e.printStackTrace();
                }
            });
        }
    }

    /**
     * 修改线程池核心参数
     */
    private void changeThreadPoolConfig(int coreSize, int maxSize) {
        threadPoolExecutor.setCorePoolSize(coreSize);
        threadPoolExecutor.setMaximumPoolSize(maxSize);
    }

}
```

## 测试

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20221230165710473.png)

```java
@RestController
@RequestMapping("/thread-pool")
public class ThreadPoolController {

    @Resource
    private DynamicThreadPool dynamicThreadPool;

    /**
     * 打印当前线程池的状态
     */
    @GetMapping("/print")
    public String printThreadPoolStatus() {
        return dynamicThreadPool.printThreadPoolStatus();
    }

    /**
     * 给线程池增加任务
     *
     * @param count
     */
    @GetMapping("/add")
    public String dynamicThreadPoolAddTask(int count) {
        dynamicThreadPool.dynamicThreadPoolAddTask(count);
        return String.valueOf(count);
    }
}
```



## 注意

- 只有使用`@Value`方式读取配置才可以自定刷新，`@ConfigurationProperties(prefix = "custom")`不可以
- 如下错误为版本问题，需切换spring-cloud-alibaba的版本为`2.2.5.RELEASE`

```log

2021-03-23 17:29:49.084 ERROR 15256 --- [-127.0.0.1_8848] c.a.n.client.config.impl.ClientWorker    : longPolling error : 
 
java.util.concurrent.RejectedExecutionException: Task java.util.concurrent.ScheduledThreadPoolExecutor$ScheduledFutureTask@e05e42 rejected from java.util.concurrent.ScheduledThreadPoolExecutor@ba59c84[Shutting down, pool size = 1, active threads = 1, queued tasks = 0, completed tasks = 1]
```

[版本对应关系](https://github.com/alibaba/spring-cloud-alibaba/wiki/%E7%89%88%E6%9C%AC%E8%AF%B4%E6%98%8E)

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20221230170122276.png)



![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20221230170144556.png)

## 续集

如何动态修改阻塞队列？