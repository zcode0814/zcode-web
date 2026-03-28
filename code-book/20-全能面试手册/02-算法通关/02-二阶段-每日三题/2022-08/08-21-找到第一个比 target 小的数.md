## 每日三刷，剑指千题

> 计划简介：
>
> - 每日三题，以中等题为主，简单题为辅进行搭配。保证质量题1道，数量题3道。
> - 每日早通勤在LeetCode手机端选题，思考思路，没答案的直接看题解。
> - 每日中午进行编码，时间控制在一小时之内。
> - 下班前半小时进行整理总结，并发布到掘金每日更文活动。
>
> 说明：
>
> - 基于以前的刷题基础，本次计划以中等题为主，大部分中等题都可以拆分为多个简单题，所以数量保证3，质量保证一道中等题即可。
> - 刷题顺序按照先刷链表、二叉树、栈、堆、队列等基本数据结构，再刷递归、二分法、排序、双指针等基础算法，最后是动态规划、贪心、回溯、搜索等复杂算法。
> - 刷题过程中整理相似题型，刷题模板。
> - 目前进度 **156/1000** 。



## [287]寻找重复数

给定一个包含 `n + 1` 个整数的数组 `nums` ，其数字都在 `[1, n]` 范围内（包括 `1` 和 `n`），可知至少存在一个重复的整数。

假设 `nums` 只有 **一个重复的整数** ，返回 **这个重复的数** 。

你设计的解决方案必须 **不修改** 数组 `nums` 且只用常量级 `O(1)` 的额外空间。



**示例 1：**

```
输入：nums = [1,3,4,2,2]
输出：2
```



**解析**

快慢指针，同环形链表。

**Code**

```java
class Solution {
        public int findDuplicate(int[] nums) {
            // 方法实在太多 哈希表、双指针、二分查找
            // 要求，不改数组且不用额外空间
            // 用快慢指针写一版吧,类似环形链表，那如何走两步呢
            int slow = 0, fast = 0;
            while (true) {
                fast = nums[nums[fast]];
                slow = nums[slow];
                if (fast == slow) {
                    break;
                }
            }
            int ans = 0;
            while (true) {
                ans = nums[ans];
                slow = nums[slow];
                if (ans == slow) {
                    break;
                }
            }
            return ans;

        }
    }
```

## [34]在排序数组中查找元素的第一个和最后一个位置

给你一个按照非递减顺序排列的整数数组 `nums`，和一个目标值 `target`。请你找出给定目标值在数组中的开始位置和结束位置。

如果数组中不存在目标值 `target`，返回 `[-1, -1]`。

你必须设计并实现时间复杂度为 `O(log n)` 的算法解决此问题。



**示例 1：**

```
输入：nums = [5,7,7,8,8,10], target = 8
输出：[3,4]
```



**解析**

二分查找变形之**找到第一个比 target 小的数。**

**Code**

```java
class Solution {
    public int[] searchRange(int[] nums, int target) {
        // 先找到第一个等于8的位置，再找到第一个大于8的位置，再相减
        int left = 0, right = nums.length - 1;
        while (left <= right) {
            int mid = (left + right) / 2;
            if (nums[mid] >= target) {
                right = mid - 1;
            } else {
                left = mid + 1;
            }
        }
        int l = right;
        left = 0;
        right = nums.length - 1;
        while (left <= right) {
            int mid = (left + right) / 2;
            if (nums[mid] > target) {
                right = mid - 1;
            } else {
                left = mid + 1;
            }
        }
        if ((left-l-1)==0){
            return new int[]{-1,-1};
        }else {
            return new int[]{l+1,left-1};
        }
    }
}
```

## 



**解析**



**Code**

```java

```

