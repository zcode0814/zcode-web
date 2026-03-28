自研  Spring 框架

> 从 0 到 1 基于原生的 servlet 实现 Spring 框架的核心功能：
> - IOC
> - AOP
> - MVC
> - ...

## 架构简图
![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20221114135028257.png)

## 项目雏形
> 基于 jsp 实现接口访问及动态页面的加载。

**jsp 运行流程**

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20221114134929978.png)

**war 包启动**

```xml
## 添加 tomcat build 插件
<plugin>
    <groupId>org.apache.tomcat.maven</groupId>
    <artifactId>tomcat7-maven-plugin</artifactId>
    <version>2.2</version>

    <configuration>
        <path>/${project.artifactId}</path> <!--项目访问路径。当前配置的访问是localhost:9090/, 如果配置是/aa，则访问路径为localhost:9090/aa -->
        <port>9090</port>
        <uriEncoding>UTF-8</uriEncoding><!-- 非必需项 -->
    </configuration>
</plugin>
```

在 maven - plugin - tomcat7 - run 启动项目，访问地址`http://localhost:9090/SpringSelf//hello`，返回动态的页面。

## 前置知识

> - 工厂设计模式
> - 反射
> - 注解

**注解的工作原理**

- 通过键值对的形式为注解赋值
- 编译时检查注解的使用范围，将注解信息写入元素属性表
- 运行时jvm讲所有注解的属性值读取出来存入map
- 创建 AnnotationInvocationHandler 示例，并放入前面的map
- jdk通过动态代理创建代理类，并初始化处理器
- 实际调用 AnnotationInvocationHandler 的 invoke（）方法来返回属性值

## IOC的实现

> 依赖倒置 - 上层控制底层（组合） - 将new对象的操作变多 - 通过容器来管理对象的生命周期

**需要实现的步骤**

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20221114164847153.png)

### 创建注解

```
.
├── Component.java
├── Controller.java
├── Repository.java
└── Service.java
```

```java
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
public @interface Controller {

}
```

### 包扫描创建类

> URL 不是你想的那样：统一资源定位符，位于 `java.net`包下。
>
> ![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20221114174151626.png)

```java
@Slf4j
public class ClassUtil {
    public static final String FILE_PROTOCOL = "file";

    /**
     * 获取包名对应的编译后的class文件夹资源
     */
    public static Set<Class<?>> extractPackageClass(String packageName) {
        Set<Class<?>> classSet = new HashSet<>();
        // 通过类加载器获取资源(编译后的class文件)
        ClassLoader classLoader = getClassLoader();
        URL resource = classLoader.getResource(packageName.replace(".", "/"));
        if (resource == null) {
            log.warn("unable to retrieve anything from package: " + packageName);
            return classSet;
        }
        //过滤出文件类型的资源
        if (resource.getProtocol().equalsIgnoreCase(FILE_PROTOCOL)) {
            File packageDirectory = new File(resource.getPath());
            extractClassFile(classSet, packageDirectory, packageName);
        }
        return classSet;
    }

    /**
     * 递归获取目标package里面的所有class文件(包括子package里的class文件)
     */
    public static void extractClassFile(Set<Class<?>> classSet, File packageDirectory, String packageName) {
        if (!packageDirectory.isDirectory()) {
            return;
        }
        File[] files = packageDirectory.listFiles(new FileFilter() {
            @Override
            public boolean accept(File file) {
                // file 可能是文件或文件夹
                if (file.isDirectory()) {
                    // 将其留在文件夹内
                    return true;
                } else {
                    // 获取文件的绝对值路径
                    String absoluteFilePath = file.getAbsolutePath();
                    if (absoluteFilePath.endsWith(".class")) {
                        // 拼接出全路径类名 com.yitiao.entity.dto.MainPageInfoDTO
                        absoluteFilePath = absoluteFilePath.replace(File.separator, ".");
                        String className = absoluteFilePath.substring(absoluteFilePath.indexOf(packageName));
                        className = className.substring(0, className.lastIndexOf("."));  // 去除 .class 后缀
                        // 通过反射机制获取对应的Class对象并加入到classSet里
                        Class targetClass = loadClass(className);
                        classSet.add(targetClass);
                    }
                    // 从文件夹内过滤掉
                    return false;
                }
            }
        });
        if (files != null) {
            for (File f : files) {
                //递归调用
                extractClassFile(classSet, f, packageName);
            }
        }
    }

    @SneakyThrows
    private static Class loadClass(String className) {
        return Class.forName(className);
    }

    /**
     * 获取classLoader
     */
    public static ClassLoader getClassLoader() {
        return Thread.currentThread().getContextClassLoader();
    }

    public static void main(String[] args) {
        extractPackageClass("com.yitiao.entity");
    }

}
```

