/**
 * WebSocket 连接和管理工具函数
 */

/**
 * 创建 WebSocket 连接
 * @param {string} url - WebSocket 服务器地址
 * @param {Object} options - 连接选项
 * @returns {WebSocket} WebSocket 实例
 */
export const createWebSocket = (url, options = {}) => {
  return new WebSocket(url)
}

/**
 * 发送消息到 WebSocket 服务器
 * @param {WebSocket} ws - WebSocket 实例
 * @param {Object} message - 要发送的消息对象
 * @returns {boolean} 是否发送成功
 */
export const sendWebSocketMessage = (ws, message) => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message))
    return true
  }
  return false
}

/**
 * 检查 WebSocket 连接状态
 * @param {WebSocket} ws - WebSocket 实例
 * @returns {string} 连接状态描述
 */
export const getWebSocketStatus = (ws) => {
  if (!ws) return 'disconnected'
  
  switch (ws.readyState) {
    case WebSocket.CONNECTING:
      return 'connecting'
    case WebSocket.OPEN:
      return 'open'
    case WebSocket.CLOSING:
      return 'closing'
    case WebSocket.CLOSED:
      return 'closed'
    default:
      return 'unknown'
  }
}

/**
 * 安全地关闭 WebSocket 连接
 * @param {WebSocket} ws - WebSocket 实例
 */
export const closeWebSocket = (ws) => {
  if (ws) {
    ws.close()
  }
}

/**
 * 发送数据并处理弱网环境
 * @param {Object} options - 发送选项
 * @param {WebSocket} options.ws - WebSocket 实例
 * @param {Object} options.data - 要发送的数据
 * @param {string} options.networkStatus - 网络状态 ('online', 'weak', 'offline')
 * @param {Function} options.validateDataFn - 数据验证函数
 * @param {Function} options.updateDataFn - 数据更新函数
 * @param {Function} options.limitArrayLengthFn - 数组长度限制函数
 * @param {Object} options.dataCache - 数据缓存管理器
 * @param {Function} options.sendWebSocketMessageFn - WebSocket消息发送函数
 */
export const sendDataWithNetworkHandling = (options) => {
  const {
    ws,
    data,
    networkStatus,
    validateDataFn,
    updateDataFn,
    limitArrayLengthFn,
    dataCache,
    sendWebSocketMessageFn
  } = options

  // 检查网络状态
  if (networkStatus === 'offline') {
    // 离线状态，直接缓存数据
    dataCache.add(data)
    console.log('网络离线，数据已缓存')
    return
  }

  if (networkStatus === 'weak') {
    // 弱网状态，缓存数据并尝试发送
    dataCache.add(data)
    console.log('弱网环境，数据已缓存并尝试发送')

    // 如果 WebSocket 连接正常，通过 WebSocket 发送数据
    if (ws && ws.readyState === WebSocket.OPEN) {
      sendWebSocketMessageFn(ws, { type: 'data', payload: data })
      if (validateDataFn(data)) {
        updateDataFn(data)

        // 限制最大数据点数量以保持性能
        // 注意：这里需要在调用时传入完整的数据数组进行限制
      }
    }
    return
  }

  // 良好网络状态
  if (ws && ws.readyState === WebSocket.OPEN) {
    // 通过 WebSocket 发送数据
    sendWebSocketMessageFn(ws, { type: 'data', payload: data })

    if (validateDataFn(data)) {
      updateDataFn(data)

      // 限制最大数据点数量以保持性能
      // 注意：这里需要在调用时传入完整的数据数组进行限制
    }

    // 如果缓存队列中有数据，也一起处理
    if (dataCache.length > 0) {
      const batch = []
      for (let i = 0; i < Math.min(5, dataCache.length); i++) {
        batch.push(dataCache.cache[i])
      }
      dataCache.cache.splice(0, batch.length)

      for (const item of batch) {
        sendWebSocketMessageFn(ws, { type: 'data', payload: item })
        if (validateDataFn(item)) {
          updateDataFn(item)

          // 限制最大数据点数量以保持性能
          // 注意：这里需要在调用时传入完整的数据数组进行限制
        }
      }
    }
  } else {
    // 未连接状态，缓存数据
    dataCache.add(data)
  }
}

