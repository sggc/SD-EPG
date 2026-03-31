# SD-EPG Dashboard

EPG 节目描述注入统计展示平台

## 功能特性

- 📊 实时统计面板 - 显示总节目数、匹配率等关键指标
- 📈 数据可视化 - 饼图、柱状图展示匹配来源分布
- 🔍 频道搜索 - 支持按频道名称快速筛选
- 📱 响应式设计 - 适配桌面、平板、手机等多端设备
- 🔐 配置管理 - 管理员可配置 EPG 和 Desc 数据源

## 技术栈

- Vue 3 (Composition API)
- Vite
- Tailwind CSS
- Chart.js

## 开发

```bash
# 安装依赖
npm install

# 本地开发
npm run dev

# 构建生产版本
npm run build

# 预览生产版本
npm run preview
```

## 部署

本项目使用 GitHub Actions 自动部署到 GitHub Pages。

数据源: https://raw.githubusercontent.com/sggc/SD-EPG/main/log/dashboard_data.json
