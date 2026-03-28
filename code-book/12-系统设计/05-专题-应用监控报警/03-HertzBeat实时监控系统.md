> [官网](https://hertzbeat.com/)
>
> [教程](https://mp.weixin.qq.com/s/_YEXtosxEX-SS5JnlVWW4w)

### 什么是HertzBeat？

HertzBeat 有两个非常鲜明的特色：**强大的监控模版**和**无需 Agent** 。







### 





## 技术选型

### Grafana和HertzBeat

1. Grafana是一种开源的数据可视化工具，它可以连接多种数据源，包括Prometheus、InfluxDB等，并提供强大的查询和可视化功能，用于创建仪表盘和图表展示数据。
2. HertzBeat是一个基于Prometheus的开源软件，用于解决Prometheus在大规模环境下的性能问题，通过推送方式将指标数据发送给Prometheus。

联系：
1. Grafana可以连接到HertzBeat提供的指标数据，通过查询和可视化功能展示HertzBeat收集的数据，帮助用户更直观地理解和分析系统性能。
2. HertzBeat可以将指标数据推送给Prometheus，而Prometheus可以作为Grafana的数据源，因此可以通过Grafana展示HertzBeat收集的数据。
3. 结合使用Grafana和HertzBeat可以实现对系统的实时监控、度量和可视化，帮助用户更好地了解系统的性能和趋势，并及时发现和解决问题。

### Prometheus和HertzBeat

1. Prometheus是一种开源的监控系统，它通过拉取方式从目标系统中收集指标数据，并提供了强大的查询语言和灵活的告警机制。
2. HertzBeat是一种基于Prometheus的开源软件，它是为了解决Prometheus在大规模环境下的性能问题而开发的。HertzBeat使用推送方式将指标数据发送给Prometheus，以提高性能和可扩展性。

联系：
1. Prometheus和HertzBeat都是用于监控系统性能的工具，可以收集和存储指标数据。
2. HertzBeat是基于Prometheus的，可以与Prometheus进行集成，通过推送方式将指标数据发送给Prometheus进行处理和存储。
3. 使用Prometheus和HertzBeat可以实现对系统的实时监控、度量和告警，帮助开发人员和运维人员及时发现和解决问题。