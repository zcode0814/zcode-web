【leetcode刷题】56.环形链表——Java版

<font color=red>⭐欢迎订阅[《leetcode》](https://blog.csdn.net/skylibiao/category_10867560.html)专栏，每日一题，每天进步⭐</font>

>这时，一名刷题人念出了“就这就这”的口号
>
>——leetcode此题热评

## 前言

哈喽，大家好，我是一条。

<font color=orange>糊涂算法，难得糊涂</font>

[《糊涂算法》](https://blog.csdn.net/skylibiao/category_11292502.html?spm=1001.2014.3001.5482)专栏上线倒计时——7天

## Question

#### [643. 子数组最大平均数 I](https://leetcode-cn.com/problems/maximum-average-subarray-i/)

<font color=green>难度：简单</font>

>给定 n 个整数，找出平均数最大且长度为 k 的连续子数组，并输出该最大平均数。
>
> 
>
>示例：
>
>```
>输入：[1,12,-5,-6,50,3], k = 4
>输出：12.75
>解释：最大平均数 (12-5-6+50)/4 = 51/4 = 12.75
>```

## Solution

>还记得最大子序和吗？一样的题——滑动窗口

- 算出前k个，作为初始值
- 向后滑动
- 前面的一个减掉，后面的加上
- 和最大值比较


## Code

>所有`leetcode`代码已同步至[github](https://github.com/lbsys)
>
>欢迎`star`

```java
/**
 * @author 一条coding
 */
class Solution {
    public double findMaxAverage(int[] nums, int k) {
        int sum = 0;
        int n = nums.length;
        for (int i = 0; i < k; i++) {
            sum += nums[i];
        }
        int maxSum = sum;
        for (int i = k; i < n; i++) {
            sum = sum - nums[i - k] + nums[i];
            maxSum = Math.max(maxSum, sum);
        }
        return 1.0 * maxSum / k;
    }
}
```

## Result

> 复杂度分析
>
> - 时间复杂度：O(N) 

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20210904132855230.png)


## 🌈寻宝

>⭐今天是坚持刷题更文的第**48**/100天
>
>⭐各位的<font color=orange>点赞、关注、收藏、评论、订阅</font>就是一条创作的最大动力
>
>⭐更多算法题欢迎关注专栏[《leetcode》](https://blog.csdn.net/skylibiao/category_10867560.html)

为了回馈各位粉丝，礼尚往来，给大家准备了一些<font color=orange>算法教学视频和电子书</font>

<font color=red>需要的小伙伴可以[点这里](https://blog.csdn.net/skylibiao/article/details/119893172?spm=1001.2014.3001.5502)</font>

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/iShot2021-08-18 17.50.24.png)