### 线程安全单例模式

```java
public class EnumStarvingSingleton {

    private EnumStarvingSingleton(){}

    public static EnumStarvingSingleton getInstance(){
        return ContainerHolder.HOLDER.instance;
    }
    private enum ContainerHolder{
        HOLDER;

        private EnumStarvingSingleton instance;

        ContainerHolder(){
            instance = new EnumStarvingSingleton();
        }
    }
}
```

### 创建容器

> 容器实质是一个保存类及其实例对象的Map：`Map<Class<?>, Object> beanMap`。
>
> 包扣容器启动（加载所有bean）、获取bean、删除bean、获取class、删除class、获取子类class等方法。
>
> 同时容器需要支持根据注解对bean的筛选。

```java
    /**
     * 扫描加载所有Bean
     */
    public synchronized void loadBeans(String packageName) {
        // 判断 bean 容器是否已经被初始化
        if (isLoaded) {
            log.warn("BeanContainer has been loaded.");
            return;
        }
        Set<Class<?>> classSet = ClassUtil.extractPackageClass(packageName);
        if (CollectionUtil.isEmpty(classSet)) {
            log.warn("extract nothing from packageName" + packageName);
            return;
        }
        for (Class<?> clazz : classSet) {
            for (Class<? extends Annotation> annotation : BEAN_ANNOTATION) {
                //如果类上面标记了定义的注解
                if (clazz.isAnnotationPresent(annotation)) {
                    //将目标类本身作为键，目标类的实例作为值，放入到beanMap中
                    beanMap.put(clazz, ClassUtil.newInstance(clazz, true));
                }
            }
        }
        isLoaded = true;
    }
```

## 依赖注入

> 上一步我们已经将创建好的bean放入容器，并提供了对bean的操作方式，但是这些bean是不完整的。
>
> 因为bean的属性还没有初始化或注入，这就需要我们实现**依赖注入**。

**思路如下**

- 定义注解`@AutoWired`来实现对需要注入的属性做标记。
- 从容器中获取或创建其所需属性的bean实例。
- 将实例赋值给需要注入的类。

```java
```



## IOC源码



### 简单容器

以 BeanFactory 接口为核心的简单容器，

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20221116150307866.png)



### 高级容器

以 ApplicationContext 接口为核心的高级容器，其既实现了一部分的简单容器，又实现了 ResourceLoader ，提供了更为方便的复杂操作，如注解的支持。

```java
public interface ApplicationContext extends EnvironmentCapable, ListableBeanFactory, HierarchicalBeanFactory,MessageSource, ApplicationEventPublisher, ResourcePatternResolver{
      
}
```

### 进攻refresh()方法准备

**PostProcessor**

1.BeanDefinitionRegistryPostProcessor

```java
public interface BeanDefinitionRegistryPostProcessor extends BeanFactoryPostProcessor {
	void postProcessBeanDefinitionRegistry(BeanDefinitionRegistry registry) throws BeansException;
}
```

允许在正常的`BeanFactoryPostProcessor`执行之前注册更多的自定义`beanDefinition`。我们可以听过实现它来向容器中添加bean。

```java
@Configuration
@ComponentScan("com.yitiao.spring")
public class CustomizedBeanDefinitionRegistryPostProcessor implements BeanDefinitionRegistryPostProcessor {
	@Override
	// 实现自 BeanFactoryPostProcessor
	public void postProcessBeanFactory(ConfigurableListableBeanFactory beanFactory) throws BeansException {
		System.out.println("---BeanFactoryPostProcessor");
	}

	@Override
	public void postProcessBeanDefinitionRegistry(BeanDefinitionRegistry registry) throws BeansException {
		System.out.println("---BeanDefinitionRegistryPostProcessor");
		BeanDefinitionBuilder definitionBuilder = BeanDefinitionBuilder.genericBeanDefinition(User.class);
		registry.registerBeanDefinition("userPost", definitionBuilder.getRawBeanDefinition());
	}
}

// 输出
// ---BeanDefinitionRegistryPostProcessor  先执行
// ---BeanFactoryPostProcessor
```

2.BeanFactoryPostProcessor

同样是影响容器的操作

3.BeanPostProcessor

