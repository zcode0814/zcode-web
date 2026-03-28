哈喽，大家好，我是一条。

今天去厕所看到运维组的围在一块看监控仪表盘，这也太炫酷了，各项指标全部可视化，清晰明了。不行，我也得搞一个。

不去厕所（摸鱼）了，开干。

## 选型

线上应用监控，其实有很多开源组件，凭我多年经验，断定运维组用的应该是普罗米修斯（prometheus）+ Grafana。

就像这样

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220621162708184.png)

或者是对于服务器资源的监控，这样：

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220621162848904.png)

这个呢，早就已经搞过了。毕竟我们只是开发，所以得搞个轻量级，上手快的，不能耽误其他工作。

## SpringBootAdmin

轻量的来了，开箱即用。

第一步，不用想，引入pom依赖。

> spring-boot-starter-web 这里有个坑，下期说。

```xml
 <!-- SpringBoot Admin -->
        <dependency>
            <groupId>de.codecentric</groupId>
            <artifactId>spring-boot-admin-starter-server</artifactId>
            <version>2.2.0</version>
        </dependency>
 <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-actuator</artifactId>
        </dependency>
<!-- 引入 Web 功能 -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
```

搞错了，先建个工程哈，没建工程的一定要建个工程，没建工程的一定要建个工程，没建工程的一定要建个工程，重要的事说三遍。

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220621163212484.png)

然后写pom，写完pom再写配置。

这里有两种方式哈

- 从注册中心nacos获取各服务的信息。
- 每个应用都暴露自己的信息，将其注册到admin

那我们肯定是选第一种了，毕竟nacos昨天已经搞完了，没搞的赶紧搞。

```yml
server:
  port: 3001
  servlet:
    context-path: /cloud-admin

spring:
  application:
    name: cloud-alibaba-admin
  cloud:
    nacos:
      discovery:
        enabled: true
        server-addr: xxxxxxxx:8848
        namespace: 9862bd7f-2dc2-47a4-9c80-c6290c5c3e2b
        metadata:
          management:
            context-path: ${server.servlet.context-path}/actuator
  thymeleaf:
    check-template: false
    check-template-location: false


# 暴露端点
management:
  endpoints:
    web:
      exposure:
        include: '*'  # 需要开放的端点。默认值只打开 health 和 info 两个端点。通过设置 *, 可以开放所有端点
  endpoint:
    health:
      show-details: always

```

写个启动类，不多哔哔。`@EnableAdminServer`别忘了加。

```java
@SpringBootApplication
@EnableAdminServer
public class AdminAppMain {
    public static void main(String[] args) {
        SpringApplication.run(AdminAppMain.class,args);
        System.out.println("admin application starting success");
    }
}
```

## 看效果

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220621163807666.png)

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220621163906116.png)

## 全部接入

其他应用想要接入监控，只需要注册到nacos，并暴露端点及元数据信息。

即修改`bootstrap.yml`

```yml
metadata:
          management:
            context-path: ${server.servlet.context-path}/actuator
```

## 安全控制

如此这样，一旦网址泄漏，服务信息即公之于众，所以得做个安全登录，为了方便，引入spring-security。

```xml
 <!-- 开启登录认证功能 -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-security</artifactId>
        </dependency>
```

配置账号密码，默认用户是user 密码随机。

```yml
spring:
  application:
    name: cloud-alibaba-admin
  security:
    user:
      name: y
      password: b
```

## 下班

搞完下班，哎呀，望去厕所了。