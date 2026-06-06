<template>
  <div class="character-form">
    <n-form
      ref="formRef"
      :model="formData"
      :rules="rules"
      label-placement="left"
      label-width="80"
    >
      <!-- 头像上传 -->
      <n-form-item label="头像">
        <div class="avatar-upload" @click="triggerUpload">
          <img
            v-if="formData.avatar"
            :src="formData.avatar"
            class="avatar-preview"
          />
          <div v-else class="avatar-placeholder">
            <span style="font-size: 32px">📷</span>
            <span>点击上传</span>
          </div>
        </div>
        <input
          ref="fileInput"
          type="file"
          accept="image/*"
          style="display: none"
          @change="handleFileChange"
        />
      </n-form-item>

      <!-- 名字 -->
      <n-form-item label="名字" path="name">
        <n-input
          v-model:value="formData.name"
          placeholder="输入角色名字"
          maxlength="20"
          show-count
        />
      </n-form-item>

      <!-- 简短描述 -->
      <n-form-item label="描述" path="description">
        <n-input
          v-model:value="formData.description"
          placeholder="一句话描述角色"
          maxlength="50"
          show-count
        />
      </n-form-item>

      <!-- 性格 -->
      <n-form-item label="性格" path="personality">
        <n-input
          v-model:value="formData.personality"
          type="textarea"
          placeholder="描述角色的性格特点，如：乐观、热血、永不放弃"
          :rows="2"
          maxlength="200"
          show-count
        />
      </n-form-item>

      <!-- 说话风格 -->
      <n-form-item label="说话风格" path="speakingStyle">
        <n-input
          v-model:value="formData.speakingStyle"
          type="textarea"
          placeholder="描述角色的说话方式，如：喜欢说'相信我'，语气活泼"
          :rows="2"
          maxlength="200"
          show-count
        />
      </n-form-item>
    </n-form>

    <!-- 操作按钮 -->
    <div class="form-actions">
      <n-button @click="handleCancel">取消</n-button>
      <n-button type="primary" @click="handleSubmit">
        {{ isEdit ? '保存' : '创建' }}
      </n-button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { NForm, NFormItem, NInput, NButton } from 'naive-ui'

const props = defineProps({
  character: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['submit', 'cancel'])

const formRef = ref(null)
const fileInput = ref(null)

const isEdit = ref(!!props.character)

const formData = reactive({
  name: '',
  description: '',
  personality: '',
  speakingStyle: '',
  avatar: ''
})

const rules = {
  name: {
    required: true,
    message: '请输入角色名字',
    trigger: 'blur'
  }
}

onMounted(() => {
  if (props.character) {
    Object.assign(formData, {
      name: props.character.name || '',
      description: props.character.description || '',
      personality: props.character.personality || '',
      speakingStyle: props.character.speakingStyle || '',
      avatar: props.character.avatar || ''
    })
  }
})

function triggerUpload() {
  fileInput.value?.click()
}

function handleFileChange(e) {
  const file = e.target.files[0]
  if (!file) return

  if (file.size > 2 * 1024 * 1024) {
    alert('图片大小不能超过 2MB')
    return
  }

  const reader = new FileReader()
  reader.onload = (event) => {
    formData.avatar = event.target.result
  }
  reader.readAsDataURL(file)
}

async function handleSubmit() {
  try {
    await formRef.value?.validate()
    emit('submit', { ...formData })
  } catch (errors) {
    console.log('验证失败:', errors)
  }
}

function handleCancel() {
  emit('cancel')
}
</script>

<style scoped>
.character-form {
  padding: 8px 0;
}

.avatar-upload {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  overflow: hidden;
  cursor: pointer;
  border: 2px dashed #ddd;
  transition: border-color 0.3s;
}

.avatar-upload:hover {
  border-color: #667eea;
}

.avatar-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  color: #999;
  font-size: 12px;
  gap: 4px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
}
</style>
