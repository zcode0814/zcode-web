OpenFeign远程调用及性能优化



## pom

```xml
		<dependency>
            <groupId>org.springframework.cloud</groupId>
            <artifactId>spring-cloud-starter-openfeign</artifactId>
        </dependency>
        <!-- 添加 httpclient 框架依赖 -->
        <dependency>
            <groupId>io.github.openfeign</groupId>
            <artifactId>feign-httpclient</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.cloud</groupId>
            <artifactId>spring-cloud-starter-loadbalancer</artifactId>
        </dependency>
```

## 启动类添加注解

`@EnableFeignClients`

## FeignClient

```java
@Service
@FeignClient(
        path = "/commerce-user",
        name = "cloud-commerce-user")
// name 是微服务名，path是访问前缀，不能用url
public interface UserFeignClient {
    @GetMapping(value = "/user/findById")
    String getUserById(String id);
}
```

## 效果

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220829175910832.png)

## 超时降级

### 开启sentinel熔断降级

要想openFeign使用sentinel的降级功能，还需要在配置文件中开启，添加如下配置：

```yaml
feign:
  sentinel:
    enabled: true
```

降级类

```java
@Component
public class FeignFallback implements UserFeignClient{

    @Override
    public String getUserById(String id) {
        return "user service fallback...";
    }
}
```



## 日志配置

```java
@Configuration
public class FeignConfig {

    @Bean
    Logger.Level feignLoggerLevel() {
        // 开启详细日志
        return Logger.Level.FULL;
    }
}
```

- **NONE**：默认的，不显示任何日志;
- **BASIC**：仅记录请求方法、URL、响应状态码及执行时间;
- **HEADERS**：除了BASIC中定义的信息之外，还有请求和响应的头信息;
- **FULL**：除了HEADERS中定义的信息之外，还有请求和响应的正文及元数据。

## 性能优化

```yaml
feign:
  compression:
    request:
      enabled: true  # 开启请求数据的压缩功能
      mime-types: text/xml,application/xml, application/json  # 压缩类型
      min-request-size: 1024  # 最小压缩值标准，当数据大于 1024 才会进行压缩
    response:
      enabled: true  # 开启响应数据压缩功能
  client:
    config:
      cloud-commerce-user:
        connectTimeout: 1000
        readTimeout: 1000
        loggerLevel: full
  okhttp:
    enabled: true
```

在`feign.SynchronousMethodHandler#executeAndDecode()`这个方法中可以清楚的看出调用哪个client(okhttp or apache httpclient)

## 源码

核心：`SynchronousMethodHandler.invoke()`本质就是restTemplate

https://juejin.cn/post/7104225858394521613

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220829183410723.png)

1.启动开启全包扫描，扫描@FeignClient注解的接口，注册feign配置和Client。

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220829184503789.png)

