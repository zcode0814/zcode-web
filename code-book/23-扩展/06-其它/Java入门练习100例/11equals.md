【Java入门练习100例】11.==和equals()——值和地址

> **点赞**再看，养成习惯。微信搜索【**一条coding**】关注这个在互联网摸爬滚打的程序员。
>
> 本文收录于[github-技术专家修炼](https://github.com/lbsys/JavaExpert)，里面有我的**学习路线、系列文章、面试题库、自学资料、电子书**等。

## 题目描述

<font color=green>难度：简单</font>

>写出下面代码的输出结果：
>
>
>
>```java
>public static void main(String[] args) {
>        String s1,s2;
>        s1=new String("we are students");
>        s2=new String("we are students");
>        System.out.println(s1.equals(s2));
>        System.out.println(s1==s2);
>        String s3,s4;
>        s3="how are you";
>        s4="how are you";
>        System.out.println(s3.equals(s4));
>        System.out.println(s3==s4);
>    }
>```
>
>
>
>

## 知识点

- String
- equals()
- ==

## 解题思路

**1.equals()和==**

首先需要明确`equals()`比较的是值，也就是和我们肉眼看见的没区别，1和1就是`true`。

`==`比较的是地址，好比两件衣服虽然看着一样，但产地不一样。依然是`false`。

**2.String**

再就是`String`的创建过程，对于`new String()` 这种毫无疑问，肯定是创建一个新对象。

但是对于直接赋值`s3="how are you";`,如果已经有一个和他值相等的对像，就不再`new`新的，而是直接指向这个对象的地址。

## 代码实现

**输出结果**

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20211020121001066.png)

## 扩展总结

由于`String`被`final`修饰，值无法修改，所以我们每次修改值都是重新`new`了一个对象，为了避免产生过多垃圾，对于需要经常修改的字符串建议使用`StringBuilder`或`StringBuffer`。

