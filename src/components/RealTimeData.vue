<template>
  <div class="real-time-data">
    <h2>舆情实时数据列表</h2>
    <div class="controls">
      <button @click="connect" :disabled="isConnected || isConnecting">连接</button>
      <button @click="disconnect" :disabled="!isConnected && !isConnecting">断开</button>
      <button @click="startSimulation" :disabled="isSimulating">开始模拟</button>
      <button @click="stopSimulation" :disabled="!isSimulating">停止模拟</button>
      <button @click="toggleViewMode" :disabled="isSimulating">切换视图</button>
      <span>舆情数量: {{ sentimentData.length.toLocaleString() }}</span>
    </div>
    <div class="network-status" :class="networkStatus">
      网络状态: {{ networkStatusText }}
    </div>
    <div class="data-quality">
      <div class="quality-item">
        <span class="label">数据准确性:</span>
        <span class="value" :class="dataAccuracyClass">{{ dataAccuracyText }}</span>
      </div>
      <div class="quality-item">
        <span class="label">实时性:</span>
        <span class="value" :class="realTimeClass">{{ realTimeText }}</span>
      </div>
      <div class="quality-item">
        <span class="label">重复数据:</span>
        <span class="value">{{ duplicateCount }}</span>
      </div>
      <div class="quality-item">
        <span class="label">丢失数据:</span>
        <span class="value">{{ lostCount }}</span>
      </div>
    </div>
    <div class="data-summary">
      <div class="summary-item">
        <span class="label">总数据量:</span>
        <span class="value">{{ sentimentData.length.toLocaleString() }} 条</span>
      </div>
      <div class="summary-item">
        <span class="label">当前显示:</span>
        <span class="value">{{ sentimentData.length.toLocaleString() }} 条</span>
      </div>
      <div class="summary-item">
        <span class="label">缓存队列:</span>
        <span class="value">{{ cacheQueue.length }} 条</span>
      </div>
    </div>
    
    <!-- Canvas 视图 -->
    <div v-if="viewMode === 'canvas'" class="canvas-container">
      <!-- 表头 -->
      <div class="canvas-header">
        <canvas ref="headerCanvasRef" class="header-canvas"></canvas>
      </div>
      <!-- 数据内容 -->
      <div class="canvas-content">
        <canvas ref="canvasRef" class="data-canvas"></canvas>
      </div>
    </div>
    
    <!-- 列表视图 -->
    <div v-else class="sentiment-list-container">
      <div class="sentiment-list" ref="listRef">
        <div 
          v-for="(item, index) in sentimentData" 
          :key="item.id" 
          class="sentiment-item"
          :class="{ even: index % 2 === 0 }"
        >
          <div class="item-index">{{ index + 1 }}</div>
          <div class="item-content">
            <div class="item-title">{{ item.title }}</div>
            <div class="item-source">{{ item.source }}</div>
          </div>
          <div class="item-time">{{ item.time }}</div>
          <div class="item-timestamp">{{ formatTimestamp(item.timestamp) }}</div>
          <div class="item-sentiment" :class="item.sentiment">
            {{ item.sentiment === 'positive' ? '正面' : item.sentiment === 'negative' ? '负面' : '中性' }}
          </div>
        </div>
        <!-- 当没有数据时显示提示 -->
        <div v-if="sentimentData.length === 0" class="no-data">
          暂无舆情数据，请点击"开始模拟"按钮生成数据
        </div>
      </div>
    </div>
    
    <div class="info">
      <p>状态: {{ status }}</p>
      <p>渲染性能: {{ performanceInfo }}</p>
      <p>视图模式: {{ viewMode === 'list' ? '列表视图' : 'Canvas视图' }}</p>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, reactive, computed, watch, nextTick } from 'vue'
