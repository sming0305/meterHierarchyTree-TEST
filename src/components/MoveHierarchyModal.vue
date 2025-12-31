<template>
    <el-dialog v-model="dialogVisible" width="700" center :show-close="false" class="!rounded-xl overflow-hidden !p-0"
        :close-on-click-modal="false">
        <template #header>
            <p class="pb-2 pt-5 text-xl font-bold">移動階層</p>
        </template>
        <div class="pb-10 px-7 border-b border-gray-300">
            <p class="text-lg text-black mb-1">選取父電表</p>
            <p class="mb-2">移動至此父電表</p>
            <el-select placeholder="搜尋/選取父電表" class="mb-6" v-model="targetMeter" @change="validateSelection">
                <el-option v-for="item in options" :key="item.value" :label="item.name" :value="item.value" />
            </el-select>
            <p class="text-lg text-black mb-1">移動設備</p>
            <p class="mb-2">此次移動之設備 <span class="text-red-600">*</span></p>
            <div class="border border-gray-300 px-4 py-3 rounded-lg">
                <el-tag v-for="(meter, index) in localMetersToMove" :key="meter.name" closable :type="'info'"
                    effect="plain" round class="mr-2" @close="removeMeter(index)">
                    {{ meter.name }}
                </el-tag>
            </div>
        </div>
        <div class="py-3 px-7 flex justify-end items-center">
            <button type="button" class="px-4 py-2 text-red-600 mr-3 cursor-pointer" @click="emit('cancel')">取消</button>
            <el-button type="primary" size="large" color="#306FD9" class="!rounded-lg" @click="">確定</el-button>
        </div>
    </el-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'

// 定義 emits
const emit = defineEmits(['update:visible', 'update:targetParentId', 'confirm', 'cancel']);

// 定義 props
const props = defineProps({
    visible: {
        type: Boolean,
        default: false
    },
    meterFlatList: {
        type: Array,
        default: () => []
    },
    metersToMove: {
        type: Array,
        default: () => []
    }
    // validParentOptions: Array,
    // targetParentId: [Number, null]
});

// 本地狀態
const dialogVisible = ref(props.visible); // 是否顯示對話框
const options = ref(props.meterFlatList); // 選項列表
const localMetersToMove = ref([]); // 欲移動的設備 (副本，刪減不影響 props)
const targetMeter = ref(null)






watch(() => props.visible, (newValue) => {
    dialogVisible.value = newValue;
});
watch(() => props.meterFlatList, (newValue) => {
    options.value = newValue;
    // console.log(`${options.value} options 建立完成`)
});
watch(() => props.metersToMove, (newValue) => {
    console.log(newValue)
    localMetersToMove.value = JSON.parse(JSON.stringify(newValue));
    // console.log;
}, {
    deep: true
})


// 確認一下兩者差異
const removeMeter = (index) => {
    if (localMetersToMove.value.length === 1) {
        alert('若要移動階層請至少保留一個設備')
        return
    }
    localMetersToMove.value.splice(index, 1)
}


function validateSelection(value) {
   const targetMeterInfo = options.value.find(item => item.value === value)
   console.log(targetMeterInfo)
}




</script>

<style scoped>
.el-select__wrapper {}
</style>