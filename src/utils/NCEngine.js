// NCEngine implementation class - based on @nexconn/call SDK

import { NCEngine as IMEngine, LogLevel } from '@nexconn/chat'
import {
  NCCallEngine,
  NCCallMediaType,
  NCCallType,
  NCCallCode,
  NCCallUserState,
} from '@nexconn/call'
import { setupVideoView } from './videoHelper'

// Global variables
let ncCallEngine = null
let currentUserId = null
let callEventHandler = null
let currentCallId = null
let hasLocalVideoView = false

class NCEngine {
  /**
   * Initialize SDK
   */
  static initialize(config) {
    const { appkey, navi, logLevel = LogLevel.ERROR } = config
    IMEngine.initialize({
      appKey: appkey,
      navi: navi || undefined,
    })
  }

  /**
   * Connect to IM
   */
  static async connect(appKey, userToken) {
    try {
      this.initialize({ appkey: appKey })

      const result = await IMEngine.connect({ token: userToken })

      if (!result.isOk || !result.data) {
        throw new Error(`Connection failed: ${result.code} ${result.msg}`)
      }

      currentUserId = result.data.userId

      ncCallEngine = new NCCallEngine({})

      this._setupCallEventListeners()

      return result
    } catch (error) {
      console.error('Connection error:', error)
      throw error
    }
  }

  static getCurrentUserId() {
    return currentUserId
  }

  /**
   * Disconnect
   */
  static async disconnect() {
    try {
      await IMEngine.disconnect()
      ncCallEngine = null
      currentUserId = null
      currentCallId = null
      hasLocalVideoView = false
    } catch (error) {
      console.error('Disconnect error:', error)
      throw error
    }
  }

  /**
   * Set call event handler
   */
  static setCallEventHandler(handler) {
    callEventHandler = handler
  }

  /**
   * Setup call event listeners
   */
  static _setupCallEventListeners() {
    if (!ncCallEngine) return

    ncCallEngine.setCallEventHandler({
      onCallReceived(event) {
        const { session, extra } = event
        currentCallId = session.getCallId()

        callEventHandler?.onCallReceived({
          caller: session.getInviterUserId(),
          callId: currentCallId,
          mediaType: session.getMediaType(),
          session,
          extra
        })
      },

      onCallConnected(event) {
        const { session } = event

        callEventHandler?.onCallConnected({
          callId: session.getCallId(),
          session
        })
      },

      onCallEnded(event) {
        const { session, reason } = event
        currentCallId = null
        hasLocalVideoView = false

        callEventHandler?.onCallEnded({
          callId: session.getCallId(),
          reason,
          session
        })
      },

      onRemoteUserStateChanged(event) {
        const { callId, userId, userState, reason } = event

        callEventHandler?.onRemoteUserStateChanged({
          callId,
          userId,
          userState,
          reason,
          state: userState === NCCallUserState.ONCALL ? 'ONCALL' : 'IDLE'
        })

        if (userState === NCCallUserState.ONCALL) {
          const session = ncCallEngine.getCurrentCallSession()
          if (session && session.getMediaType() === NCCallMediaType.AUDIO_VIDEO) {
            setupVideoView(userId, false)
          }
        }
      },

      onMediaTypeChangeRequestReceived(event) {
        const { userId, transactionId, mediaType } = event

        callEventHandler?.onMediaTypeChangeRequestReceived({
          userId,
          transactionId,
          mediaType,
          newMediaType: mediaType
        })
      },

      onMediaTypeChangeResultReceived(event) {
        const { userId, mediaType, result } = event

        callEventHandler?.onMediaTypeChangeResultReceived({
          userId,
          mediaType,
          result
        })
      },

      onServerCallLogReceived(event) {
        const { callLog } = event

        callEventHandler?.onServerCallLogReceived({
          startTime: callLog.startTime,
          endTime: callLog.endTime,
          participants: callLog.participants || [],
          endReason: callLog.endReason,
          callLog
        })
      },

      onRemoteUserInvited(event) {
        const { inviteeUserList, inviterUserId, callId } = event

        callEventHandler?.onRemoteUserInvited({
          inviteeUserList,
          inviterUserId,
          callId
        })
      },

      onRemoteCameraStateChanged(event) {
        const { callId, userId, disabled } = event

        callEventHandler?.onRemoteCameraStateChanged({
          callId,
          userId,
          disabled
        })
      },

      onRemoteMicrophoneStateChanged(event) {
        const { callId, userId, disabled } = event

        callEventHandler?.onRemoteMicrophoneStateChanged({
          callId,
          userId,
          disabled
        })
      }
    })
  }

