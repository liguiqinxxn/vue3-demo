/**
 * Canvas 绘制工具函数
 */

/**
 * 绘制圆角矩形
 * @param {CanvasRenderingContext2D} ctx - Canvas上下文
 * @param {number} x - X坐标
 * @param {number} y - Y坐标
 * @param {number} width - 宽度
 * @param {number} height - 高度
 * @param {number} radius - 圆角半径
 */
function drawRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.fill();
}

/**
 * 渲染表头 Canvas
 * @param {CanvasRenderingContext2D} headerCanvasCtx - 表头 Canvas 上下文
 * @param {HTMLCanvasElement} headerCanvas - 表头 Canvas 元素
 * @param {string} viewMode - 视图模式
 */
export const renderHeaderCanvas = (headerCanvasCtx, headerCanvas, viewMode) => {
  console.log('渲染表头 Canvas')
  if (!headerCanvasCtx || !headerCanvas || viewMode !== 'canvas') {
    console.log('表头 Canvas 上下文或元素未找到或视图模式不正确')
    return
  }

  // 清除画布
  headerCanvasCtx.clearRect(0, 0, headerCanvas.width, headerCanvas.height)

  // 表头高度与CSS中保持一致
  const headerHeight = 40
  // 注意：不要直接设置headerCanvas.height，这会重置Canvas上下文
  // 而是在初始化时设置Canvas尺寸

  // 绘制背景（与列表视图.header-canvas背景保持一致）
  headerCanvasCtx.fillStyle = '#f5f5f5'
  headerCanvasCtx.fillRect(0, 0, headerCanvas.width, headerHeight)

  // 绘制表头文本 (垂直居中)
  headerCanvasCtx.fillStyle = '#333333'
  headerCanvasCtx.font = 'bold 14px Arial' // 加粗字体，与列表视图保持一致
  headerCanvasCtx.textAlign = 'left'

  // 计算文本垂直居中位置
  const textBaseline = headerHeight / 2 + 5 // 5是字体基线偏移量

  // 绘制表头列标题（位置与列表项保持一致）
  headerCanvasCtx.fillText('序号', 15, textBaseline) // 与.item-index位置对齐
  headerCanvasCtx.fillText('标题/来源', 60, textBaseline) // 与.item-content位置对齐
  headerCanvasCtx.fillText('时间', 350, textBaseline) // 与.item-time位置对齐
  headerCanvasCtx.fillText('时间戳', 430, textBaseline) // 与.item-timestamp位置对齐
  headerCanvasCtx.fillText('情感', 520, textBaseline) // 与.item-sentiment位置对齐

  // 绘制分隔线 (在表头底部)
  headerCanvasCtx.strokeStyle = '#dddddd'
  headerCanvasCtx.beginPath()
  headerCanvasCtx.moveTo(0, headerHeight - 1)
  headerCanvasCtx.lineTo(headerCanvas.width, headerHeight - 1)
  headerCanvasCtx.stroke()

  console.log('表头 Canvas 绘制完成')
}

/**
 * 渲染数据 Canvas
 * @param {CanvasRenderingContext2D} canvasCtx - Canvas 上下文
 * @param {HTMLCanvasElement} canvas - Canvas 元素
 * @param {Array} data - 要渲染的数据
 * @param {number} scrollTop - 滚动位置
 * @param {string} viewMode - 视图模式
 * @param {Function} formatTimestampFn - 格式化时间戳的函数
 */
