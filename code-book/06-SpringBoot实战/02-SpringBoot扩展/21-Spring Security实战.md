## Qucik Start

**配置**

```xml
# pom.xml
<dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-security</artifactId>
            <version>2.3.1.RELEASE</version>
        </dependency>
```



```yaml
# yml
spring:
  application:
    name: cloud-alibaba-security
  security:
    user:
      name: admin
      password: admin
```

**效果图**

> 默认用户名为 user 密码在控制台打印，每次都不一样。

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220929174638573.png)

**白名单**

```java
@Configuration
public class SecurityConfig extends WebSecurityConfigurerAdapter {
    @Override
    protected void configure(HttpSecurity http) throws Exception {
        http.formLogin() // 表单登录
                .and()
                .authorizeRequests() // 认证配置
                .anyRequest() // 任何请求
                .authenticated(); // 都需要身份验证
    }
}
```

##  基本原理

SpringSecurity 本质是一个**过滤器链**。

重点看三个过滤器：

- FilterSecurityInterceptor：是一个方法级的权限过滤器, 基本位于过滤链的最底部。super.beforeInvocation(fi) 表示查看之前的 filter 是否通过。fi.getChain().doFilter(fi.getRequest(), fi.getResponse());表示真正的调用后台的服务
- ExceptionTranslationFilter：是个异常过滤器，用来处理在认证授权过程中抛出的异常
- UsernamePasswordAuthenticationFilter ：对/login 的 POST 请求做拦截，校验表单中用户
  名，密码。



## 认证（登录）管理

### 基于数据库的认证

> 上面的一个小案例是基于配置好的密码进行验证，但实际使用中，肯定是要基于数据库。
>
> 我们只需要实现`UserDetailsService`这个类，就可以自定义登录逻辑。

**注入密码解析器**

```java
@Configuration
public class SecurityConfig extends WebSecurityConfigurerAdapter {
    // 注入 PasswordEncoder 类到 spring 容器中
    @Bean
    public PasswordEncoder passwordEncoder(){
        return new BCryptPasswordEncoder();
    } 
}
```

BCryptPasswordEncoder 是 Spring Security 官方推荐的密码解析器，平时多使用这个解析器。是对 bcrypt 强散列方法的具体实现。是基于 Hash 算法实现的单向加密。可以通过 strength 控制加密强度，默认 10。

**用户表准备**

```sql
create table users
(
    id       bigint auto_increment
        primary key,
    username varchar(20)  not null,
    password varchar(100) null,
    constraint username
        unique (username)
);

INSERT INTO cloud_security.users (id, username, password) VALUES (1, 'admin', '$2a$10$8rg2pl01Yjy75Meoh3OTW.7v5RN/ALFLtdtXC2F/qdpSBZoe5v.I2');
INSERT INTO cloud_security.users (id, username, password) VALUES (2, 'yitiao', '$2a$10$fD8gpmQlCIHWuZXxcVQEw.MdN8wBn6/nTEsUHJ2n6dTvgok8jfm7m');
```

**生成持久层**

使用插件，略过

**认证逻辑**

> 这里不需要我们解密密码之后再做验证，只需要从数据库把加密后的密码查过来，spring-security 会帮我们做验证。

```java
@Service
@RequiredArgsConstructor
public class UsersServiceImpl implements UsersService{
    private final UsersMapper usersMapper;

    @Override
    public UserDetails loadUserByUsername(String name) throws UsernameNotFoundException {
        Users users = usersMapper.selectOne(Wrappers.lambdaQuery(Users.class).eq(Users::getUsername, name));
        Assert.isTrue(ObjectUtil.isNotNull(users), StrUtil.format("user [{}] is not exist"),name);
//        String encode = new BCryptPasswordEncoder().encode(users.getPassword());
        List<GrantedAuthority> auths = AuthorityUtils.commaSeparatedStringToAuthorityList("role");
        return new User(users.getUsername(),users.getPassword(),auths);
    }
}
```

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220930111359592.png)

> 疑问，登陆之后的有效时间如何配置？token 是如何生成的？
>
> 猜测是下面这个 cookie

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220930111747552.png)

### 自定义登录页

> 实际开发中，都需要自定义登录页，一是美化，而是提供其他功能，如注册。

**引入 pom**

