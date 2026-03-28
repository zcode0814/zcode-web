

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20221227175603615.png)

## 广告来源

```js
// common.js 30行		
buildFooter : function() {

			var html ='<footer class="footer">'+
					  '    		<div class="container">'+
					  '<a href="https://render.alipay.com/p/s/taobaonpm_click/druid_banner_click" target="new"><img src="https://render.alipay.com/p/s/taobaonpm_click/druid_banner"></a><br/>' +
				  	  '	powered by <a href="https://github.com/alibaba/" target="_blank">Alibaba</a> & sandzhang & <a href="http://melin.iteye.com/" target="_blank">melin</a> & <a href="https://github.com/shrekwang" target="_blank">shrek.wang</a>'+
				  	  '			</div>'+
					  ' </footer>';
			$(document.body).append(html);
		},
```

## 过滤器

1.Druid监控配置

```yml
spring:
  datasource:
    druid:
      #初始连接数 默认0
      initial-size: 10
      #最大连接数，默认8
      max-active: 30
      #最小闲置数
      min-idle: 10
      #获取连接的最大等待时间，单位毫秒
      max-wait: 5000
      # 配置间隔多久才进行一次检测，检测需要关闭的空闲连接，单位是毫秒
      time-between-eviction-runs-millis: 20000
      # 配置一个连接在池中最小生存的时间，单位是毫秒
      min-evictable-idle-time-millis: 600000
      max-evictable-idle-time-millis: 900000
      # 用来测试连接是否可用的SQL语句,默认值每种数据库都不相同,这是mysql
      validationQuery: select 1
      # 应用向连接池申请连接，并且testOnBorrow为false时，连接池将会判断连接是否处于空闲状态，如果是，则验证这条连接是否可用
      testWhileIdle: false
      # 如果为true，默认是false，应用向连接池申请连接时，连接池会判断这条连接是否是可用的
      testOnBorrow: false
      # 如果为true（默认false），当应用使用完连接，连接池回收连接的时候会判断该连接是否还可用
      testOnReturn: false
      # 是否缓存preparedStatement，也就是PSCache。PSCache对支持游标的数据库性能提升巨大，比如说oracle
      poolPreparedStatements: true
      # 要启用PSCache，必须配置大于0，当大于0时， poolPreparedStatements自动触发修改为true，
      # 在Druid中，不会存在Oracle下PSCache占用内存过多的问题，
      # 可以把这个数值配置大一些，比如说100
      maxOpenPreparedStatements: 20
      # 连接池中的minIdle数量以内的连接，空闲时间超过minEvictableIdleTimeMillis，则会执行keepAlive操作
      keepAlive: true
      # Spring 监控，利用aop 对指定接口的执行时间，jdbc数进行记录
      aop-patterns: "com.yitiao.*"
      ########### 启用内置过滤器（第一个 stat必须，否则监控不到SQL）##########
      filters: stat,wall,log4j2
      # 自己配置监控统计拦截的filter
      filter:
        # 开启druiddatasource的状态监控
        stat:
          enabled: true
          db-type: mysql
          # 开启慢sql监控，超过2s 就认为是慢sql，记录到日志中
          log-slow-sql: true
          slow-sql-millis: 2000
        # 日志监控，使用slf4j 进行日志输出
        slf4j:
          enabled: true
          statement-log-error-enabled: true
          statement-create-after-log-enabled: false
          statement-close-after-log-enabled: false
          result-set-open-after-log-enabled: false
          result-set-close-after-log-enabled: false
      ########## 配置WebStatFilter，用于采集web关联监控的数据 ##########
      web-stat-filter:
        enabled: true                   # 启动 StatFilter
        url-pattern: /*                 # 过滤所有url
        exclusions: "*.js,*.gif,*.jpg,*.png,*.css,*.ico,/druid/*" # 排除一些不必要的url
        session-stat-enable: true       # 开启session统计功能
        session-stat-max-count: 1000    # session的最大个数,默认100
      ########## 配置StatViewServlet（监控页面），用于展示Druid的统计信息 ##########
      stat-view-servlet:
        enabled: true                   # 启用StatViewServlet
        url-pattern: /druid/*           # 访问内置监控页面的路径，内置监控页面的首页是/druid/index.html
        reset-enable: false              # 不允许清空统计数据,重新计算
        login-username: root            # 配置监控页面访问密码
        login-password: root
        allow:         # 允许访问的地址，如果allow没有配置或者为空，则允许所有访问
        deny:

```



2.新建过滤器

```java
public class DruidAdRemoveFilter extends OncePerRequestFilter {
    private static final String FILEPATH = "support/http/resources/js/common.js";

    @Override
    protected void doFilterInternal(@NotNull HttpServletRequest request, @NotNull HttpServletResponse response, FilterChain chain) throws ServletException, IOException {

        chain.doFilter(request, response);
        // 重置缓冲区，响应头不会被重置
        response.resetBuffer();
        // 获取common.js
        String text = Utils.readFromResource(FILEPATH);
        // 正则替换banner, 除去底部的广告信息
        text = text.replaceAll("<a.*?banner\"></a><br/>", "<a href=\"https://space.bilibili.com/340880619\" target=\"new\">一条coding</a>");
        text = text.replaceAll("powered.*?shrek.wang</a>", "");
        response.getWriter().write(text);
    }
}
```



3.注册过滤器

```java
@Configuration
@EnableConfigurationProperties(DruidStatProperties.class)
public class DruidMonitorConfig {

    @Bean
    @ConditionalOnProperty(name = "spring.datasource.druid.web-stat-filter.enabled", havingValue = "true")
    public FilterRegistrationBean<DruidAdRemoveFilter> druidAdRemoveFilterRegister(DruidStatProperties properties)
    {
        // 获取web监控页面的参数
        DruidStatProperties.StatViewServlet config = properties.getStatViewServlet();
        // 提取common.js的配置路径
        String pattern = config.getUrlPattern() != null ? config.getUrlPattern() : "/druid/*";
        String commonJsPattern = pattern.replaceAll("\\*", "js/common.js");

        FilterRegistrationBean<DruidAdRemoveFilter> registrationBean = new FilterRegistrationBean<>();
        registrationBean.setFilter(new DruidAdRemoveFilter());
        registrationBean.addUrlPatterns(commonJsPattern);
        return registrationBean;
    }
}
```

`@ConditionalOnProperty`的作用是什么？

在spring boot中有时候需要控制配置类是否生效,可以使用@ConditionalOnProperty注解来控制@Configuration是否生效。

在本案例中，`spring.datasource.druid.web-stat-filter.enabled`是我们在Druid监控中的配置，通过`havingValue`与配置文件中的值对比,返回为`true`则配置类生效,反之失效。

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20221227175912767.png)

## 效果展示

http://101.43.146.76:8014/druid/index.html

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20221227181038124.png)

