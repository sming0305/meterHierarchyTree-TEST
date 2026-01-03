<template>
  <section class="subheader-bg min-h-screen flex flex-col">
    <h1 class="px-5 py-2 header-bg border-b border-gray-300 text-xl font-bold">階層設定</h1>
    <div class="px-5 subheader-bg border-b border-gray-300 flex justify-between">
      <p class="grow border-r border-gray-300 py-3">已選取 {{ selectedItems.length }} 個電表</p>
      <div class="flex items-center pl-3">
        <button type="button" class="flex items-center mr-6 cursor-pointer">
          <img class="mr-2 h-4 w-4 mb-1" src="@/assets/image/border_color_20dp_2854C5_FILL0_wght400_GRAD0_opsz20.png"
            alt="edit_icon">編輯電表
        </button>
        <button type="button" class="flex items-center" @click="openDialog" :class="{
          'cursor-pointer': selectedItems.length > 0,
          'text-gray-400': selectedItems.length === 0
        }" :disabled="selectedItems.length === 0">
          <img class="mr-1 h-5 w-5 d-block " src="@/assets/image/tab_move_20dp_2854C5_FILL0_wght400_GRAD0_opsz20.png"
            alt="move_icon">
          <span class="leading-tight">移動階層</span>
        </button>
      </div>
    </div>
    <div class="flex grow overflow-x-auto">
      <!-- 第 0 層 (root) -->
      <div class="w-[300px] m-[-1px] border border-gray-300 flex flex-col">
        <p class="py-3 px-5 header-bg border-b border-gray-300">第 0 層</p>
        <VueDraggable group="meters" v-model="meterHierarchyTree" class="p-1 grow" @move="checkMove" @end="onDragEnd"
          @start="onDragStart" v-if="draggableInitialized" data-level="0" :data-id="null">
          <div v-for="node in meterHierarchyTree" :key="node.id"
            class="flex items-center justify-between pl-4 py-1 rounded-md hover:bg-gray-300 cursor-pointer select-none"
            :class="{
              'bg-blue-200': isSelected(node.id),
              'bg-gray-300': isInPath(node) && !isSelected(node.id),
              'multi-dragging': isSelected(node.id) && dragState.isDragging
            }" @click="handleNodeClick(node, 0, $event)" :data-node-id="node.id">
            <p flex="shrink-0">{{ node.name }}</p>
            <img v-if="node.children?.length"
              src="@/assets/image/keyboard_arrow_right_24dp_666666_FILL0_wght400_GRAD0_opsz24.svg" alt="arrow_right_icon">
            <!-- 下層容器 -->
            <VueDraggable v-model="node.children" group="meters" class="drop-zone border border-dashed border-gray-400
            flex justify-center items-center" v-if="draggableInitialized" :data-id="node.id" :data-container="true">
              <img src="@/assets/image/move_group_24dp_666666_FILL0_wght400_GRAD0_opsz24.svg" alt="move_group_icon"
                style="width: 18px; height: 18px;">
            </VueDraggable>
          </div>
        </VueDraggable>
      </div>
      <!-- 第 1 層及更高層級 -->
      <template v-for="level in currentMaxLevel" :key="level">
        <div v-if="selectedNodes[level - 1] && selectedNodes[level - 1].children.length > 0"
          class="w-[300px] m-[-1px] border border-gray-300 flex flex-col">
          <p class="py-3 px-5 header-bg border-b border-gray-300">第 {{ level }} 層</p>
          <VueDraggable group="meters" v-model="selectedNodes[level - 1].children" class="p-1 grow" @move="checkMove"
            @end="onDragEnd" @start="onDragStart" v-if="draggableInitialized" :data-level="`${level}`"
            :data-id="selectedNodes[level - 1].id">
            <div v-for="node in selectedNodes[level - 1].children || []"
              class="flex items-center justify-between pl-4 py-1 rounded-md hover:bg-gray-300 cursor-pointer select-none"
              :class="{
                'bg-blue-200': isSelected(node.id),
                'bg-gray-300': isInPath(node) && !isSelected(node.id),
                'multi-dragging': isSelected(node.id) && dragState.isDragging
              }" @click="handleNodeClick(node, level, $event)" :data-node-id="node.id">
              <p class="shrink-0">{{ node.name }}</p>
              <img v-if="node.children?.length"
                src="@/assets/image/keyboard_arrow_right_24dp_666666_FILL0_wght400_GRAD0_opsz24.svg" alt="arrow_right_icon">
              <!-- 下層容器 -->
              <VueDraggable v-model="node.children" group="meters"
                class="drop-zone border border-dashed border-gray-400 flex justify-center items-center"
                v-if="draggableInitialized" :data-id="node.id" :data-container="true">
                <img src="@/assets/image/move_group_24dp_666666_FILL0_wght400_GRAD0_opsz24.svg" alt="move_group_icon"
                  style="width: 18px; height: 18px;">
              </VueDraggable>
            </div>
          </VueDraggable>
        </div>
      </template>
    </div>
    <MoveHierarchyModal :visible="visible" :meterFlatList="meterFlatList" :metersToMove="metersToMove"
      @cancel="visible = false" @confirm="refreshData">
    </MoveHierarchyModal>
  </section>
