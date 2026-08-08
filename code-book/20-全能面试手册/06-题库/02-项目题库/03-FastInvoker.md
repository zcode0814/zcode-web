# Fast Invoker 面试问答准备

> 说明：本文按“10 年经验 Java 面试官可能追问”的角度整理。  
> “代码依据”来自当前仓库可见源码和 `src/main/resources/lib/invoker-agent-1.0.2.jar` 的字节码信息；仓库中无法确认的内容会明确标注，并给出答题思路。

## 1. 项目定位

### Q1：这个插件最核心解决的痛点是什么？

**答：**  
Java 后端开发中，验证一个 service 方法、private 方法或 static 方法，常常需要写临时接口、补单元测试、构造上下文或重启应用。Fast Invoker 的目标是把这个流程缩短为：在 IDEA 中选中方法、Attach 到运行中的 JVM、填写 JSON 参数、直接调用并查看结果。

**代码依据：**
- `plugin.xml` 描述了 “invoke any Java method directly in a running JVM”。
- `InvokeLineMarker` 在 Java 方法旁添加 gutter icon。
- `InvokeToolService.invoke()` 将调用请求发送到目标 JVM 中的 Agent。

### Q2：和 Postman、单元测试、Debug Evaluate Expression、Arthas 的区别是什么？

**答：**
- Postman 只能调用已暴露的 HTTP 接口，Fast Invoker 可以直接调用类方法。
- 单元测试更适合长期回归，Fast Invoker 更适合本地临时验证和调试。
- Debug Evaluate Expression 依赖断点上下文，Fast Invoker 不要求程序停在某个断点。
- Arthas 更偏线上诊断和 JVM 观测，Fast Invoker 更偏 IDE 内开发调试体验，并提供参数模板、历史回放、脚本和 AI 参数生成。

**当前代码体现：**
- IDEA 插件入口、ToolWindow、LineMarker 和 Action 已实现。
- 当前仓库没有和 Arthas/Postman 的直接集成或对比逻辑。

### Q3：为什么做 IDEA 插件，而不是 CLI 或 Web 控制台？

**答题思路：**  
因为调用入口天然来自代码编辑器：插件可以直接使用 PSI 获取类名、方法名、参数类型，并把调用能力嵌入开发者日常编码环境。CLI/Web 控制台需要用户手动输入方法签名，体验和准确性都更差。

**代码依据：**
- `InvokeLineMarker` 使用 PSI 判断 `PsiIdentifier` 的父节点是否为 `PsiMethod`。
- `InvokeToolService.setBodyToPanel()` 从 `PsiMethod` 自动提取 className、methodName 和参数模板。

## 2. 整体架构

### Q4：插件端、Agent 端、目标 JVM 的调用链路是什么？

**答：**
1. 用户点击方法旁 gutter icon 或右键菜单。
2. 插件端通过 PSI 获取类名、方法名、参数列表，填充到 ToolWindow。
3. 用户选择本地 JVM 进程，插件通过 Java Attach API 加载 Agent jar。
4. Agent 在目标 JVM 中启动 HTTP Server。
5. 插件向 `http://localhost:{port}/api/invoke` 发送调用请求。
6. Agent 反序列化请求，执行 Groovy 前置脚本，转换参数，反射调用目标方法。
7. Agent 将返回值或错误封装成 Response 返回给插件 UI。

**代码依据：**
- `InvokeToolService.attach()` 使用 `VirtualMachine.list()` 选择 JVM。
- `InvokeToolService.doAttach()` 调用 `VirtualMachine.attach(pid)` 和 `vm.loadAgent(agentJarPath)`。
- `InvokeHttpClient.sendInvoke()` POST 到 `/api/invoke`。
- Agent 字节码显示 `InvokeHttpServer` 创建 `/api/invoke`，`InvokeHttpHandler` 调用 `InvokeMethodService.invoke()`。

### Q5：为什么使用 HTTP 通信？

**答：**  
当前实现使用 JDK 自带 `com.sun.net.httpserver.HttpServer`，好处是实现简单、无额外网络框架依赖、便于插件端用普通 HTTP 客户端调用。缺点是安全控制、连接管理、双向通信能力较弱。

