<template>
  <div class="multi-call-container">
    <h1>Multi Call</h1>

    <div class="main-content">
      <!-- Left Panel: Controls -->
      <div class="left-panel">
        <div class="form-group">
          <label>callee userIds: divided by comma(eg. uid1,uid2,...)</label>
          <input v-model="calleeUserIds" type="text" placeholder="Enter multiple user IDs, separated by commas" />
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
          <button @click="showInviteDialog" class="btn-primary">inviteToCall</button>
          <button @click="handleEndCall" class="btn-danger">endCall</button>
          <button @click="toggleCamera" class="btn-secondary">
            {{ cameraEnabled ? 'disableCamera' : 'enableCamera' }}
          </button>
          <button @click="toggleMicrophone" class="btn-secondary">
            {{ microphoneEnabled ? 'disableMicrophone' : 'enableMicrophone' }}
          </button>
        </div>
      </div>

      <!-- Right Panel: User List -->
      <div class="right-panel">
        <div class="user-list-container">
          <h3>User List</h3>
          <div class="user-list">
            <!-- Local User (always visible) -->
            <div class="user-item">
              <div class="user-info">
                <strong>Local User</strong>
              </div>
              <div class="user-video">
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

            <!-- Remote Users -->
            <div v-for="user in remoteUserList" :key="user.userId" class="user-item">
              <div class="user-info">
                <strong>{{ user.userId }}</strong>
              </div>
              <div class="user-video">
                <video
                  v-if="user.mediaType === NCCallMediaType.AUDIO_VIDEO"
                  :id="`video-${user.userId}`"
                  class="video-element"
                  autoplay
                  playsinline
                ></video>
                <div v-else class="audio-indicator">
                  {{ user.userId }}'s audio
                </div>
              </div>
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

    <!-- Invite Dialog -->
    <div v-if="showInviteDialogVisible" class="dialog-overlay">
      <div class="dialog">
        <h3>Invite Users</h3>
        <div class="form-group">
          <label>callee userIds: divided by comma(eg. uid1,uid2,...)</label>
          <input v-model="inviteUserIds" type="text" placeholder="Enter user IDs to invite, separated by commas" />
        </div>
        <div class="dialog-buttons">
          <button @click="handleInvite" class="btn-primary">invite</button>
          <button @click="cancelInvite" class="btn-secondary">cancel</button>
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
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useToast } from 'vue-toastification'
import NCEngine from '../utils/NCEngine'
import { NCCallType, NCCallMediaType, NCCallUserState, NCCallCode } from '@nexconn/call'
import { setupVideoView } from '../utils/videoHelper'

export default {
  name: 'MultiCall',
  setup() {
    const toast = useToast()
    const calleeUserIds = ref('')
    const mediaType = ref(NCCallMediaType.AUDIO_VIDEO)
    const cameraEnabled = ref(false)
    const microphoneEnabled = ref(false)
    const remoteUserList = ref([])
    const callLogs = ref([])
    const showInviteDialogVisible = ref(false)
    const inviteUserIds = ref('')
    const showIncomingCallDialog = ref(false)
    const incomingCallInfo = ref({})

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

        microphoneEnabled.value = NCEngine.isMicrophoneEnabled()
      },
      onCallEnded: () => {
        toast.info('Call ended')
        remoteUserList.value = []
        cameraEnabled.value = false
        microphoneEnabled.value = false
      },
      onRemoteUserStateChanged: (userInfo) => {
        toast.info(`${userInfo.userId} state changed: ${NCCallUserState[userInfo.userState]}`)

        if (userInfo.userState === NCCallUserState.ONCALL) {
          const existingUser = remoteUserList.value.find(u => u.userId === userInfo.userId)
          if (!existingUser) {
            remoteUserList.value.push({
              userId: userInfo.userId,
              mediaType: mediaType.value
            })
          }
        } else if (userInfo.userState === NCCallUserState.IDLE) {
          remoteUserList.value = remoteUserList.value.filter(u => u.userId !== userInfo.userId)
        }
      },
      onMediaTypeChangeResultReceived: (result) => {
        toast.success('Media type changed successfully')

        mediaType.value = result.mediaType
        cameraEnabled.value = result.mediaType === NCCallMediaType.AUDIO_VIDEO

        remoteUserList.value.forEach(user => {
          user.mediaType = mediaType.value
        })
      },
      onServerCallLogReceived: (log) => {
        toast.success('Call log received')
        callLogs.value.unshift(log)
      },
      onRemoteUserInvited: (event) => {
        const { inviteeUserList, inviterUserId } = event
        toast.info(`${inviterUserId} invited ${inviteeUserList.join(', ')}`)
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
        const userIds = calleeUserIds.value.split(',').map(id => id.trim()).filter(id => id)

        if (mediaType.value === NCCallMediaType.AUDIO_VIDEO) {
          await setupVideoView(currentUserId.value, true)
        }

        const result = await NCEngine.startCall({
          calleeUserIds: userIds,
          mediaType: mediaType.value,
          callType: NCCallType.MULTI
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
        remoteUserList.value = []
      }
    }

    const showInviteDialog = () => {
      showInviteDialogVisible.value = true
    }

    const handleInvite = async () => {
      try {
        const userIds = inviteUserIds.value.split(',').map(id => id.trim()).filter(id => id)
        const result = await NCEngine.inviteToCall({
          userIds: userIds
        })

        if (result.code !== NCCallCode.SUCCESS) {
          throw new Error(`Invite failed with code: ${result.code}`)
        }

        showInviteDialogVisible.value = false
        inviteUserIds.value = ''
        toast.success('Invitation sent')
      } catch (error) {
        console.error('Invite failed:', error)
        toast.error(`Invite failed: ${error.message || 'Unknown error'}`)
      }
    }

    const cancelInvite = () => {
      showInviteDialogVisible.value = false
      inviteUserIds.value = ''
    }

    const handleEndCall = async () => {
      try {
        const result = await NCEngine.endCall({})

        if (result.code !== NCCallCode.SUCCESS) {
          throw new Error(`End call failed with code: ${result.code}`)
        }

        remoteUserList.value = []
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

    const handleAcceptCall = async () => {
      try {
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
        remoteUserList.value = []
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

    onMounted(() => {
      NCEngine.setCallEventHandler(callEventHandler)
    })

    onUnmounted(() => {
      NCEngine.setCallEventHandler(null)
    })

    return {
      calleeUserIds,
      mediaType,
      cameraEnabled,
      microphoneEnabled,
      remoteUserList,
      callLogs,
      showInviteDialogVisible,
      inviteUserIds,
      showIncomingCallDialog,
      incomingCallInfo,
      currentUserId,
      handleStartCall,
      showInviteDialog,
      handleInvite,
      cancelInvite,
      handleEndCall,
      toggleCamera,
      toggleMicrophone,
      handleAcceptCall,
      handleRejectCall,
      NCCallMediaType
    }
  }
}
</script>

<style scoped>
.multi-call-container {
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
  font-size: 12px;
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
}

.user-list-container {
  flex: 1;
  background: white;
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow-y: auto;
}

.user-list-container h3 {
  margin-bottom: 15px;
  color: #333;
  font-size: 16px;
}

.user-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.user-item {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
}

.user-info {
  margin-bottom: 10px;
  color: #333;
}

.user-video {
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
  font-size: 16px;
}

.call-logs {
  background: white;
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  max-height: 200px;
  overflow-y: auto;
  margin-top: 20px;
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
  min-width: 400px;
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