</template>

<script setup>
import { ref, nextTick, onMounted } from 'vue'
import axios from 'axios'
import MoveHierarchyModal from '@/components/MoveHierarchyModal.vue'
import { ElMessageBox } from 'element-plus'
import { VueDraggable } from 'vue-draggable-plus';
import infoStore from '@/stores/infoStore.js'

async function init() {
  await getMeterHierarchyTreeAction(true)
  await nextTick()
  draggableInitialized.value = true
}

onMounted(() => {
  init()
});

// 電表數據
const meterHierarchyTree = ref({})
// 扁平電表數據
const meterFlatList = ref([])

// 追蹤選中的節點完整路線
const selectedNodes = ref({})
// 目前需要渲染的最大層數
const currentMaxLevel = ref(1)
// 儲存所有選中的節點
const selectedItems = ref([]);
// 欲移動的裝置
const metersToMove = ref([])

// 移動階層 modal 顯示
const visible = ref(false)

// 拖曳功能是否已初始化
const draggableInitialized = ref(false);

const useInfoStore = infoStore()
const { errorMessageBoxSetting, successMessageBoxSetting } = useInfoStore

// 拖曳狀態
const dragState = ref({
  isDragging: false,
  isMultiDragging: false
});


// 獲取電表資料
async function getMeterHierarchyTreeAction(needFlat) {
  try {
    const res = await axios.get('http://localhost:3001/nodes?flat=false')
    if (!res.data.length) res.data = [{ ...res.data }]
    meterHierarchyTree.value = res.data
    if (needFlat) meterFlatList.value = flattenTreeForSelect(meterHierarchyTree.value)
  } catch (err) {
    console.log(err)
  }
}

// 拖曳開始處理 (更新狀態)
const onDragStart = (evt) => {
  const draggedNode = evt.data;
  dragState.value.isDragging = true;
  dragState.value.isMultiDragging = isSelected(draggedNode.id) && selectedItems.value.length > 1; // 檢查是否是多選拖曳
};

// 檢查拖曳是否可以移動
const checkMove = (evt) => {
  const draggedNode = evt.data;
  const targetId = Number(evt.to.dataset.id)
  const targetNode = meterFlatList.value.find(node => node.id === targetId);
  const isMultiDrag = isSelected(draggedNode.id) && selectedItems.value.length > 1;

  // 檢查規則1：不能移動到自身的子孫節點  
  if (targetNode && (isMultiDrag
    ? selectedItems.value.some(meter => targetNode.path && targetNode.path.startsWith(meter.path))
    : targetNode.path && targetNode.path.startsWith(draggedNode.path))) {
    ElMessageBox.confirm('不可將電表移動到自身的子孫節點底下，請重新設定。', '設定錯誤 (自身子孫節點)', errorMessageBoxSetting);
    return false;
  }

  // 檢查規則2：不能移動到自身
  if (isMultiDrag ? selectedItems.value.some(meter => meter.id === targetId) : draggedNode.id === targetId) {
    ElMessageBox.confirm('不可將電表移動到自身，請重新設定。', '設定錯誤 (電表移動到自身)', errorMessageBoxSetting);
    return false;
  }

  // 檢查規則3：不能移動到與原本相同的父層
  if (targetNode && draggedNode.parent_id === targetNode.id && evt.to.dataset.container) return false;

  return true;
};