```java
public interface BeanPostProcessor {
	@Nullable
	default Object postProcessBeforeInitialization(Object bean, String beanName) throws BeansException {
		return bean;
	}
	@Nullable
	default Object postProcessAfterInitialization(Object bean, String beanName) throws BeansException {
		return bean;
	}

}
```

对bean进行进一步的处理和扩展,即在初始化前后对bean做更多的处理。比如封装一些属性，耗时统计。这也是后面是实现aop的基础。

```java
@Configuration
@ComponentScan("com.yitiao.spring")
public class CustomizedBeanPostProcessor implements BeanPostProcessor {
	public Object postProcessBeforeInitialization(Object bean, String beanName) throws BeansException{
		System.out.println(beanName + "调用了 postProcessBeforeInitialization() ");
		return bean;
	}
	public Object postProcessAfterInitialization(Object bean, String beanName) throws BeansException{
		System.out.println(beanName + "调用了 postProcessAfterInitialization() ");
		return bean;
	}
}
```

4.PostProcessor的执行顺序

```java
// 容器层面
BeanDefinitionRegistryPostProcessor()
BeanFactoryPostProcessor()
// bean层面
postProcessBeforeInitialization() 
postProcessAfterInitialization() 
```

**Aware.interface**

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20221116165759296.png)

可以通过实现接口来获取对应的容器或上下文

```java
@Controller
public class HelloController implements ApplicationContextAware, BeanNameAware {
	@Autowired
	private HelloService helloService;
	private String name;
	private ApplicationContext context;

	public void sayHello(){
		helloService.sayHello();
		System.out.println("---name:"+name);
		System.out.println("---context:"+context.getApplicationName());
	}

	@Override
	public void setBeanName(String name) {
		System.out.println("---setName");
		this.name = name;
	}

	@Override
	public void setApplicationContext(ApplicationContext applicationContext) throws BeansException {
		System.out.println("---setContext");
		this.context = applicationContext;
	}
}
// 输出
// ---setName
// ---setContext
// helloController调用了 postProcessBeforeInitialization() 
// helloController调用了 postProcessAfterInitialization() 
```

**事件监听机制**

监听器会监听感兴趣的事，一旦事情发生，便会做出响应。

- 事件源
- 监听器（监听事件源）
- 事件对象

对于一个事件源，首先需要一个添加监听器的功能（支持添加多个），其次要有执行响应监听的能力。

```java
public class EventSource {
	private List<EventListener> listenerList = new ArrayList<>();
	public void register(EventListener listener){
		listenerList.add(listener);
	}
	public void publishEvent(Event event){
		for(EventListener listener: listenerList){
			listener.processEvent(event);
		}
	}
}
```

对于监听器，应该是一个抽象的，可扩展的接口，并支持自定义其针对事件对象某种变化的响应事件

```java
public interface EventListener {
  void processEvent(Event event); // 在其实现类监听事件对象的属性变化
}
```

监听器实现

```java
public class SingleClickEventListener implements EventListener {
    @Override
    public void processEvent(Event event) {
        if("singleclick".equals(event.getType())){
            System.out.println("单击被触发了");
        }
    }
}
```

测试类

```java
public class EventTest {
	public static void main(String[] args) {
		Event event = new Event();
		EventSource eventSource = new EventSource();
		eventSource.register(new SingleClickEventListener());
		event.setType("singleclick");
		eventSource.publishEvent(event);
	}
}

```

spring的监听类

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20221116180013662.png)

> todo @EventListener 使用

### 进攻refresh()

**1.prepareRefresh()**

调用容器准备刷新的方法，获取容器的当时时间，同时给容器设置同步标识，设置为激活状态。

- 初始化上下文环境中的任何占位符属性源。
- 验证标记为要求的所有属性都是可解析的。
- 清空 ApplicationListeners 和 ApplicationEvents。

**2.ConfigurableListableBeanFactory beanFactory = obtainFreshBeanFactory();**

告诉子类启动refreshBeanFactory()方法，并设置工厂id。

**3.prepareBeanFactory(beanFactory)**

注册一些容器中需要的系统Bean.例如classloader，beanfactoryPostProcessor等



**4.postProcessBeanFactory(beanFactory)**

允许容器的子类去注册postProcessor  ，钩子方法

**5.invokeBeanFactoryPostProcessors(beanFactory)**

激活在容器中注册为bean的BeanFactoryPostProcessors



6.registerBeanPostProcessors(beanFactory)



7.initMessageSource()



8.initApplicationEventMulticaster()



9.onRefresh()



10.registerListeners()



11.finishBeanFactoryInitialization(beanFactory)



12.finishRefresh()



13.resetCommonCaches()


​				
