<template>
  <div class="virtual-carousel-container" ref="containerRef" @mousedown="handleMouseDown" @mousemove="handleMouseMove" @mouseup="handleMouseUp" @mouseleave="handleMouseUp">
    <div class="virtual-carousel-track" ref="trackRef" :style="trackStyle">
      <div 
      v-for="(item, index) in visibleItems" 
      :key="item.id ?? index" 
      class="virtual-carousel-item"
      :style="{ width: actualItemWidth.value + 'px', height: props.itemHeight + 'px' }"
    >
        <slot :item="item" :index="index"></slot>
      </div>
    </div>
    <div class="virtual-carousel-pagination">
      <button 
        v-for="index in pageCount" 
        :key="index" 
        :class="{ active: currentPage === index - 1 }"
        @click="goToPage(index - 1)"
      ></button>
    </div>
    <button class="virtual-carousel-prev" @click="prev()">&lt;</button>
    <button class="virtual-carousel-next" @click="next()">&gt;</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { AnimationManager, AutoplayManager } from './../utils/animationUtils'

// 定义轮播项数据结构接口
interface CarouselItem {
  id: number
  color: string
  title: string
}

// 定义组件属性接口
interface VirtualCarouselProps {
  items: CarouselItem[]
  itemWidth?: number
  itemHeight?: number
  visibleCount?: number
  gap?: number
  autoplay?: boolean
  autoplaySpeed?: number
  loop?: boolean
  autoFit?: boolean
}

// 定义组件属性
const props = withDefaults(defineProps<VirtualCarouselProps>(), {
  itemWidth: 300,
  itemHeight: 200,
  visibleCount: 3,
  gap: 10,
  autoplay: false,
  autoplaySpeed: 3000,
  loop: true,
  autoFit: true
})

const containerRef = ref<HTMLDivElement | null>(null)
const trackRef = ref<HTMLDivElement | null>(null)
const position = ref(0)
const startX = ref(0)
const startPosition = ref(0)
const isDragging = ref(false)
const containerWidth = ref(0)
const actualItems = ref<CarouselItem[]>([])

// 创建动画管理器实例
let animationManager: AnimationManager | null = null
let autoplayManager: AutoplayManager | null = null

// 计算实际需要渲染的items（添加前后的复制项以实现循环效果）
const updateActualItems = () => {
  if (!props.loop || props.items.length <= props.visibleCount) {
    actualItems.value = [...props.items]
    return
  }
  
  // 为了实现循环效果，复制前后的项
  const beforeItems = props.items.slice(-props.visibleCount)
  const afterItems = props.items.slice(0, props.visibleCount)
  actualItems.value = [...beforeItems, ...props.items, ...afterItems]
}

// 监听items变化
watch(() => props.items, () => {
  updateActualItems()
}, { immediate: true, deep: true })

// 监听autoplay变化
watch(() => props.autoplay, (newVal) => {
  if (autoplayManager) {
    (autoplayManager as any).autoplay = newVal
    if (newVal) {
      autoplayManager.resume()
    } else {
      autoplayManager.stop()
    }
  }
})

// 监听autoplaySpeed变化
watch(() => props.autoplaySpeed, (newVal) => {
  if (autoplayManager) {
    (autoplayManager as any).autoplaySpeed = newVal
    autoplayManager.reset()
  }
})

// 根据是否自动适配，计算实际的item宽度
const actualItemWidth = computed(() => {
  if (props.autoFit && containerWidth.value > 0) {
    // 自动适配模式：根据容器宽度、可见数量和间距计算item宽度
    const totalGapWidth = props.gap * (props.visibleCount - 1)
    const availableWidth = containerWidth.value - totalGapWidth
    return Math.floor(availableWidth / props.visibleCount)
  }
  return props.itemWidth
})

const itemWidthWithGap = computed(() => actualItemWidth.value + props.gap)

const totalWidth = computed(() => {
  return actualItems.value.length * itemWidthWithGap.value - props.gap
})

const pageCount = computed(() => {
  return Math.ceil(props.items.length / props.visibleCount)
})

const currentPage = computed(() => {
  return Math.floor((position.value + containerWidth.value / 2) / containerWidth.value)
})

const trackStyle = computed(() => ({
  transform: `translateX(${position.value}px)`,
  transition: isDragging.value ? 'none' : 'transform 0.3s ease',
  width: totalWidth.value + 'px',
  display: 'flex',
  gap: props.gap + 'px'
}))

// 监听容器宽度变化，重新计算位置
watch(() => containerWidth.value, () => {
  if (props.items.length > 0 && animationManager && props.autoFit) {
    // 重新计算当前页码并跳转
    const currentPageIndex = currentPage.value
    goToPage(currentPageIndex)
  }
})

// 计算可见的items
const visibleItems = computed(() => {
  if (props.loop) {
    // 循环模式下显示实际处理过的items
    return actualItems.value
  }
  
  // 非循环模式下只显示可见的items
  const start = Math.floor(-position.value / itemWidthWithGap.value)
  const end = Math.min(start + props.visibleCount + 1, props.items.length)
  return props.items.slice(start, end)
})

