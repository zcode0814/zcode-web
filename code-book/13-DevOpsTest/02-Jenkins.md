## Linux安装Jenkins

哈喽，大家好，我是一条。

这是 DevOps 相关的第一篇文章，准确是第二篇，之前有一篇《Docker从入门到干事》。

本文主要是 Jenkins 的安装部署，那前提我们应该装好 Git Maven JDK。这些准备工作就简单过一下。

Git 安装很简单

```
yum install git
git --version
```

Maven下载好配置环境变量即可

```
下载：wget --no-check-certificate https://dlcdn.apache.org/maven/maven-3/3.8.6/binaries/apache-maven-3.8.6-bin.tar.gz

配置环境变量

export M2_HOME=/data/opt/maven/maven-3.8.6

export PATH=$PATH:$M2_HOME/bin
```

> 需要Java8以上，最新版本的应该需要Java11以上。

准备好之后我们正式进入Jenkins的部署。

1.下载安装

> rpm 镜像下载站 https://mirrors.bfsu.edu.cn/jenkins/redhat-stable/
>
> war 官网下载 https://get.jenkins.io/war-stable/

```shell
wget --no-check-certificate  http://pkg.jenkins-ci.org/redhat-stable/jenkins-2.190.3-1.1.noarch.rpm
rpm -ivh jenkins-2.190.3-1.1.noarch.rpm

# war 安装
nohup java -jar jenkins.war --httpPort=8080 &
```

速度慢的话，可以在本地下载完再传到服务器。

> RPM方式卸载Jenkins
>
> ```shell
> rpm -e jenkins
> rpm -ql jenkins # 检查是否卸载成功
> # 彻底删除残留文件：
> find / -iname jenkins | xargs -n 1000 rm -rf
> ```



2.修改端口配置

```shell
vim /etc/sysconfig/jenkins
# 修改端口号为 8880
```

3.启动

```shell
systemctl start jenkins
systemctl status jenkins
```

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220811155617971.png)

4.解决首页加载过慢问题

当我们第一次访问时，会提示如下界面，且等待时间较长。

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220811155833096.png)

更改为清华大学镜像，之后重启 Jenkins

```shell
find / -name *.UpdateCenter.xml
vi /var/lib/jenkins/hudson.model.UpdateCenter.xml
# 改为以下地址 
#https://mirrors.tuna.tsinghua.edu.cn/jenkins/updates/update-center.json
```

5.安装插件

进入Jenkins 需要按照其提示打开日志文件获取密码，不赘述。

选择安装部分插件，因为网络原因，大概率会安装失败，所以只需要勾选最后一个中文插件就好了。

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220811155749722.png)

6.设置管理员用户

设置用户名和密码作为管理员用户，也可以直接用admin。

7.一切准备就绪

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220811160537250.png)

8.新建任务，下回再续

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220811160822239.png)

## War包安装

```shell
cd /data/opt/jenkins/
nohup java -jar jenkins.war --httpPort=8880 &
```

## 插件合集

1.官方推荐插件

2.blue ocean for web   UI美化插件

3.Send build artifacts over SSh   远程传输jar包

4.gitee  在gitee提交触发构建

## jenkins + Maven + Gitee 自动化部署

1.**实现思路**



![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20220816134836332.png)



2.**全局配置**









## 代码检查





## pipeline





## jenkins集成docker

Dockerfile

```dockerfile
FROM openjdk:8
MAINTAINER yitiao
ADD target/qiqi.jar qiqi-boot.jar
EXPOSE 9091
ENTRYPOINT ["java","-jar","qiqi-boot.jar"]
```

**jenkins shell**

```shell
cd /root/.jenkins/workspace/dev-qiqi-docker/
docker stop qiqi-boot || true
docker rm qiqi-boot || true
docker rmi qiqi-boot || true
docker build -t qiqi-boot .
docker run -d -p 9091:9091 --name qiqi-boot qiqi-boot:latest
```

原理分析

和以前一样，都要利用 maven 打一个 jar 包，然后将 jar 包放进 docker ，成为一个镜像。

工程里的dockerFile 会生成在jenkins workspace\workname 下，然后在 shell 中根据 DockerFile 来 build  镜像。

## Jenkins与GitLab 的深入评估和比较

https://baijiahao.baidu.com/s?id=1680330220863514387&wfr=spider&for=pc

