## SpringBoot暴露数据

```xml
<!--注意与springboot的版本对应-->
<dependency>
    <groupId>io.micrometer</groupId>
    <artifactId>micrometer-registry-prometheus</artifactId>
    <version>1.9.3</version> 
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
    <version>2.7.1</version>
</dependency>
```



```java
@SpringBootApplication
public class AdminMainApp {

    public static void main(String[] args) {
        SpringApplication.run(AdminMainApp.class,args);
        System.out.println("AdminMainApp application started");
    }

    @Bean
    MeterRegistryCustomizer<MeterRegistry> configurer(@Value("${spring.application.name:Default}") String applicationName) {
        return (registry) -> registry.config().commonTags("application", applicationName);
    }
}
```



```yml
## 配置具体含义参见后面对actuator安全问题的讲解
management:
  endpoints:
    web:
      exposure:
        include: '*'
  endpoint:
    prometheus:
      enabled: true
    metrics:
      enabled: true
  metrics:
    export:
      prometheus:
        enabled: true
```

http://127.0.0.1:8014/actuator/prometheus

## Prometheus采集数据

```shell
docker pull prom/prometheus
docker pull grafana/grafana
docker pull prom/node-exporter
docker pull prom/mysqld-exporter
```



```yml
# prometheus.yml 
global:
  scrape_interval:     60s
  evaluation_interval: 60s

scrape_configs:
  - job_name: prometheus
    static_configs:
      - targets: ['127.0.0.1:19090']
        labels:
          instance: prometheus

  - job_name: node
    metrics_path: '/metrics'
    static_configs:
      - targets: ['101.43.146.76:19100']
        labels:
          instance: node

  - job_name: mysqld
    metrics_path: '/metrics'
    static_configs:
      - targets: ['101.43.146.76:19104']
        labels:
          instance: mysqld

  - job_name: yitiao-admin
    scrape_interval: 5s
    metrics_path: '/actuator/prometheus'
    static_configs:
      - targets: ['101.43.146.76:8014']
```



```shell
docker run --name prom -d --restart=always -p 19090:9090 -v /data/opt/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml prom/prometheus  


```



http://101.43.146.76:19090/targets?search=yitiao-admin

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20221225132355419.png)



## Grafana可视化数据

**安装**

```shell
mkdir grafana-storage
chmod 777 -R grafana-storage/

docker run --name=grafana -d --restart=always -p 3000:3000  -v /data/opt/prometheus/grafana-storage:/var/lib/grafana grafana/grafana
```

http://101.43.146.76:3000/login

`admin/admin`

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20221225133323443.png)

**配置**

1.添加数据源，选择普罗米修斯，配置其地址

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20221225133513130.png)

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20221225133604357.png)

2.导入仪表盘

dashbroad -> import -> 4701(JVM仪表盘编号) -> save

> [仪表盘市场](https://grafana.com/grafana/dashboards/)

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20221225134251562.png)

## 其它指标监控

> [Prometheus常用exporter](https://blog.csdn.net/wangshui898/article/details/115395942)

**服务器监控**

```shell
docker run --name node -d -p 19100:9100 \
  -v /proc:/host/proc:ro \
  -v /sys:/host/sys:ro \
  -v /:/rootfs:ro \
  prom/node-exporter

```



```yml
  - job_name: node
    metrics_path: '/metrics'
    static_configs:
      - targets: ['101.43.146.76:19100']
        labels:
          instance: node
```



![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20221225141133308.png)



仪表盘：1860

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20221225141838000.png)

**Mysql监控**

```shell
docker run -d --name mysqld_exporter -p 19104:9104 -e DATA_SOURCE_NAME="root:Libiao@123@(101.43.160.149:3306)/" prom/mysqld-exporter

## -e DATA_SOURCE_NAME="用户名:密码@(127.0.0.1:3306)/"
```



```yml
- job_name: mysqld
    metrics_path: '/metrics'
    static_configs:
      - targets: ['101.43.146.76:19104']
        labels:
          instance: mysqld
```



仪表盘：7362

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20221225143612046.png)



**redis监控**

```shell
docker pull bitnami/redis-exporter
docker run -d --name redis_exporter -p 19121:9121 bitnami/redis-exporter --redis.addr redis://101.43.160.149:6378 --redis.password "Libiao@123"
```

访问测试 http://101.43.146.76:19121/metrics

```yml
- job_name: redis
    metrics_path: '/metrics'
    static_configs:
      - targets: ['101.43.146.76:19121']
        labels:
          instance: redis
```



仪表盘：2751

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20230220162802316.png)

## 报警配置

https://blog.csdn.net/Andy_Health/article/details/123475186



## Actuator安全问题

> https://blog.csdn.net/u013087026/article/details/109536552

**安全配置详解**

```yml
# 访问示例：http://localhost:9595/monitor
management:
  endpoints:
    web:
      # actuator的访问路径，替换默认/actuator
      base-path: /monitor
      # 设置是否暴露端点 默认只有health和info可见
      exposure:
        # include: env   # 方式1: 暴露端点env，配置多个以,隔开
        include: "*"     # 方式2: 包括所有端点，注意需要添加引号
        # 排除端点
        exclude: shutdown
  server:
    port: 9595  #新开监控端口，不和应用用同一个端口
  endpoint:
    health:
      show-details: always # 显示db、redis、rabbti连接情况等
    shutdown:
      enabled: true  #默认情况下，除shutdown以外的所有端点均已启用。手动开启
```

**Endpoints（端点）介绍**

Endpoints 是 Actuator 的核心部分，它用来监视应用程序及交互，spring-boot-actuator中已经内置了非常多的Endpoints（health、info、beans、httptrace、shutdown等等），同时也允许我们扩展自己的端点。

Actuator 默认提供了以下接口，具体如下表所示：

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20230201114314477.png)

**安全措施**

即使按照上述配置修改默认端口和路径，关闭一些不需要的EndPoint，只要我们有开放就有安全隐患，更可靠的办法还是加密码保护，所以引入`spring-security`。

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-security</artifactId>
</dependency>
```



```yml
spring:
 security:
    user:
      password: 123456
      name: yitiao
```



为了只对actuator功能做权限验证，其他应用接口不做认证，我们可以重新定制下SpringSecurity

```java
@Configuration
@EnableWebSecurity
public class ActuatorSecurityConfig extends WebSecurityConfigurerAdapter {
 
  @Autowired
  Environment env;
 
  @Override
  protected void configure(HttpSecurity security) throws Exception {
 
        String contextPath = env.getProperty("management.endpoints.web.base-path");
        if(StringUtils.isEmpty(contextPath)) {
            contextPath = "";
        }
        security.csrf().disable();
        security.authorizeRequests()
                .antMatchers("/**"+contextPath+"/**")
                .authenticated()
                .anyRequest()
                .permitAll()
                .and()
                .httpBasic();
 
     }
}
```

再次访问http://localhost:9595/monitor，此时需要进行权限验证，如下图：

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/640.png)

**安全总结**

- 只开放某些无敏感信息的端点。
- 打开安全限制并进行身份验证，访问Actuator接口时需要登录。
- Actuator访问接口使用独立端口，并配置不对外网开放。

## 自定义监控端点

https://blog.csdn.net/kingwinstar/article/details/120392420