【算法练习】78.URL化——字符串

<font color=red>⭐[加入组队刷题](https://docs.qq.com/mind/DZUtHWVlsalNRU1dp)，每日一题，每天进步⭐</font>

>用例"ds sdfs afs sdfa dfssf asdf " 27 我吐了，居然偷偷加了三个空格在末尾
>
>——leetcode此题热评

## 前言

哈喽，大家好，我是一条。

**糊涂算法，难得糊涂**

<font color=orange><b>点击跳转到[《糊涂算法》](https://blog.csdn.net/skylibiao/category_11292502.html?spm=1001.2014.3001.5482)专栏学习java大厂面试必备数据结构和算法知识！</b></font>

## Question

#### [面试题 01.03. URL化](https://leetcode-cn.com/problems/string-to-url-lcci/)

<font color=green>难度：简单</font>

>URL化。编写一种方法，将字符串中的空格全部替换为%20。假定该字符串尾部有足够的空间存放新增字符，并且知道字符串的“真实”长度。（注：用Java实现的话，请使用字符数组实现，以便直接在数组上操作。）
>
> 
>
>示例 1：
>
>```
>输入："Mr John Smith    ", 13
>输出："Mr%20John%20Smith"
>```
>
>示例 2：
>
>```
>输入："               ", 5
>输出："%20%20%20%20%20"
>```
>
>
>
>
>提示：
>
>字符串长度在 [0, 500000] 范围内。
>

## Solution

>巧用StringBuilder。
>
>此题更完美的方法是**从后向前**遍历。


## Code

>所有`leetcode`代码已同步至[github](https://github.com/lbsys)
>
>欢迎`star`

```java
/**
 * @author 一条coding
 */
class Solution {
    public String replaceSpaces(String S, int length) {
        StringBuilder builder = new StringBuilder();
        char[] chars = S.toCharArray();
        for (int i = 0; i < length; i++) {
            if (chars[i]==' '){
                chars[i]='%';
            }
            builder.append(chars[i]);
        }
        String s = builder.toString();
        return s.replace("%","%20");
    }
}
```

## Result

> 复杂度分析
>
> - 时间复杂度：O(N) 

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20211004144822412.png)


## 粉丝福利

>⭐今天是坚持刷题更文的第**78**/100天
>
>⭐各位的<font color=orange>点赞、关注、收藏、评论、订阅</font>就是一条创作的最大动力
>
>⭐更多数据结构和算法讲解欢迎关注专栏[《糊涂算法》](https://blog.csdn.net/skylibiao/category_11292502.html?spm=1001.2014.3001.5482)

为了回馈各位粉丝，礼尚往来，给大家准备了一些<font color=orange><b>学习资料</b></font>

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/iShot2021-08-18 17.50.24.png)

<center>👇 点击下方卡片<b>关注</b>后回复<b>算法</b> 领取👇</center>

