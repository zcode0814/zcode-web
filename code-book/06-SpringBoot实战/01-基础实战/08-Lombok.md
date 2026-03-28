## Generating equals/hashCode implementation but without a call to superclass

当我们给一个继承了父类的子类上使用@Data @ToString @EqualsAndHashCode 注解时，IDE 会警告

    Generating equals/hashCode implementation but without a call to superclass

意思是，该注解在实现 ToString EqualsAndHashCode 方法时，不会考虑父类的属性，通过反编译的源码也是可以看到他是没有对父类的字段进行比较的。

**方式一**

直接在子类上声明 `@EqualsAndHashCode(callSuper = true)`

**方式二**

新建`lombok.config`


```java
# 相当于在该目录下的每个实体类上添加 @EqualsAndHashCode(callSuper = true)
# 使其在实现 ToString EqualsAndHashCode 方法时，带上父类的属性
config.stopBubbling=true
lombok.equalsAndHashCode.callSuper=call
```

## 自己实现 Lombok

https://cloud.tencent.com/developer/article/2333366