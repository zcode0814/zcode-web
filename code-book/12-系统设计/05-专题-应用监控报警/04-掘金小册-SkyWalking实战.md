## 基础篇

### 功能与架构

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20221128172132315.png)

### JavaAgent

JavaAgent 是在 JDK5 之后提供的新特性，也可以叫java代理。

开发者通过这种机制(Instrumentation)可以在类加载class文件之前修改方法的字节码(此时字节码尚未加入JVM)，动态更改类方法实现AOP，提供监控服务如；方法调用时长、可用率、内存等。

>关于更多的字节码增强，ASM等参考[链接](https://www.hyhblog.cn/2022/07/04/java_bytecode_instrumentation_bytebuddy/)
>
>cdlib和asm[相关](https://share.bito.co/static/share?aid=f7839f36-a231-4051-bf26-c29298341140)

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20230422191757395.png)

**使用**

通常以jar包的形式存在，通过JVM参数`-javaagent:xxxx.jar`加载。

其主要应用于程序的诊断、监控和性能优化方面，代表的产品有阿里的 Arthas 和 Apache 的 SkyWalking 。



#### 模拟案例

通过 ASM 开发一个 Java 探针，达到打印接口出入参的效果。

1. 初始化模板

```xml
<dependency>
  <groupId>org.ow2.asm</groupId>
  <artifactId>asm-commons</artifactId>
  <version>6.2.1</version>
  <exclusions>
      <exclusion>
          <groupId>org.ow2.asm</groupId>
          <artifactId>asm-analysis</artifactId>
      </exclusion>
      <exclusion>
          <groupId>org.ow2.asm</groupId>
          <artifactId>asm-tree</artifactId>
      </exclusion>
  </exclusions>
</dependency>
```

入口类 叫`PreMain`，即在`Main`类之前执行的方法，需要将该类配置到`MANIFEST.MF`文件中。

```java
public class PreMain {

    //JVM 首先尝试在代理类上调用以下方法
    public static void premain(String agentArgs, Instrumentation inst) {
      // ProfilingMethodVisitor，是给方法增强的具体 ASM 操作类。
        inst.addTransformer(new ProfilingTransformer());
    }

    //如果代理类没有实现上面的方法，那么 JVM 将尝试调用该方法
    public static void premain(String agentArgs) {
    }
}
```

```
# resources/META-INF/MANIFEST.MF
Manifest-Version: 1.0
Premain-Class: com.towncoder.PreMain
Can-Redefine-Classes: true
```

2. 具体操作类



```java
```



2. 





## 实战篇

> 

### 应用接入

**启动参数**

```
-javaagent:/Users/libiao/programs/skywalking-es7-8.6.0/agent/skywalking-agent.jar
-Dskywalking.agent.service_name=dubbo-provider
-Dskywalking.collector.backend_service=127.0.0.1:11800
```

**配置网页端端口**

```yaml
# webapp.yml
server:
  port: 8100
```

访问[http://localhost:8100](http://localhost:8100)

**测试效果**

日常重点关注 APM-Service 和 DataBase,服务异常或者数据库异常通过关注这两个监控页面就能看出。

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20221129093345161.png)



![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20221129101334789.png)



![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20221129101757713.png)

### 自定义监控项

移除 Redis 的插件包，项目启动时 Redis 的插件类将不会被加载，也就无法拦截了。我们在agent/plugins目录下找到 lettuce 的 jar包，并将其移动到agent/option-plugins目录下（此目录下的插件包将不会被加载），重启项目调用，可以看到 Redis 的链路请求消失了。



> 在互联网背景下，你觉得探针技术对于业务来说最大的优势是什么？
>
> 答：我个人觉得最大的优势在于代码无侵入。举个例子，之前参与过健康码数据迁移相关的业务，CTO 在会议上，主要就问了几个问题：对于生产环境是否有任何影响？出了问题是否能快速回滚？
>
> 从他的视角看，生产环境的稳定性胜过一切。这其实就和我们的探针技术不谋而合了，因为我们是无侵入的，对于业务基本不会造成任何影响。

### 日志
**打印和上传日志配置**

```xml
<dependency>
    <groupId>org.apache.skywalking</groupId>
    <artifactId>apm-toolkit-logback-1.x</artifactId>
    <version>8.6.0</version>
</dependency>
```



```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
    <!--   打印日志-->
    <appender name="STDOUT" class="ch.qos.logback.core.ConsoleAppender">
        <encoder class="ch.qos.logback.core.encoder.LayoutWrappingEncoder">
            <layout class="org.apache.skywalking.apm.toolkit.log.logback.v1.x.TraceIdPatternLogbackLayout">
                <Pattern>%d{yyyy-MM-dd HH:mm:ss.SSS}||[%tid]||%-5level||%logger{80}||%msg%n</Pattern>
            </layout>
        </encoder>
        <filter class="ch.qos.logback.classic.filter.ThresholdFilter">
            <level>INFO</level>
        </filter>
    </appender>
    <!--   上传日志-->
    <appender name="grpc-log" class="org.apache.skywalking.apm.toolkit.log.logback.v1.x.log.GRPCLogClientAppender">
        <encoder class="ch.qos.logback.core.encoder.LayoutWrappingEncoder">
            <layout class="org.apache.skywalking.apm.toolkit.log.logback.v1.x.mdc.TraceIdMDCPatternLogbackLayout">
                <Pattern>%d{yyyy-MM-dd HH:mm:ss.SSS} [%tid] [%thread] %-5level %logger{36} -%msg%n</Pattern>
            </layout>
        </encoder>
        <filter class="ch.qos.logback.classic.filter.ThresholdFilter">
            <level>INFO</level>
        </filter>
    </appender>

    <root>
        <appender-ref ref="STDOUT"/>
        <appender-ref ref="grpc-log"/>
    </root>
</configuration>
```

**测试效果**

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20221130113425022.png)

