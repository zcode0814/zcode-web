![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/20230907150916.png)

注意看第三步，mq的异常并不代表消息发送失败，也可能是网络抖动，如果此时回滚，就会造成数据不一致。下面就看一下真正的分布式事务应该怎么做？

 


## 基于 RocketMQ 实现分布式事务

[实战案例](https://mp.weixin.qq.com/s?__biz=MjM5NTY1MjY0MQ==&mid=2650860292&idx=3&sn=21be1aef473c4ceb1f2b00116fd4f671&chksm=bd017e4a8a76f75c89aea1b820f6e76071406c9e3cdd7c61cad99c92d6a59baff1daaf751d38&scene=27)

```Java
@Override
public void delete(String orderNo) {
 Order order = orderMapper.selectByNo(orderNo);
 //如果订单存在且状态为有效，进行业务处理
 if (order != null && CloudConstant.VALID_STATUS.equals(order.getStatus())) {
  String transactionId = UUID.randomUUID().toString();
  //如果可以删除订单则发送消息给rocketmq，让用户中心消费消息

  rocketMQTemplate.sendMessageInTransaction("add-amount",
    MessageBuilder.withPayload(
      UserAddMoneyDTO.builder()
        .userCode(order.getAccountCode())
        .amount(order.getAmount())
        .build()
    )
    .setHeader(RocketMQHeaders.TRANSACTION_ID, transactionId)
    .setHeader("order_id",order.getId())
    .build()
    ,order
  );

 }
}
```