// 拖曳結束處理
const onDragEnd = async (evt) => {

  // 重置拖曳狀態
  dragState.value.isDragging = false;

  const draggedNode = evt.data;
  let targetParentId = Number(evt.to.dataset.id)

  // 如果是在同一容器內排序，不做處理，同階層拖曳將不會改變設備資料
  if (evt.from.dataset.level === evt.to.dataset.level) {
    return;
  }
  // 如果父節點沒有變化，不做處理 (優化使用者體驗，使其可以反悔時放回原來位置)
  if (draggedNode.parent_id === targetParentId) {
    console.log('如果父節點沒有變化，不做處理 ')
    return;
  }

  // 檢查是否是多選拖曳（拖曳的節點在選中項目中，且有多個選中項目）
  const isMultiDrag = isSelected(draggedNode.id) && selectedItems.value.length > 1;

  // 準備要移動的節點ID
  let nodeIds = [];
  let nodesToMove = [];

  if (isMultiDrag) {
    // 多選拖曳：移動所有選中的節點
    nodeIds = selectedItems.value.map(item => item.id);
    nodesToMove = [...selectedItems.value];
  } else {
    // 單選拖曳：只移動拖曳的節點
    nodeIds = [draggedNode.id];
    nodesToMove = [draggedNode];
  }

  try {
    // 調用API
    await axios.patch('http://localhost:3001/nodes/move', {
      target_parent_id: targetParentId,
      node_ids: nodeIds
    });

    // 刷新數據
    await refreshData(nodesToMove);

  } catch (error) {
    console.error('拖曳處理錯誤', error);
    ElMessageBox.confirm(`${error.response?.data?.error || '移動失敗'}，請重新整理頁面進行嘗試。`, '拖曳移動失敗', errorMessageBoxSetting);
  }
};

// modal 移動設備後重新獲取資料並正確渲染電表
async function refreshData(finalMetersToMove) {

  // 保存原始選中的節點 ID
  const selectedIds = finalMetersToMove.map(item => item.id);

  // 1. 獲取新資料
  await getMeterHierarchyTreeAction(false);

  // 2. 扁平化樹結構
  const flatNodes = flattenTreeForSelect(meterHierarchyTree.value);

  // 3. 找出其中一個移動的節點作為參考
  const movedNode = flatNodes.find(node => node.id === finalMetersToMove[0].id)

  // 4. 構建從根到該節點的路徑
  const pathNodes = [];
  pathNodes.unshift(movedNode) // 將該節點也完整加入路徑

  let currentNode = movedNode;

  // 先找到該節點的父節點
  let parentNode = flatNodes.find(node => node.id === movedNode.parent_id);

  // 向上追溯到根
  while (parentNode) {
    pathNodes.unshift(parentNode); // 添加到路徑前面
    currentNode = parentNode;
    parentNode = flatNodes.find(node => node.id === currentNode.parent_id); // 再找到當前父層的父層
  }

  // 5. 重置選中狀態
  selectedNodes.value = {};

  // 6. 設置路徑上的每個節點為選中
  pathNodes.forEach((node, index) => {
    selectedNodes.value[index] = node;
  });

  // 7. 設置最大層級
  currentMaxLevel.value = pathNodes.length + 1;

  // 8. 更新當下選中的節點
  selectedItems.value = [];
  selectedIds.forEach(id => {
    const updatedNode = flatNodes.find(node => node.id === id);
    selectedItems.value.push(updatedNode);
  })

  // 9. 關閉 modal
  visible.value = false;

  ElMessageBox.confirm(`電表階層更新完成。`, '更新成功', successMessageBoxSetting);
}