import { generateSentimentItem } from '../mock/sentimentData'
import { 
  formatTimestamp, 
  validateSentimentData, 
  calculateRealTimeDelay, 
  adjustDataQualityByNetwork, 
  generateRandomSentiment,
  limitArrayLength
} from '../utils/dataUtils'
import { 
  createWebSocket, 
  sendWebSocketMessage, 
  getWebSocketStatus, 
  closeWebSocket,
  sendDataWithNetworkHandling,
  WebSocketReconnector,
  WebSocketHeartbeat,
  WebSocketDataCache
} from '../utils/websocketUtils'
import { 
  renderHeaderCanvas, 
  renderCanvas as renderCanvasUtil, 
  handleCanvasScroll as handleCanvasScrollUtil,
  initializeCanvas as initializeCanvasUtil
} from '../utils/canvasUtils'
import { checkNetworkStatus as checkNetworkStatusUtil } from '../utils/networkUtils'

export default {
  name: 'RealTimeData',
  props: {
    wsUrl: {
      type: String,
      default: 'ws://localhost:8080/ws'
    }
  },
  setup(props) {
    // DOM 引用
    const listRef = ref(null)
    const canvasRef = ref(null)
    const headerCanvasRef = ref(null)
    
    // 状态管理
    const isConnected = ref(false)
    const isConnecting = ref(false)
    const isSimulating = ref(false)
    const status = ref('未连接')
    const performanceInfo = ref('等待数据...')
    const networkStatus = ref('offline') // online, offline, weak
    const viewMode = ref('canvas') // 默认为canvas视图
    const scrollTop = ref(0) // Canvas 滚动位置
    const networkStatusText = computed(() => {
      switch (networkStatus.value) {
        case 'online': return '良好'
        case 'weak': return '弱网'
        case 'offline': return '离线'
        default: return '未知'
      }
    })
    
    // Canvas 相关
    let canvasCtx = null
    let headerCanvasCtx = null
    let animationFrameId = null
    const canvasData = reactive([]) // 用于 Canvas 渲染的数据副本
    
    // 数据质量指标
    const dataAccuracy = ref(100) // 数据准确率百分比
    const realTimeDelay = ref(0) // 实时延迟（毫秒）
    const duplicateCount = ref(0) // 重复数据数量
    const lostCount = ref(0) // 丢失数据数量
    
    const dataAccuracyText = computed(() => `${dataAccuracy.value.toFixed(2)}%`)
    const dataAccuracyClass = computed(() => {
      if (dataAccuracy.value >= 99) return 'excellent'
      if (dataAccuracy.value >= 95) return 'good'
      if (dataAccuracy.value >= 90) return 'warning'
      return 'error'
    })
    
    const realTimeText = computed(() => {
      if (realTimeDelay.value < 1000) return '实时'
      if (realTimeDelay.value < 5000) return '较实时'
      return '延迟'
    })
    
    const realTimeClass = computed(() => {
      if (realTimeDelay.value < 1000) return 'excellent'
      if (realTimeDelay.value < 5000) return 'good'
      if (realTimeDelay.value < 10000) return 'warning'
      return 'error'
    })
    
    // 数据存储
    const sentimentData = reactive([])
    const cacheQueue = reactive([]) // 网络不稳定时的数据缓存队列
    const receivedSequenceNumbers = reactive(new Set()) // 已接收的序列号，用于去重
    const expectedSequenceNumber = ref(1) // 期望的下一个序列号，用于检测丢失
    
    // WebSocket 相关
    let ws = null
    let simulationTimer = null
    
    // 重连配置
    const reconnectConfig = new WebSocketReconnector({
      maxRetries: 5,
      retryDelay: 3000
    })
    
    // 心跳检测配置
    const heartbeatManager = new WebSocketHeartbeat({
      interval: 30000, // 30秒发送一次心跳
      timeout: 5000 // 5秒内未收到响应认为连接异常
    })
    
    // 数据缓存管理
    const dataCache = new WebSocketDataCache({
      processInterval: 1000,
      batchSize: 10
    })
    
    // 性能监控
    let lastRenderTime = 0
    let frameCount = 0
    let fps = 0
    
    // 重置数据质量指标
    const resetDataQualityMetrics = () => {
      dataAccuracy.value = 100
      realTimeDelay.value = 0
      duplicateCount.value = 0
      lostCount.value = 0
      receivedSequenceNumbers.clear()
      expectedSequenceNumber.value = 1
    }
    
    // 切换视图模式
    const toggleViewMode = () => {
      viewMode.value = viewMode.value === 'list' ? 'canvas' : 'list'
      console.log('切换视图模式到:', viewMode.value)
      if (viewMode.value === 'canvas') {
        // 切换到 Canvas 视图时，复制数据用于渲染
        canvasData.length = 0
        canvasData.push(...sentimentData.slice(0, 1000)) // 限制 Canvas 渲染的数据量
        console.log('准备初始化 Canvas，数据量:', canvasData.length)
        
        // 使用重试机制确保 DOM 已更新
        nextTick(() => {
          console.log('视图切换时初始化 Canvas')
          initializeCanvasWithRetry(0)
        })
      }
    }
    
    // 带重试机制的 Canvas 初始化（用于视图切换时）
    const initializeCanvasWithRetry = (retryCount) => {
      console.log(`尝试初始化 Canvas (第${retryCount + 1}次)`)
      console.log('canvasRef:', canvasRef)
      console.log('headerCanvasRef:', headerCanvasRef)
      console.log('canvasRef.value:', canvasRef.value)
      console.log('headerCanvasRef.value:', headerCanvasRef.value)
      
      if (!canvasRef.value || !headerCanvasRef.value) {
        console.log('Canvas 元素未找到，canvasRef.value:', canvasRef.value, 'headerCanvasRef.value:', headerCanvasRef.value)
        
        // 限制重试次数为3次
        if (retryCount < 3) {
          setTimeout(() => {
            console.log(`第${retryCount + 1}次重试获取 Canvas 元素`)
            initializeCanvasWithRetry(retryCount + 1)
          }, 100 * (retryCount + 1)) // 递增延迟时间
        } else {
          console.log('达到最大重试次数，Canvas 元素仍未找到')
        }
        return
      }
      
      doInitializeCanvas()
    }
    
    // 初始化 Canvas
    const initializeCanvas = () => {
      console.log('开始初始化 Canvas')
      console.log('canvasRef:', canvasRef)
      console.log('headerCanvasRef:', headerCanvasRef)
      console.log('canvasRef.value:', canvasRef.value)
      console.log('headerCanvasRef.value:', headerCanvasRef.value)
      
      if (!canvasRef.value || !headerCanvasRef.value) {
        console.log('Canvas 元素未找到，canvasRef.value:', canvasRef.value, 'headerCanvasRef.value:', headerCanvasRef.value)
        // 简单重试一次
        setTimeout(() => {
          console.log('重试获取 Canvas 元素')
          if (canvasRef.value && headerCanvasRef.value) {
            console.log('重试获取成功，执行初始化')
            doInitializeCanvas()
          } else {
            console.log('重试获取仍然失败')
          }
        }, 50)
        return
      }
      
      doInitializeCanvas()
    }
    
    // 实际的 Canvas 初始化逻辑
    const doInitializeCanvas = () => {
      const canvas = canvasRef.value
      const headerCanvas = headerCanvasRef.value
      
      initializeCanvasUtil({
        canvas,
        headerCanvas,
        setHeaderCanvasCtxFn: (ctx) => { headerCanvasCtx = ctx },
        setCanvasCtxFn: (ctx) => { canvasCtx = ctx },
        renderHeaderCanvasFn: () => {
          renderHeaderCanvas(headerCanvasCtx, headerCanvas, viewMode.value)
        },
        renderCanvasFn: () => {
          // 启动渲染循环
          if (animationFrameId) {
            cancelAnimationFrame(animationFrameId)
          }
          renderCanvasLoop()
        }
      })
      
      // 添加鼠标滚轮事件监听
      canvas.addEventListener('wheel', handleCanvasScroll)
    }
    
    // 渲染循环
    const renderCanvasLoop = () => {
      renderCanvasUtil(canvasCtx, canvasRef.value, canvasData, scrollTop.value, viewMode.value, formatTimestamp)
      animationFrameId = requestAnimationFrame(renderCanvasLoop)
    }
    
    // 绘制表头 Canvas
    const renderHeaderCanvasInternal = () => {
      renderHeaderCanvas(headerCanvasCtx, headerCanvasRef.value, viewMode.value)
    }
    
    // 处理 Canvas 滚动
    const handleCanvasScroll = (event) => {
      handleCanvasScrollUtil(
        event, 
        () => scrollTop.value, 
        () => renderCanvasUtil(canvasCtx, canvasRef.value, canvasData, scrollTop.value, viewMode.value, formatTimestamp),
        canvasCtx
      )
    }
    
    // 渲染 Canvas
    const renderCanvas = () => {
      renderCanvasUtil(canvasCtx, canvasRef.value, canvasData, scrollTop.value, viewMode.value, formatTimestamp)
    }
    
    // 更新 Canvas 数据
    const updateCanvasData = () => {
      if (viewMode.value !== 'canvas') return
      
      // 更新 Canvas 数据副本
      canvasData.length = 0
      canvasData.push(...sentimentData.slice(0, 1000)) // 限制数据量以保持性能
      
      // 如果 Canvas 已初始化，触发重新渲染
      if (canvasCtx) {
        renderCanvas()
        
        // 更新Canvas高度以匹配数据量
        if (canvasRef.value) {
          // 每行高度为60px，根据数据量设置Canvas高度
          const totalHeight = canvasData.length * 60
          canvasRef.value.height = totalHeight
          
          // 如果有容器引用，同时更新容器的滚动高度
          const canvasContent = canvasRef.value.parentElement
          if (canvasContent) {
            canvasContent.style.height = Math.min(totalHeight, 400) + 'px' // 限制最大高度为400px
          }
        }
      }
    }
    
    // 模拟网络状态检测
    const checkNetworkStatus = () => {
      checkNetworkStatusUtil({
        getNetworkStatus: () => networkStatus.value,
        setNetworkStatus: (status) => { networkStatus.value = status },
        getDataAccuracy: () => dataAccuracy.value,
        setDataAccuracy: (accuracy) => { dataAccuracy.value = accuracy },
        getRealTimeDelay: () => realTimeDelay.value,
        setRealTimeDelay: (delay) => { realTimeDelay.value = delay }
      })
    }
    
    // 验证数据准确性
    const validateDataAccuracy = (item) => {
      const result = validateSentimentData(item, receivedSequenceNumbers, expectedSequenceNumber.value)
      
      if (!result.isValid) {
        dataAccuracy.value = Math.max(0, dataAccuracy.value + result.accuracyImpact)
      }
      
      if (result.isDuplicate) {
        duplicateCount.value++
      }
      
      if (result.lostCount > 0) {
        lostCount.value += result.lostCount
      }
      
      // 更新序列号状态（仅在数据有效时）
      if (result.isValid) {
        receivedSequenceNumbers.add(item.sequenceNumber)
        expectedSequenceNumber.value = item.sequenceNumber + 1
      }
      
      return result.isValid
    }
    
    // 连接到 WebSocket 服务器
    const connect = () => {
      if (isConnected.value || isConnecting.value) return
      
      try {
        isConnecting.value = true
        status.value = '连接中...'
        
        // 重置数据质量指标
        resetDataQualityMetrics()
        
        // 连接到 WebSocket 服务器
        ws = createWebSocket(props.wsUrl)
        
        // WebSocket 连接成功
        ws.onopen = () => {
          isConnecting.value = false
          isConnected.value = true
          status.value = '已连接'
          networkStatus.value = 'online'
          reconnectConfig.reset()
          
          // 启动心跳检测
          startHeartbeat()
          
          // 启动缓存数据处理
          startCacheProcessing()
          
          // 停止模拟数据推送（如果正在运行）
          stopSimulation()
        }
        
        // WebSocket 接收消息
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            
            // 如果是心跳响应，直接返回
            if (data.type === 'heartbeat') {
              console.log('收到心跳响应')
              return
            }
            
            // 处理数据消息
            if (data.type === 'data') {
              const payload = data.payload
              
              // 更新实时性指标
              const now = Date.now()
              realTimeDelay.value = calculateRealTimeDelay(payload.timestamp)
              
              // 发送数据（处理弱网环境）
              sendData(payload)
            }
            
            // 处理控制消息
            if (data.type === 'control') {
              if (data.command === 'simulationStarted') {
                isSimulating.value = true
                status.value = '正在接收模拟数据...'
              } else if (data.command === 'simulationStopped') {
                isSimulating.value = false
                status.value = '模拟已停止'
              }
            }
          } catch (error) {
            console.error('解析 WebSocket 消息失败:', error)
            status.value = `数据解析错误: ${error.message}`
          }
        }
        
        // WebSocket 连接错误
        ws.onerror = (error) => {
          isConnecting.value = false
          status.value = `连接错误: ${error.message}`
          networkStatus.value = 'offline'
          handleReconnect()
        }
        
        // WebSocket 连接关闭
        ws.onclose = (event) => {
          isConnected.value = false
          isConnecting.value = false
          
          if (event.wasClean) {
            status.value = `连接已关闭: ${event.code} ${event.reason}`
          } else {
            status.value = '连接意外断开'
          }
          
          networkStatus.value = 'offline'
          handleReconnect()
        }
      } catch (error) {
        isConnecting.value = false
        status.value = `连接失败: ${error.message}`
        networkStatus.value = 'offline'
        handleReconnect()
      }
    }
    
    // 断开 WebSocket 连接
    const disconnect = () => {
      closeWebSocket(ws)
      ws = null
      
      isConnected.value = false
      isConnecting.value = false
      status.value = '已断开'
      networkStatus.value = 'offline'
      stopSimulation()
      stopHeartbeat()
      stopCacheProcessing()
      reconnectConfig.reset()
    }
    
    // 启动心跳检测
    const startHeartbeat = () => {
      stopHeartbeat()
      heartbeatManager.start(ws, 
        () => {
          // 发送心跳包
          sendWebSocketMessage(ws, { type: 'heartbeat' })
          console.log('发送心跳包')
        },
        () => {
          // 心跳超时处理
          if (isConnected.value) {
            // 模拟网络状态变化
            checkNetworkStatus()
          }
        }
      )
    }
    
    // 停止心跳检测
    const stopHeartbeat = () => {
      heartbeatManager.stop()
    }
    
    // 处理重连
    const handleReconnect = () => {
      reconnectConfig.attemptReconnect(
        () => connect(),
        (currentRetries, maxRetries) => {
          status.value = `连接断开，${reconnectConfig.retryDelay/1000}秒后尝试重连 (${currentRetries}/${maxRetries})`
          networkStatus.value = 'offline'
        },
        () => {
          status.value = '连接失败，已达到最大重试次数'
          networkStatus.value = 'offline'
        }
      )
    }
    
    // 启动缓存数据处理
    const startCacheProcessing = () => {
      stopCacheProcessing()
      dataCache.startProcessing(ws, (batch) => {
        // 批量发送缓存数据
        for (const item of batch) {
          sendWebSocketMessage(ws, { type: 'data', payload: item })
        }
      })
    }
    
    // 停止缓存数据处理
    const stopCacheProcessing = () => {
      dataCache.stopProcessing()
    }
    
    // 发送数据（处理弱网环境）
    const sendData = (data) => {
      sendDataWithNetworkHandling({
        ws,
        data,
        networkStatus: networkStatus.value,
        validateDataFn: validateDataAccuracy,
        updateDataFn: (data) => {
          sentimentData.unshift(data)
          // 更新 Canvas 数据
          updateCanvasData()
        },
        limitArrayLengthFn: limitArrayLength,
        dataCache,
        sendWebSocketMessageFn: sendWebSocketMessage
      })
      
      // 使用utils中的函数限制最大数据点数量以保持性能
      sentimentData.splice(0, sentimentData.length, ...limitArrayLength(sentimentData, 10000))
    }
    
    // 开始模拟数据推送（通过 WebSocket 控制服务器端生成）
    const startSimulation = () => {
      if (!isConnected.value || !ws || ws.readyState !== WebSocket.OPEN) {
        status.value = '请先连接 WebSocket'
        return
      }
      
      if (isSimulating.value) return
      
      // 通过 WebSocket 发送控制命令
      sendWebSocketMessage(ws, {
        type: 'control',
        command: 'startSimulation'
      })
      
      isSimulating.value = true
      status.value = '正在接收模拟数据...'
      
      // 重置数据质量指标
      resetDataQualityMetrics()
    }
    
    // 停止模拟数据推送
    const stopSimulation = () => {
      if (!isConnected.value || !ws || ws.readyState !== WebSocket.OPEN) {
        isSimulating.value = false
        return
      }
      
      // 通过 WebSocket 发送控制命令
      sendWebSocketMessage(ws, {
        type: 'control',
        command: 'stopSimulation'
      })
      
      isSimulating.value = false
      if (!isConnected.value) {
        status.value = '模拟已停止'
      }
    }
    
    // 监听 WebSocket URL 变化
    watch(() => props.wsUrl, (newUrl, oldUrl) => {
      if (isConnected.value && newUrl !== oldUrl) {
        // 如果连接状态且 URL 发生变化，重新连接
        disconnect()
        setTimeout(() => {
          connect()
        }, 1000)
      }
    })
    
    // 监听数据变化，更新 Canvas
    watch(() => sentimentData.length, () => {
      if (viewMode.value === 'canvas') {
        updateCanvasData()
      }
    })
    
    // 更新性能信息
    const updatePerformanceInfo = () => {
      frameCount++
      const now = performance.now()
      if (now - lastRenderTime >= 1000) {
        fps = frameCount
        frameCount = 0
        lastRenderTime = now
        performanceInfo.value = `FPS: ${fps} | 舆情数量: ${sentimentData.length.toLocaleString()}`
      }
    }
    
    // 动画循环
    const animationLoop = () => {
      updatePerformanceInfo()
      requestAnimationFrame(animationLoop)
    }
    
    // 组件挂载时初始化
    onMounted(() => {
      animationLoop()
      
      // 初始化 Canvas 视图（如果默认是 Canvas 视图）
      if (viewMode.value === 'canvas') {
        // 复制数据用于渲染
        canvasData.length = 0
        canvasData.push(...sentimentData.slice(0, 1000)) // 限制 Canvas 渲染的数据量
        
        // 使用 nextTick 确保 DOM 已更新
        nextTick(() => {
          console.log('组件挂载时初始化 Canvas')
          initializeCanvas()
        })
      }
      
      // 监听窗口大小变化
      const handleResize = () => {
        if (viewMode.value === 'canvas' && canvasRef.value && headerCanvasRef.value) {
          const canvas = canvasRef.value
          const headerCanvas = headerCanvasRef.value
          const container = canvas.parentElement.closest('.canvas-container')
          const headerContainer = headerCanvas.parentElement
          canvas.width = container.clientWidth
          // 根据数据量动态设置Canvas高度
          const totalHeight = canvasData.length * 60
          canvas.height = Math.max(totalHeight, container.clientHeight - 40) // 至少保持容器高度减去表头
          headerCanvas.width = headerContainer.clientWidth
          headerCanvas.height = 40 // 表头高度设置为40px
          
          // 重新绘制
          renderHeaderCanvas()
          renderCanvas()
        }
      }
      
      window.addEventListener('resize', handleResize)
      
      // 模拟定期检查网络状态
      setInterval(checkNetworkStatus, 10000)
    })
    
    // 组件卸载时清理
    onUnmounted(() => {
      disconnect()
      stopSimulation()
      
      // 取消动画帧
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
      }
      
      // 移除事件监听器
      if (canvasRef.value) {
        canvasRef.value.removeEventListener('wheel', handleCanvasScroll)
      }
    })
    
    return {
      listRef,
      canvasRef,
      headerCanvasRef,
      isConnected,
      isConnecting,
      isSimulating,
      status,
      performanceInfo,
      networkStatus,
      networkStatusText,
      viewMode,
      cacheQueue,
      sentimentData,
      dataAccuracyText,
      dataAccuracyClass,
      realTimeText,
      realTimeClass,
      duplicateCount,
      lostCount,
      formatTimestamp,
      connect,
      disconnect,
      startSimulation,
      stopSimulation,
      toggleViewMode
    }
  }
}
</script>