**代码依据：**
- `InvokeHttpClient` 使用 Hutool `HttpUtil.post()`。
- Agent 字节码中 `InvokeHttpServer.start()` 使用 `HttpServer.create()`。

**注意：**  
`doc/CLAUDE.md` 中曾描述 WebSocket 通信，但当前代码和 Agent 字节码实际是 HTTP，面试时应以当前实现为准。

### Q6：Agent 端做了哪些事情？

**答：**
- 提供 `premain` 和 `agentmain` 入口。
- 保存 `Instrumentation`。
- 根据当前进程 pid 计算端口并启动 HTTP Server。
- 接收 `/api/invoke` 请求。
- 执行 Groovy 前置脚本。
- 将 JSON 参数转换为 Java 对象。
- 查找目标类和目标方法。
- 对 private 方法调用 `setAccessible(true)`。
- 对 static 方法直接调用，对实例方法先尝试从 JVM 堆中获取对象，取不到则使用无参构造创建。

**代码依据：**
- Agent manifest 包含 `Premain-Class` 和 `Agent-Class`。
- `AgentMain.agentmain()` 调用 `startHttpServer()`。
- `InvokeMethodService.invoke()` 字节码中存在 `Method.setAccessible(true)`、`Method.invoke()`、`VMToolUtil.getObject()`、`getDeclaredConstructor().newInstance()`。

### Q7：Agent 的生命周期怎么管理？能卸载吗？

**答：**  
当前实现中，插件 attach 后会 `vm.detach()`，但 detach 只断开插件进程和目标 JVM 的 attach 连接，不会卸载已加载的 Agent。Agent 会继续在目标 JVM 中运行 HTTP Server。当前代码没有实现 Agent 卸载机制。

**代码依据：**
- `InvokeToolService.doAttach()` 中有注释：`detach 不会卸载已加载的 agent`。

**可优化思路：**
- Agent 提供 `/api/shutdown`。
- 插件侧提供 Disconnect。
- 对重复加载做幂等检查，避免端口重复绑定。

## 3. Java Attach API

### Q8：Java Attach API 的基本原理是什么？

**答：**  
Attach API 允许一个 JVM 进程连接到另一个本地 JVM 进程，并向目标 JVM 动态加载 Java Agent。目标 Agent 的 `agentmain(String, Instrumentation)` 会被调用，从而获得在目标 JVM 内执行代码的能力。

**代码依据：**
- 插件端依赖 `com.sun.tools.attach.VirtualMachine`。
- Agent manifest 声明 `Agent-Class: com.zcode.invoker.agent.AgentMain`。

### Q9：attach 需要什么权限？常见失败原因有哪些？

**答题思路：**
- 通常需要同一用户权限。
- 目标进程必须是支持 Attach 的 HotSpot/OpenJDK JVM。
- JRE 环境、权限受限、容器隔离、禁用 attach、JDK 版本差异都可能失败。
- macOS/Linux/Windows 的 attach 机制和权限细节不同。

**当前代码：**
- `InvokeToolService.attach()` 只列出本地 JVM 并过滤 IntelliJ/Gradle/JetBrains 进程。
- `doAttach()` 捕获异常并弹窗提示，但没有细分失败原因。

### Q10：不同 JDK 版本有什么兼容问题？

**答：**  
插件当前使用 Java 17 编译，Agent manifest 显示 `Build-Jdk-Spec: 1.8`。理论上 Agent 编译到较低字节码版本更利于加载到老 JVM，但运行时还要考虑目标 JVM 是否支持 Agent 依赖库、模块访问限制、Attach 权限等。

**代码依据：**
- `build.gradle.kts` 设置插件 Java 17。
- Agent manifest 显示 Build JDK 1.8。
- `InvokeToolService.checkJavaVersion()` 会读取当前 JVM 和目标 JVM 的 `java.specification.version`，但目前只是记录日志，没有强制校验。

## 4. 方法调用与反射

