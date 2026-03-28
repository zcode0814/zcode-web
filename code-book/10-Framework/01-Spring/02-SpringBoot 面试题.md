



## 自动装配原理

1. 项目启动时通过`@SpringBootApplication`开启`@EnableAutoConfiguration`注解。
2. `AutoConfigurationImportSelector` `SpringFactoriesLoader.loadFactoryNames(EnableAutoConfiguration.class)`
3. 拿到`META-INF/spring.factories`配置的所有自动配置类
4. 每个 xxxAutoConfiguration都有对应的 xxxProperties 类，绑定到配置文件的前缀。
5. 通过@bean 注解添加组件到 spring 容器，完成自动配置。
6. 核心：约定大于配置。

**扩展**

如何自己添加自动配置类

要自定义添加自动配置类，可以创建一个配置类并在类上添加 `@Configuration` 注解，然后在类中定义需要自动配置的 Bean，并使用 `@ConditionalOnClass`、`@ConditionalOnMissingBean` 等条件注解来控制自动配置的条件。以下是一个简单的示例代码：

```java
@Configuration
public class CustomAutoConfiguration {

    @Bean
    @ConditionalOnClass({CustomClass.class})
    public CustomBean customBean() {
        return new CustomBean();
    }
}
```

在 `META-INF/spring.factories` 文件中添加自动配置类的配置：

```
org.springframework.boot.autoconfigure.EnableAutoConfiguration=\
com.example.CustomAutoConfiguration
```



## 配置文件加载顺序

### 内部配置文件的路径和优先级

![image-20240315161501937](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20240315161501937.png)

命令行参数需配合 jar 包使用来改变默认配置

```shell
java -jar name.jar --spring.config.location=D:/application.properties
```

### 外部配置文件的顺序



### nacos 配置优先级

https://blog.csdn.net/weixin_43987408/article/details/133690525

