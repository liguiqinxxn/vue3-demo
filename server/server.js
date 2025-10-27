const WebSocket = require('ws');

// 创建 WebSocket 服务器，监听 8080 端口
const wss = new WebSocket.Server({ port: 8080 });

// 序列号计数器（每次服务器启动时重置）
let sequenceNumber = 1;

// 舆情数据模板
const sentiments = ['positive', 'negative', 'neutral'];
const sources = ['微博', '新闻', '论坛', '微信', '抖音', '小红书'];
const titles = [
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
];

// 模拟数据生成状态
let isSimulating = false;
let simulationInterval = null;

// 生成随机舆情数据
function generateSentimentItem() {
  return {
    id: Date.now() + Math.random(),
    sequenceNumber: sequenceNumber++,
    title: titles[Math.floor(Math.random() * titles.length)],
    source: sources[Math.floor(Math.random() * sources.length)],
    time: new Date().toLocaleTimeString(),
    timestamp: Date.now(),
    sentiment: sentiments[Math.floor(Math.random() * sentiments.length)]
  };
}

// 广播消息给所有连接的客户端
function broadcast(data) {
  const message = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// 开始模拟数据生成
function startSimulation() {
  if (isSimulating) return;
  
  isSimulating = true;
  console.log('开始生成模拟数据');
  
  // 每 100ms 推送一条舆情数据
  simulationInterval = setInterval(() => {
    const sentimentItem = generateSentimentItem();
    broadcast({
      type: 'data',
      payload: sentimentItem
    });
  }, 100);
}

// 停止模拟数据生成
function stopSimulation() {
  if (simulationInterval) {
    clearInterval(simulationInterval);
    simulationInterval = null;
  }
  isSimulating = false;
  console.log('停止生成模拟数据');
}

// 当有客户端连接时
wss.on('connection', (ws) => {
  console.log('客户端已连接');
  
  // 发送欢迎消息
  ws.send(JSON.stringify({
    type: 'welcome',
    message: '欢迎连接到 WebSocket 服务器'
  }));
  
  // 处理客户端消息
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      // 处理心跳包
      if (data.type === 'heartbeat') {
        ws.send(JSON.stringify({
          type: 'heartbeat',
          timestamp: Date.now()
        }));
        console.log('收到心跳包，已响应');
      }
      
      // 处理模拟数据控制命令
      if (data.type === 'control') {
        if (data.command === 'startSimulation') {
          startSimulation();
          ws.send(JSON.stringify({
            type: 'control',
            command: 'simulationStarted',
            message: '模拟数据生成已启动'
          }));
        } else if (data.command === 'stopSimulation') {
          stopSimulation();
          ws.send(JSON.stringify({
            type: 'control',
            command: 'simulationStopped',
            message: '模拟数据生成已停止'
          }));
        }
      }
    } catch (error) {
      console.error('解析客户端消息失败:', error);
    }
  });
  
  // 当客户端断开连接时
  ws.on('close', () => {
    console.log('客户端已断开连接');
    // 如果这是最后一个客户端，停止模拟数据生成
    if (wss.clients.size === 0) {
      stopSimulation();
    }
  });
  
  // 当发生错误时
  ws.on('error', (error) => {
    console.error('WebSocket 错误:', error);
  });
});

// 每 30 秒发送一次心跳包
setInterval(() => {
  broadcast({
    type: 'heartbeat',
    timestamp: Date.now()
  });
  console.log('广播心跳包');
}, 30000);

console.log('WebSocket 服务器已在端口 8080 启动');