### Q11：private 方法怎么调用？

**答：**  
Agent 端查找到目标 `Method` 后调用 `method.setAccessible(true)`，再通过反射执行，因此可以调用 private 方法。

**代码依据：**
- Agent `InvokeMethodService.invoke()` 字节码中存在 `Method.setAccessible(true)`。

### Q12：static 方法和实例方法分别怎么处理？

**答：**
- static 方法：直接使用 `method.invoke(null, args)`。
- 实例方法：先通过 `VMToolUtil.getObject(clazz)` 尝试从目标 JVM 堆里获取已有对象；如果没有找到，则调用无参构造器创建实例，再执行反射调用。

**代码依据：**
- Agent 字节码中先判断 `Modifier.isStatic(method.getModifiers())`。
- 非 static 分支调用 `VMToolUtil.getObject(clazz)`，为空则 `getDeclaredConstructor().newInstance()`。

### Q13：如果目标方法依赖 Spring Bean，如何拿到 Bean？

**当前代码能确认的答案：**  
仓库没有 Spring 专用逻辑源码。但 Agent 中存在 `VMToolUtil.getObject(Class)`，从命名和字节码调用位置看，它会尝试从目标 JVM 中获取某个 class 的已有对象，这可能覆盖 Spring 容器中已实例化 Bean 的场景。

**面试答题思路：**
- 当前版本优先尝试从 JVM 堆中找到目标类实例，适合 Spring Bean 已存在的场景。
- 更稳的设计是识别 Spring `ApplicationContext`，通过 `getBean(Class)` 或 beanName 获取代理对象。
- 如果目标方法依赖事务、AOP、缓存，应优先调用 Spring 代理 Bean，而不是直接 new 对象或反射目标类。

### Q14：方法重载怎么处理？

**答：**  
Agent 端根据方法名和参数类型数组匹配 `getDeclaredMethods()`。对泛型参数，会将 `ParameterizedType` 转成 raw type 再比较，因此 `List<User>` 和 `List<Order>` 在运行时都按 `List` 匹配。

**代码依据：**
- `InvokeMethodService.findMethod()` 遍历 declared methods，比较 methodName 和参数类型。
- 字节码中对 `ParameterizedType.getRawType()` 做了处理。

**风险：**
- 只查 `getDeclaredMethods()`，可能不覆盖父类继承方法。
- 泛型擦除后无法区分同 raw type 的泛型差异。
- 参数类型转换错误会导致找不到重载方法。

### Q15：如何选择 ClassLoader？

**答：**  
Agent 端先遍历 `Instrumentation.getAllLoadedClasses()`，找到 className 完全相等的类直接返回；找不到时再尝试线程上下文 ClassLoader、SystemClassLoader、Agent 自身 ClassLoader 和默认 `Class.forName()`。

**代码依据：**
- Agent `InvokeMethodService.loadClass()` 字节码体现了上述顺序。

**答题补充：**
多 ClassLoader 场景下，仅靠类名可能存在歧义。更完善的方案是结合目标对象实例、Spring Bean、ClassLoader id 或代码来源路径来定位。

### Q16：异常如何返回？

**答：**  
Agent 端捕获异常后构造 error Response 返回。`getInvokeResult()` 内部也捕获反射调用异常，并把异常 message 当作结果返回。

**代码依据：**
- Agent `InvokeMethodService.invoke()` 捕获 `Exception` 后调用 `Response.buildError()`。
- `getInvokeResult()` 捕获异常后返回 `e.getMessage()`。

**风险：**
当前返回信息可能缺少完整堆栈，不利于定位深层异常。可以优化为返回异常类型、message、完整 stack trace 和 cause 链。

## 5. 参数生成与类型转换

### Q17：为什么 JSON 参数结构设计成 `type + value`？

**答：**  
因为目标 JVM 需要知道每个参数的 Java 类型，才能做反序列化和重载方法匹配。只传 value 无法区分 `Long`、`Integer`、`String`、自定义对象等类型。

