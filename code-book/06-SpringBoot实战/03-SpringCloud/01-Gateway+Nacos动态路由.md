Gateway+Nacos实现动态路由

哈喽，大家好，我是一条。

nacos 和 admin 搭建完之后，我们还需要一个网关作为整个系统的门户，所以的访问都必须经过网关才能到我们的具体服务。

所以就要求我们的网关具有，请求分发，拦截过滤的功能，同时还需要做到负载均衡。

那就需要去注册中心拿到各服务信息，不能将服务地址硬编码到代码里。

这些是比较简单的，难点在于如何动态的更新网关配置。

首先，nacos是支持配置动态刷新的，那我就只需要实现gateway收到nacos的配置更新事件后更新自己的路由配置，更新的方式选择全量刷新即可。

那整体就可以分为两块：

- 监听nacos
- 更新配置

同时，服务初次启动时应该全量拉取配置并新增到gateway。

按照这个思路，我们来实现其核心类。

## 定义配置文件的位置

首先路由配置我们是放在nacos的，那如何从众多配合文件中确定我们的路由配置呢，nacos给我们提供了data-id和group。

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220623175759060.png)

所以建好配置之后就需要在gateway中配置好路由配置文件的data-id 和 group ，有点绕嘴哈。

```yml
 spring:
  cloud:
    nacos:     
      custom:
        gateway:
          router:
            data-id: cloud-gateway-router
            group: dev
```

还需要一个配置类来读取到javabean里。

```java
@Configuration
public class GatewayConfig {

    /** 读取配置的超时时间 */
    public static final long DEFAULT_TIMEOUT = 30000;

    /** Nacos 服务器地址 */
    public static String NACOS_SERVER_ADDR;

    /** 命名空间 */
    public static String NACOS_NAMESPACE;

    /** data-id */
    public static String NACOS_ROUTE_DATA_ID;

    /** 分组 id */
    public static String NACOS_ROUTE_GROUP;

    @Value("${spring.cloud.nacos.discovery.server-addr}")
    public void setNACOS_SERVER_ADDR(String NACOS_SERVER_ADDR) {
        this.NACOS_SERVER_ADDR = NACOS_SERVER_ADDR;
    }

    @Value("${spring.cloud.nacos.discovery.namespace}")
    public void setNACOS_NAMESPACE(String NACOS_NAMESPACE) {
        this.NACOS_NAMESPACE = NACOS_NAMESPACE;
    }

    @Value("${spring.cloud.nacos.custom.gateway.router.data-id}")
    public void setNACOS_ROUTE_DATA_ID(String NACOS_ROUTE_DATA_ID) {
        this.NACOS_ROUTE_DATA_ID = NACOS_ROUTE_DATA_ID;
    }

    @Value("${spring.cloud.nacos.custom.gateway.router.group}")
    public void setNACOS_ROUTE_GROUP(String NACOS_ROUTE_GROUP) {
        this.NACOS_ROUTE_GROUP = NACOS_ROUTE_GROUP;
    }
}

```

## 添加监听

通过 server-addr、namespace、data-id、group，我们就可以连接到nacos，再读取其配置文件的json，初始化我们的gateway配置，再对nacos添加监听即可。

看代码：

```java
@Component
@Slf4j
@DependsOn({"gatewayConfig"})
public class GatewayRouteNacosListener {

    private ConfigService nacosConfig;

    private GatewayRouteHandler updateRouteService;

//    private GateWayConfig GateWayConfig;


    public GatewayRouteNacosListener(GatewayRouteHandler updateRouteService) {
        this.updateRouteService = updateRouteService;
    }

    /**
     * <h2>Bean 在容器中构造完成之后会执行 init 方法</h2>
     * */
    @PostConstruct
    public void init() {

        log.info("gateway route init....");

        try {
            // 初始化 Nacos 配置客户端
            initNacosConfig();
            if (null == nacosConfig) {
                log.error("init config service fail");
                return;
            }

            // 通过 Nacos Config 并指定路由配置路径去获取路由配置
            String configInfo = nacosConfig.getConfig(
                    GatewayConfig.NACOS_ROUTE_DATA_ID,
                    GatewayConfig.NACOS_ROUTE_GROUP,
                    GatewayConfig.DEFAULT_TIMEOUT
            );

            log.info("get current gateway config: [{}]", configInfo);
            List<RouteDefinition> definitionList =
                    JSON.parseArray(configInfo, RouteDefinition.class);

            if (CollectionUtils.isNotEmpty(definitionList)) {
                updateRouteService.BatchAddRoute(definitionList);
            }

        } catch (Exception ex) {
            log.error("gateway route init has some error: [{}]", ex.getMessage(), ex);
        }

        // 设置监听器
        addNacosListener(GatewayConfig.NACOS_ROUTE_DATA_ID, GatewayConfig.NACOS_ROUTE_GROUP);
    }


    public void initNacosConfig(){
        try {
            Properties properties = new Properties();
            properties.setProperty("serverAddr", GatewayConfig.NACOS_SERVER_ADDR);
            properties.setProperty("namespace", GatewayConfig.NACOS_NAMESPACE);
            this.nacosConfig = NacosFactory.createConfigService(properties);
        } catch (Exception ex) {
            log.error("init gateway nacos config error: [{}]", ex.getMessage(), ex);
        }
    }

    /**
     * <h2>监听 Nacos 下发的动态路由配置</h2>
     * */
    private void addNacosListener(String dataId, String group) {

        try {
            // 给 Nacos Config 客户端增加一个监听器
            nacosConfig.addListener(dataId, group, new Listener() {

                /**
                 * 自己提供线程池执行操作
                 * */
                @Override
                public Executor getExecutor() {
                    return Executors.newFixedThreadPool(5);
                }

                /**
                 * <h2>监听器收到配置更新</h2>
                 * @param configInfo Nacos 中最新的配置定义
                 * */
                @Override
                public void receiveConfigInfo(String configInfo) {

                    log.info("start to update config: [{}]", configInfo);
                    List<RouteDefinition> definitionList = JSON.parseArray(configInfo, RouteDefinition.class);
                    log.info("transfer to  route definition: [{}]", definitionList.toString());
                    updateRouteService.fullUpdateRoute(definitionList);
                }
            });
        } catch (NacosException ex) {
            log.error("dynamic update gateway config error: [{}]", ex.getMessage(), ex);
        }
    }
}

```

