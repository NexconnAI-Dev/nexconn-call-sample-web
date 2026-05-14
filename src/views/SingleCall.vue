<template>
  <div class="single-call-container">
    <h1>Single Call</h1>

    <div class="main-content">
      <!-- Left Panel: Controls -->
      <div class="left-panel">
        <div class="form-group">
          <label>callee userId</label>
          <input v-model="calleeUserId" type="text" placeholder="Enter callee user ID" />
        </div>

        <div class="form-group">
          <label>mediaType</label>
          <div class="radio-group">
            <label>
              <input type="radio" v-model="mediaType" :value="NCCallMediaType.AUDIO_VIDEO" />
              AUDIO_VIDEO
            </label>
            <label>
              <input type="radio" v-model="mediaType" :value="NCCallMediaType.AUDIO" />
              AUDIO
            </label>
          </div>
        </div>

        <div class="button-group">
          <button @click="handleStartCall" class="btn-primary">startCall</button>
          <button @click="handleEndCall" class="btn-danger">endCall</button>
          <button @click="toggleCamera" class="btn-secondary">
            {{ cameraEnabled ? 'disableCamera' : 'enableCamera' }}
          </button>
          <button @click="toggleMicrophone" class="btn-secondary">
            {{ microphoneEnabled ? 'disableMicrophone' : 'enableMicrophone' }}
          </button>
          <button
            v-if="mediaType === NCCallMediaType.AUDIO && callConnected"
            @click="handleChangeToVideoCall"
            class="btn-primary"
          >
            changeToVideoCall
          </button>
        </div>
      </div>

      <!-- Right Panel: Video Area -->
      <div class="right-panel">
        <div class="user-list">
          <!-- Local User -->
          <div class="user-video-box local-user">
            <h3>Local User</h3>
            <div class="video-area">
              <video
                v-if="currentUserId"
                :id="`video-${currentUserId}`"
                class="video-element"
                v-show="mediaType === NCCallMediaType.AUDIO_VIDEO"
                autoplay
                muted
                playsinline
              ></video>
              <div v-show="mediaType !== NCCallMediaType.AUDIO_VIDEO" class="audio-indicator">audio</div>
            </div>
          </div>

          <!-- Remote User -->
          <div class="user-video-box remote-user">
            <h3>Remote User {{ remoteUserId ? `(${remoteUserId})` : '' }}</h3>
            <div class="video-area" v-if="isInCall && remoteUserConnected">
              <video
                v-if="remoteUserId"
                :id="`video-${remoteUserId}`"
                class="video-element"
                v-show="mediaType === NCCallMediaType.AUDIO_VIDEO"
                autoplay
                playsinline
              ></video>
              <div v-show="mediaType !== NCCallMediaType.AUDIO_VIDEO" class="audio-indicator">{{ remoteUserId }}'s audio</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Bottom: Call Logs -->
    <div class="call-logs">
      <h3>Call Logs</h3>
      <div class="log-list">
        <div v-for="(log, index) in callLogs" :key="index" class="log-item">
          <div>Start Time: {{ log.startTime }}</div>
          <div>End Time: {{ log.endTime }}</div>
          <div>Participants: {{ log.participants.join(', ') }}</div>
          <div>End Reason: {{ log.endReason }}</div>
        </div>
      </div>
    </div>

    <!-- Incoming Call Dialog -->
    <div v-if="showIncomingCallDialog" class="dialog-overlay">
      <div class="dialog">
        <h3>Incoming Call</h3>
        <p>From: {{ incomingCallInfo.caller }}</p>
        <div class="dialog-buttons">
          <button @click="handleAcceptCall" class="btn-primary">acceptCall</button>
          <button @click="handleRejectCall" class="btn-danger">endCall</button>
        </div>
      </div>
    </div>

    <!-- Media Type Change Request Dialog -->
    <div v-if="showMediaTypeChangeDialog" class="dialog-overlay">
      <div class="dialog">
        <h3>Media Type Change Request</h3>
        <p>From: {{ mediaTypeChangeRequest.userId }}</p>
        <p>New Media Type: {{ mediaTypeChangeRequest.newMediaType }}</p>
        <div class="dialog-buttons">
          <button @click="handleAgreeMediaTypeChange" class="btn-primary">agree</button>
          <button @click="handleDisagreeMediaTypeChange" class="btn-danger">disagree</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useToast } from 'vue-toastification'
