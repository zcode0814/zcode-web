![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20240327085623526.png)





Code Screenshots
● CamelCase
● GenAllSetter
● Git Commit Template
● 



## leetcode插件配置

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20230131144221719.png)

filename：`[$!{question.frontendQuestionId}]${question.title}`
template：

```java
package com.yitiao.data_algorithms.leetcode.editor.cn;
import com.yitiao.data_algorithms.leetcode.editor.cn.base.ListNode;
import com.yitiao.data_algorithms.leetcode.editor.cn.base.TreeNode;

class $!velocityTool.camelCaseName(${question.titleSlug}){
    // $!velocityTool.date()
    public static void main(String[] args) {
        Solution solution = new $!velocityTool.camelCaseName(${question.titleSlug})().new Solution();
    }
${question.code}
}
```



## 代码美化

[9款在线程序员写作文档代码截图美化工具](https://www.shimaisui.com/1772.html)

插件：CodeSnap