thymeleaf 的作用主要是访问静态资源。

```xml
<dependency>
  <groupId>org.springframework.boot</groupId> 
  <artifactId>spring-boot-starter-thymeleaf</artifactId>
</dependency>
```

**登录页面**

src/main/resources/static/login.html

```html
<!DOCTYPE html>
<html  xmlns:th="http://www.thymeleaf.org">
<head lang="en">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8"/>
    <title>xx</title>
</head>
<body>

<h1>表单提交</h1>
<!-- 表单提交用户信息,注意字段的设置,直接是*{} -->
<form action="/user/login"  method="post">
    用户名：<input type="text" name="username" />
    密码：<input type="text" name="password" />
    <input type="submit" />
</form>
</body>
</html>
```

**security 配置**

```java
http.formLogin().loginPage("/login.html") // 自定义的登录页
                .loginProcessingUrl("/user/login") // 设置提交按钮对应的url，可以自定义，具体实现不需要自己写，security 最终都会演示案例中的 /login ,进而走我们自定义的认证逻辑。
                .successForwardUrl("/success") // 登录成功之后跳转到哪个 url ，此请求需要我们自己实现，且必须是 Post fang'f
                .failureForwardUrl("/fail").permitAll() // 失败的
                .and()
                .authorizeRequests() // 认证配置
                .antMatchers("/health/info","/user/login") //放行的请求
                .permitAll() // 指定 URL 无需保护。
                .anyRequest() // 其他请求
                .authenticated() //需要认证
                .and()
                .csrf().disable();
```

**测试**

```java
@RestController
public class LoginController {

    @GetMapping("index")
    public String index() {
        return "index";
    }
  
    // 必须是 post
    @PostMapping("/success")
    public String success() {
        return "success";
    }

    @PostMapping("/fail")
    public String fail() {
        return "fail";
    }
}
```



访问 `http://localhost:6201/index`，跳转到 `http://localhost:6201/login.html`。

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220930170444312.png)

输入用户名密码提交

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220930170528390.png)

登陆成功之后在访问 index

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220930170726584.png)

**相关源码**

`UsernamePasswordAuthenticationFilter.class`

### 退出登录

**定义登录后默认跳转页**

```html
# success.html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Title</title>
</head>
<body>
<h1>登录成功</h1>
<a href="/logout">退出</a>
</body>
</html>
```

```java
// 配置
http.formLogin()
                .loginPage("/login.html") // 表单登录
                .loginProcessingUrl("/user/login") // 设置哪个是登录的 url。
                // defaultSuccessUrl 和 successForwardUrl(发的是post 请求)
                .defaultSuccessUrl("/success.html") // 登录成功之后跳转到哪个 url
```



**配置退出登录**

```java
http.logout().logoutUrl("/logout")
                .logoutSuccessUrl("/user/logout") // 发送 get 请求
                .permitAll();

    @GetMapping("/user/logout")
    public String logout() {
        return "logout";
    }
```

**测试**

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20221001192505679.png)

点击退出

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20221001192537232.png)

### 记住我（自动登录）





![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20221001220404149.png)





![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20221001220451266.png)

## 授权（权限）管理

### 基于数据库的权限控制

> 用户的权限应通过角色控制，并存入数据库。

**新建角色权限表**

用户 admin 是管理员角色，拥有系统管理和用户管理权限，用户 yitiao 是普通用户，只有用户管理权限。

```sql
create table sys_role(
id bigint primary key auto_increment,
name varchar(20)
);

insert into sys_role values(1,'管理员');
insert into sys_role values(2,'普通用户');

create table sys_role_user(
uid bigint,
rid bigint
);
insert into sys_role_user values(1,1);
insert into sys_role_user values(2,2);

create table sys_menu(
id bigint primary key auto_increment,
name varchar(20),
url varchar(100),
parentid bigint,
permission varchar(20)
);
insert into sys_menu values(1,'系统管理','',0,'menu:system');
insert into sys_menu values(2,'用户管理','',0,'menu:user');
create table sys_role_menu(
mid bigint,
rid bigint
);

insert into sys_role_menu values(1,1);
insert into sys_role_menu values(2,1);
insert into sys_role_menu values(2,2);
```

**认证逻辑增加查询权限**

