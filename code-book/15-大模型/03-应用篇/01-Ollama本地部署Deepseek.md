> [尚硅谷-Java大模型应用开发，微服务整合DeepSeek，LangChain大型语言模型LLM实战](https://www.bilibili.com/video/BV1SzP3eSEho)

## 什么是 Ollama

专门搞大模型的 Docker

提供各种模型的本地部署

https://ollama.com/

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20250405152025841.png)

下载即可安装，使用命令和 Docker 类似

```shell
ollama -v
## ollama version is 0.6.4
```

默认的安装目录`~/.ollama/`

## 下载大模型

在官网选择要部署的模型，如 [deepseek-r1](https://ollama.com/library/deepseek-r1) ，选择合适的参数（普通机器选择 8B 即可，专业级显卡或 M2 ultra 可以选择 14B），复制运行的命令即可。

```shell
ollama run deepseek-r1:8b
```

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20250405152650050.png)

默认大模型会下载到安装目录即`~/.ollama/models`下，如果想更换目录，可以通过设置环境变量实现，参考[官方文档](https://github.com/ollama/ollama/blob/main/docs/faq.md#how-do-i-configure-ollama-server)

```shell
launchctl setenv OLLAMA_MODELS "~/LLM/ollama/models"
```

## 本地和大模型交互

安装完成后，就可以在命令行向大模型提问。

如果想更好的体验，需要选择一个合适的客户端和大模型交互，如果是本地模型，可以使用 [page assist](https://chromewebstore.google.com/detail/page-assist-%E6%9C%AC%E5%9C%B0-ai-%E6%A8%A1%E5%9E%8B%E7%9A%84-web/jfgfiigpkhlkbnfnbobbkinehhfdhndo) 来快速实现。

他是一款浏览器插件，能自动检测到本地的大模型，非常方便。

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20250405161411726.png)

## 基于 springboot 访问大模型

> https://www.cnblogs.com/javaguide/p/18712169
>
> https://www.cnblogs.com/zlt2000/articles/18747435

注意：base-url: https://api.deepseek.com 不要加 V1