export const renderCanvas = (canvasCtx, canvas, data, scrollTop, viewMode, formatTimestampFn) => {
  if (!canvasCtx || !canvas) {
    console.log('Canvas 上下文或元素未找到')
    return
  }

  console.log('开始绘制数据 Canvas', data.length, scrollTop, viewMode)
  
  // 清除画布
  canvasCtx.clearRect(0, 0, canvas.width, canvas.height)
  
  // 设置字体和样式
  canvasCtx.font = '14px Arial'
  canvasCtx.textBaseline = 'middle'
  
  // 定义行高 (与.sentiment-item样式保持一致)
  const rowHeight = 60
  
  // 计算可见区域的起始和结束索引
  const startIndex = Math.floor(scrollTop / rowHeight)
  const endIndex = Math.min(data.length, startIndex + Math.ceil(canvas.height / rowHeight) + 1)
  
  console.log('渲染数据范围:', startIndex, '到', endIndex, '总共', data.length, '条数据')
  
  // 绘制可见的数据行
  for (let i = startIndex; i < endIndex; i++) {
    const item = data[i]
    if (!item) continue
    
    const y = i * rowHeight - scrollTop
    
    // 跳过完全不可见的行
    if (y + rowHeight < 0 || y > canvas.height) {
      continue
    }
    
    // 绘制背景 (与.sentiment-item样式保持一致)
    canvasCtx.fillStyle = i % 2 === 0 ? '#ffffff' : '#f8f9fa'
    canvasCtx.fillRect(0, y, canvas.width, rowHeight)
    
    // 绘制分隔线 (与.sentiment-item样式保持一致)
    canvasCtx.fillStyle = '#eeeeee'
    canvasCtx.fillRect(0, y + rowHeight - 1, canvas.width, 1)
    
    // 计算文本基线 (垂直居中)
    const textBaseline = y + rowHeight / 2
    
    // 绘制序号 (与.item-index样式保持一致)
    canvasCtx.fillStyle = '#999999'
    canvasCtx.font = '12px Arial'
    canvasCtx.textAlign = 'left'
    canvasCtx.fillText((i + 1).toString(), 15, textBaseline)
    
    // 绘制标题 (与.item-title样式保持一致)
    canvasCtx.fillStyle = '#333333'
    canvasCtx.font = '14px Arial'
    canvasCtx.fontWeight = '500'
    const title = item.title.length > 30 ? item.title.substring(0, 30) + '...' : item.title
    canvasCtx.fillText(title, 60, textBaseline - 10) // 上移一点为来源留出空间
    
    // 绘制来源 (与.item-source样式保持一致)
    canvasCtx.fillStyle = '#666666'
    canvasCtx.font = '12px Arial'
    canvasCtx.fillText(item.source.length > 25 ? item.source.substring(0, 25) + '...' : item.source, 60, textBaseline + 10) // 下移一点以显示在标题下方
    
    // 绘制时间 (与.item-time样式保持一致)
    canvasCtx.fillStyle = '#999999'
    canvasCtx.font = '12px Arial'
    canvasCtx.fillText(item.time, 350, textBaseline)
    
    // 绘制时间戳 (与.item-timestamp样式保持一致)
    canvasCtx.fillStyle = '#999999'
    canvasCtx.font = '12px Arial'
    canvasCtx.fillText(formatTimestampFn(item.timestamp), 430, textBaseline)
    
    // 绘制情感 (与.item-sentiment样式保持一致)
    let sentimentText = ''
    let sentimentColor = '#9e9e9e'
    let bgColor = '#fafafa'
    
    switch (item.sentiment) {
      case 'positive':
        sentimentText = '正面'
        sentimentColor = '#4caf50'
        bgColor = '#e8f5e9'
        break
      case 'negative':
        sentimentText = '负面'
        sentimentColor = '#f44336'
        bgColor = '#ffebee'
        break
      default:
        sentimentText = '中性'
        sentimentColor = '#9e9e9e'
        bgColor = '#fafafa'
    }
    
    // 绘制情感背景 (垂直居中，与.item-sentiment样式保持一致)
    const sentimentX = 520
    const sentimentY = y + (rowHeight - 20) / 2
    const sentimentWidth = 40
    const sentimentHeight = 20
    
    // 绘制圆角矩形背景
    canvasCtx.fillStyle = bgColor
    drawRoundedRect(canvasCtx, sentimentX, sentimentY, sentimentWidth, sentimentHeight, 3) // 3px圆角
    
    // 绘制情感文本 (垂直居中)
    canvasCtx.fillStyle = sentimentColor
    canvasCtx.font = '12px Arial'
    canvasCtx.textAlign = 'center'
    canvasCtx.fillText(sentimentText, sentimentX + sentimentWidth / 2, y + rowHeight / 2 + 5)
  }
  
  console.log('数据 Canvas 绘制完成')
}

