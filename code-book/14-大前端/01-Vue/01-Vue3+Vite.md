最近工作需要，开始写前端，其实自己也写过一点前端，当时也学过，但就是记不住，没开窍。

所以这回试试业务驱动的方式，边写边学，为了以后自己有什么想法的时候可以独立实现，光有后端是没有办法做一个产品的。

本文就是调研一下目前主流的前端技术框架，算是给自己总结一个学习大纲，同时也适用于想快速入门前端或者后端转前端的同学。

## 主流方案

首先 `Vue or React ？`从我工作过的公司来看，Vue 还是占大多数，毕竟是国内的框架，文档和社区都会好过  Facebook  的 React 。

而且大多数的公司都已经在使用 Vue3 ，支持很多特性和语法糖。

再就是  `JavaScript or Typescript ？`，这个其实各大公司还不是特别统一，但趋势都是往 Typescript 发展的，我对其是不熟悉的，也是边学边学。

再有就是打包工具，我以前都是用 Webpack 的，直到启动公司的前端项目，发现这启动速度比我自己的项目快了有10倍，简直太爽，问了一下前端同事是用 Vite 打包的，也是目前比较的主流方案，缺点就是对比较老的浏览器不支持，不过除了政府机关也没人用 IE 浏览器了吧。

最后是我自己发现的 CSS 的新技术 —— less，简单了解一下可以理解为 properties 和 yaml 的区别，深入的以后单聊。

```vue
<style lang="less" scoped>
  
<style/>
```

## 初体验

记得之前写过「前端瞎搞」系列的文章，那个项目让我改成了仿掘金的一个样式，目前就是苦于域名没备案，备案真的好麻烦。

放一个微信云托管的链接吧，有域名，但是可读性非常差。

[TownCoder](http://prod-2gdll4tce989da3f-1318566852.tcloudbaseapp.com/)

言归正传，本次的初体验就使用目前的流行框架 Vue + Vite + Typescript 实现，比以前更简单。

### 项目搭建

首先打开 Vite [官网](https://cn.vitejs.dev/guide/)，只需一个命令就可以创建新项目：

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20230609114215414.png)

```shell
npm create vite@latest
```

然后输入项目名，选择 Vue 再选择 Typescript 项目就创建完成了。

### 项目启动

用 VScode 或者 Webstorm 打开项目，我个人是习惯  Webstorm 的，和 Idea 一脉相承的快捷键和全新UI 设计，缺点是插件比较少，因为专业的前端开发是还用 VScode 比较多，本文还是用 Webstorm 演示。

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20230609133215616.png)

打开项目，我们只需要在命令行安装依赖，再启动就ok了，如果在第一步安装依赖提示有冲突，可以加上`--force`参数。

```shell
npm install
npm run dev
```

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20230609133658332.png)

我在项目上稍微做了点修改，删除了一些静态代码，同时将图标单独作为一个 Vue 文件，自己又新建了一个 `Tab.vue` 文件，可以在 `App.vue` 文件中随意修改使用哪个组件。

```vue
<script setup lang="ts">
import HelloWorld from './components/HelloWorld.vue'
import Tab from './components/Tab.vue'
import Logo from "./components/Logo.vue";
</script>

<template>
  <!--  <Logo/>-->
  <!--  <HelloWorld msg="Vite + Vue"/>-->
  <Tab/>
</template>
```

这样做的好处是方便整理我以后学习的案例，比如 `Tab.vue` 是用来测试标签页切换时的动态传参问题：

```vue
<template>
  <el-tabs v-model="activeName" class="demo-tabs" @tab-click="handleClick">
    <el-tab-pane label="User" name="first">User</el-tab-pane>
    <el-tab-pane label="Config" name="second">Config</el-tab-pane>
    <el-tab-pane label="Role" name="third">Role</el-tab-pane>
    <el-tab-pane label="Task" name="fourth">Task</el-tab-pane>
  </el-tabs>
</template>

<script lang="ts" setup>
import {ref} from 'vue'
import type {TabsPaneContext} from 'element-plus'

const activeName = ref('first')
const handleClick = (tab: TabsPaneContext, event: Event) => {
  // 打印切换后的标签页的名字
  console.log(tab.paneName, event)
  // 打印切换前的标签页的名字
  console.log(activeName.value)
}
</script>

<style>
.demo-tabs > .el-tabs__content {
  padding: 32px;
  color: #6b778c;
  font-size: 32px;
  font-weight: 600;
}
</style>
```

## 后续知识点

> 因为我目前需要的是最快的时间能干活，所以我不会系统的学习每一个知识点，而是选取使用最多，最新的技术去学习。
>
> 总结如下，不断完善。

- setup 语法糖
- 







https://blog.csdn.net/qq_40639028/article/details/127842699