Dubbo + Nacos实现微服务间调用，太丝滑了

哈喽，大家好，我是一条。

对于微服务架构来说，服务间通信方案必不可少，目前常用的远程调用框架就是 OpenFeign 和 Dubbo 。都是结合注册中心实现远程调用。

OpenFeign 其实就是对 RestTemplate 的一层封装，而 Dubbo 有自己独特通信协议，所以大型项目一般使用 Dubbo ，小型项目会使用 OpenFeign ，比较轻量。

Dubbo 支持 ZK，Nacos 等多种注册中心，考虑目前已经较少使用 ZK 做注册中心，本文就基于 Naocs + Dubbo 实现微服务间的远程调用。

> nacos 环境在之前的文章已经聊过，本文不再赘述。重点在 Dubbo 。 

## pom

```xml
<!--dubbo相关-->
        <dependency>
            <groupId>org.apache.dubbo</groupId>
            <artifactId>dubbo-spring-boot-starter</artifactId>
            <version>${dubbo.version}</version>
        </dependency>

        <dependency>
            <groupId>org.apache.dubbo</groupId>
            <artifactId>dubbo-registry-nacos</artifactId>
            <version>${dubbo.version}</version>
        </dependency>

        <!-- 解决dubbo2.7.13jar包冲突问题-->
        <dependency>
            <groupId>com.alibaba.spring</groupId>
            <artifactId>spring-context-support</artifactId>
            <version>1.0.11</version>
        </dependency>
```

## yaml

主要是为 Dubbo 配置 Nacos 的地址。

```yaml

dubbo:
  registry:
    address: nacos://101.11.11.11:8848 #注册地址
  application:
    name: dubbo-consumer #应用名
  consumer:
    timeout: 30000 #超时时间
```

## provider and consume

既然是服务间调用，我们需要两个服务：provider and consume ，同时在启动类开始 Dubbo 。`@EnableDubbo`

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220830174929576.png)

## DubboService

对于服务端来说，想开放哪个接口，只需要在接口添加 `@DubboService` 注解。

```java
@DubboService
@Component
public class RpcService implements InfoService {
    public String getInfo() {

        return "hello，这里是dubbo-provider模块！";
    }
}

    
```

## DubboReference

那客户端只需要加上 `DubboReference` 注解就可以实现像调用本地方法一样调用远程方法。

关键一点是实现的接口最好在公共的包下。

```java
@RestController
@RequestMapping("/rpc")
public class TestRpcController {
    @DubboReference
    private InfoService infoService;

    @GetMapping("/info")
    public String getInfo(){
       return infoService.getInfo();
    }
}
```

## 启动测试

可以看到注册中心已经有了 DubboService 的信息。

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220816171050583.png)

直接访问客户端的接口，返回服务端数据：

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220816171128035.png)

## Dubbo的优雅停机







