# CSS动画

## 教程

https://github.com/chokcoco/iCSS/issues/141



## 案例：灵动岛

https://juejin.cn/post/7146170515407765541

## 案例：打字机动画

https://www.cnblogs.com/luckest/p/16977657.html













# CSS布局

## 弹性布局

对于所有行级元素，正常的布局方式为按照文档流从上至下布局，如果希望两个容器在同一行，就需要将行级元素设置为块级元素。

```css
display: block;
display: inline-block;
```

但是以上的方法会出现一些无法预料的问题，所以推荐使用**弹性布局**

```css
display: flex;
```

它可以用于以下四个方面：

- 在不同方向排列元素
- 重新排列元素的显示顺序
- 更改元素的对齐方式
- 动态地将元素装入容器

### 布局属性

1. justify-content 属性定义了项目在水平方向上的对齐方式。
   ```css
   .box {
     justify-content: flex-start | flex-end | center | space-between | space-around;
   }
   ```

   ![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/20230721095446.png)

2. align-items 属性定义项目在垂直方向上如何对齐。
   ```css
   .box {
     align-items: flex-start | flex-end | center | baseline | stretch;
   }
   ```

   ![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/20230721095608.png)

















# CSS样式

## 文本超出省略号

```css
text-overflow：clip | ellipsis
```

默认值：clip

适用于：所有元素

clip： 当对象内文本溢出时不显示省略标记（...），而是将溢出的部分裁切掉。
ellipsis： 当对象内文本溢出时显示省略标记（...）。

在使用的时候，有时候发现不会出现省略标记效果，经过测试发现，使用ellipsis的时候，必须配合`overflow:hidden; white-space:nowrap; width:50%;`这三个样式共同使用才会有效果，示例代码：

```html
<style type="text/css">
    .test{text-overflow:ellipsis;overflow:hidden;white-space:nowrap;width:150px;}
</style>

<div class="test">关于**产品的推广关于**产品的推广关于**产品的推广</div>
```

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/20230724101448.png)

