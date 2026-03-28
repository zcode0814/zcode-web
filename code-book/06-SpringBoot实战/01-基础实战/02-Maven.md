## 配置优先级

https://blog.csdn.net/abu935009066/article/details/124206273



## 导入本地jar包

https://blog.csdn.net/m0_67393342/article/details/126583536



## 命令

```shell
# 构建项目并跳过测试和文档生成过程
mvn clean install -DskipTests -Dmaven.javadoc.skip=true
```



## scope

https://blog.csdn.net/mccand1234/article/details/60962283



## 自定义 maven 插件

https://mp.weixin.qq.com/s/UFHK0J9X0z9Z6GO4_SIPgA





## 配置文件

在Maven中，`<profile>`标签用于定义项目的不同配置文件，可以根据不同的环境或需求激活不同的profile来应用对应的配置。

每个`<profile>`标签可以包含一组配置，如插件、依赖、属性等，以便在构建项目时根据需要进行选择和应用。

```xml
<profiles>
    <profile>
        <id>local</id>
        <activation>
            <activeByDefault>true</activeByDefault>
        </activation>
        <properties>
            <env>local</env>
            <project.log.dir>/Users/log/${project.name}</project.log.dir>
        </properties>
    </profile>
    <profile>
        <id>dev</id>
        <properties>
            <env>dev</env>
            <project.log.dir>/data/logs/${project.name}</project.log.dir>
        </properties>
    </profile>
</profiles>
```

- <id>：指定profile的唯一标识符，用于在命令行中激活特定的profile。
- <activation>：定义profile的激活条件，如activeByDefault、os、property等。
- <properties>：定义profile的属性，可以在项目中引用这些属性。
- <dependencies>：定义profile的依赖项。
- <build>：定义profile的构建配置，如插件配置、资源目录等。

这段配置中包含了两个profile，一个是id为local的本地环境配置，另一个是id为dev的开发环境配置。

其中，local配置被设置为**默认激活状态**（activeByDefault为true），而dev配置需要手动激活。

根据这个配置，当Maven构建项目时，如果没有手动激活dev配置，则local配置会被默认激活。

**手动激活dev配置**

```Shell
mvn clean install -Pdev
```

