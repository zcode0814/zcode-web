## nginx动态路由配置

```shell
server {
        listen       9876;
        server_name  localhost;

        #charset koi8-r;

        access_log  logs/host.access.log;

        location / {
            root   html;
            index  index.html index.htm;
            try_files  $uri $uri/ @router;
        }

        location @router {
            rewrite ^.*$ /index.html last;
        }

        error_page   500 502 503 504  /50x.html;
        location = /50x.html {
            root   html;
        }

        location /api/ {
            proxy_pass http://localhost:8014/;        #必须斜杠/结尾
            proxy_set_header   X-Forwarded-Proto    $scheme;
            proxy_set_header   Host                 $http_host;
            proxy_set_header   X-Real-IP            $remote_addr;
        }
 }
```



## WebStorm远程连接Docker部署VUE 项目

哈喽，大家好，我是一条。

周五一天好几个会，啥也没干成，不如就搞一点自己的东西，提高点今日实际收益。

之前写过前端瞎搞的文章，如今第一版已经开发完，到了部署阶段，我自己先想了几个方案：

- 和在本地一样，`npm run dev`,然后后台运行，虽然正规没这么干，但我也没说我是正规军，都瞎搞了我还在乎正不正规
- 先`npm run build`,再把`dist`文件夹放入nginx，好像正规了一点，但是还得搞个nginx，我的内存呀，算了

那还考虑啥，本地线上一把梭，run起来就完了。

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20230317153612126.png)

那本期就到期结束，我们下期……

哎，卧槽！怎么挂了，重启一下，好啦。……又挂了，绝了WC。

看来还得想个别的法子，既然后端都能用Docker部署，那前端应该也可以呀，查一下，看看怎么搞得，整起来。

## Docker远程连接

**Docker开始远程TCP**

```shell
## 1.打开编辑：
vi /lib/systemd/system/docker.service

## 2.注释原有的：
#ExecStart=/usr/bin/dockerd -H fd:// --containerd=/run/containerd/containerd.sock

## 3.添加新的：
ExecStart=/usr/bin/dockerd -H unix:///var/run/docker.sock -H tcp://0.0.0.0:2375

## -H代表指定docker的监听方式，这里是socket文件文件位置，也就是socket方式，2375就是tcp端口

5.重新加载系统服务配置文件（包含刚刚修改的文件）
systemctl daemon-reload

6.重启docker服务
systemctl restart docker
```

**WebStorm连接**

view - Tools Windows - Services - + - Docker connection 

```
tcp://
```



![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20230317163145049.png)

**连接成功**

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20230317161653719.png)

## Dockerfile

```dockerfile
FROM nginx
MAINTAINER yitiao

#移除基础镜像内部的nginx的默认配置文件
RUN rm /etc/nginx/conf.d/default.conf

#将自己定义的nginx文件 拷贝到原nginx文件的位置
ADD default.conf /etc/nginx/conf.d/

#将前端build好生成的dist文件拷贝 nginx代理的文件夹内
COPY dist/ /usr/share/nginx/html/
```

**自定义的nginx配置文件**

```nginx
server {
    listen       8090; # 监听的端口号
    server_name  localhost; 

    location / {
        root   /usr/share/nginx/html;
        index  index.html index.htm;
        try_files $uri $uri/ /index.html =404;
    }

    error_page   500 502 503 504  /50x.html;
    location = /50x.html {
        root   html;
    }
}
```

**编排启动过程**

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20230317162439013.png)

**运行**

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20230317162548983.png)

**自动更新**

当我们有更新时，再次运行即可，会自动把旧的容器删除，不需要我们做任何操作

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20230317162816968.png)

## So Easy

这也太方便了，一个字：绝！

下班下班！

