# 全局请求添加 TraceId 

哈喽，大家好，我是一条。

不知道大家有没有一堆日志就是定位不到那块是异常部分，接口错误无法复现，也找不到报错信息等比较棘手的问题。

其实解决上面的问题很简单，只要我们为每一个请求都分配一个唯一的 RequestId 或者叫 TraceId ，一旦出了问题，只需要拿着 Id 去日志里一搜，妖魔鬼怪立马原形毕露。

对于分布式链路追踪，有很多开源中间件，本文主要通过 logback 的 MDC 实现。

## 请求拦截器

```java
@Component
public class TraceIdInterceptor extends HandlerInterceptorAdapter {
    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        String traceId = String.format("%s - %s",request.getRequestURI(), UUID.fastUUID().toString(true));
        MDC.put("traceId", traceId);
        return true;
 }
```

注册拦截器

```java
@Component
@RequiredArgsConstructor
public class GlobalWebMvcConfigurer implements WebMvcConfigurer {

    private final TraceIdInterceptor traceIdInterceptor;
    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(traceIdInterceptor);
    }
}
```

## 统一返回值

```java
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CommonResponse<T> implements Serializable {

    /** 错误码 */
    private Integer code;

    /** 错误消息 */
    private String message;

    /** 泛型响应数据 */
    private T Data;

    private String traceId;

    public CommonResponse(Integer code, String message) {

        this.code = code;
        this.message = message;
        this.traceId = MDC.get("traceId");
    }

}
```

## 日志配置

**logback.xml**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
    <property name="LOG_PATTERN"
              value="%d{yyyy-MM-dd} %d{HH:mm:ss.SSS} [%highlight(%-5level)] [%boldYellow(%X{traceId})] [%boldYellow(%thread)] %boldGreen(%logger{36} %F.%L) %msg%n">
    </property>

    <appender name="STDOUT" class="ch.qos.logback.core.ConsoleAppender">
        <encoder>
            <pattern>${LOG_PATTERN}</pattern>
        </encoder>
        <!-- 控制台打印INFO及以上级别的日志 -->
        <filter class="ch.qos.logback.classic.filter.ThresholdFilter">
            <level>INFO</level>
        </filter>
    </appender>

    <root>
        <appender-ref ref="STDOUT"/>
    </root>
</configuration>
```

## 测试

**接口返回值**

```json
{
  "code": 0,
  "message": "",
  "traceId": "/commerce-user/user/findById - 73e470120ef24d57a111de6b671d030b",
  "data": {
    "id": 1,
    "username": "test1",
    "password": "test",
    "extraInfo": "{}",
    "createTime": "2022-06-20T09:23:18.000+00:00",
    "updateTime": "2022-06-20T09:23:18.000+00:00",
    "balance": 0
  }
}
```

**日志**

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/20230619103920.png)

如此，如果线上有接口出现问题，拿着 traceId 到日志文件搜索，就能检索到该请求的日志调用链路，处理问题就变得简单了。

## 异步调用配置

因为是 ThreadLocal ，异步任务必然是获取不到 traceId 的，需要再线程池配置中手动添加。

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/20230619103920.png)

**线程池配置**

```java
@Configuration
public class AsyncConfig implements AsyncConfigurer {
    @Bean
    @Override
    public Executor getAsyncExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();

        executor.setCorePoolSize(10);
        executor.setMaxPoolSize(20);
        executor.setQueueCapacity(20);
        executor.setKeepAliveSeconds(60);
        executor.setThreadNamePrefix("user-async-");   // 这个非常重要

        // 等待所有任务结果候再关闭线程池
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(60);
        // 定义拒绝策略
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
        //设置线程装饰器
        executor.setTaskDecorator(runnable -> ThreadMdcUtils.wrapAsync(runnable, MDC.getCopyOfContextMap()));
        // 初始化线程池, 初始化 core 线程
        executor.initialize();

