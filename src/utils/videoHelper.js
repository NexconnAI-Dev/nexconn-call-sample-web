import { nextTick } from 'vue'
import NCEngine from './NCEngine'

/**
 * Setup video view for local or remote user
 * @param {string} userId - User ID
 * @param {boolean} isLocal - Whether this is the local user
 * @param {boolean} enableLowResolutionStream - Enable low resolution stream for remote users
 */
export const setupVideoView = async (userId, isLocal = false, enableLowResolutionStream = false) => {
  await nextTick()

  const videoElement = document.getElementById(`video-${userId}`)

  if (!videoElement) {
    console.warn(`Video element not found for user: ${userId}`)
    return
  }

  if (isLocal) {
    NCEngine.setLocalVideoView({ videoElement })
  } else {
    NCEngine.setRemoteVideoView([{ userId, videoElement, enableLowResolutionStream }])
  }
}
