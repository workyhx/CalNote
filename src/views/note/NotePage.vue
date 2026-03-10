<template>
  <!-- 全屏布局容器 -->
  <div class="notebook-container">
    <!-- 稿纸标题 + 按钮 -->
    <div class="notebook-header">
      <!-- 左边两个按钮放一起 -->
      <div class="left-buttons">
        <button class="add-line-btn" @click="addLineToBottom"> 新增行 </button>
        <button class="clear-btn" @click="clearAllLines">清空所有计算</button>
      </div>
      <span class="header-title">计算稿纸</span>
    </div>

    <!-- 核心稿纸区域（全屏） -->
    <div class="notebook-content">
      <!-- 每行输入 + 计算结果 -->
      <div class="line-item" v-for="(line, index) in lines" :key="line.id">
        <input
          type="text"
          v-model="line.text"
          class="line-input"
          @input="calculateLine(line)"
          @keydown.enter="handleEnterKey($event, line, index)"
          @keydown.tab="handleTabKey($event, line, index)"
          placeholder="输入计算内容（如：1块+2块、100+20*3、!1）"
        />
      </div>
    </div>

    <!-- 底部小页脚 -->
    <div class="notebook-footer">CalcNote ©2026</div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { create, all } from 'mathjs'

// 初始化 math.js（支持四则/逻辑运算）
const math = create(all)

// 定义行数据类型
interface LineItem {
  id: string
  text: string
  result: any | null
}

// 本地存储的 key（自定义，保证唯一）
const STORAGE_KEY = 'calc_notebook_data'

// 初始化稿纸行数据
const lines = ref<LineItem[]>([])

// 核心：过滤中文单位（块、元、个、斤、元等），提取纯数字表达式
const filterChineseUnits = (str: string) => {
  return str.replace(/[\u4e00-\u9fa5]/g, '').trim()
}

// 从本地存储加载数据
const loadData = () => {
  const savedData = localStorage.getItem(STORAGE_KEY)
  if (savedData) {
    try {
      const parsedData = JSON.parse(savedData) as LineItem[]
      lines.value = parsedData.length > 0 ? parsedData : [
        { id: Date.now().toString(), text: '', result: null }
      ]
    } catch (e) {
      lines.value = [{ id: Date.now().toString(), text: '', result: null }]
      saveData()
    }
  } else {
    lines.value = [{ id: Date.now().toString(), text: '', result: null }]
    saveData()
  }
}

// 保存数据到本地存储
const saveData = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lines.value))
}

// 核心修改：新增行到最底部
const addLineToBottom = () => {
  const newLine: LineItem = {
    id: Date.now().toString(),
    text: '',
    result: null
  }
  // 插入到数组最后一个位置（最底部）
  lines.value.splice(lines.value.length, 0, newLine)
  saveData() // 保存数据

  // 新增后聚焦到底部的新行
  setTimeout(() => {
    const inputs = document.querySelectorAll('.line-input')
    inputs[inputs.length - 1]?.focus()
    // 自动滚动到底部
    document.querySelector('.notebook-content')?.scrollTo({
      top: document.querySelector('.notebook-content')?.scrollHeight,
      behavior: 'smooth'
    })
  }, 0)
}

// 辅助：新增行到指定位置（供快捷键使用，改为当前行下方）
const addLineToIndex = (insertIndex: number) => {
  const newLine: LineItem = {
    id: Date.now().toString(),
    text: '',
    result: null
  }
  // 插入到当前行的下一行（符合书写习惯）
  lines.value.splice(insertIndex + 1, 0, newLine)
  saveData()
  return newLine
}

// 核心：计算并补全=和结果到输入框（支持中文单位）
const calculateAndCompleteLine = (line: LineItem) => {
  try {
    const pureInput = line.text.replace(/\s*=.*/, '').trim()
    if (!pureInput) {
      line.result = null
      saveData()
      return false
    }

    const pureExpr = filterChineseUnits(pureInput)
    if (!pureExpr) {
      line.result = null
      saveData()
      return false
    }

    const result = math.evaluate(pureExpr)
    line.result = result
    line.text = `${pureInput} = ${result}`
    saveData()
    return true
  } catch (e) {
    line.result = null
    saveData()
    return false
  }
}

