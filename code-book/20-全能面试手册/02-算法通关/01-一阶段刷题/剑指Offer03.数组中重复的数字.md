


>这道题在原书上绝对不是简单级别啊！
>它考察的是程序员的沟通能力，先问面试官要时间/空间需求！！！
>只是时间优先就用字典，
>还有空间要求，就用指针+原地排序数组，
>如果面试官要求空间O(1)并且不能修改原数组，还得写成二分法！！！
>
>——leetcode此题热评

## 前言

哈喽，大家好，我是一条。

<font color=orange>糊涂算法，难得糊涂</font>

今天做一道剑指offer的题。

## Question

#### [剑指 Offer 03. 数组中重复的数字](https://leetcode-cn.com/problems/shu-zu-zhong-zhong-fu-de-shu-zi-lcof/)

<font color=green>难度：简单</font>

>找出数组中重复的数字。
>
>
>在一个长度为 n 的数组 nums 里的所有数字都在 0～n-1 的范围内。数组中某些数字是重复的，但不知道有几个数字重复了，也不知道每个数字重复了几次。请找出数组中任意一个重复的数字。
>
>示例 1：
>
>```
>输入：
>[2, 3, 1, 0, 2, 5, 3]
>输出：2 或 3 
>```
>
>
>
>
>限制：
>
>2 <= n <= 100000
>
>

## Solution

>做了这么多题，这题应该算是比较简单了
>
>但是又不简单，就像评论说的，我们面试的时候，一定要问好时间和空间的要求

- 新建一个`hashset`
- 依次加入数组元素，加入失败，就将该数字返回，并终止循环。


## Code

>所有`leetcode`代码已同步至[github](https://github.com/lbsys/JavaExpert)
>
>欢迎`star`

```java
/**
 * @author yitiaoIT
 */
class Solution {
    public int findRepeatNumber(int[] nums) {
        Set<Integer> set = new HashSet<>();
        for(int n : nums) {
            if(!set.add(n)){
              return n;
            } 
        }
        return -1;
    }
}
```

## Result

> 复杂度分析
>
> - 时间复杂度：O(N)


![image-20210807192546221](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/4ca58c3fab95455486a83b4af9ac64ee~tplv-k3u1fbpfcp-zoom-1.image)