<style scoped>
.real-time-data {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.controls {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
  flex-wrap: wrap;
  align-items: center;
}

.controls button {
  padding: 8px 16px;
  background-color: #4ecdc4;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.controls button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.controls span {
  margin-left: auto;
  font-weight: bold;
}

.network-status {
  padding: 8px 12px;
  border-radius: 4px;
  margin-bottom: 15px;
  font-weight: bold;
  text-align: center;
}

.network-status.online {
  background-color: #e8f5e9;
  color: #4caf50;
}

.network-status.weak {
  background-color: #fff3e0;
  color: #ff9800;
}

.network-status.offline {
  background-color: #ffebee;
  color: #f44336;
}

.data-quality {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  margin-bottom: 15px;
  padding: 10px;
  background-color: #f8f9fa;
  border-radius: 4px;
}

.quality-item {
  display: flex;
  align-items: center;
  gap: 5px;
}

.quality-item .label {
  font-weight: bold;
  color: #555;
}

.quality-item .value {
  font-weight: bold;
}

.quality-item .value.excellent {
  color: #4caf50;
}

.quality-item .value.good {
  color: #2196f3;
}

.quality-item .value.warning {
  color: #ff9800;
}

.quality-item .value.error {
  color: #f44336;
}

.data-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  margin-bottom: 15px;
  padding: 12px 15px;
  background-color: #e3f2fd;
  border-radius: 4px;
  border-left: 4px solid #2196f3;
}