**代码依据：**
- `InvokeParam` 包含 `type` 和 `value`。
- 插件端调用前将 `type` 转成 JVM 规范命名。
- Agent 端使用 `JavaTypeConverter.convert(type)` 得到反射 Type，再把 value 转成 Java 对象。

### Q18：参数模板如何生成？

**答：**  
插件端通过 PSI 读取 `PsiMethod` 的参数列表，对基本类型、包装类型、String、日期、BigDecimal 等生成默认值；对数组、List、Set、Map 递归生成元素样例；对自定义对象递归读取字段生成 JSON 对象，并通过 visited set 避免循环引用。

**代码依据：**
- `InvokeParamGenerator.generateInvokeParam()`。
- `generateClassSample()` 对自定义类递归字段。
- `visitedClasses` 用于避免循环引用。

### Q19：泛型参数如何处理？

**答：**  
插件端生成样例时，`List<T>` 和 `Set<T>` 会读取第一个泛型参数生成数组样例，`Map<K,V>` 当前只对 value 类型生成样例，key 固定为 `"key"`。Agent 端匹配方法时会把 `ParameterizedType` 转为 raw type。

**代码依据：**
- `InvokeParamGenerator.handleJdkClass()`。
- Agent `findMethod()` 对 `ParameterizedType` 使用 raw type。

### Q20：接口、抽象类、框架对象怎么处理？

**当前代码：**
- 参数模板生成没有针对接口、抽象类、`HttpServletRequest`、`MultipartFile`、`Pageable` 等框架对象做专门处理。

**答题思路：**
- 第一阶段可返回 `$type` 占位，让用户手动填写。
- 第二阶段可做规则库：常见 Spring MVC、分页、Servlet、枚举、Optional 等类型提供专用生成器。
- 对接口/抽象类，可以允许用户指定具体实现类，或基于历史调用记录/LLM 推断。

## 6. 调用历史、脚本与 LLM

### Q21：调用历史保存在哪里？

**答：**  
调用历史是项目级配置，保存到 `fast-invoker-history.xml`；脚本模板是应用级配置，保存到 `fast-invoker-script.xml`；LLM 配置是应用级配置，保存到 `fast-invoker-llm.xml`。

**代码依据：**
- `InvokeHistoryConfig` 是 `Service.Level.PROJECT`。
- `InvokeScriptConfig` 是 `Service.Level.APP`。
- `LLMConfig` 是 `Service.Level.APP`。

### Q22：历史成功调用怎么判断？

**答：**  
根据 `doc/AI_PARAM_GENERATION_GUIDE.md`，成功标准是返回结果不包含 `Exception`、`Error`、`failed` 等关键词。具体实现应查看 `HistoryParamExtractor`。

**代码依据：**
- `SmartParamGenerator` 调用 `HistoryParamExtractor.findSuccessfulHistory()`。
- 使用历史记录构造 prompt，最多取 3 条历史参数。

### Q23：Groovy 前置脚本运行在哪里？

**答：**  
运行在目标 JVM 的 Agent 端，而不是 IDEA 插件端。Agent 在反射调用方法前创建 `GroovyShell` 并执行 `preScript`。

**代码依据：**
- Agent `InvokeMethodService.invoke()` 字节码中创建 `GroovyShell`，执行 `InvokeBody.getPreScript()`。
- `GroovyScriptHelper` 提供 `mock()` 和 `getObj(Class)` 能力。

### Q24：Groovy 脚本有什么安全风险？

**答：**  
风险很高。脚本运行在目标 JVM 中，可以修改对象字段、获取对象、执行任意 Groovy 代码。当前代码没有沙箱、权限控制、白名单或审计。

**优化思路：**
- 默认关闭脚本能力。
- 对脚本模板做团队审核。
- 限制可调用 helper API。
- 在 AI Agent 场景下禁止自动生成或自动执行高风险脚本。

### Q25：LLM 参数生成如何工作？

**答：**  
插件端根据当前 `PsiMethod` 获取类名、方法名、参数名称和参数类型；再查询历史成功调用记录；然后拼接 prompt 调用兼容 OpenAI Chat Completions 的接口，要求返回纯 JSON 数组，最后把结果填回参数编辑器。

