哈喽，大家好，我是一条。

众多周知我是个后端程序员，但当初学习编程的时候我是学过前端的，奈何太久不用，都换还回去了。

现在工作呢，也用不上，只是隔壁的大佬们都是前后端都会，妥妥的全栈，这显得我就很low了，索性就搞一搞。

后端程序员的前端瞎搞之路，就开始了！

## 从新建项目开始

开始不着急，先建个项目看看啥样，前端的编辑器我也用过几款，像Hbuilder、VSCode、WebStrom。同事大佬都用的 VSCode ，但我实在是用不惯，我更喜欢 WebStrom。

但是！！！

我发现WebStrom过于傻瓜，可自定义配置的部分比较少，所以就选择先在命令行创建完，再导入WebStrom。

**安装Vue/Cli**

```
npm install -g @vue/cli
vue --version
```

其实我以前安装过的，所以这步就略过，之间创建工程。

```
vue create java-book
```

接下来就是关键部分，

**配置项目**

首先，选择手动创建，自定义配置，然后用空格键添加需要的组件或功能。

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220627152422579.png)

再选择vue的版本，这里用的是ts和Vue 3。

![image-20220627152457165](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220627152457165.png)

回车之后就开始创建工程了，完成如如下：

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220627152817878.png)

## 集成 ant-design-vue

人们数值的vue框架都是element ui，但我觉得太丑，问了一下前端同事，推荐antd，使用的方式和java差不多，先下载依赖，再导入。


```
sudo npm i --save ant-design-vue
```

在`main.ts`全局导入，

```tsx
import Antd from 'ant-design-vue';
import 'ant-design-vue/dist/antd.css';
```

然后就可以参考官网文档，引入各种组件了。

非常的简单。

官网：https://www.antdv.com/components/layout-cn#API

## 效果图

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220627184228252.png)

简单看一下效果图吧，这里已经接入后端的数据了，就是样式还没调整。

## 最后

前端其实搞起来还是很好玩的，下期介绍前后端联调。
