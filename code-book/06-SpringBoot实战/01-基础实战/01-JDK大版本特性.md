> 简单整理一下JDK9-JDK17在开发中可能常用到的一些新功能：https://juejin.cn/post/7254353613743882296

## JDK 8

### Optional 的妙用

#### ofNullable()、orElse()、orElseThrow()

```java
public static <T> Optional<T> ofNullable(T value) {    
    return value == null ? empty() : of(value);    
}
```

```java
CbimUser.builder()
.sex(Optional.ofNullable(user.getSex()).orElse(0))
  
.sex(user.getSex()==null?0:user.getSex())
.build()
```

```java
    public CodeNote getNoteById(String id) {
        return Optional.ofNullable(noteMapper.selectById(id))
                .orElseThrow(() -> new CustomException("数据不存在"));
    }
```

```java
User user = null;
user = Optional.ofNullable(user).orElseGet(() -> createUser());
user = Optional.ofNullable(user).orElse(createUser());

public static User createUser(){
        System.out.println("createUser...");
        User user = new User();
        user.setName("hangman");
        return user;
}

// createUser...
// createUser...
```

当`user`值不为`null`时，`orElse`函数依然会执行`createUser()`方法，而`orElseGet`函数并不会执行`createUser()`方法。

#### map()、flatMap()

```java
String city = Optional.ofNullable(user).map(u-> u.getName()).get();
// java.util.NoSuchElementException: No value present
Optional.ofNullable(user)    
                   .map(u-> u.getAddress())    
                   .map(a->a.getCity())    
                   .orElseThrow(()->new Exception("取指错误"));    
// java.lang.Exception: 取指错误
```

#### ifPresent()

```java
Optional.ofNullable(user)    
    .ifPresent(u->{    
        dosomething(u);    
});   
```

#### filter()

`filter`方法接受一个 `Predicate` 来对 `Optional` 中包含的值进行过滤。

如果包含的值满足条件，那么还是返回这个 `Optional`。

否则返回 `Optional.empty`。

```java
public User getUser(User user) {    
    return Optional.ofNullable(user)    
                   .filter(u->"zhangsan".equals(u.getName()))    
                   .orElseGet(()-> {    
                        User user1 = new User();    
                        user1.setName("zhangsan");    
                        return user1;    
                   });    
}    
```

## Stream 的快速处理

### allMatch()

```java
public static void main(String[] args) {
     String info = "liaoning,fuxin,zidu,extra";

     System.out.println(Arrays.stream(info.split(","))
             .limit(3)
             .allMatch(Main::matchCode));  	// 短路与
 }

public static boolean matchCode(String code){
    System.out.println("code:"+code);
    return code.equals("liaoning");;
}

// 输出
// code:liaoning
// code:fuxin
// false
```



## JDK 9



## JDK 21

> 尚硅谷 https://www.bilibili.com/video/BV1Xg4y197DB

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20231031153128310.png)

### 核心特性

**虚拟线程**是 java 和其他语言拉齐的一大利器，其根本思想就是把线程从 jvm 层面再划分，虚拟线程作为最小的调度单位，即不必开辟操作系统层面的新线程，即可异步执行任务。

```java
import java.util.concurrent.Executors;
import java.util.concurrent.ThreadPoolExecutor;

public class VirtualThreadsExample {
    public static void main(String[] args) {
        ThreadPoolExecutor executor = (ThreadPoolExecutor) Executors.newVirtualThreadExecutor();
        
        for (int i = 0; i < 10; i++) {
            int taskId = i;
            executor.execute(() -> {
                System.out.println("Task " + taskId + " is running on virtual thread: " + Thread.currentThread().getName());
            });
        }
        
        executor.shutdown();
    }
}
```

### 其他特性

- 对集合增加一个获取收尾元素，添加首尾元素，翻转集合的接口。
- 不再支持 32 位的操作系统，因为主流已经是 64 位。
- 准备禁止动态代理，出于安全考虑。
- 稳定的 ZGC，对大内存更友好。
- `switch`语法增强。
- 增加一个 `Record` 数据类型。
- 增加非对称加密 API 。