        return executor;
    }
}
```

```java
public class ThreadMdcUtils {
    public static Runnable wrapAsync(Runnable task, Map<String,String> context){
        return () -> {
            if(context==null){
                MDC.clear();
            }else {
                MDC.setContextMap(context);
            }
            if(MDC.get("traceId")==null){
                MDC.put("traceId", UUID.fastUUID().toString(true));
            }
            try {
                task.run();
            }finally {
                MDC.clear();
            }
        };
    }
}
```

**再次测试**

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/20230619103920.png)



# TraceId 搭配 ELK

哈喽，大家好，我是一条。

之前写了一篇关于 TraceId 的文章：[为全局请求添加 TraceId ，看日志再也不懵逼](https://juejin.cn/post/7137187959580655646)，有幸上了掘金周榜，在此感谢一下推荐人：[和耳朵](https://juejin.cn/user/325111173878983/posts)，不过说实话写的不够详细，在掘金经过多次认真写没被推荐之后也就没啥动力了，毕竟没有人能够一直为爱发电。

今天就接着 TraceId 做一些优化，如果想快速的定位到问题，就要实现对日志的快速搜索，所以本文就引入 ELK 技术栈。

ELK 是 ES、Logstash、Kibana 的总称，其核心功能就是实现数据的收集、搜索、可视化。具体功能和使用在本文都会提到。

## 需求分析

先分析一下，我们想实现的核心功能是搜索，必然是用 ES 实现，那问题就转换成**如何将日志收集并存储到 ES**。

日志大家都不陌生了，可以在控制台打印，也可以存入文件，那能不能直接输入 ES 呢，好像没听说过。

这里就要用到 Logstash 来收集日志，Spring 默认的日志框架 Logback 已经对其提供了支持，我们要做的只是编写配置文件。

Logstash 有个问题就是非常占用内存，所以本文后面会介绍另一个比较轻量级的日志收集工具 FileBeat ，由 Go 语言编写。

同时对于真实的线上环境为了保证吞吐量和可靠性，都会引入 Kafka 进行解耦，本文不做演示。

下面就进入实战部分，搭建一套日志收集与搜索系统。

## ES

推荐大家去 elastic 的[中文社区](https://elasticsearch.cn/download/)下载 ELK ，速度会比较快，官网当然也是可以的。目前最新版本是8.+，推荐还是下 7.+ 比较稳妥，具体版本随意，但 ELK 的版本要一致。

本文使用 7.14.2 版本。下载下来解压就行，不废话。

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220913170114375.png)

**修改配置文件**

进入 config 目录：

```yml
# elasticsearch.yml

path.data: /Users/li/programs/elasticsearch-7.14.2/data
path.logs: /Users/li/programs/elasticsearch-7.14.2/logs
ingest.geoip.downloader.enabled: false
```

```
# jvm.options
# 如果内存够用也可以不修改
-Xms1g
-Xmx1g
```

**启动**

```she
./bin/elasticsearch
```

```
[2022-09-13T10:54:10,015][INFO ][o.e.n.Node               ] [LdeMacBook-Pro.mshome.net] started
[2022-09-13T10:54:10,730][INFO ][o.e.l.LicenseService     ] [LdeMacBook-Pro.mshome.net] license [b7a596e6-1b61-4e6d-af2f-7eab70fe693b] mode [basic] - valid
```

**测试**

浏览器访问：`http://localhost:9200/`

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220913171019641.png)

## kibana

下面再安装 ES 的可视化工具，下载地址同上，版本号同上。

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220913171248000.png)

**修改配置文件**

```yml
# kibana.yml
server.port: 5601
server.host: "localhost"
elasticsearch.hosts: ["http://localhost:9200"]
kibana.index: ".kibana"
i18n.locale: "zh-CN" # 中文
```

**启动**

```
./bin/kibana
```

```
[10:56:42.001] [info][status] Kibana is now degraded
[10:56:44.784] [info][status] Kibana is now available (was degraded)
```

**测试**

浏览器访问：`http://localhost:5601/`

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220913171742925.png)

新增数据并查询

```json
PUT /ecommerce/product/1
 {
     "name" : "gaolujie yagao",
     "desc" :  "gaoxiao meibai",
     "price" :  30,
     "producer" :  "gaolujie producer",
     "tags": [ "meibai", "fangzhu" ]
 }
 
GET /ecommerce/product/1
```

## Logstash

下载地址同上，版本号同上。

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220913172131485.png)

**拷贝配置文件 logstash-sample.conf**

```conf
# logstash-log-boot.conf

input {
  tcp {
    mode => "server"
    host => "127.0.0.1"
    # 通过监听9001端口进行采集日志
    port => 9001
    codec => json_lines
  }
}

output {
  elasticsearch {
    # ES的地址
    hosts => ["http://127.0.0.1:9200"]
    # 索引的名称
    index => "boot-log-collection-%{+YYYY.MM.dd}"
  }
  stdout {
    codec => rubydebug
  }
}
```

**启动**

```
./bin/logstash -f ./config/logstash-log-boot.conf
```

## Logback

