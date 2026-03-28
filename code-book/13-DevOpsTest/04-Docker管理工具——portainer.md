## Docker安装Portainer

```shell
docker pull portainer/portainer-ce
docker run --name portainer -d -p 9100:9000 -v /var/run/docker.sock:/var/run/docker.sock -v /data/opt/portainer/data:/data --restart=always portainer/portainer-ce
## -v: 目录映射，
## 将/var/run/docker.sock映射到容器中，用于访问Docker的守护进程，控制Docker。
## /data/opt/portainer/data保存Portainer的配置信息。
```

访问ip+映射端口：http://101.43.146.76:9100/

创建用户 admin/portainer.io

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20230104145724260.png)

登录成功之后，本地的Docker环境会自动被配置好，可以查看镜像和容器：

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20230104150753454.png)

## 添加远程Docker环境

> docker开启远程连接https://blog.csdn.net/sg_knight/article/details/126319965

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20230104152508827.png)