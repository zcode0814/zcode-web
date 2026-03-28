位于`netty-common`模块`io.netty.util.concurrent`包下。



```
{@ link ThreadLocal} 的一种特殊变体，当从 {@ link FastThreadLocalThread} 访问时，会产生更高的访问性能。在内部，{@ link FastThreadLocal} 使用数组中的常量索引，而不是使用哈希代码和哈希表来查找变量。尽管看起来非常微妙，但与使用哈希表相比，它会产生轻微的性能优势，并且在频繁访问时非常有用。

要利用此线程本地变量，您的线程必须是 {@ link FastThreadLocalThread} 或其子类型。默认情况下，由于这个原因，{@ link DefaultThreadFactory} 创建的所有线程都是 {@ link FastThreadLocalThread}。

请注意，快速路径仅在扩展 {@ link FastThreadLocalThread} 的线程上才可能，因为它需要一个特殊的字段来存储必要的状态。任何其他类型的线程的访问都可以追溯到常规的 {@ link ThreadLocal}。
```
