![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/ff4597fe160a2408d1f29b066d44c2dc.png)





## 后置处理器

本文主要介绍各种后置处理器（xxxPostProcessor）,围绕bean的生命周期来看后置处理器去的执行顺序即功能。

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220704153506982.png)

整个流程的入口位于`refersh()`方法，承接前面的内容，我们已经准备好了`BeanFactory`，并放入了经过`ResourceLoad`加载解析过的`BeanDefinition`。

所以第一步就是要增强我们的`BeanFactory`，即`invokeBeanFactoryPsotProcessors`。

## 总体流程图

<img src="https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/Bean%E7%94%9F%E5%91%BD%E5%91%A8%E6%9C%9F%E6%B5%81%E7%A8%8B.jpg"  />

## invokeBeanFactoryPsotProcessors