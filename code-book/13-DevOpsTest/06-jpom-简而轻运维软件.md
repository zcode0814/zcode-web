## Docker安装

```shell
docker pull jpomdocker/jpom
mkdir -p /data/opt/jpom-server/logs
mkdir -p /data/opt/jpom-server/data
mkdir -p /data/opt/jpom-server/conf
docker run -d -p 2122:2122 \
	--name jpom-server \
	-v /data/opt/jpom-server/logs:/usr/local/jpom-server/logs \
	-v /data/opt/jpom-server/data:/usr/local/jpom-server/data \
	-v /data/opt/jpom-server/conf:/usr/local/jpom-server/conf \
	jpomdocker/jpom
```

