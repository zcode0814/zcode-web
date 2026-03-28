# 更好用的SkyWalking

> 用一天半时间在本地搭建基于dubbo的生产者消费者服务，接入SkyWaking后对其应用监控、拓扑图、链路追踪、日志、报警功能做了实现和体验，结合我们自身的SkyWaking，分析其不好用的原因及优化方案。

## 又乱又长

拿一个bms的接口举例，难以想象跨度为`208`,里面包扣redis、druid、lettuce等很多无关监控，也有很多重复调用。

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20221130170704803.png)

其实SkyWalking比老一代的zipkin链路监控工具好用很多，主要是我们自己的原因：

- 监控了很多无关指标
- 应用间调用混乱，中间层过多，从下面的拓扑图也可以看出，除去spring应用、redis、mysql，nginx占据了大部分节点。

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/%E4%BC%81%E4%B8%9A%E5%BE%AE%E4%BF%A1%E6%88%AA%E5%9B%BE_1c90bc93-cb8a-48c4-a307-67dec5436a10.png)

**解决方案**

- 去除无关指标监控，只需在agent/plugins目录下找到相关的jar包，并将其移动到agent/option-plugins目录下
- 给我们调用链路瘦身，去掉中间层

## 监而不报

SkyWalking的应用监控能力毋庸置疑，甚至可以监控到慢sql，以及链路追踪可以看到sql语句。

目前我们的绝大部分应用已经接入监控，各项指标全部有显示，无论是做性能测试还是应用监控，都是绰绰有余。

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20221130172108690.png)

那为什么没有被用起来呢？缺少一个驱动力，光监控不报警谁会盯着这个仪表盘看呢？（目前我这没收到过报警，有可能做了）

所以我在本地环境测试了其报警功能，支持发送到企业微信。

```yaml
# 告警配置
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
    - https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=
```



![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20221129185621903.png)



![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20221129185656860.png)

收到报警后，可以根据端点、示例信息进行链路追踪，追踪到超时链路可以直接跳转到日志，如果通过日志无法定位到问题，还可以通过SkyWalking的性能剖析帮助分析，这里测试了一个`Thread.sleep(2000)`的超时案例，分析如下：

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20221130161221242.png)

这里不方便的一点是看日志的方式，SkyWalking支持将日志存储到ES，我们也可以通过链路追踪到tid之后去ES看日志：

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20221130112109776.png)

## 闭关锁国

这里主要有两点，一是运维对日志的管控，使用SkyWalking的核心是有tid，如果我们无法从线上日志中得到tid，也就无法准确的追踪到链路，这里的解决方案是将tid从接口返回，只需在全局返回对象添加字段即可：

```xml
<dependency>
    <groupId>org.apache.skywalking</groupId>
    <artifactId>apm-toolkit-trace</artifactId>
    <version>8.6.0</version>
</dependency>
```



```json
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
        this.tId = TraceContext.traceId();  // 从上下文获取tid
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

另一个是对SkyWalking的使用推广，有些开发可都不知道我们有SkyWalking，或者不清楚怎么用。

个人觉得可以搞一次培训，同时将其管理权交给开发，SkyWalking不应作为运维侧的监控，运维负责应用外部环境的监控，应用内部的监控应由开发自己来管理。

## 无关业务

SkyWalking本身的定位是应用监控和链路追踪，和业务上不做关联，如果结合我们自身希望它为我们做一些业务上的帮助，主要思考如下：

- 赋予接口（端点）业务含义：在链路追踪上显示每个端点的业务含义，实现方式可以通过对SkyWalking二次开发，自定义Swagger插件，获取Swagger注解上的业务注释，效果如下：

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20221130175043412.png)

- 将监控用作埋点，统计用户习惯：比如我们新上线一个功能，可以通过接口访问次数来得出新功能的受欢迎程度及其合理性，为我们产品的更新迭代提供数据支持。

## 总结

个人觉得SkyWalking是微服务治理的一大利器，利用好可以大大提高系统稳定性和工作效率，对其优化的优先级可以按照如下顺序进行：

1.去除无关监控指标，去除中间层

2.接入监控告警到微信群

3.培训SkyWalking的使用，并重视对报警的处理和反馈

4.做SkyWalking的二次开发以支持业务产品