// 行计算核心逻辑（仅实时计算，不补全）
const calculateLine = (line: LineItem) => {
  try {
    const pureInput = line.text.replace(/\s*=.*/, '').trim()
    const pureExpr = filterChineseUnits(pureInput)
    if (!pureExpr) {
      line.result = null
      return
    }
    const result = math.evaluate(pureExpr)
    line.result = result
  } catch (e) {
    line.result = null
  }
}

// 回车逻辑：补全当前行=结果 → 新增行到当前行下方（底部方向）
const handleEnterKey = (e: KeyboardEvent, line: LineItem, index: number) => {
  e.preventDefault()

  // 计算并补全当前行的=和结果
  const hasResult = calculateAndCompleteLine(line)

  // 新增行到当前行下一行
  const newLine = addLineToIndex(index)

  // 有结果则填入新行，无结果则留空
  if (hasResult) {
    newLine.text = line.result.toString()
    calculateLine(newLine)
  }

  // 聚焦新行并滚动到底部
  setTimeout(() => {
    const inputs = document.querySelectorAll('.line-input')
    inputs[index + 1]?.focus()
    document.querySelector('.notebook-content')?.scrollTo({
      top: document.querySelector('.notebook-content')?.scrollHeight,
      behavior: 'smooth'
    })
  }, 0)
}

// Tab键逻辑：补全当前行=结果 → 新增空行到当前行下方
const handleTabKey = (e: KeyboardEvent, line: LineItem, index: number) => {
  e.preventDefault()

  // 计算并补全当前行的=和结果
  calculateAndCompleteLine(line)

  // 新增空行到当前行下一行
  addLineToIndex(index)

  // 聚焦新行并滚动到底部
  setTimeout(() => {
    const inputs = document.querySelectorAll('.line-input')
    inputs[index + 1]?.focus()
    document.querySelector('.notebook-content')?.scrollTo({
      top: document.querySelector('.notebook-content')?.scrollHeight,
      behavior: 'smooth'
    })
  }, 0)
}

// 清空所有计算（清空后自动保存）
const clearAllLines = () => {
  lines.value = [
    { id: Date.now().toString(), text: '', result: null }
  ]
  saveData()

  // 清空后聚焦到唯一的输入行
  setTimeout(() => {
    const input = document.querySelector('.line-input') as HTMLInputElement
    input?.focus()
  }, 0)
}

// 页面挂载时加载本地数据
onMounted(() => {
  loadData()
})
</script>

<style scoped>
/* 全屏容器 */
.notebook-container {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  font-family: 'Microsoft Yahei', sans-serif;
}

/* 头部（调整布局：新增行在左，标题居中，清空在右） */
.notebook-header {
  height: 60px;
  line-height: 60px;
  text-align: center;
  font-size: 20px;
  font-weight: bold;
  background-color: #7dbcea;
  color: #fff;
  display: flex;
  justify-content: space-between; /* 两端对齐，标题自动居中 */
  align-items: center;
  padding: 0 20px;
  box-sizing: border-box;
}

.header-title {
  flex: 1; /* 占满中间空间，实现标题居中 */
  text-align: center;
  margin: 0 10px; /* 与按钮保持间距 */
}

/* 左侧按钮组 */
.left-buttons {
  display: flex;
  gap: 8px;
}

/* 清空按钮样式 */
.clear-btn {
  padding: 6px 12px;
  background-color: #ff4444;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  white-space: nowrap; /* 防止按钮文字换行 */
}

.clear-btn:hover {
  background-color: #cc0000;
}

/* 核心内容区（占满剩余高度） */
.notebook-content {
  flex: 1;
  padding: 20px;
  background-color: #f9f9f9;
  overflow-y: auto; /* 内容过多时滚动 */
}

/* 每行样式 */
.line-item {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
  padding: 8px 0;
  border-bottom: 1px solid #eee;
}

/* 输入框样式 */
.line-input {
  flex: 1;
  padding: 10px 15px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
  outline: none;
  transition: border-color 0.2s;
}

.line-input:focus {
  border-color: #7dbcea;
}

/* 新增行按钮（最左侧） */
.add-line-btn {
  padding: 6px 12px;
  background-color: #108ee9;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  white-space: nowrap; /* 防止按钮文字换行 */
}

.add-line-btn:hover {
  background-color: #0e7bc8;
}

/* 小页脚 */
.notebook-footer {
  height: 30px; /* 小页脚高度 */
  line-height: 30px;
  text-align: center;
  background-color: #7dbcea;
  color: #fff;
  font-size: 12px;
}
</style>