/**
 * 处理 Canvas 滚动
 * @param {Event} event - 滚动事件
 * @param {Function} setScrollTopFn - 设置滚动位置的函数
 * @param {Function} renderCanvasFn - 重新渲染Canvas的函数
 * @param {CanvasRenderingContext2D} canvasCtx - Canvas上下文
 */
export const handleCanvasScroll = (event, setScrollTopFn, renderCanvasFn, canvasCtx) => {
  event.preventDefault()

  // 计算滚动距离
  // 优化：根据滚动方向和幅度调整滚动速度，提供更流畅的体验
  const scrollDelta = event.deltaY > 0 ? Math.min(100, event.deltaY) : Math.max(-100, event.deltaY)
  const currentScrollTop = setScrollTopFn()
  const newScrollTop = Math.max(0, currentScrollTop + scrollDelta)
  setScrollTopFn(newScrollTop)

  // 重新渲染
  if (canvasCtx) {
    renderCanvasFn()
  }
}

/**
 * 初始化 Canvas
 * @param {Object} options - 初始化选项
 * @param {HTMLCanvasElement} options.canvas - 数据 Canvas 元素
 * @param {HTMLCanvasElement} options.headerCanvas - 表头 Canvas 元素
 * @param {Function} options.setHeaderCanvasCtxFn - 设置表头 Canvas 上下文的函数
 * @param {Function} options.setCanvasCtxFn - 设置数据 Canvas 上下文的函数
 * @param {Function} options.renderHeaderCanvasFn - 渲染表头 Canvas 的函数
 * @param {Function} options.renderCanvasFn - 渲染数据 Canvas 的函数
 */
export const initializeCanvas = (options) => {
  const {
    canvas,
    headerCanvas,
    setHeaderCanvasCtxFn,
    setCanvasCtxFn,
    renderHeaderCanvasFn,
    renderCanvasFn
  } = options

  console.log('获取到的 Canvas 元素:', canvas)
  console.log('获取到的表头 Canvas 元素:', headerCanvas)

  // 添加检查防止错误
  if (!canvas || !headerCanvas) {
    console.log('Canvas 元素未找到')
    return
  }

  const canvasCtx = canvas.getContext('2d')
  const headerCanvasCtx = headerCanvas.getContext('2d')
  
  setCanvasCtxFn(canvasCtx)
  setHeaderCanvasCtxFn(headerCanvasCtx)

  console.log('获取到的 Canvas 上下文:', canvasCtx)
  console.log('获取到的表头 Canvas 上下文:', headerCanvasCtx)

  // 设置 Canvas 尺寸
  console.log('开始设置 Canvas 尺寸')
  console.log('canvas.parentElement:', canvas.parentElement)

  const container = canvas.parentElement ? canvas.parentElement.closest('.canvas-container') : null
  console.log('获取到的容器元素:', container)

  if (!container) {
    console.log('容器元素未找到')
    return
  }

  // 设置表头和数据 Canvas 的尺寸
  const containerWidth = container.clientWidth
  const containerHeight = container.clientHeight
  
  // 确保容器宽度不为0
  if (containerWidth === 0) {
    console.warn('容器宽度为0，使用默认宽度800px')
    canvas.width = 800
    headerCanvas.width = 800
  } else {
    // 表头 Canvas
    headerCanvas.width = containerWidth
    headerCanvas.height = 40 // 表头高度固定为40px
    
    // 数据 Canvas
    canvas.width = containerWidth
    // 设置Canvas高度，减去表头高度
    canvas.height = Math.max(0, containerHeight - 40)
  }

  // 确保canvas元素可以正确显示
  canvas.style.display = 'block'

  console.log('Canvas 尺寸设置完成', canvas.width, canvas.height)
  console.log('表头 Canvas 尺寸设置完成', headerCanvas.width, headerCanvas.height)

  // 渲染表头
  if (typeof renderHeaderCanvasFn === 'function') {
    renderHeaderCanvasFn()
  }
  
  // 开始渲染循环
  if (typeof renderCanvasFn === 'function') {
    renderCanvasFn()
  }
}