// 將樹狀資料扁平化為列表
const flattenTreeForSelect = (nodes, parent_id = null, parentPath = '', result = []) => {

  if (!nodes) return result

  for (const node of nodes) {

    // 構建當前節點的路徑
    const currentPath = parentPath ? `${parentPath}/${node.id}` : `/${node.id}`;

    // 樹狀資料加上追蹤用數據
    node.value = node.id
    node.parent_id = parent_id
    node.path = currentPath

    // 整理扁平化資料內容
    const option = {
      id: node.id,
      value: node.id,
      name: node.name,
      depth: node.depth,
      parent_id: parent_id,
      path: currentPath,
      children: node.children
    };

    result.push(option);

    // 遞歸處理子節點
    if (node.children && node.children.length > 0) {
      flattenTreeForSelect(node.children, node.id, currentPath, result);
    }
  }
  return result;
};

// 處理點擊節點
const handleNodeClick = (node, level, event) => {
  // 處理多選邏輯（按住Ctrl鍵）
  if (event.ctrlKey || event.metaKey) {
    const index = selectedItems.value.findIndex(item => item.id === node.id);
    if (index === -1) {
      // 檢查是否可以添加到選中項（同層級同子樹）
      if (canSelectMultiple(node)) {
        selectedItems.value.push(node);
      }
    } else {
      // 取消選中
      selectedItems.value.splice(index, 1);
    }
  } else {

    // 設置當前層級的選中節點
    selectedNodes.value[level] = node;
    // 清除更高層級的選中節點
    for (let i = level + 1; i < currentMaxLevel.value; i++) {
      selectedNodes.value[i] = null;
    }
    // 更新當前需要的最大層級
    currentMaxLevel.value = level + 1;

    // 單選模式
    selectedItems.value = [node];
  }
};

// 檢查是否可以多選（同層級同子樹）
const canSelectMultiple = (node) => {
  if (selectedItems.value.length === 0) return true;

  const firstSelected = selectedItems.value[0];

  // 檢查是否同層級
  if (node.depth !== firstSelected.depth) {
    ElMessageBox.confirm('多選時不能選擇不同層級的節點，請重新設定。', '錯誤 (跨層級選擇節點)', errorMessageBoxSetting)
    return false;
  }
  // 檢查是否同一子樹（有相同的父節點）
  if (node.parent_id !== firstSelected.parent_id) {
    ElMessageBox.confirm('多選時不能選擇不同子樹的節點，請重新設定。', '錯誤 (不同子樹)', errorMessageBoxSetting)
    return false;
  }
  return true;
};

// 打開移動階層視窗
const openDialog = async () => {
  visible.value = true
  metersToMove.value = []
  await nextTick()
  metersToMove.value = selectedItems.value
}

// 檢查節點是否被選中
const isSelected = (id) => {
  return selectedItems.value.some(item => item.id === id);
};

// 檢查各節點是否在當前路徑上 (顯示 CSS 用)
const isInPath = (node) => {
  if (!selectedNodes.value[0]) return false;
  return Object.values(selectedNodes.value).some(item => item && item.id === node.id)
};
</script>

<style scoped>
.header-bg {
  background-color: rgb(245, 245, 239);
}

.subheader-bg {
  background-color: rgb(235, 235, 240);
}

.drop-zone {
  height: 38px;
  min-width: 80px;
  background-color: rgba(200, 200, 200, 0.2);
  transition: all 0.2s;
  margin: 2px 0;
  border-radius: 4px;
}

.multi-dragging {
  opacity: 0.7;
  border: 2px dashed #3b82f6 !important;
  background-color: #dbeafe !important;
}
</style>
