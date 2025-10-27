/**
 * 数据处理和格式化工具函数
 */

/**
 * 格式化时间戳为 HH:MM:SS 格式
 * @param {number} timestamp - 时间戳
 * @returns {string} 格式化后的时间字符串
 */
export const formatTimestamp = (timestamp) => {
  const date = new Date(timestamp)
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`
}

/**
 * 验证舆情数据的准确性
 * @param {Object} item - 舆情数据项
 * @param {Set} receivedSequenceNumbers - 已接收的序列号集合
 * @param {number} expectedSequenceNumber - 期望的序列号
 * @returns {Object} 验证结果和更新后的状态
 */
export const validateSentimentData = (item, receivedSequenceNumbers, expectedSequenceNumber) => {
  const result = {
    isValid: true,
    accuracyImpact: 0,
    isDuplicate: false,
    lostCount: 0
  }

  // 检查必需字段
  if (!item.id || !item.title || !item.timestamp) {
    result.isValid = false
    result.accuracyImpact = -0.1
    return result
  }

  // 检查序列号是否重复
  if (receivedSequenceNumbers.has(item.sequenceNumber)) {
    result.isDuplicate = true
    result.isValid = false
    result.accuracyImpact = -0.05
    return result
  }

  // 检查序列号是否丢失（仅当序列号大于期望值时才计算丢失）
  if (item.sequenceNumber > expectedSequenceNumber) {
    const lost = item.sequenceNumber - expectedSequenceNumber
    result.lostCount = lost
    result.accuracyImpact = -(lost * 0.1)
  }

  // 检查时间戳是否合理
  const now = Date.now()
  const timeDiff = Math.abs(now - item.timestamp)
  if (timeDiff > 300000) { // 超过5分钟认为时间戳异常
    result.isValid = false
    result.accuracyImpact = -0.1
  }

  return result
}

/**
 * 计算实时性延迟
 * @param {number} timestamp - 数据时间戳
 * @returns {number} 延迟毫秒数
 */
export const calculateRealTimeDelay = (timestamp) => {
  const now = Date.now()
  return now - timestamp
}

/**
 * 根据网络状态调整数据质量指标
 * @param {string} networkStatus - 网络状态 ('online', 'weak', 'offline')
 * @param {Object} metrics - 当前数据质量指标
 * @returns {Object} 更新后的数据质量指标
 */
export const adjustDataQualityByNetwork = (networkStatus, metrics) => {
  const updatedMetrics = { ...metrics }

  switch (networkStatus) {
    case 'offline':
      updatedMetrics.dataAccuracy = Math.max(0, updatedMetrics.dataAccuracy - 0.5)
      updatedMetrics.realTimeDelay += 1000
      break
    case 'weak':
      updatedMetrics.dataAccuracy = Math.max(20, updatedMetrics.dataAccuracy - 0.1)
      updatedMetrics.realTimeDelay += 200
      break
    default: // online
      updatedMetrics.dataAccuracy = Math.min(100, updatedMetrics.dataAccuracy + 0.1)
      updatedMetrics.realTimeDelay = Math.max(0, updatedMetrics.realTimeDelay - 50)
  }

  return updatedMetrics
}

/**
 * 生成随机情感值
 * @returns {string} 情感值 ('positive', 'negative', 'neutral')
 */
export const generateRandomSentiment = () => {
  const sentiments = ['positive', 'negative', 'neutral']
  return sentiments[Math.floor(Math.random() * sentiments.length)]
}

/**
 * 限制数组长度
 * @param {Array} array - 要限制的数组
 * @param {number} maxLength - 最大长度
 * @returns {Array} 限制长度后的数组
 */
export const limitArrayLength = (array, maxLength) => {
  if (array.length > maxLength) {
    return array.slice(0, maxLength)
  }
  return array
}