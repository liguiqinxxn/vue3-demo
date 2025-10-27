/**
 * 网络状态检测和处理工具函数
 */

import { adjustDataQualityByNetwork } from './dataUtils'

/**
 * 模拟网络状态检测
 * @param {Object} options - 配置选项
 * @param {Function} options.getNetworkStatus - 获取当前网络状态的函数
 * @param {Function} options.setNetworkStatus - 设置网络状态的函数
 * @param {Function} options.getDataAccuracy - 获取数据准确率的函数
 * @param {Function} options.setDataAccuracy - 设置数据准确率的函数
 * @param {Function} options.getRealTimeDelay - 获取实时延迟的函数
 * @param {Function} options.setRealTimeDelay - 设置实时延迟的函数
 * @returns {void}
 */
export const checkNetworkStatus = (options) => {
  const {
    getNetworkStatus,
    setNetworkStatus,
    getDataAccuracy,
    setDataAccuracy,
    getRealTimeDelay,
    setRealTimeDelay
  } = options

  // 在实际应用中，可以通过 navigator.connection 或其他方式检测网络状态
  // 这里我们模拟不同的网络状态
  const statuses = ['online', 'weak', 'offline']
  const newNetworkStatus = statuses[Math.floor(Math.random() * statuses.length)]
  setNetworkStatus(newNetworkStatus)

  // 根据网络状态调整数据质量指标
  const metrics = {
    dataAccuracy: getDataAccuracy(),
    realTimeDelay: getRealTimeDelay()
  }

  const updatedMetrics = adjustDataQualityByNetwork(newNetworkStatus, metrics)
  setDataAccuracy(updatedMetrics.dataAccuracy)
  setRealTimeDelay(updatedMetrics.realTimeDelay)
}