**将日志存储到ES**

```yaml
storage:
  selector: ${SW_STORAGE:elasticsearch7}
  elasticsearch:
    nameSpace: ${SW_NAMESPACE:"elasticsearch"}
    clusterNodes: ${SW_STORAGE_ES_CLUSTER_NODES:localhost:9200}
    protocol: ${SW_STORAGE_ES_HTTP_PROTOCOL:"http"}
    user: ${SW_ES_USER:""}
    password: ${SW_ES_PASSWORD:""}
```



![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20221130112109776.png)

### 告警

> https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=d9ffcd1e-67e2-47fd-b45d-0b0400bad938

**配置规则**

`config/alarm-settings.yml`

```yaml
# Sample alarm rules.
rules:
  # Rule unique name, must be ended with `_rule`.
  service_resp_time_rule:
    metrics-name: service_resp_time
    include-names:
      - dubbo-provider
      - dubbo-consumer
    op: ">"
    threshold: 1000
    period: 10
    count: 2
    silence-period: 1
    message: 服务 {name} 响应时间在10分钟内超过100毫秒2次
    
wechatHooks:
  textTemplate: |-
    {
      "msgtype": "text",
      "text": {
        "content": "Apache SkyWalking 告警: \n %s."
      }
    }
  webhooks:
    - https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=d9ffcd1e-67e2-47fd-b45d-0b0400bad938
```

**测试效果**

```java
    @GetMapping(value = "/testServiceRespTimeRule")
    public String testServiceRespTimeRule() throws InterruptedException {
        log.info("测试告警指标:{}", "testServiceRespTimeRule");
        Thread.sleep(1000);
        return "success";
    }
```



![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20221129185621903.png)



![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20221129185656860.png)

### 性能剖析

**新建性能剖析任务**

```java
    @SneakyThrows
    @GetMapping(value = "/record/list")
    public String recordList() {
        log.info("获取记录列表");
        List<PunchRecord> records = rpcService.recordList();
        Thread.sleep(2000);
        return "record size:" + records.size();
    }
```



![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20221130161402553.png)

**访问5次测试**

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20221130161221242.png)

### 全局返回Tid

```xml
<dependency>
    <groupId>org.apache.skywalking</groupId>
    <artifactId>apm-toolkit-trace</artifactId>
    <version>8.6.0</version>
</dependency>
```



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

    /**
     * skywalking tid
     */
    private String tId;

    public CommonResponse(Integer code, String message) {
        this.code = code;
        this.message = message;
        this.tId = TraceContext.traceId();
    }
}
```

```json
{
  "code": 0,
  "message": "",
  "tid": "b22effb533624922988c091a21284f43.561.16697981493930001",
  "data": "Hello Nacos Discovery string_x7kw2"
}
```

## 原理篇

