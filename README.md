# Vue 3 组件演示项目

这是一个基于 Vue 3 和 Vite 构建的演示项目，展示了两个高性能组件的实现：

1. **虚拟轮播组件 (VirtualCarousel)** - 使用 requestAnimationFrame 实现的高效轮播组件
2. **实时数据列表组件 (RealTimeData)** - 支持 WebSocket 连接和 Canvas 渲染的实时数据展示组件

## 项目特点

- 使用 Vue 3 Composition API 和 `<script setup>` 语法
- 集成 Element Plus UI 组件库
- 高性能组件实现（虚拟滚动、Canvas 渲染）
- WebSocket 实时数据通信
- 响应式设计，适配不同屏幕尺寸

## 组件介绍

### 虚拟轮播组件 (VirtualCarousel)

一个使用 Vue 3 和 requestAnimationFrame 实现的高效虚拟轮播组件，具有以下特点：

- 使用 requestAnimationFrame 实现平滑动画效果
- 支持虚拟滚动，只渲染可见和即将可见的元素
- 支持自动播放和手动拖拽
- 响应式设计，适应不同屏幕宽度
- 支持循环播放

### 实时数据列表组件 (RealTimeData)

一个用于展示实时舆情数据的高性能组件，具有以下特点：

- 支持 WebSocket 连接和数据接收
- 双视图模式：列表视图和 Canvas 视图
- 数据质量监控（准确性、实时性、重复/丢失数据检测）
- 网络状态检测和弱网环境处理
- 数据缓存机制应对网络不稳定
- 心跳检测保持连接活跃
- 自动重连机制

## 技术栈

- [Vue 3](https://v3.vuejs.org/)
- [Vite](https://vitejs.dev/)
- [Element Plus](https://element-plus.org/)

## 项目结构

```
src/
├── components/
│   ├── VirtualCarousel.vue    # 虚拟轮播组件
│   └── RealTimeData.vue       # 实时数据列表组件
├── mock/
│   ├── carouselData.js        # 轮播组件模拟数据
│   └── sentimentData.js       # 实时数据组件模拟数据
├── utils/
│   ├── animationUtils.js      # 动画相关工具函数
│   ├── canvasUtils.js         # Canvas 渲染工具函数
│   ├── dataUtils.js           # 数据处理工具函数
│   ├── networkUtils.js        # 网络状态检测工具函数
│   └── websocketUtils.js      # WebSocket 相关工具函数
├── App.vue                    # 主应用组件
└── main.js                    # 应用入口文件
```

## 安装和运行

1. 克隆项目代码：
   ```bash
   git clone <项目地址>
   ```

2. 安装依赖：
   ```bash
   npm install
   # 或
   yarn install
   ```

3. 启动开发服务器：
   ```bash
   npm run dev
   # 或
   yarn dev
   ```

4. 构建生产版本：
   ```bash
   npm run build
   # 或
   yarn build
   ```

5. 预览生产构建：
   ```bash
   npm run preview
   # 或
   yarn preview
   ```

## 使用说明

项目启动后，您将看到一个包含两个标签页的应用界面：

1. **虚拟轮播组件** 标签页展示了 VirtualCarousel 组件的功能和特性
2. **实时数据列表** 标签页展示了 RealTimeData 组件，您可以配置 WebSocket 服务器地址进行连接

## 浏览器支持

- 现代浏览器（Chrome, Firefox, Safari, Edge 等）

## 许可证

[MIT](./LICENSE)