import NCEngine from '../utils/NCEngine'
import { NCCallType, NCCallMediaType, NCCallUserState, NCCallCode } from '@nexconn/call'
import { setupVideoView } from '../utils/videoHelper'

export default {
  name: 'SingleCall',
  setup() {
    const toast = useToast()
    const calleeUserId = ref('')
    const mediaType = ref(NCCallMediaType.AUDIO_VIDEO)
    const cameraEnabled = ref(false)
    const microphoneEnabled = ref(false)
    const isInCall = ref(false)
    const callConnected = ref(false)
    const remoteUserConnected = ref(false)
    const remoteUserId = ref('')
    const callLogs = ref([])
    const showIncomingCallDialog = ref(false)
    const incomingCallInfo = ref({})
    const showMediaTypeChangeDialog = ref(false)
    const mediaTypeChangeRequest = ref({})
    const currentTransactionId = ref('')

    const currentUserId = computed(() => NCEngine.getCurrentUserId())

    const callEventHandler = {
      onCallReceived: (callInfo) => {
        toast.info('Incoming call')
        incomingCallInfo.value = callInfo
        showIncomingCallDialog.value = true

        mediaType.value = callInfo.mediaType
      },
      onCallConnected: () => {
        toast.success('Call connected')
        isInCall.value = true
        callConnected.value = true

        microphoneEnabled.value = NCEngine.isMicrophoneEnabled()
      },
      onCallEnded: () => {
        toast.info('Call ended')
        isInCall.value = false
        callConnected.value = false
        remoteUserConnected.value = false
        remoteUserId.value = ''
        cameraEnabled.value = false
        microphoneEnabled.value = false
      },
      onRemoteUserStateChanged: (userInfo) => {
        toast.info(`${userInfo.userId} state changed: ${NCCallUserState[userInfo.userState]}`)
        
        if (userInfo.userState === NCCallUserState.ONCALL) {
          remoteUserId.value = userInfo.userId
          remoteUserConnected.value = true
          toast.success(`Remote user ${userInfo.userId} joined`)
        } else if (userInfo.userState === NCCallUserState.IDLE) {
          remoteUserConnected.value = false
          remoteUserId.value = ''
          toast.info(`Remote user ${userInfo.userId} left`)
        }
      },
      onMediaTypeChangeRequestReceived: (request) => {
        toast.info('Media type change request received')
        mediaTypeChangeRequest.value = request
        showMediaTypeChangeDialog.value = true

        currentTransactionId.value = request.transactionId
      },
      onMediaTypeChangeResultReceived: (result) => {
        toast.success('Media type changed successfully')

        mediaType.value = result.mediaType
        cameraEnabled.value = result.mediaType === NCCallMediaType.AUDIO_VIDEO
      },
      onServerCallLogReceived: (log) => {
        toast.success('Call log received')
        callLogs.value.unshift(log)
      },
      onRemoteUserInvited: () => {
        // Not used in single call
      },
      onRemoteCameraStateChanged: (event) => {
        const { userId, disabled } = event
        toast.info(`${userId}'s camera ${disabled ? 'disabled' : 'enabled'}`)
      },
      onRemoteMicrophoneStateChanged: (event) => {
        const { userId, disabled } = event
        toast.info(`${userId}'s microphone ${disabled ? 'disabled' : 'enabled'}`)
      }
    }

    const handleStartCall = async () => {
      try {
        isInCall.value = true
        callConnected.value = false

        if (mediaType.value === NCCallMediaType.AUDIO_VIDEO) {
          await setupVideoView(currentUserId.value, true)
        }

        const result = await NCEngine.startCall({
          calleeUserId: calleeUserId.value,
          mediaType: mediaType.value,
          callType: NCCallType.SINGLE
        })

        if (result.code !== NCCallCode.SUCCESS) {
          throw new Error(`Start call failed with code: ${result.code}`)
        }

        if (mediaType.value === NCCallMediaType.AUDIO_VIDEO) {
          cameraEnabled.value = true
        }

        toast.success('Call started successfully')
      } catch (error) {
        console.error('Start call failed:', error)
        toast.error(`Start call failed: ${error.message || 'Unknown error'}`)
        isInCall.value = false
      }
    }

    const handleEndCall = async () => {
      try {
        const result = await NCEngine.endCall({})

        if (result.code !== NCCallCode.SUCCESS) {
          throw new Error(`End call failed with code: ${result.code}`)
        }

        isInCall.value = false
        remoteUserConnected.value = false
        toast.success('Call ended')
      } catch (error) {
        console.error('End call failed:', error)
        toast.error(`End call failed: ${error.message || 'Unknown error'}`)
      }
    }

    const toggleCamera = async () => {
      try {
        cameraEnabled.value = !cameraEnabled.value
        const result = await NCEngine.enableCamera(cameraEnabled.value)

        if (result.code !== NCCallCode.SUCCESS) {
          cameraEnabled.value = !cameraEnabled.value
          throw new Error(`Camera operation failed with code: ${result.code}`)
        }

        toast.success(cameraEnabled.value ? 'Camera enabled' : 'Camera disabled')
      } catch (error) {
        console.error('Camera operation failed:', error)
        toast.error(`Camera operation failed: ${error.message || 'Unknown error'}`)
      }
    }

    const toggleMicrophone = async () => {
      try {
        microphoneEnabled.value = !microphoneEnabled.value
        const result = await NCEngine.enableMicrophone(microphoneEnabled.value)

        if (result.code !== NCCallCode.SUCCESS) {
          microphoneEnabled.value = !microphoneEnabled.value
          throw new Error(`Microphone operation failed with code: ${result.code}`)
        }

        toast.success(microphoneEnabled.value ? 'Microphone enabled' : 'Microphone disabled')
      } catch (error) {
        console.error('Microphone operation failed:', error)
        toast.error(`Microphone operation failed: ${error.message || 'Unknown error'}`)
      }
    }

    const handleChangeToVideoCall = async () => {
      try {
        await setupVideoView(currentUserId.value, true)

        if (remoteUserConnected.value && remoteUserId.value) {
          await setupVideoView(remoteUserId.value, false)
        }

        const result = await NCEngine.requestChangeMediaType(NCCallMediaType.AUDIO_VIDEO)

        if (result.code !== NCCallCode.SUCCESS) {
          throw new Error(`Request change media type failed with code: ${result.code}`)
        }

        if (result.transactionId) {
          currentTransactionId.value = result.transactionId
        }

        toast.success('Media type change request sent')
      } catch (error) {
        console.error('Request change media type failed:', error)
        toast.error(`Request change media type failed: ${error.message || 'Unknown error'}`)
      }
    }

    const handleAcceptCall = async () => {
      try {
        isInCall.value = true
        callConnected.value = false

        if (mediaType.value === NCCallMediaType.AUDIO_VIDEO) {
          await setupVideoView(currentUserId.value, true)
        }

        const result = await NCEngine.acceptCall({})

        if (result.code !== NCCallCode.SUCCESS) {
          throw new Error(`Accept call failed with code: ${result.code}`)
        }

        showIncomingCallDialog.value = false
        toast.success('Call accepted')
      } catch (error) {
        console.error('Accept call failed:', error)
        toast.error(`Accept call failed: ${error.message || 'Unknown error'}`)
        isInCall.value = false
      }
    }

    const handleRejectCall = async () => {
      try {
        const result = await NCEngine.endCall({})

        if (result.code !== NCCallCode.SUCCESS) {
          throw new Error(`Reject call failed with code: ${result.code}`)
        }

        showIncomingCallDialog.value = false
        toast.info('Call rejected')
      } catch (error) {
        console.error('Reject call failed:', error)
        toast.error(`Reject call failed: ${error.message || 'Unknown error'}`)
      }
    }

    const handleAgreeMediaTypeChange = async () => {
      try {
        const newMediaType = mediaTypeChangeRequest.value.newMediaType
        if (newMediaType === NCCallMediaType.AUDIO_VIDEO) {
          await setupVideoView(currentUserId.value, true)

          if (remoteUserConnected.value && remoteUserId.value) {
            await setupVideoView(remoteUserId.value, false)
          }
        }

        const result = await NCEngine.replyChangeMediaType({
          isAgreed: true,
          transactionId: currentTransactionId.value
        })

        if (result.code !== NCCallCode.SUCCESS) {
          throw new Error(`Reply change media type failed with code: ${result.code}`)
        }

        showMediaTypeChangeDialog.value = false
        toast.success('Media type change agreed')

        currentTransactionId.value = ''
      } catch (error) {
        console.error('Agree failed:', error)
        toast.error(`Agree failed: ${error.message || 'Unknown error'}`)
      }
    }

    const handleDisagreeMediaTypeChange = async () => {
      try {
        const result = await NCEngine.replyChangeMediaType({
          isAgreed: false,
          transactionId: currentTransactionId.value
        })

        if (result.code !== NCCallCode.SUCCESS) {
          throw new Error(`Reply change media type failed with code: ${result.code}`)
        }

        showMediaTypeChangeDialog.value = false
        toast.info('Media type change rejected')

        currentTransactionId.value = ''
      } catch (error) {
        console.error('Reject failed:', error)
        toast.error(`Reject failed: ${error.message || 'Unknown error'}`)
      }
    }

    onMounted(() => {
      NCEngine.setCallEventHandler(callEventHandler)
    })

    onUnmounted(() => {
      NCEngine.setCallEventHandler(null)
    })

    return {
      calleeUserId,
      mediaType,
      cameraEnabled,
      microphoneEnabled,
      isInCall,
      callConnected,
      remoteUserConnected,
      remoteUserId,
      callLogs,
      showIncomingCallDialog,
      incomingCallInfo,
      showMediaTypeChangeDialog,
      mediaTypeChangeRequest,
      currentUserId,
      handleStartCall,
      handleEndCall,
      toggleCamera,
      toggleMicrophone,
      handleChangeToVideoCall,
      handleAcceptCall,
      handleRejectCall,
      handleAgreeMediaTypeChange,
      handleDisagreeMediaTypeChange,
      NCCallMediaType
    }
  }
}
</script>

