> https://juejin.cn/post/7127468724046528525

## 自定义starter步骤

其实自定义starter很简单，大致需要以下5步：

新建两个模块，命名规范：
springboot自带的starter命名规范为spring-boot-starter-xxx，
自定义的starter命名规范为xxx-spring-boot-starter

- xxx-spring-boot-autoconfigure：自动配置核心代码
- xxx-spring-boot-starter：管理依赖

如果不需要将自动配置代码和依赖项管理分离开来，则可以将它们组合到一个模块中。只不过springboot官方建议将两个模块分开。

2. 引入spring-boot-autoconfigure依赖
3. 创建自定义的XXXProperties 类: 这个类的属性根据需要是要出现在配置文件中的。
4. 创建自定义的XXXAutoConfiguration类：这个类要配置自动配置时的一些逻辑，同时也要让XXXProperties 类生效。
5. 创建自定义的spring.factories文件：在resources/META-INF创建一个spring.factories文件和spring-configuration-metadata.json，spring-configuration-metadata.json文件是用于在填写配置文件时的智能提示，可要可不要，有的话提示起来更友好。spring.factories用于导入自动配置类，必须要有

## 基础案例









## 常用注解

下面这些注解在自定义starter是可能会用到。

@Conditional：按照一定的条件进行判断，满足条件给容器注册bean
@ConditionalOnMissingBean：给定的在bean不存在时,则实例化当前Bean
@ConditionalOnProperty：配置文件中满足定义的属性则创建bean，否则不创建
@ConditionalOnBean：给定的在bean存在时,则实例化当前Bean
@ConditionalOnClass： 当给定的类名在类路径上存在，则实例化当前Bean
@ConditionalOnMissingClass ：当给定的类名在类路径上不存在，则实例化当前Bean





## log-aop-spring-boot-starter

> 基于企业微信的监控报警功能，参考美团的日志框架
>
> 待添加：
>
> - 数据统计
> - 基于滑动窗口的报警收敛



## CommonLog接入说明

### 基本功能

对所有`@Controller`和`@RestController`接口进行拦截，打印其入参、耗时、返回结果等信息，如下图：

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/%E4%BC%81%E4%B8%9A%E5%BE%AE%E4%BF%A1%E6%88%AA%E5%9B%BE_86812c89-6ee0-441d-afa9-887ba1a963a3.png)

> 其中`请求用户ID`为从header获取中的`[userid]`值。目前大多数调用没有传递该值，所以显示`null`。
>
> `String userid = request.getHeader("userid");`



### 普通接入

以上功能位于`cbim-common`模块，各应用只需引入其最新版本即可，

- 本地可以先删除`cbim-common`的依赖缓存，重新加载
- 服务器可以修改一下pom文件，`CI`时便会拉取最新的依赖包

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20221219142506870.png)

### 高级接入

### NoLog

对于有些不想打印日志的接口，提供`@NoLog`注解，支持添加在类和方法上。

```java
@Documented
@Target({ ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
public @interface NoLog {
}
```

### 保存日志

如果有应用想把接口的入参耗时等相关信息存入数据库，提供了实现接口，这里仿照`Mybatis-Plus`的插件方式，具体使用方式如下：

1.自定义插件实现类

```java
@Slf4j
// 必须实现 LogInnerInterceptor 接口
public class LogDbInterceptor implements LogInnerInterceptor {

    @Override
    public void saveLog(CommonLog commonLog) {
        // 在此处自定义保存日志的策略
        log.info("插入日志"+Thread.currentThread().getName());
    }
}
```

```java
// 对日志信息的封装
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Accessors(chain = true)
public class CommonLog {

    private String requestUri;

    private String requestType;

    private String requestMethod;

    private String requestParam;

    private String requestResult;

    private Integer requestCode;

    private Long costTime;

    private String requestTime;

    private String userId;
}
```

2.添加自定义的插件

```java
@Configuration
public class CommonLogConfig {

    @Bean
    public LogInterceptor logInterceptor(){
        LogInterceptor logInterceptor = new LogInterceptor();
        // 支持添加多个插件
        logInterceptor.addInterceptor(new LogDbInterceptor());
        return logInterceptor;
    }
}
```

3.额外说明

以上两步已经完成自定义插件的功能，此处需说明的是：对日志的保存操作为异步执行，避免对接口核心业务逻辑的影响，具体代码参考：

```java
// RequestParamAspect.class
private void handleInterceptor(CommonLog commonLog) {
        if (CollectionUtil.isNotEmpty(interceptors)){
            interceptors.forEach(item->{
                executor.execute(()-> item.saveLog(commonLog));
            });
        }
    }
```

### 可能的影响

由于本次功能自定义了Spring自带的线程池`ThreadPoolTaskExecutor`,对于用到线程池的地方，可能需要修改注入的方式，如下：

```java
// 方式一
@Resource(name = "cbimThreadPool")
private Executor poolTaskExecutor;

// 方式二
private Executor executor = SpringUtil.getBean("cbimThreadPool");
```