这里要特别注意一下，`@DependsOn({"gatewayConfig"})`的配置里面配置类名的首字母小写之后的名字。即容器中的名字。

## gateway更新配置

接下来就要实现`updateRouteService.fullUpdateRoute(definitionList);`这个方法。

需要两个工具来实现

```java
// 对路由的写操作  - 新增、删除
    private final RouteDefinitionWriter writer;
    // 对路由的读操作  - 查询
    private final RouteDefinitionLocator locator;
```

直接看代码，有注释：

```java
/**
 * 注册监听器，监听 nacos 的路由变化。
 */
@Service
@Slf4j
public class GatewayRouteHandler implements ApplicationEventPublisherAware {
    // 对路由的写操作  - 新增、删除
    private final RouteDefinitionWriter writer;
    // 对路由的读操作  - 查询
    private final RouteDefinitionLocator locator;

    public GatewayRouteHandler(RouteDefinitionWriter writer, RouteDefinitionLocator locator) {
        this.writer = writer;
        this.locator = locator;
    }

    private ApplicationEventPublisher eventPublisher;

    @Override
    public void setApplicationEventPublisher(ApplicationEventPublisher applicationEventPublisher) {
        this.eventPublisher = applicationEventPublisher;
    }

    /**
     * <h2>增加路由定义</h2>
     */
    public void addRoute(RouteDefinition definition) {

        log.info("gateway add route: [{}]", definition);

        // 保存路由配置并发布
        writer.save(Mono.just(definition)).subscribe();
        // 发布事件通知给 Gateway, 同步新增的路由定义
        this.eventPublisher.publishEvent(new RefreshRoutesEvent(this));

    }

    public void BatchAddRoute(List<RouteDefinition> definitions) {
        definitions.forEach(this::addRoute);
    }


    /**
     * <h2>全量更新路由</h2>
     */
    public void fullUpdateRoute(List<RouteDefinition> definitions) {

        log.info("gateway full update route: [{}]", definitions);

        // 先拿到当前 Gateway 中存储的路由定义
        List<RouteDefinition> routeDefinitionsExits = locator.getRouteDefinitions().buffer().blockFirst();
        if (!CollectionUtils.isEmpty(routeDefinitionsExits)) {
            // 清除掉之前所有的 "旧的" 路由定义
            routeDefinitionsExits.forEach(rd -> {
                log.info("delete route definition: [{}]", rd);
                deleteRouteById(rd.getId());
            });
        }

        // 把更新的路由定义同步到 gateway 中
        definitions.forEach(this::addRoute);
    }

    /**
     * <h2>根据路由 id 删除路由配置</h2>
     */
    private void deleteRouteById(String id) {

        try {
            writer.delete(Mono.just(id)).subscribe();
            // 发布事件通知给 gateway 更新路由定义
            this.eventPublisher.publishEvent(new RefreshRoutesEvent(this));
            log.info("gateway delete route success - id: [{}]", id);
        } catch (Exception ex) {
            log.error("gateway delete route fail: [{}]", ex.getMessage(), ex);
        }
    }

    /**
     * <h2>单个更新路由</h2>
     */
    private void updateRouteById(RouteDefinition definition) {
        try {
            deleteRouteById(definition.getId());
            addRoute(definition);
        } catch (Exception ex) {
            log.error("gateway update route fail: [{}]", ex.getMessage(), ex);
        }
    }

    private void batchUpdateRoute(List<RouteDefinition> definitions) {
        definitions.forEach(this::updateRouteById);
    }
}

```

## 最后

这样我们就更新路由配置文件，gateway就会受到更新事件，从而触发更新。

这个企业级的实现方式一定要学会。

下期见！