.summary-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.summary-item .label {
  font-weight: bold;
  color: #1976d2;
  font-size: 14px;
}

.summary-item .value {
  font-weight: bold;
  color: #333;
  font-size: 14px;
}

.canvas-container {
  flex: 1;
  min-height: 400px;
  border: 1px solid #ddd;
  border-radius: 4px;
  overflow: hidden;
  background-color: #f8f9fa;
  display: flex;
  flex-direction: column;
  position: relative;
}

.canvas-header {
  flex-shrink: 0;
  border-bottom: 1px solid #ddd;
  height: 40px; /* 设置固定高度 */
}

.header-canvas {
  width: 100%;
  height: 100%;
  display: block;
  cursor: default;
}

.canvas-content {
  flex: 1;
  overflow: auto; /* 改为auto以支持滚动 */
  position: relative;
  min-height: 0; /* 允许内容区域收缩 */
}

.data-canvas {
  width: 100%;
  display: block;
  cursor: default;
}

.sentiment-list-container {
  flex: 1;
  min-height: 400px;
  border: 1px solid #ddd;
  border-radius: 4px;
  overflow: hidden;
  background-color: #f8f9fa;
  display: flex;
  flex-direction: column;
}

.sentiment-list {
  flex: 1;
  overflow-y: auto;
  position: relative;
  background-color: white;
}

