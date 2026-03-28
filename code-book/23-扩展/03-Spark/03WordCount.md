大家好，我是一条~

5小时推开Spark的大门，第三小时，带大家做一个大数据入门的经典案例——WordCount。

话不多说，开干！

## 题目描述

WordCount，顾名思义，统计文件中不同单词出现的次数，一般在日志分析中经常会用到。

一条在学习Hadoop时做的一个项目是分析金庸小说中的人物关系，那要做的第一步就是统计各个人物出现的次数。

## 案例分析

>如果让你用Java来实现这个需求，相信大家都会有思路。

- 分词：把长句子分成单词，如果是规范的文本，可以用空格分割，不规范的文本，可以用`jieba`分词，感兴趣的同学可以百度了解一下。
-  分组计数：相同的单词一组，计算出现的次数，并用一个map的保存。
- 保存结果：将结果写入文件。

## 案例实现

### 1.本地实现

打开上一节建的`WordCount.scala`文件，编辑如下代码，每行都有注释，对Scala不熟悉的同学先不要纠结语法问题，我们的重点是Spark。

```scala
WordCount {
  def main(args: Array[String]): Unit = {
    // 创建 Spark 运行配置对象
    val sparkConf = new SparkConf().setMaster("local[*]").setAppName("WordCount")
    // 创建 Spark 上下文环境对象（连接对象）
    val sc  = new SparkContext(sparkConf)
    // 读取文件，返回一个RDD
    var input=sc.textFile("src/main/java/test.txt");
    // 分词
    var lines=input.flatMap(line=>line.split(" "))
    // 分组计数
    var count=lines.map(word=>(word,1)).reduceByKey{(x,y)=>x+y}
    // 写入文件
    count.saveAsTextFile("src/main/java/output");
    //关闭 Spark 连接
    sc.stop()
  }
}
```

注意文件存放的路径，保证能读取到文件。

输出结果

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220123210037578.png)

### 2.提交到服务器

打包成jar包，上传到服务器，记得修改成服务上的文件路径。

```shell
#启动master
./sbin/start-master.sh
#启动worker 
./bin/spark-class org.apache.spark.deploy.worker.Worker spark://VM-24-10-centos:7077
#提交作业
./bin/spark-submit  --master spark://VM-24-10-centos:7077 --class WordCount /data/opt/spark/file/spark-wordcount-1.0-SNAPSHOT.jar
```

输出结果


![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220123212451758.png)

## 最后

ok，一个经典的入门案例我们已经完成了，是不是觉得Spark也没那么难。

但是，不知道同学们有没有如下疑问：

- Spark内部是如何组合计数的？
- Worker和Master是什么关系?
- RDD是什么东西？

如果有，请坚持打卡，明后两天将会解答大家的疑惑，填坑——Spark核心编程。