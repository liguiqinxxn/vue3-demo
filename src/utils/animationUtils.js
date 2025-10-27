// 滚动动画管理器类
export class AnimationManager {
  constructor(options) {
    this.position = options.position
    this.itemWidthWithGap = options.itemWidthWithGap
    this.loop = options.loop
    this.visibleCount = options.visibleCount
    this.itemsCount = options.itemsCount
    this.actualItemsCount = options.actualItemsCount
    this.containerWidth = options.containerWidth
    
    this.animationFrameId = null
  }
  
  // 缓动函数
  easeOutQuad(t) {
    return t * (2 - t)
  }
  
  // 移动到指定位置
  moveTo(newPosition) {
    let targetPosition = newPosition
    
    if (!this.loop) {
      // 非循环模式下限制位置
      const minPosition = -(this.actualItemsCount - this.visibleCount) * this.itemWidthWithGap.value
      targetPosition = Math.max(minPosition, Math.min(0, targetPosition))
    }
    
    this.position.value = targetPosition
    
    // 循环模式下的位置校正
    if (this.loop && this.actualItemsCount > this.visibleCount) {
      const realItemsCount = this.itemsCount
      const beforeItemsCount = this.visibleCount
      
      // 移动到了复制的前面部分，校正到实际的后面
      if (this.position.value > 0) {
        this.position.value = this.position.value - (beforeItemsCount + realItemsCount) * this.itemWidthWithGap.value
      }
      
      // 移动到了复制的后面部分，校正到实际的前面
      if (this.position.value < -(beforeItemsCount + realItemsCount) * this.itemWidthWithGap.value + this.containerWidth.value) {
        this.position.value = this.position.value + (beforeItemsCount + realItemsCount) * this.itemWidthWithGap.value
      }
    }
  }
  
  // 使用requestAnimationFrame进行平滑动画
  smoothMove(targetPosition) {
    this.cancelAnimation()
    
    const startPosition = this.position.value
    const startTime = performance.now()
    const distance = targetPosition - startPosition
    const duration = 300 // 动画持续时间
    
    const animate = (currentTime) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      // 使用缓动函数
      const easedProgress = this.easeOutQuad(progress)
      
      this.position.value = startPosition + distance * easedProgress
      
      if (progress < 1) {
        this.animationFrameId = requestAnimationFrame(animate)
      }
    }
    
    this.animationFrameId = requestAnimationFrame(animate)
  }
  
  // 取消动画
  cancelAnimation() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
  }
}

// 自动播放管理器类
export class AutoplayManager {
  constructor(options) {
    this.autoplay = options.autoplay
    this.autoplaySpeed = options.autoplaySpeed
    this.itemsCount = options.itemsCount
    this.visibleCount = options.visibleCount
    this.next = options.next
    
    this.timer = null
    this.isRunning = false
  }
  
  // 开始自动播放
  start() {
    // 只有在满足条件且当前未运行时才启动
    if (!this.autoplay || this.itemsCount <= this.visibleCount || this.isRunning) {
      return
    }
    
    this.isRunning = true
    this.scheduleNext()
  }
  
  // 安排下一次自动播放
  scheduleNext() {
    // 确保清除之前的计时器
    this.clear()
    
    this.timer = setTimeout(() => {
      // 确保autoplay仍为true且组件仍在运行
      if (this.autoplay && this.isRunning) {
        this.next()
        // 安排下一次移动
        this.scheduleNext()
      }
    }, this.autoplaySpeed)
  }
  
  // 重置自动播放计时器
  reset() {
    // 如果当前正在运行，则重新安排
    if (this.isRunning) {
      this.scheduleNext()
    }
  }
  
  // 清除计时器
  clear() {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
  }
  
  // 停止自动播放
  stop() {
    this.isRunning = false
    this.clear()
  }
  
  // 恢复自动播放
  resume() {
    if (!this.isRunning) {
      this.start()
    }
  }
}