.sentiment-item {
  display: flex;
  align-items: center;
  padding: 10px 15px;
  border-bottom: 1px solid #eee;
  height: 60px;
  box-sizing: border-box;
}

.sentiment-item.even {
  background-color: #f8f9fa;
}

.item-index {
  width: 40px;
  font-size: 12px;
  color: #999;
  flex-shrink: 0;
}

.item-content {
  flex: 1;
  min-width: 0;
}

.item-title {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 4px;
}

.item-source {
  font-size: 12px;
  color: #666;
}

.item-time, .item-timestamp {
  font-size: 12px;
  color: #999;
  width: 70px;
  flex-shrink: 0;
}

.item-sentiment {
  width: 50px;
  text-align: center;
  font-size: 12px;
  padding: 3px 6px;
  border-radius: 3px;
  flex-shrink: 0;
}

.item-sentiment.positive {
  background-color: #e8f5e9;
  color: #4caf50;
}

.item-sentiment.negative {
  background-color: #ffebee;
  color: #f44336;
}

.item-sentiment.neutral {
  background-color: #fafafa;
  color: #9e9e9e;
}

.no-data {
  text-align: center;
  padding: 40px 20px;
  color: #666;
  font-size: 16px;
}

.info {
  margin-top: 20px;
  padding: 10px;
  background-color: #f8f9fa;
  border-radius: 4px;
}

.info p {
  margin: 5px 0;
  font-size: 14px;
}
</style>