OK，到此 ELK 就搭建完了，接下来就是配置 boot 应用的日志输出。`logback.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
    <property name="LOG_PATTERN"
              value="%d{yyyy-MM-dd} %d{HH:mm:ss.SSS} [%highlight(%-5level)] [%boldYellow(%X{traceId})] [%boldYellow(%thread)] %boldGreen(%logger{36} %F.%L) %msg%n">
    </property>

    <appender name="STDOUT" class="ch.qos.logback.core.ConsoleAppender">
        <encoder>
            <pattern>${LOG_PATTERN}</pattern>
        </encoder>
        <!-- 控制台打印INFO及以上级别的日志 -->
        <filter class="ch.qos.logback.classic.filter.ThresholdFilter">
            <level>INFO</level>
        </filter>
    </appender>

    <!--    LOGSTASH 日志收集-->
    <appender name="LOGSTASH" class="net.logstash.logback.appender.LogstashTcpSocketAppender">
        <!-- 在logstash启动文件logstash-log-boot.conf中配置的IP地址和端口 -->
        <destination>127.0.0.1:9001</destination>
        <encoder charset="UTF-8" class="net.logstash.logback.encoder.LogstashEncoder" />
        <filter class="ch.qos.logback.classic.filter.ThresholdFilter">
            <level>INFO</level>
        </filter>
    </appender>

    <root>
        <appender-ref ref="STDOUT"/>
        <!-- 引入LOGSTASH-->
        <appender-ref ref="LOGSTASH" />
    </root>
</configuration>


```

如果报`LogstashTcpSocketAppender`这个类找不到，需要添加一个依赖：

```xml
				<dependency>
            <groupId>net.logstash.logback</groupId>
            <artifactId>logstash-logback-encoder</artifactId>
            <version>6.6</version>
        </dependency>
```

那其实这个依赖就是用来网络通信的，来传输日志。

**测试**

这时启动应用，观看 Logstash 的控制台，会跟着打印日志，再打开 ES ，创建我们配置好的查询索引，神奇的事情发生了，我们日志一条一条的展示出来。

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220913173639792.png)

再结合 TraceId 进行搜索，简直逆天！

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220909172027326.png)

## Filebeat

同样是下载 FileBeat 。采集流程：

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20230115011624694.png)

根据采集数据的不同，提供Beats组，如下：

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20230115011344264.png)







 

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220913173848095.png)

**修改配置文件**

```yml
filebeat.inputs:
- type: log
  enabled: true
  paths:
    - /Users/li/IdeaProjects/cloud-alibaba/cloud-service-commerce/commerce-user/log/*.log
filebeat.config.modules:
  path: ${path.config}/modules.d/*.yml
  reload.enabled: false
setup.template.settings:
  index.number_of_shards: 2
setup.kibana:
  host: "localhost:5601"
output.elasticsearch:
  hosts: ["localhost:9200"]
processors:
  - add_host_metadata: ~
  - add_cloud_metadata: ~
```

因为 Filebeat 是基于监控日志文件有没有新增来同步数据的，所以需要配置日志文件的目录。

可以直接输出到 ES ，也可以输出到 Logstash 。二选一！

**再配置 logback.xml**

```xml
<appender name="FILE" class="ch.qos.logback.core.rolling.RollingFileAppender">
        <!--日志文件输出位置-->
        <File>/Users/li/IdeaProjects/cloud-alibaba/cloud-service-commerce/commerce-user/log/user.log</File>
        <encoder>
            <!--[%X{requestId}] 线程id,方便排查日志-->
            <pattern>%date %level [%thread] [%X{requestId}] [%logger{36}.%method\(\):%line] %msg%n</pattern>
        </encoder>
        <filter class="ch.qos.logback.classic.filter.ThresholdFilter">
            <level>INFO</level>
        </filter>
        <rollingPolicy class="ch.qos.logback.core.rolling.TimeBasedRollingPolicy">
            <!-- 添加.gz 历史日志会启用压缩 大大缩小日志文件所占空间 -->
            <!--<fileNamePattern>/home/log/stdout.log.%d{yyyy-MM-dd}.log</fileNamePattern>-->
            <fileNamePattern>
                /Users/li/IdeaProjects/cloud-alibaba/cloud-service-commerce/commerce-user/log/user-%d{yyyy-MM-dd}.log
            </fileNamePattern>
            <maxHistory>3</maxHistory><!-- 保留 3 天日志 -->
        </rollingPolicy>
    </appender>


		<root>
        <appender-ref ref="FILE"/>
    </root>
```

再次启动项目，发现日志已写入文件

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220913174621452.png)

进入 ES 查询，同样查询到日志。

> 经过测试，FileBeat 的日志收集延迟时间要比 Logstash 长，毕竟基于文件进行同步，可以理解，而且本身业务实时性要求不高。

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220913110633959.png)

## 最后

内容看着比较多，实际很容易实现，但真正生产环境要复杂的多，还需不断思考。

点个赞吧！