**代码依据：**
- `SmartParamGenerator.generateSmartParams()`。
- `LLMHttpClient.generateParams()`。
- `SmartParamAction` 在后台任务中调用 LLM，成功后更新参数编辑器。

### Q26：LLM 返回非法 JSON 怎么处理？

**当前代码：**
- `LLMHttpClient` 会去掉 Markdown 代码块包裹，但没有对最终内容做 JSON 校验。

**答题思路：**
- 使用 `JSONValidator` 或 `JSON.parseArray()` 校验。
- 失败时自动重试一次，并把错误信息追加到 prompt。
- 保留规则生成参数作为降级。

### Q27：LLM 有敏感数据风险吗？

**答：**  
有。当前实现会把历史成功调用参数放进 prompt，如果里面有用户 ID、手机号、token、订单号等敏感信息，会发送给配置的 LLM 服务。

**当前代码：**
- 没有看到脱敏逻辑。

**优化思路：**
- prompt 前对敏感字段脱敏。
- 提供“只使用方法签名，不使用历史参数”的开关。
- 支持本地模型或企业内网模型。
- 给历史记录增加敏感字段标记。

## 7. MCP Server / Skill / AI Agent

### Q28：MCP Server 在项目里扮演什么角色？

**当前代码无法确认：**  
当前仓库没有 MCP Server 或 Skill 的源码实现。

**答题思路：**  
MCP Server 可以把 Fast Invoker 的能力封装成标准工具，例如：
- `list_jvm_processes`
- `attach_jvm`
- `generate_method_params`
- `invoke_method`
- `get_invoke_history`
- `run_real_chain_test`

AI Agent 通过这些工具，不只生成代码，还可以启动项目、Attach JVM、调用真实业务方法并判断结果。

### Q29：Skill 暴露哪些能力给 AI Agent？

**当前代码无法确认。**

**答题思路：**
Skill 更像“使用说明 + 流程约束”，告诉 Agent：
1. 如何定位被修改代码对应的方法。
2. 如何启动项目。
3. 如何选择 JVM。
4. 如何构造调用参数。
5. 如何调用 MCP 工具执行真实链路测试。
6. 如何基于返回值判断测试是否通过。

### Q30：AI 修改代码后的真实链路测试流程是什么？

**推荐回答：**
1. Agent 修改代码。
2. Agent 使用项目命令启动应用。
3. MCP Server 枚举 JVM 进程并选择目标进程。
4. MCP Server 调用 Fast Invoker Attach 能力。
5. Agent 根据变更方法、历史参数或 LLM 生成调用参数。
6. MCP 调用目标业务方法。
7. 根据返回值、异常、日志或断言规则判断链路是否通过。
8. 失败时把错误反馈给 Agent 继续修复。

**注意：**  
如果简历写这点，面试时要说明“当前仓库插件能力已具备，MCP/Skill 是对外赋能层；仓库里是否包含该层实现需要如实说明”。

### Q31：AI Agent 调用真实方法如何避免破坏环境？

**答题思路：**
- 限制只在本地或测试环境使用。
- 方法白名单/黑名单。
- 默认禁止 `delete`、`update`、`send`、`pay`、`publish` 等高风险方法。
- 支持 dry-run 或 mock 外部副作用。
- Groovy 前置脚本和真实调用都需要人工确认。
- 对调用参数、调用结果做审计。

## 8. 并发、稳定性与性能

### Q32：调用是否会阻塞 IDEA UI？

**答：**  
发送调用和 AI 参数生成都使用 `Task.Backgroundable` 放到后台线程执行，UI 更新通过 `ApplicationManager.invokeLater()` 回到 UI 线程。

**代码依据：**
- `SendInvokeAction`。
- `SmartParamAction`。
- `InvokeToolService.invoke()` 中更新 UI 使用 `invokeLater()`。

### Q33：HTTP 请求超时时间为什么是 10 分钟？

