<template>
  <div class="login-container">
    <div class="login-box">
      <h1>Login</h1>

      <!-- Case 1: Login Form -->
      <div v-if="!isConnected" class="login-form">
        <div class="form-group">
          <label>appKey</label>
          <input v-model="appKey" type="text" placeholder="Enter appKey" />
        </div>

        <div class="form-group">
          <label>user token</label>
          <input v-model="userToken" type="text" placeholder="Enter user token" />
        </div>

        <button @click="handleConnect" class="btn-primary">connect</button>
      </div>

      <!-- Case 2: Connected Actions -->
      <div v-else class="action-buttons">
        <button @click="handleDisconnect" class="btn-secondary">disconnect</button>
        <button @click="goToSingleCall" class="btn-primary">1v1-call</button>
        <button @click="goToMultiCall" class="btn-primary">multi-call</button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import NCEngine from '../utils/NCEngine'

const STORAGE_KEY = 'nexconn_login_info'

export default {
  name: 'Login',
  setup() {
    const router = useRouter()
    const toast = useToast()
    const appKey = ref('')
    const userToken = ref('')
    const isConnected = ref(false)

    // 从 localStorage 加载保存的登录信息
    onMounted(() => {
      try {
        const savedInfo = localStorage.getItem(STORAGE_KEY)
        if (savedInfo) {
          const { appKey: savedAppKey, userToken: savedToken } = JSON.parse(savedInfo)
          appKey.value = savedAppKey || ''
          userToken.value = savedToken || ''
        }
      } catch (error) {
        console.error('加载保存的登录信息失败:', error)
      }
    })

    const handleConnect = async () => {
      if (!appKey.value) {
        toast.error('Please enter appKey')
        return
      }

      if (!userToken.value) {
        toast.error('Please enter user token')
        return
      }

      try {
        toast.info('Connecting...')
        await NCEngine.connect(appKey.value, userToken.value)
        isConnected.value = true
        toast.success('Connected successfully')

        // Save login info to localStorage
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({
            appKey: appKey.value,
            userToken: userToken.value
          }))
        } catch (error) {
          console.error('Failed to save login info:', error)
        }
      } catch (error) {
        console.error('Connection failed:', error)
        toast.error(`Connection failed: ${error.message || 'Unknown error'}`)
      }
    }

    const handleDisconnect = async () => {
      try {
        await NCEngine.disconnect()
        isConnected.value = false
        appKey.value = ''
        userToken.value = ''
        toast.success('Disconnected')

        // Clear saved login info
        try {
          localStorage.removeItem(STORAGE_KEY)
        } catch (error) {
          console.error('Failed to clear login info:', error)
        }
      } catch (error) {
        console.error('Disconnect failed:', error)
        toast.error(`Disconnect failed: ${error.message || 'Unknown error'}`)
      }
    }

    const goToSingleCall = () => {
      router.push('/single-call')
    }

    const goToMultiCall = () => {
      router.push('/multi-call')
    }

    return {
      appKey,
      userToken,
      isConnected,
      handleConnect,
      handleDisconnect,
      goToSingleCall,
      goToMultiCall
    }
  }
}
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-box {
  background: white;
  padding: 40px;
  border-radius: 10px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  min-width: 400px;
}

h1 {
  text-align: center;
  margin-bottom: 30px;
  color: #333;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-weight: bold;
  color: #555;
}

.form-group input {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 14px;
}

.form-group input:focus {
  outline: none;
  border-color: #667eea;
}

.btn-primary, .btn-secondary {
  padding: 12px 20px;
  border: none;
  border-radius: 5px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-primary {
  background: #667eea;
  color: white;
}

.btn-primary:hover {
  background: #5568d3;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #5a6268;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 15px;
}
</style>