// 更新容器宽度
const updateContainerWidth = () => {
  if (containerRef.value) {
    containerWidth.value = containerRef.value.clientWidth
  }
}

// 下一页
const next = () => {
  const nextPage = currentPage.value + 1
  goToPage(Math.min(nextPage, pageCount.value - 1))
}

// 上一页
const prev = () => {
  const prevPage = currentPage.value - 1
  goToPage(Math.max(prevPage, 0))
}

// 跳转到指定页
const goToPage = (pageIndex: number) => {
  let targetPosition: number
  
  if (props.loop) {
    // 循环模式下的目标位置 - 由于已经在actualItems中添加了前后复制的项，这里不需要再加visibleCount
    targetPosition = -(pageIndex * props.visibleCount) * itemWidthWithGap.value
  } else {
    // 非循环模式下的目标位置
    targetPosition = -Math.min(pageIndex * props.visibleCount, props.items.length - props.visibleCount) * itemWidthWithGap.value
  }
  
  if (animationManager) {
    animationManager.smoothMove(targetPosition)
  }
}

// 鼠标按下事件
const handleMouseDown = (e: MouseEvent) => {
  if (props.items.length <= props.visibleCount) return
  
  isDragging.value = true
  startX.value = e.clientX
  startPosition.value = position.value
  
  // 停止自动播放
  if (props.autoplay && autoplayManager) {
    autoplayManager.stop()
  }
}

// 鼠标移动事件
const handleMouseMove = (e: MouseEvent) => {
  if (!isDragging.value || props.items.length <= props.visibleCount || !animationManager) return
  
  const currentX = e.clientX
  const diff = currentX - startX.value
  
  // 使用requestAnimationFrame进行拖动动画
  animationManager.cancelAnimation()
  (animationManager as any).animationFrameId = requestAnimationFrame(() => {
    animationManager?.moveTo(startPosition.value + diff)
  })
}

// 鼠标释放事件
const handleMouseUp = () => {
  if (!isDragging.value || props.items.length <= props.visibleCount || !animationManager || !autoplayManager) return
  
  isDragging.value = false
  
  // 计算应该吸附到哪一页
  const pageIndex = Math.round(-position.value / containerWidth.value)
  goToPage(Math.max(0, Math.min(pageIndex, pageCount.value - 1)))
  
  // 恢复自动播放
  if (props.autoplay) {
    // 使用setTimeout确保动画完成后再恢复自动播放
    setTimeout(() => {
      autoplayManager.resume()
    }, 300)
  }
}

// 生命周期钩子
onMounted(() => {
  updateContainerWidth()
  window.addEventListener('resize', updateContainerWidth)
  
  // 确保visibleCount和itemWidthWithGap被正确计算
  const itemWidthWithGapValue = itemWidthWithGap.value
  
  // 初始化动画管理器
  animationManager = new AnimationManager({
    position,
    itemWidthWithGap,
    loop: props.loop,
    visibleCount: props.visibleCount,
    itemsCount: props.items.length,
    actualItemsCount: actualItems.value.length,
    containerWidth
  })
  
  // 初始化自动播放管理器
  autoplayManager = new AutoplayManager({
    autoplay: props.autoplay,
    autoplaySpeed: props.autoplaySpeed,
    itemsCount: props.items.length,
    visibleCount: props.visibleCount,
    next
  })
  
  // 初始化位置
  if (props.items.length > 0 && animationManager) {
    goToPage(0)
  }
  
  // 开始自动播放
  if (props.autoplay && autoplayManager) {
    autoplayManager.start()
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', updateContainerWidth)
  if (animationManager) {
    animationManager.cancelAnimation()
  }
  if (autoplayManager) {
    autoplayManager.stop()
  }
})
</script>

<style scoped>
.virtual-carousel-container {
  position: relative;
  overflow: hidden;
  width: 100%;
  user-select: none;
  cursor: grab;
}

.virtual-carousel-container:active {
  cursor: grabbing;
}

.virtual-carousel-track {
  will-change: transform;
}

.virtual-carousel-item {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  border-radius: 8px;
  overflow: hidden;
}

.virtual-carousel-pagination {
  position: absolute;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
}

.virtual-carousel-pagination button {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.3);
  border: none;
  cursor: pointer;
  transition: background 0.3s;
}

.virtual-carousel-pagination button.active {
  background: rgba(0, 0, 0, 0.8);
}

.virtual-carousel-prev,
.virtual-carousel-next {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.8);
  border: none;
  cursor: pointer;
  font-size: 20px;
  color: #333;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.virtual-carousel-prev {
  left: 10px;
}

.virtual-carousel-next {
  right: 10px;
}

.virtual-carousel-prev:hover,
.virtual-carousel-next:hover {
  background: rgba(255, 255, 255, 1);
  transform: translateY(-50%) scale(1.1);
}
</style>