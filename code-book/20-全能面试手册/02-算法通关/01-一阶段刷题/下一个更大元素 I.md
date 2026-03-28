【leetcode刷题】54.写一个更大元素1——Java版

<font color=red>⭐欢迎订阅[《leetcode》](https://blog.csdn.net/skylibiao/category_10867560.html)专栏，每日一题，每天进步⭐</font>

>算法不行，现在语文也不行了。我哭了，你们呢？
>
>——leetcode此题热评

## 前言

哈喽，大家好，我是一条。

<font color=orange>糊涂算法，难得糊涂</font>

[《糊涂算法》](https://blog.csdn.net/skylibiao/category_11292502.html?spm=1001.2014.3001.5482)专栏上线倒计时——7天

## Question

#### [496. 下一个更大元素 I](https://leetcode-cn.com/problems/next-greater-element-i/)

<font color=green>难度：简单</font>

>给你两个 没有重复元素 的数组 nums1 和 nums2 ，其中nums1 是 nums2 的子集。
>
>请你找出 nums1 中每个元素在 nums2 中的下一个比其大的值。
>
>nums1 中数字 x 的下一个更大元素是指 x 在 nums2 中对应位置的右边的第一个比 x 大的元素。如果不存在，对应位置输出 -1 。
>
> 
>
>示例 1:
>
>```
>输入: nums1 = [4,1,2], nums2 = [1,3,4,2].
>输出: [-1,3,-1]
>解释:
>    对于 num1 中的数字 4 ，你无法在第二个数组中找到下一个更大的数字，因此输出 -1 。
>    对于 num1 中的数字 1 ，第二个数组中数字1右边的下一个较大数字是 3 。
>    对于 num1 中的数字 2 ，第二个数组中没有下一个更大的数字，因此输出 -1 。
>```
>
>示例 2:
>
>```
>输入: nums1 = [2,4], nums2 = [1,2,3,4].
>输出: [3,-1]
>解释:
>    对于 num1 中的数字 2 ，第二个数组中的下一个较大数字是 3 。
>    对于 num1 中的数字 4 ，第二个数组中没有下一个更大的数字，因此输出 -1 。
>```
>
>
>
>
>提示：
>
>```
>1 <= nums1.length <= nums2.length <= 1000
>0 <= nums1[i], nums2[i] <= 104
>nums1和nums2中所有整数 互不相同
>nums1 中的所有整数同样出现在 nums2 中
>```
>
>

## Solution

>注意一句话`其中nums1 是 nums2 的子集。`，这样我们只需要处理好num2存入hashmap即可。
>
>如何处理nums2？
>
>单调栈

- 元素入栈
- 如果下一个大于栈顶，栈顶出栈
- 遍历nums1


## Code

>所有`leetcode`代码已同步至[github](https://github.com/lbsys)
>
>欢迎`star`

```java
/**
 * @author 一条coding
 */
import java.util.ArrayDeque;
import java.util.Arrays;
import java.util.Deque;
import java.util.HashMap;
import java.util.Map;
import java.util.Stack;

public class Solution {

    public int[] nextGreaterElement(int[] nums1, int[] nums2) {
        int len1 = nums1.length;
        int len2 = nums2.length;

        Deque<Integer> stack = new ArrayDeque<>();
        Map<Integer, Integer> map = new HashMap<>();
        // 先处理 nums2，把对应关系存入哈希表
        for (int i = 0; i < len2; i++) {
            while (!stack.isEmpty() && stack.peekLast() < nums2[i]) {
                map.put(stack.removeLast(), nums2[i]);
            }
            stack.addLast(nums2[i]);
        }

        // 遍历 nums1 得到结果集
        int[] res = new int[len1];
        for (int i = 0; i < len1; i++) {
            res[i] = map.getOrDefault(nums1[i], -1);
        }
        return res;
    }
}
```

## Result

> 复杂度分析
>
> - 时间复杂度：O(N+M) 

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20210902001638308.png)

## 🌈寻宝

>⭐今天是坚持刷题更文的第**45**/100天
>
>⭐各位的<font color=orange>点赞、关注、收藏、评论、订阅</font>就是一条创作的最大动力
>
>⭐更多算法题欢迎关注专栏[《leetcode》](https://blog.csdn.net/skylibiao/category_10867560.html)

为了回馈各位粉丝，礼尚往来，给大家准备了一些<font color=orange>算法教学视频和电子书</font>

<font color=red>需要的小伙伴可以[点这里](https://blog.csdn.net/skylibiao/article/details/119893172?spm=1001.2014.3001.5502)</font>

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/iShot2021-08-18 17.50.24.png)