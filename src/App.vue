<script>
import VirtualCarousel from './components/VirtualCarousel.vue'
import RealTimeData from './components/RealTimeData.vue'
import { ref, shallowRef, markRaw } from 'vue'
import { carouselItems } from './mock/carouselData'

export default {
  name: 'App',
  components: {
    VirtualCarousel,
    RealTimeData
  },
  setup() {
    // 使用从mock文件导入的轮播数据
    const carouselItemsRef = ref(carouselItems)
    
    // Tab 相关状态
    const activeTab = ref('realtime')
    
    // WebSocket 服务器地址
    const wsUrl = ref('ws://localhost:8080/ws')
    
    // 切换 tab
    const switchTab = (tabName) => {
      activeTab.value = tabName
    }
    
    return {
      carouselItems: carouselItemsRef,
      activeTab,
      switchTab,
      wsUrl
    }
  }
}
</script>

<template>
  <div class="app-container">
    <h1>Vue 3 组件演示</h1>
    
    <!-- Element Plus Tabs -->
    <el-tabs v-model="activeTab" @tab-click="switchTab">
      <el-tab-pane label="虚拟轮播组件" name="carousel">
        <div class="component-wrapper">
          <VirtualCarousel
            :items="carouselItems"
            :item-width="280"
            :item-height="180"
            :visible-count="3"
            :gap="20"
            :autoplay="true"
            :autoplay-speed="4000"
            :loop="true"
          >
            <!-- 自定义轮播项内容 -->
            <template #default="{ item }">
              <div 
                class="carousel-item-content"
                :style="{ backgroundColor: item.color }"
              >
                <h3>{{ item.title }}</h3>
              </div>
            </template>
          </VirtualCarousel>
        </div>
        
        <div class="description">
          <p>这是一个使用 Vue 3 和 requestAnimationFrame 实现的高效虚拟轮播组件。</p>
          <p>特点：</p>
          <ul>
            <li>使用 requestAnimationFrame 实现平滑动画效果</li>
            <li>支持虚拟滚动，只渲染可见和即将可见的元素</li>
            <li>支持自动播放和手动拖拽</li>
            <li>响应式设计，适应不同屏幕宽度</li>
            <li>支持循环播放</li>
          </ul>
        </div>
      </el-tab-pane>
      
      <el-tab-pane label="实时数据列表" name="realtime">
        <div class="component-wrapper">
          <div class="websocket-config" v-if="activeTab === 'realtime'">
            <el-form :inline="true" class="config-form">
              <el-form-item label="WebSocket服务器地址:">
                <el-input v-model="wsUrl" placeholder="请输入WebSocket服务器地址" style="width: 300px;"></el-input>
              </el-form-item>
            </el-form>
          </div>
          <div class="real-time-data-wrapper">
            <RealTimeData :ws-url="wsUrl" />
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<style scoped>
.app-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
}

h1 {
  text-align: center;
  color: #333;
  margin-top: 0;
  margin-bottom: 15px;
}

.component-wrapper {
  width: 1000px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  overflow: hidden;
  background: white;
  box-sizing: border-box;
}

.real-time-data-wrapper {
  height: 800px;
}

.websocket-config {
  padding: 15px;
  background-color: #f5f5f5;
  border-radius: 4px;
}

.config-form .el-form-item {
  margin-bottom: 0;
}

.carousel-wrapper {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto 40px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  overflow: hidden;
  padding: 20px;
  background: white;
}

.carousel-item-content {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 24px;
  font-weight: bold;
  border-radius: 8px;
  transition: transform 0.3s;
}

.carousel-item-content:hover {
  transform: scale(0.95);
}

.description {
  background: #f8f9fa;
  padding: 30px;
  border-radius: 8px;
  line-height: 1.6;
  margin-top: 40px;
}

.description p {
  margin-bottom: 15px;
  color: #555;
}

.description ul {
  padding-left: 20px;
}

.description li {
  margin-bottom: 10px;
  color: #555;
}
</style>