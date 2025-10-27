// 实时舆情数据模拟生成函数
export const sentimentConfig = {
  sentiments: ['positive', 'negative', 'neutral'],
  sources: ['微博', '新闻', '论坛', '微信', '抖音', '小红书'],
  titles: [
    '新产品发布获得广泛关注',
    '公司财报超预期，股价大涨',
    '行业政策调整引发热议',
    '技术创新引领市场新趋势',
    '品牌营销活动效果显著',
    '用户满意度调查结果出炉',
    '合作伙伴关系进一步深化',
    '市场份额持续扩大',
    '产品质量问题引发讨论',
    '服务升级赢得用户好评'
  ]
}

// 生成单个舆情数据项
export function generateSentimentItem(expectedSequenceNumber, existingData = []) {
  const { sentiments, sources, titles } = sentimentConfig
  
  // 随机决定是否生成重复数据（5%概率）
  const isDuplicate = Math.random() < 0.05 && existingData.length > 0
  if (isDuplicate && existingData.length > 0) {
    // 返回一个已存在的数据项（模拟重复数据）
    const randomIndex = Math.floor(Math.random() * Math.min(existingData.length, 100))
    return { ...existingData[randomIndex] }
  }
  
  return {
    id: Date.now() + Math.random(),
    sequenceNumber: expectedSequenceNumber,
    title: titles[Math.floor(Math.random() * titles.length)],
    source: sources[Math.floor(Math.random() * sources.length)],
    time: new Date().toLocaleTimeString(),
    timestamp: Date.now(),
    sentiment: sentiments[Math.floor(Math.random() * sentiments.length)]
  }
}

export default {
  sentimentConfig,
  generateSentimentItem
}