  /**
   * Start call
   */
  static async startCall(params) {
    if (!ncCallEngine) {
      throw new Error('NCCallEngine not initialized')
    }

    try {
      const { calleeUserId, calleeUserIds, mediaType, callType } = params

      let calleeIds = []
      if (callType === NCCallType.SINGLE) {
        calleeIds = [calleeUserId]
      } else {
        calleeIds = calleeUserIds || []
      }

      const result = await ncCallEngine.startCall({
        calleeIds,
        callType: callType,
        mediaType: mediaType
      })

      if (result.code === NCCallCode.SUCCESS) {
        currentCallId = result.callId
      }

      return result
    } catch (error) {
      console.error('Start call error:', error)
      throw error
    }
  }

  /**
   * End call
   */
  static async endCall(params) {
    if (!ncCallEngine) {
      throw new Error('NCCallEngine not initialized')
    }

    try {
      const { callId } = params
      const result = await ncCallEngine.endCall({
        callId: callId || currentCallId
      })

      if (result.code === NCCallCode.SUCCESS) {
        currentCallId = null
      }

      return result
    } catch (error) {
      console.error('End call error:', error)
      throw error
    }
  }

  /**
   * Accept call
   */
  static async acceptCall(params) {
    if (!ncCallEngine) {
      throw new Error('NCCallEngine not initialized')
    }

    try {
      const { callId } = params

      const result = await ncCallEngine.acceptCall({
        callId: callId || currentCallId
      })

      return result
    } catch (error) {
      console.error('Accept call error:', error)
      throw error
    }
  }

  /**
   * Enable/disable camera
   */
  static async enableCamera(enabled) {
    if (!ncCallEngine) {
      throw new Error('NCCallEngine not initialized')
    }

    try {
      if (enabled && !hasLocalVideoView && currentUserId) {
        await setupVideoView(currentUserId, true)
      }

      const result = await ncCallEngine.enableCamera(enabled)
      return result
    } catch (error) {
      console.error('Camera operation error:', error)
      throw error
    }
  }

  /**
   * Enable/disable microphone
   */
  static async enableMicrophone(enabled) {
    if (!ncCallEngine) {
      throw new Error('NCCallEngine not initialized')
    }

    try {
      const result = await ncCallEngine.enableMicrophone(enabled)
      return result
    } catch (error) {
      console.error('Microphone operation error:', error)
      throw error
    }
  }

  /**
   * Get microphone enabled state
   */
  static isMicrophoneEnabled() {
    if (!ncCallEngine) {
      return false
    }

    try {
      return ncCallEngine.isMicrophoneEnabled()
    } catch (error) {
      console.error('Get microphone state error:', error)
      return false
    }
  }

  /**
   * Request change media type
   */
  static async requestChangeMediaType(mediaType) {
    if (!ncCallEngine) {
      throw new Error('NCCallEngine not initialized')
    }

    try {
      const result = await ncCallEngine.requestChangeMediaType({
        mediaType: mediaType
      })

      return result
    } catch (error) {
      console.error('Request change media type error:', error)
      throw error
    }
  }

  /**
   * Reply change media type request
   */
  static async replyChangeMediaType(params) {
    if (!ncCallEngine) {
      throw new Error('NCCallEngine not initialized')
    }

    try {
      const { isAgreed, transactionId } = params
      const result = await ncCallEngine.replyChangeMediaType({
        transactionId,
        isAgreed
      })

      return result
    } catch (error) {
      console.error('Reply change media type error:', error)
      throw error
    }
  }

  /**
   * Invite users to call
   */
  static async inviteToCall(params) {
    if (!ncCallEngine) {
      throw new Error('NCCallEngine not initialized')
    }

    try {
      const { userIds } = params
      const result = await ncCallEngine.inviteToCall({
        calleeIds: userIds
      })

      return result
    } catch (error) {
      console.error('Invite users error:', error)
      throw error
    }
  }

  /**
   * Set local video view
   */
  static setLocalVideoView(params) {
    if (!ncCallEngine) {
      throw new Error('NCCallEngine not initialized')
    }

    try {
      const { videoElement } = params
      const result = ncCallEngine.setLocalVideoView({ videoElement })
      hasLocalVideoView = Boolean(videoElement)
      return result
    } catch (error) {
      console.error('Set local video view error:', error)
      throw error
    }
  }

  /**
   * Set remote video view
   */
  static setRemoteVideoView(params) {
    if (!ncCallEngine) {
      throw new Error('NCCallEngine not initialized')
    }

    try {
      return ncCallEngine.setRemoteVideoView(params)
    } catch (error) {
      console.error('Set remote video view error:', error)
      throw error
    }
  }
}

export { NCCallType, NCCallMediaType, NCCallUserState, NCCallCode }

export default NCEngine
