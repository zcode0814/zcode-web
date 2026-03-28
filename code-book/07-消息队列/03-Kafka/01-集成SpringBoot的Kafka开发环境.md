SpringBoot集成Kafka——上手如此简单。

哈喽，大家好，我是一条。

今天下午整理本打算整理一下服务器资源，给每个服务器上安装的中间件打个标签，方便查找。

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220622151403232.png)

发现之前搭建kafka的服务到期没续费，被回收了。缺一套kafka的环境，闲来无事，搭一个吧，顺便踩踩坑。

话不多说，开干。

## 安装kafka

官网：https://kafka.apache.org/downloads

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220622151706520.png)

目前最新是3.2版本，也是稳定版，scala的版本可选2.12和2.13。推荐2.13，不太重要。

下载，搞到服务器上。如下：

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220622151901235.png)

解压，改名，同时建一个数据存放文件夹。

简单修改一下配置，不搞那么复杂。

```shell
vi config/server.properties
```

主要修改数据存放目录，listener地址。

```properties
 ## 内网地址
listeners=PLAINTEXT://13:9092 
## 公网地址
advertised.listeners=PLAINTEXT://3.13:9092 
## 上面算是个坑，不过在本地安装就不需要管了，默认就行。
log.dirs=/data/opt/kafka/logs
```

接下来启动就好了，这台服务器已经装好了zk，就不用kafka自带的了，如果没有，需要先启动zk。

```shell
bin/zookeeper-server-start.sh config/zookeeper.properties
```

再启动kafka

```shell
bin/kafka-server-start.sh config/server.properties
nohup bin/kafka-server-start.sh config/server.properties & ## 后台
```

jps 看一下是否启动成功

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220622152709218.png)

## 创建topic

建个topic玩一下，

```
bin/kafka-topics.sh --create --topic quickstart-events --bootstrap-server 127.0.0.1:9092
## 注意最后的IP地址，要和listener配置的一样。
```

打开生产者，我们可以在这发消息，然后再消费者查看是否能收到。

```
bin/kafka-console-producer.sh --topic quickstart-events --bootstrap-server 127.0.0.1:9092
```

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220622152932498.png)

打开消费者，新开一个终端。

```
bin/kafka-console-consumer.sh --topic quickstart-events --from-beginning --bootstrap-server 192.168.31.96:9092
```

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220622153134975.png)

ok，收到消息了，么得问题。

## SpringBoot集成

随便找个以前的工程，加入pom。偷个懒。

```xml
<dependency>
            <groupId>org.springframework.kafka</groupId>
            <artifactId>spring-kafka</artifactId>
            <version>2.5.0.RELEASE</version>
        </dependency>
```

配置kafka server地址：

```yml
spring:
    kafka:
    bootstrap-servers: 101.43.138.173:9092
    producer:
      key-serializer: org.apache.kafka.common.serialization.StringSerializer
      value-serializer: org.apache.kafka.common.serialization.StringSerializer
    listener:
      ack-mode: manual_immediate
      missing-topics-fatal: false
```

搞个controller测试一下

```java

import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;
import org.springframework.util.concurrent.ListenableFuture;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.concurrent.ExecutionException;

@RestController
@RequestMapping("/kafka")
@Slf4j
public class KafkaController {

    private final KafkaTemplate<String,String> kafkaTemplate;

    public KafkaController(KafkaTemplate<String,String> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }


    @GetMapping("/send")
    public void send(@RequestParam(defaultValue = "hi")String msg) throws ExecutionException, InterruptedException {
        ListenableFuture<SendResult<String, String>> listenableFuture = kafkaTemplate.send("quickstart-events", msg);
        String res = listenableFuture.get().toString();
        log.info("producer send result:[{}]",res);
    }

}

```

测试一下

```
producer send result:[SendResult [producerRecord=ProducerRecord(topic=quickstart-events, partition=null, headers=RecordHeaders(headers = [RecordHeader(key = b3, value = [97, 57, 51, 56, 50, 99, 54, 102, 102, 101, 48, 54, 99, 100, 55, 57, 45, 57, 52, 52, 57, 100, 51, 100, 48, 99, 49, 49, 49, 56, 51, 54, 49, 45, 49])], isReadOnly = true), key=null, value=hi, timestamp=null), recordMetadata=quickstart-events-0@6]]

```

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220622153612796.png)

看看消费者终端也收到了，么得问题，搞定。

## 最后

工作时间：1小时

产出：一篇文章

获赞：？

做核酸去了，下期见。