<style scoped>
.single-call-container {
  padding: 20px;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
}

h1 {
  text-align: center;
  margin-bottom: 20px;
  color: #333;
}

.main-content {
  display: flex;
  gap: 20px;
  flex: 1;
  overflow: hidden;
}

.left-panel {
  width: 300px;
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow-y: auto;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-weight: bold;
  margin-bottom: 8px;
  color: #555;
}

.form-group input[type="text"] {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.radio-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.radio-group label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: normal;
}

.button-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.btn-primary, .btn-secondary, .btn-danger {
  padding: 10px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
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

.btn-danger {
  background: #dc3545;
  color: white;
}

.btn-danger:hover {
  background: #c82333;
}

.right-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.user-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.user-video-box {
  background: white;
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.user-video-box h3 {
  margin-bottom: 10px;
  color: #333;
  font-size: 16px;
}

.video-area {
  width: 100%;
  height: 400px;
  background: #000;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  position: relative;
  overflow: hidden;
}

.video-element {
  width: 100%;
  height: 100%;
}

.audio-indicator {
  font-size: 18px;
}

.call-logs {
  background: white;
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  max-height: 200px;
  overflow-y: auto;
}

.call-logs h3 {
  margin-bottom: 10px;
  color: #333;
  font-size: 16px;
}

.log-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.log-item {
  padding: 10px;
  background: #f8f9fa;
  border-radius: 4px;
  font-size: 12px;
  color: #555;
}

.log-item div {
  margin-bottom: 4px;
}

.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog {
  background: white;
  padding: 30px;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  min-width: 300px;
}

.dialog h3 {
  margin-bottom: 15px;
  color: #333;
}

.dialog p {
  margin-bottom: 10px;
  color: #555;
}

.dialog-buttons {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.dialog-buttons button {
  flex: 1;
}
</style>