**答：**  
当前 `InvokeHttpClient` 设置 `600000ms`，可以覆盖一些较慢的本地业务调用。但这只是粗粒度超时，无法中断目标 JVM 中已经开始执行的方法。

**优化思路：**
- UI 可配置超时时间。
- Agent 端使用线程池和 Future timeout。
- 对无法中断的业务方法给出风险提示。

### Q34：Agent 端线程安全如何？

**当前代码能确认：**
- Agent HTTP Server 使用默认 executor，具体并发行为取决于 JDK `HttpServer` 默认实现。
- 每次请求创建新的 `InvokeMethodService`。
- `InvokeContent.clearContext()` 在 finally 逻辑中清理上下文。

**无法确认：**
- `InvokeContent` 内部是否使用 ThreadLocal，当前没有源码。
- `VMToolUtil.getObject()` 是否线程安全，当前没有源码。

**答题思路：**
需要确保请求上下文使用 ThreadLocal 或请求级对象，不共享可变状态；对历史记录和 UI 状态也要避免并发更新问题。

### Q35：Attach 状态如何判断真的可用？

**答：**  
当前 `AttachStatusManger.checkStatus()` 只检查 pid 是否还存在于 `VirtualMachine.list()` 中。它不能证明 Agent HTTP Server 仍可用。

**代码依据：**
- `AttachStatusManger.checkStatus()`。

**优化思路：**
- 增加 `/api/health`。
- 调用前探测端口。
- 失败时自动提示重新 attach。

### Q36：端口如何确定？有端口冲突风险吗？

**答：**  
插件侧 `getPort()` 使用 `1013 + (pid.hashCode() % 1000)`；Agent 端使用 `1013 + Math.abs(pid.hashCode() % 1000)`。这里存在一个实现不一致：插件侧没有 `Math.abs()`，理论上 pid hash 为负数时端口可能不一致或非法。

**代码依据：**
- `AttachStatusManger.getPort()`。
- Agent `AgentMain.startHttpServer()` 字节码。

**优化建议：**
插件侧也使用 `Math.abs(pid.hashCode() % 1000)`，或由 Agent 写入端口文件/返回 attach 参数，避免双方重复计算。

## 9. 安全性

### Q37：这个工具可以调用任意方法，如何控制安全风险？

**当前代码：**
- 没有看到鉴权、请求签名、token、白名单、黑名单、只读限制。
- Agent HTTP Server 绑定方式是 `new InetSocketAddress(port)`，没有显式限定 `127.0.0.1`。

**答题思路：**
- 仅面向本地开发环境。
- HTTP Server 绑定 localhost。
- Attach 时生成随机 token，插件请求必须带 token。
- 方法白名单/黑名单。
- 对高风险调用二次确认。
- 记录调用审计日志。
- AI Agent 场景默认只允许白名单方法。

### Q38：API Key 如何存储？

**答：**  
LLM API Key 当前使用 IntelliJ `PersistentStateComponent` 存在应用级配置文件 `fast-invoker-llm.xml`。

**代码依据：**
- `LLMConfig`。

**风险和优化：**
当前是普通持久化配置，不是专门的安全凭据存储。更好的方式是使用 IntelliJ PasswordSafe 或系统 Keychain。

## 10. 工程质量与测试

### Q39：有没有测试？

**当前代码：**
- `build.gradle.kts` 引入了 IntelliJ Platform test framework。
- 仓库当前没有看到 `src/test` 下的测试文件。

**答题思路：**
可以补三类测试：
- 参数模板生成单测。
- JSON 类型转换和请求体构造测试。
- 插件 UI/Action 集成测试。
- Agent 端用示例 Spring Boot 应用做端到端测试。

### Q40：哪些操作不能在 EDT 上执行？

**答：**  
Attach、HTTP 调用、LLM 请求、复杂 PSI 分析、历史大量查询都不应阻塞 EDT。当前发送调用和 LLM 生成已经放到后台任务；LineMarker 快速阶段只做轻量判断。

**代码依据：**
- `SendInvokeAction` 和 `SmartParamAction` 使用 `Task.Backgroundable`。
- `InvokeLineMarker.getLineMarkerInfo()` 只判断 element 类型并创建 marker。

