/**
 * Canvas 绘制工具函数
 */

/**
 * 渲染表头 Canvas
 * @param {CanvasRenderingContext2D} headerCanvasCtx - 表头 Canvas 上下文
 * @param {HTMLCanvasElement} headerCanvas - 表头 Canvas 元素
 * @param {string} viewMode - 视图模式
 */
export const renderHeaderCanvas = (headerCanvasCtx, headerCanvas, viewMode) => {
  console.log('绘制表头 Canvas')
  if (!headerCanvasCtx || viewMode !== 'canvas') {
    console.log('表头 Canvas 上下文未找到或视图模式不正确')
    return
  }

  if (!headerCanvas) {
    console.log('表头 Canvas 元素未找到')
    return
  }

  console.log('表头 Canvas 元素已找到', headerCanvas)

  // 清除画布
  headerCanvasCtx.clearRect(0, 0, headerCanvas.width, headerCanvas.height)

  // 绘制背景
  headerCanvasCtx.fillStyle = '#ffffff'
  headerCanvasCtx.fillRect(0, 0, headerCanvas.width, headerCanvas.height)

  // 绘制表头
  const headerY = 30
  headerCanvasCtx.fillStyle = '#333333'
  headerCanvasCtx.font = 'bold 14px Arial'
  headerCanvasCtx.textAlign = 'left'
  headerCanvasCtx.fillText('序号', 10, headerY)
  headerCanvasCtx.fillText('标题', 60, headerY)
  headerCanvasCtx.fillText('来源', 300, headerY)
  headerCanvasCtx.fillText('时间', 400, headerY)
  headerCanvasCtx.fillText('情感', 500, headerY)

  // 绘制分隔线
  headerCanvasCtx.strokeStyle = '#dddddd'
  headerCanvasCtx.beginPath()
  headerCanvasCtx.moveTo(0, headerY + 10)
  headerCanvasCtx.lineTo(headerCanvas.width, headerY + 10)
  headerCanvasCtx.stroke()

  console.log('表头 Canvas 绘制完成')
}

/**
 * 渲染数据 Canvas
 * @param {CanvasRenderingContext2D} canvasCtx - 数据 Canvas 上下文
 * @param {HTMLCanvasElement} canvas - 数据 Canvas 元素
 * @param {Array} canvasData - 要渲染的数据
 * @param {number} scrollTop - 滚动位置
 * @param {string} viewMode - 视图模式
 * @param {Function} formatTimestampFn - 时间格式化函数
 */
export const renderCanvas = (canvasCtx, canvas, canvasData, scrollTop, viewMode, formatTimestampFn) => {
  console.log('渲染数据 Canvas')
  if (!canvasCtx || viewMode !== 'canvas') {
    console.log('数据 Canvas 上下文未找到或视图模式不正确')
    return
  }

  if (!canvas) {
    console.log('数据 Canvas 元素未找到')
    return
  }

  console.log('数据 Canvas 元素已找到', canvas)

  // 清除画布
  canvasCtx.clearRect(0, 0, canvas.width, canvas.height)

  // 绘制背景
  canvasCtx.fillStyle = '#ffffff'
  canvasCtx.fillRect(0, 0, canvas.width, canvas.height)

  // 如果没有数据，显示提示信息
  if (canvasData.length === 0) {
    console.log('没有数据，显示提示信息')
    canvasCtx.fillStyle = '#666666'
    canvasCtx.font = '16px Arial'
    canvasCtx.textAlign = 'center'
    canvasCtx.fillText('暂无舆情数据，请点击"开始模拟"按钮生成数据', canvas.width / 2, canvas.height / 2)
    return
  }

  console.log('开始绘制数据行，数据量：', canvasData.length)

  // 绘制数据行
  const rowHeight = 60
  const startY = -scrollTop

  // 计算可见行数
  const visibleRows = Math.ceil(canvas.height / rowHeight) + 2
  const startRow = Math.max(0, Math.floor(scrollTop / rowHeight))
  const endRow = Math.min(canvasData.length, startRow + visibleRows)

  console.log('可见行范围：', startRow, '到', endRow)

  for (let i = startRow; i < endRow; i++) {
    const item = canvasData[i]
    const y = startY + (i * rowHeight) // 修复：移除不必要的 +1

    // 交替行背景色
    if (i % 2 === 0) {
      canvasCtx.fillStyle = '#f8f9fa'
      canvasCtx.fillRect(0, y - 20, canvas.width, rowHeight)
    }

    // 绘制序号
    canvasCtx.fillStyle = '#999999'
    canvasCtx.font = '12px Arial'
    canvasCtx.textAlign = 'left'
    canvasCtx.fillText((i + 1).toString(), 10, y)

    // 绘制标题
    canvasCtx.fillStyle = '#333333'
    canvasCtx.font = '14px Arial'
    canvasCtx.fillText(item.title.length > 30 ? item.title.substring(0, 30) + '...' : item.title, 60, y)

    // 绘制来源
    canvasCtx.fillStyle = '#666666'
    canvasCtx.font = '12px Arial'
    canvasCtx.fillText(item.source, 300, y)

    // 绘制时间
    canvasCtx.fillStyle = '#999999'
    canvasCtx.font = '12px Arial'
    canvasCtx.fillText(formatTimestampFn(item.timestamp), 400, y)

    // 绘制情感
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

    // 绘制情感背景
    canvasCtx.fillStyle = bgColor
    canvasCtx.fillRect(500, y - 15, 50, 20)

    // 绘制情感文本
    canvasCtx.fillStyle = sentimentColor
    canvasCtx.font = '12px Arial'
    canvasCtx.textAlign = 'center'
    canvasCtx.fillText(sentimentText, 525, y)

    // 绘制分隔线
    canvasCtx.strokeStyle = '#eeeeee'
    canvasCtx.beginPath()
    canvasCtx.moveTo(0, y + 20)
    canvasCtx.lineTo(canvas.width, y + 20)
    canvasCtx.stroke()
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
  const scrollDelta = event.deltaY > 0 ? 20 : -20
  const newScrollTop = Math.max(0, setScrollTopFn() + scrollDelta)
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

  console.log('获取到的 Canvas 元素:', canvas, headerCanvas)

  const canvasCtx = canvas.getContext('2d')
  const headerCanvasCtx = headerCanvas.getContext('2d')

  setHeaderCanvasCtxFn(headerCanvasCtx)
  setCanvasCtxFn(canvasCtx)

  console.log('获取到的 Canvas 上下文:', canvasCtx, headerCanvasCtx)

  // 设置 Canvas 尺寸
  console.log('开始设置 Canvas 尺寸')
  console.log('canvas.parentElement:', canvas.parentElement)
  console.log('headerCanvas.parentElement:', headerCanvas.parentElement)

  const container = canvas.parentElement ? canvas.parentElement.closest('.canvas-container') : null
  const headerContainer = headerCanvas.parentElement
  console.log('获取到的容器元素:', container, headerContainer)

  if (!container) {
    console.log('容器元素未找到')
    return
  }

  canvas.width = container.clientWidth
  canvas.height = container.clientHeight - 40 // 减去表头高度（40px）
  headerCanvas.width = headerContainer.clientWidth
  headerCanvas.height = 40 // 表头高度设置为40px

  console.log('Canvas 尺寸设置完成', canvas.width, canvas.height, headerCanvas.width, headerCanvas.height)

  // 绘制表头
  renderHeaderCanvasFn()

  // 开始渲染循环
  renderCanvasFn()
}