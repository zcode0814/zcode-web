【python实战】Windows改hosts好麻烦，熬夜自制修改神器，快到飞起（可体验内测投票）

❤️<font color=orange>欢迎订阅[《从实战学python》](https://blog.csdn.net/skylibiao/category_7934680.html?spm=1001.2014.3001.5482)专栏，用python实现爬虫、办公自动化、数据可视化、人工智能等各个方向的实战案例，有趣又有用！</font>❤️

[更多精品专栏简介点这里](https://blog.csdn.net/skylibiao/article/details/119297018?spm=1001.2014.3001.5502)

>所谓的诗和远方，不过是，要把眼前的苟且，熬过了才有。

## 前言

哈喽，大家好，我是一条。

相信使用`Windows`的小伙伴在工作中遇到需要频繁`hosts`时都非常苦恼。主要有这几个原因：

- 路径复杂，`Windows`的`hosts`文件位于`C:\Windows\System32\drivers\etc\hosts`目录下，不是很好记。
- 多次修改之后终于记下了，或者在桌面创建快捷方式，但更烦的是需要管理员权限。
- 有时候只是需要将某一行注释或取消注释，也要打开文件修改。（一条工作中主要就是这种情况）

针对以上痛点，一条自制了一款修改神器，2秒内切换/修改完`hosts`，可不要小看这两秒，效率是第一生产力，另外这可是个装x神器，前端小姐姐一定会因此爱上你的！

<font color=red>文末有C站内测投票可体验</font>

## 效果展示

目前主要实现了三个功能，<font color=orange>使用方法为win + R 打开命令行窗口，输入文件名（h.py），回车，键盘输入对应功能的数字。</font>

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20210821123505109.png)

比如需要修改，键盘输入2，在输入要修改的行号即可。

### 1--查看

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/1.gif)

### 2--修改（根据行号增加或者取消注释）

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/2.gif)

### 3--新增

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/3.gif)

话不多说，看下如何实现的。（文末附完整代码）

## 管理员启动

>神器的核心部分，查了一下资料，万能的python果然有能够以管理员权限执行脚本的神器。
>
>就是他——`ctypes`

主要代码就是这句：

```python
ctypes.windll.shell32.ShellExecuteW(None, "runas", sys.executable, __file__, None, 1)
```

其中有一个参数为`__file__`，这句代码是获取管理员权限然后重新执行该文件。这个系统命令并不是主程序完成的，而是以管理员身份重新开了一个进程执行系统命令。并有一个自己的控制台。

有了管理员权限后，只要对`hosts`文件进行读写即可。

## 查看

>读取文件，按行打印即可，为了方便，加了行号。

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20210821052144470.png)

主要代码

```python
def show():
    lineNum = 1
    with open("C:\Windows\System32\drivers\etc\hosts", "r") as f:
        linesList = f.readlines()
    for i in linesList:
        print(str(lineNum) + " " + i, end="")
        lineNum = lineNum + 1
    input("please press enter exit")
```

## 修改

>先执行查看，然后输入对用的行号，判断每行开头字符是否是`#`，是去掉，不是在开头加上。
>
>实现注释/非注释的切换。

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20210821052534826.png)

主要代码

```python
def edit():
    lineNum=1
    with open("C:\Windows\System32\drivers\etc\hosts", "r") as f:
        linesList=f.readlines()
    for i in linesList:
        print(str(lineNum)+" "+i,end="")
        lineNum =lineNum+1
    lineNumber=int(input("please enter lineNumber:"))
    if(linesList[lineNumber-1].startswith("#")):
        linesList[lineNumber-1]=linesList[lineNumber-1].replace("#","",1)
    else:
        linesList[lineNumber-1]="#"+linesList[lineNumber-1]
    with open("C:\Windows\System32\drivers\etc\hosts", "a+") as f:
        f.truncate(0)
        f.writelines(linesList)
```

## 新增

>输入你要新增的内容，写入文件即可。

![](https://yitiaoit.oss-cn-beijing.aliyuncs.com/img/image-20210821053253411.png)

主要代码

```python
def add(addStr):
    with open("C:\Windows\System32\drivers\etc\hosts", "a+") as f:
            f.write(addStr+"\n")
    print(addStr+"\thava add")
    input("please press enter exit")
```

## 部署

>为了速度达到最快，采用win+R的方式打开，这样即使你在处理复杂的事情，也不用回到桌面，不用打开文件，一触即达！

- 新建`h.py`文件
- 将文件放入`C:\Windows\System32`目录下
- win + R输入`h.py`即可打开
- 键盘输入数字使用相应功能

## 完整代码

```python
#pip install name 安装
import ctypes, sys

def is_admin():
    try:
        return ctypes.windll.shell32.IsUserAnAdmin()
    except:
        return False


def add(addStr):
    with open("C:\Windows\System32\drivers\etc\hosts", "a+") as f:
            f.write(addStr+"\n")
    print(addStr+"\thava add")
    input("please press enter exit")

def edit():
    lineNum=1
    with open("C:\Windows\System32\drivers\etc\hosts", "r") as f:
        linesList=f.readlines()
    for i in linesList:
        print(str(lineNum)+" "+i,end="")
        lineNum =lineNum+1
    lineNumber=int(input("please enter lineNumber:"))
    if(linesList[lineNumber-1].startswith("#")):
        linesList[lineNumber-1]=linesList[lineNumber-1].replace("#","",1)
    else:
        linesList[lineNumber-1]="#"+linesList[lineNumber-1]
    with open("C:\Windows\System32\drivers\etc\hosts", "a+") as f:
        f.truncate(0)
        f.writelines(linesList)
    input("please press enter exit")

def show():
    lineNum = 1
    with open("C:\Windows\System32\drivers\etc\hosts", "r") as f:
        linesList = f.readlines()
    for i in linesList:
        print(str(lineNum) + " " + i, end="")
        lineNum = lineNum + 1
    input("please press enter exit")
if __name__ == '__main__':
    if is_admin():
        print("Hosts编辑器\nAuthor:一条coding\nData:2021-08-21\nVersion:0.0.1")
        operateType = input("查看hosts：1\n编辑hosts：2\n新增hosts：3")
        if (operateType == "1"):
            show()
        if (operateType == "2"):
            edit()
        if (operateType == "3"):
            addStr=input("please type your content:")
            add(addStr)
    else:
        ctypes.windll.shell32.ShellExecuteW(None, "runas", sys.executable, __file__, None, 1)
```

# 最后

>⭐今天是坚持刷题更文的第**36**/100天
>
>⭐各位的<font color=orange>点赞、关注、收藏、评论、订阅</font>就是一条创作的最大动力

为了回馈各位粉丝，礼尚往来，给大家准备了一条多年积累下来的优质资源，包括<font color=orange> 学习视频、面试资料、珍藏电子书等</font>

大家可以<font color=orange>评论留言或者私信</font>我领取

![在这里插入图片描述](https://img-blog.csdnimg.cn/54bc192590174279ad876040029fdf12.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3NreWxpYmlhbw==,size_16,color_FFFFFF,t_70)