/**
 * WebSocket 重连配置和管理
 */
export class WebSocketReconnector {
  constructor(options = {}) {
    this.maxRetries = options.maxRetries || 5
    this.retryDelay = options.retryDelay || 3000
    this.currentRetries = 0
    this.retryTimer = null
  }

  /**
   * 尝试重连
   * @param {Function} connectFn - 连接函数
   * @param {Function} onRetry - 重试回调
   * @param {Function} onFailed - 重试失败回调
   */
  attemptReconnect(connectFn, onRetry, onFailed) {
    if (this.currentRetries < this.maxRetries) {
      this.currentRetries++

      if (onRetry) {
        onRetry(this.currentRetries, this.maxRetries)
      }

      // 清除之前的定时器
      if (this.retryTimer) {
        clearTimeout(this.retryTimer)
      }

      // 设置重连定时器
      this.retryTimer = setTimeout(() => {
        connectFn()
      }, this.retryDelay)
    } else {
      this.currentRetries = 0
      if (onFailed) {
        onFailed()
      }
    }
  }

  /**
   * 重置重连计数器
   */
  reset() {
    this.currentRetries = 0
    if (this.retryTimer) {
      clearTimeout(this.retryTimer)
      this.retryTimer = null
    }
  }
}

/**
 * WebSocket 心跳检测管理
 */
export class WebSocketHeartbeat {
  constructor(options = {}) {
    this.interval = options.interval || 30000 // 30秒
    this.timeout = options.timeout || 5000 // 5秒
    this.heartbeatTimer = null
    this.timeoutTimer = null
  }

  /**
   * 启动心跳检测
   * @param {WebSocket} ws - WebSocket 实例
   * @param {Function} onHeartbeat - 心跳发送回调
   * @param {Function} onTimeout - 心跳超时回调
   */
  start(ws, onHeartbeat, onTimeout) {
    this.stop()

    this.heartbeatTimer = setInterval(() => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        if (onHeartbeat) {
          onHeartbeat()
        }

        // 设置心跳响应超时检测
        if (this.timeoutTimer) {
          clearTimeout(this.timeoutTimer)
        }

        this.timeoutTimer = setTimeout(() => {
          if (onTimeout) {
            onTimeout()
          }
        }, this.timeout)
      }
    }, this.interval)
  }

  /**
   * 停止心跳检测
   */
  stop() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }

    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer)
      this.timeoutTimer = null
    }
  }
}

/**
 * WebSocket 数据缓存管理
 */
export class WebSocketDataCache {
  constructor(options = {}) {
    this.cache = []
    this.processInterval = options.processInterval || 1000
    this.batchSize = options.batchSize || 10
    this.processTimer = null
  }

  /**
   * 添加数据到缓存队列
   * @param {any} data - 要缓存的数据
   */
  add(data) {
    this.cache.push(data)
  }

  /**
   * 启动缓存数据处理
   * @param {WebSocket} ws - WebSocket 实例
   * @param {Function} onDataSend - 数据发送回调
   */
  startProcessing(ws, onDataSend) {
    this.stopProcessing()

    this.processTimer = setInterval(() => {
      if (this.cache.length > 0 && ws && ws.readyState === WebSocket.OPEN) {
        // 批量发送缓存数据
        const batch = this.cache.splice(0, Math.min(this.batchSize, this.cache.length))
        console.log(`发送 ${batch.length} 条缓存数据`)

        if (onDataSend) {
          onDataSend(batch)
        }
      }
    }, this.processInterval)
  }

  /**
   * 停止缓存数据处理
   */
  stopProcessing() {
    if (this.processTimer) {
      clearInterval(this.processTimer)
      this.processTimer = null
    }
  }

  /**
   * 获取缓存队列长度
   * @returns {number} 缓存队列长度
   */
  get length() {
    return this.cache.length
  }
}