### Q41：当前代码最值得重构的地方是什么？

**建议回答：**
- Attach 状态和端口计算需要更可靠，修复 `Math.abs` 不一致问题。
- Agent 通信需要鉴权和 health check。
- LLM 返回值需要 JSON 校验和降级策略。
- Agent 源码最好纳入同一仓库，便于维护和测试。
- 错误处理需要返回结构化异常，而不是只返回 message。
- 方法匹配需要支持继承方法、接口方法和 Spring 代理对象。

## 11. 边界场景

### Q42：事务、AOP、缓存注解是否生效？

**答题思路：**
- 如果调用的是 Spring 代理 Bean 的 public 方法，事务/AOP/缓存通常可以生效。
- 如果直接反射调用目标类 private 方法，绕过代理，事务/AOP/缓存不会生效。
- 当前 Agent 优先从堆中找对象，但无法从可见代码确认一定拿到 Spring 代理。

**面试重点：**
要主动说明“这个工具是调试工具，不等同于完整集成测试；涉及 AOP/事务的场景需要明确调用的是代理对象还是目标对象”。

### Q43：接口方法、抽象方法、父类方法支持吗？

**当前实现风险：**
- Agent 端 `findMethod()` 使用 `getDeclaredMethods()`，只查当前 class 声明的方法，不查父类 public/inherited methods。
- 抽象方法无法直接执行。
- 接口方法需要定位到实现类或 Spring Bean。

**优化思路：**
- 递归查父类和接口。
- 对接口方法结合 Spring ApplicationContext 找实现 Bean。
- UI 上允许用户选择实际实现类。

### Q44：异步返回值如何展示？

**当前代码：**
- 没有看到 `CompletableFuture`、`Mono`、`Flux` 的特殊处理。

**答题思路：**
- `CompletableFuture` 可选择等待完成并展示结果。
- Reactor 类型可配置 block 超时。
- 默认展示对象本身，避免无意触发异步链路。

## 12. 面试中最容易被追问的点

### 重点 1：实例方法到底怎么拿实例？

**推荐答法：**  
Agent 端对于 static 方法直接调用；对于实例方法，当前先尝试通过 `VMToolUtil.getObject(Class)` 从目标 JVM 中获取已有对象，如果获取不到，再使用无参构造创建对象。这能覆盖一部分已实例化对象场景，但对 Spring Bean、AOP 代理、事务上下文并不是最稳方案。后续应显式接入 Spring ApplicationContext，优先拿代理 Bean。

### 重点 2：方法重载怎么保证匹配准确？

**推荐答法：**  
请求中每个参数都带 `type`，Agent 将 type 转成反射 Type，再用方法名和参数类型数组匹配 declared method。泛型会转 raw type。这个方案能处理常见重载，但对继承方法、泛型擦除、多 ClassLoader 仍有边界，需要继续增强。

### 重点 3：安全风险如何控制？

**推荐答法：**  
当前版本定位本地开发调试，安全控制还比较弱。面向团队或 AI Agent 场景，需要增加 localhost 绑定、随机 token、方法白名单/黑名单、危险调用确认、审计日志和敏感参数脱敏。

### 重点 4：MCP/Skill 到底做到什么程度？

**推荐答法：**  
当前仓库能确认的是 Fast Invoker 插件和 Agent 运行时调用能力。MCP Server / Skill 是把这个能力开放给 AI Agent 的上层封装：让 Agent 能在改完代码后启动项目、Attach JVM、调用真实业务方法并读取结果。面试时应如实说明当前代码仓库是否包含 MCP/Skill 实现，避免把规划说成已完整落地。

### 重点 5：这个项目最大的技术价值是什么？

**推荐答法：**  
它把 IDEA 代码上下文、Java Attach、Agent、反射调用、参数生成、历史回放和 AI 辅助连接成一个闭环。核心不是单点技术，而是把“代码中的方法”变成“运行中 JVM 可验证的调用目标”，从而提升本地调试和 AI 代码验证效率。