```java
@Service
@RequiredArgsConstructor
public class UsersServiceImpl implements UsersService {
    private final UsersMapper usersMapper;
    private final SysRoleUserMapper roleUserMapper;
    private final SysRoleMenuMapper roleMenuMapper;
    private final SysMenuMapper menuMapper;

    @Override
    public UserDetails loadUserByUsername(String name) throws UsernameNotFoundException {
        Users users = usersMapper.selectOne(Wrappers.lambdaQuery(Users.class).eq(Users::getUsername, name));
        Assert.isTrue(ObjectUtil.isNotNull(users), StrUtil.format("user [{}] is not exist"), name);
//        String encode = new BCryptPasswordEncoder().encode(users.getPassword());
        // 获取用户的权限
        List<GrantedAuthority> auths = new ArrayList<>();
        List<SysRoleUser> sysRoleUsers = roleUserMapper.selectList(Wrappers.lambdaQuery(SysRoleUser.class)
                .eq(SysRoleUser::getUid, users.getId())
        );
        sysRoleUsers.forEach(sysRoleUser -> {
            List<SysRoleMenu> sysRoleMenus = roleMenuMapper.selectList(Wrappers.lambdaQuery(SysRoleMenu.class)
                    .eq(SysRoleMenu::getRid, sysRoleUser.getRid())
            );
            sysRoleMenus.forEach(sysRoleMenu -> {
                List<SysMenu> sysMenus = menuMapper.selectList(Wrappers.lambdaQuery(SysMenu.class)
                        .eq(SysMenu::getId, sysRoleMenu.getMid())
                );
                sysMenus.forEach(sysMenu -> {
                    auths.add(new SimpleGrantedAuthority(sysMenu.getPermission()));
                });

            });
        });
        return new User(users.getUsername(), users.getPassword(), auths);
    }
}
```

**配置权限**

```java
http.formLogin()
                .loginPage("/login.html") // 表单登录
                .loginProcessingUrl("/user/login") // 设置哪个是登录的 url。
                .successForwardUrl("/success") // 登录成功之后跳转到哪个 url
                .failureForwardUrl("/fail").permitAll()
                .and()
                .authorizeRequests() // 认证配置
                .antMatchers("/health/info", "/user/login").permitAll() // 指定 URL 无需保护。
                .antMatchers("/menu/system").hasAuthority("menu:system")  // 为指定接口配置权限
                .antMatchers("/menu/user").hasAnyAuthority("menu:user", "menu:system") // 配置方式过于笨重
                .anyRequest().authenticated() // 其他请求需要认证
                .and()
                .csrf().disable();
```

**模拟接口**

```java
@RestController
@RequestMapping("/menu")
public class MenuController {

    @GetMapping("/system")
    public String system(){
        return  "system";
    }

    @GetMapping("/user")
    public String user(){
        return  "user";
    }

}
```



**测试效果**

首先访问`/index`，进入登录界面，用 yitiao 用户表登陆成功之后，访问`/menu/system`返回 403 ，访问`/menu/user`成功返回。

### 自定义 403 页面

现在还有个问题就是 403 页面可读性很差，是不应该直接展示给用户的，正常的操作应该是自定义一个无权限页面。

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Title</title>
</head>
<body>
<h1>没有权限</h1>
</body>
</html>
```

**添加自定义页面的配置**

```java
http.exceptionHandling().accessDeniedPage("/unauth.html");
```

**测试**

继续按上面的访问顺序，403 页面如下：

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20221001175857717.png)

### 使用注解

上面也说到，这种每个接口都在配置类里写一次的方式有些笨重，所以一般开发中的做法都是使用注解来配置权限。

**开启注解**

```java
@EnableGlobalMethodSecurity(prePostEnabled = true,securedEnabled = true) // 括号内可开启多个
```

**controller 添加注解**

```java
    @GetMapping("/user")
    @PreAuthorize("hasAuthority('menu:user')")   // 在方法执行前校验
    public String user(){
        return  "user";
    }

		/**
     *  @PostAuthorize()
     *  在方法之后做检验，一般用来对返回值的处理
     */
```

**重新测试**

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20221001185919547.png)

**其他注解**

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20221001190257867.png)

## CSRF

> 跨站请求伪造：在本网站获取到其他网站的token，从而劫持用户不自愿的发送一些请求。

