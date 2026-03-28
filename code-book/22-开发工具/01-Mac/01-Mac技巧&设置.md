## 端口占用

### mac

```shell
lsof -i |grep port
```

### Linux

```shell
netstat -nltp | grep port
```

## Homebrew安装

https://blog.csdn.net/m0_46197393/article/details/106752367



## 使用tree命令生成目录结构

### 原生命令

Mac 系统下默认是不带这条命令的，执行下面这条命令也可以打印出树状结构。

```shell
find . -print | sed -e 's;[^/]*/;|____;g;s;____|; |;g'
# 不想每次都输入这么长一条命令怎么办？用 alias 给这条命令指定一条别名，方法步骤如下：

# Step 1 ：创建 .bash_profile 文件
cd ~
touch .bash_profile
open .bash_profile

# Step 2：把下面的命令保存在这个文件中
alias tree="find . -print | sed -e 's;[^/]*/;|____;g;s;____|; |;g'"

#Step 3：执行下面命令
source .bash_profile
```

### tree

```shell
brew install tree
```

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20221109093041677.png)

```shell
brew cleanup   # 清理旧版本安装程序
```

**使用方法**

```shell
tree                         #打印所有目录层级
tree -L 2                    #遍历2层
tree > README.md             #输出结果到 Markdown 文档 
```

### 效果

```
.
├── config-data
│   └── DEFAULT_GROUP
│       └── application-dev.yml
└── tenant-config-data
    └── 9862bd7f-2dc2-47a4-9c80-c6290c5c3e2b
        ├── DEFAULT_GROUP
        │   └── seataServer.properties
        └── dev
            └── cloud-alibaba-nacos.yml
```

## bash和zsh



## JDK版本管理

> [JDK17 下载](https://www.oracle.com/java/technologies/downloads/#jdk17-mac)

```shell
brew install jenv
```





## 安全模式

```shell
csrutil disable
csrutil enable
```



## 命令行复制

如需要将脚本的输出通过管道传输到`pbcopy` 

```shell
./somescript.sh | pbcopy
ls | pbcopy
```



## 安装软件提示已损坏

```shell
sudo xattr -d com.apple.quarantine /Applications/xxxx.app
```



## VPN

https://119.23.235.186/portal/#!/login

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20240402001151834.png)

## 程序坞卡死

``` java
 kill Dock
```

## 批量修改文件名

> https://juejin.cn/post/7157989447613546533
>
> https://www.sohu.com/a/491253836_120854716

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20240616145056820.png)

## 设置自定义快捷键

设置 - 键盘 - 快捷键 - APP 快捷键 - 添加



## 电源管理

```shell
pmset -g
```

```
System-wide power settings:
Currently in use:
 standby              1
 Sleep On Power Button 1
 hibernatefile        /var/vm/sleepimage
 powernap             1
 networkoversleep     0
 disksleep            10
 sleep                1 (sleep prevented by useractivityd, sharingd, powerd)
 hibernatemode        3
 ttyskeepawake        1
 displaysleep         3
 tcpkeepalive         1
 lowpowermode         1
 womp                 0
```



`pmset -g` 是 macOS 系统中用于显示当前电源管理设置的命令。以下是输出内容的逐条解释：

### **System-wide power settings:**  
这是系统级别的电源管理设置。

### **Currently in use:**  
以下是当前正在使用的电源管理设置：

#### **standby 1**  
- 启用了“待机模式”。  
- 这是一种低功耗模式，通常在电池电量剩余 5% 时触发，系统会将内存内容保存到磁盘并进入深度睡眠状态。

#### **Sleep On Power Button 1**  
- 按下电源按钮时，系统会进入睡眠模式。

#### **hibernatefile /var/vm/sleepimage**  
- 系统的休眠文件存储在 `/var/vm/sleepimage` 中。  
- 这个文件用于在系统休眠时保存内存内容到磁盘。

#### **powernap 1**  
- 启用了“Power Nap”功能。  
- 在睡眠状态下，系统仍然可以接收更新、邮件等网络活动。

#### **networkoversleep 0**  
- 禁用了“网络唤醒”功能。  
- 系统不会因为网络活动而从睡眠状态唤醒。

#### **disksleep 10**  
- 磁盘睡眠时间为 10 分钟。  
- 如果磁盘空闲 10 分钟，磁盘会进入低功耗模式。

#### **sleep 1 (sleep prevented by useractivityd, sharingd, powerd)**  
- 系统睡眠时间为 1 分钟，但由于 `useractivityd`、`sharingd` 和 `powerd` 进程的活动，睡眠被阻止。  
- 这些进程可能正在运行某些任务，导致系统无法进入睡眠。

#### **hibernatemode 3**  
- 休眠模式设置为 3。  
- 这是默认值，表示系统在睡眠时会同时使用内存和磁盘（混合模式）。  
  - **0**: 仅使用内存（快速唤醒，但耗电）。  
  - **3**: 使用内存和磁盘（默认模式）。  
  - **25**: 仅使用磁盘（最节能，但唤醒较慢）。

#### **ttyskeepawake 1**  
- 启用了“终端保持唤醒”功能。  
- 如果用户通过终端登录，系统不会自动进入睡眠。

#### **displaysleep 3**  
- 显示器睡眠时间为 3 分钟。  
- 如果显示器空闲 3 分钟，会进入低功耗模式。

#### **tcpkeepalive 1**  
- 启用了 TCP 保持连接功能。  
- 系统会定期发送 TCP 数据包以保持网络连接。

#### **lowpowermode 1**  
- 启用了“低功耗模式”。  
- 系统会限制某些功能以节省电量。

#### **womp 0**  
- 禁用了“唤醒网络”功能。  
- 系统不会因为网络活动而从睡眠状态唤醒。

### 总结  
这些设置控制了系统在不同电源状态下的行为，包括睡眠、磁盘休眠、网络活动等。如果需要修改这些设置，可以使用 `pmset` 命令。例如：  
```bash
sudo pmset disksleep 15  # 将磁盘睡眠时间设置为 15 分钟
```



250405 改动

```shell
sudo pmset -b standbydelay 14400
sudo pmset -b tcpkeepalive 0
```

相关文档

- https://zhuanlan.zhihu.com/p/294859171
- https://blog.csdn.net/nnnnmmmm01/article/details/125989090
