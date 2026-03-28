## 背景





## 实现

```java
    /**
     * 读取本地html文件里的html代码
     */
    @SneakyThrows
    private String toHtmlString(String path) {
        ClassLoader classLoader = Thread.currentThread().getContextClassLoader();
        InputStream resourceStream = null;
        String filePath = "codebook" + path;

        if (AdminMainApp.class.getResource("").getProtocol().equals("jar")) {
            // 以 jar 的方式运行
            resourceStream = classLoader.getResourceAsStream(filePath);
        } else {
            URL resource = classLoader.getResource(filePath);
            resourceStream = new FileInputStream(resource.getFile());
        }

        // 获取HTML文件
        StringBuilder htmlSb = new StringBuilder();
        try {
            BufferedReader br = new BufferedReader(new InputStreamReader(resourceStream, StandardCharsets.UTF_8));
            while (br.ready()) {
                htmlSb.append(br.readLine());
            }
            br.close();
            // 删除临时文件
            //file.delete();
        } catch (IOException e) {
            return "文件不存在";
        }
        // HTML文件字符串
        return htmlSb.toString();
    }
```