/**
 * 连接 WebSocket 并处理事件
 * @param {Object} options - 连接选项
 * @param {string} options.url - WebSocket 服务器地址
 * @param {Object} options.state - 组件状态对象
 * @param {Function} options.onOpen - 连接打开回调
 * @param {Function} options.onMessage - 消息接收回调
 * @param {Function} options.onClose - 连接关闭回调
 * @param {Function} options.onError - 错误处理回调
 * @returns {WebSocket} WebSocket 实例
 */
export const connectWebSocket = (options) => {
  const {
    url,
    state,
    onOpen,
    onMessage,
    onClose,
    onError
  } = options

  const ws = new WebSocket(url)

  // WebSocket 连接打开
  ws.onopen = (event) => {
    state.isConnected.value = true
    state.isConnecting.value = false
    state.status.value = '已连接'
    state.networkStatus.value = 'online'

    if (onOpen) {
      onOpen(event)
    }
  }

  // WebSocket 消息接收
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data)

    if (onMessage) {
      onMessage(data)
    }
  }

  // WebSocket 错误处理
  ws.onerror = (event) => {
    state.status.value = `连接错误: ${event.message}`
    state.networkStatus.value = 'offline'

    if (onError) {
      onError(event)
    }
  }

  // WebSocket 连接关闭
  ws.onclose = (event) => {
    state.isConnected.value = false
    state.isConnecting.value = false

    if (event.wasClean) {
      state.status.value = `连接已关闭: ${event.code} ${event.reason}`
    } else {
      state.status.value = '连接意外断开'
    }

    state.networkStatus.value = 'offline'
    
    if (onClose) {
      onClose(event)
    }
  }

  return ws
}

/**
 * 断开 WebSocket 连接
 * @param {Object} options - 断开连接选项
 * @param {WebSocket} options.ws - WebSocket 实例
 * @param {Object} options.state - 组件状态对象
 * @param {Function} options.stopSimulation - 停止模拟函数
 * @param {Function} options.stopHeartbeat - 停止心跳检测函数
 * @param {Function} options.stopCacheProcessing - 停止缓存处理函数
 * @param {Object} options.reconnectConfig - 重连配置
 */
export const disconnectWebSocket = (options) => {
  const {
    ws,
    state,
    stopSimulation,
    stopHeartbeat,
    stopCacheProcessing,
    reconnectConfig
  } = options

  closeWebSocket(ws)

  state.isConnected.value = false
  state.isConnecting.value = false
  state.status.value = '已断开'
  state.networkStatus.value = 'offline'
  
  if (stopSimulation) {
    stopSimulation()
  }
  
  if (stopHeartbeat) {
    stopHeartbeat()
  }
  
  if (stopCacheProcessing) {
    stopCacheProcessing()
  }
  
  reconnectConfig.reset()
}

/**
 * 启动心跳检测
 * @param {Object} options - 心跳检测选项
 * @param {WebSocket} options.ws - WebSocket 实例
 * @param {Object} options.heartbeatManager - 心跳管理器
 * @param {Function} options.sendHeartbeat - 发送心跳包函数
 * @param {Function} options.onTimeout - 心跳超时回调
 */
export const startHeartbeatDetection = (options) => {
  const {
    ws,
    heartbeatManager,
    sendHeartbeat,
    onTimeout
  } = options

  heartbeatManager.stop()
  heartbeatManager.start(ws, sendHeartbeat, onTimeout)
}

/**
 * 处理 WebSocket 重连
 * @param {Object} options - 重连选项
 * @param {Function} options.connectFn - 连接函数
 * @param {Object} options.state - 组件状态对象
 * @param {Object} options.reconnectConfig - 重连配置
 */
export const handleWebSocketReconnect = (options) => {
  const {
    connectFn,
    state,
    reconnectConfig
  } = options

  reconnectConfig.attemptReconnect(
    connectFn,
    (currentRetries, maxRetries) => {
      state.status.value = `连接断开，${reconnectConfig.retryDelay/1000}秒后尝试重连 (${currentRetries}/${maxRetries})`
      state.networkStatus.value = 'offline'
    },
    () => {
      state.status.value = '连接失败，已达到最大重试次数'
      state.networkStatus.value = 'offline'
    }
  )
}
