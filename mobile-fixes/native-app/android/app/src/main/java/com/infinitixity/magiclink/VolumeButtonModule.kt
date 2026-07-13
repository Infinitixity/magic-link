package com.infinitixity.magiclink

import android.content.Context
import android.media.AudioManager
import android.database.ContentObserver
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule
import kotlin.math.roundToInt

class VolumeButtonModule(
  reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {
  private var listenerCount = 0
  private var volumeObserver: ContentObserver? = null
  private var lastVolumePercent = currentMediaVolumePercent()

  override fun getName(): String = "VolumeButtonControls"

  @ReactMethod
  fun setMediaVolume(percent: Double) {
    val audioManager = reactApplicationContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager
    val maxVolume = audioManager.getStreamMaxVolume(AudioManager.STREAM_MUSIC)
    val clampedPercent = percent.coerceIn(0.0, 100.0)
    val nextVolume = ((clampedPercent / 100.0) * maxVolume).roundToInt()
    audioManager.setStreamVolume(AudioManager.STREAM_MUSIC, nextVolume, 0)
    emitVolumeChanged(currentMediaVolumePercent())
  }

  @ReactMethod
  fun getMediaVolume() {
    emitVolumeChanged(currentMediaVolumePercent())
  }

  @ReactMethod
  fun addListener(eventName: String) {
    listenerCount += 1
    if (listenerCount == 1) {
      startVolumeObserver()
    }
  }

  @ReactMethod
  fun removeListeners(count: Int) {
    listenerCount = (listenerCount - count).coerceAtLeast(0)
    if (listenerCount == 0) {
      stopVolumeObserver()
    }
  }

  override fun invalidate() {
    stopVolumeObserver()
    super.invalidate()
  }

  private fun startVolumeObserver() {
    if (volumeObserver != null) {
      return
    }

    volumeObserver = object : ContentObserver(Handler(Looper.getMainLooper())) {
      override fun onChange(selfChange: Boolean) {
        super.onChange(selfChange)
        val nextVolume = currentMediaVolumePercent()
        if (nextVolume != lastVolumePercent) {
          emitVolumeChanged(nextVolume)
        }
      }
    }

    reactApplicationContext.contentResolver.registerContentObserver(
      Settings.System.CONTENT_URI,
      true,
      volumeObserver!!
    )
  }

  private fun stopVolumeObserver() {
    volumeObserver?.let {
      reactApplicationContext.contentResolver.unregisterContentObserver(it)
    }
    volumeObserver = null
  }

  private fun currentMediaVolumePercent(): Int {
    val audioManager = reactApplicationContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager
    val maxVolume = audioManager.getStreamMaxVolume(AudioManager.STREAM_MUSIC).coerceAtLeast(1)
    val currentVolume = audioManager.getStreamVolume(AudioManager.STREAM_MUSIC)
    return ((currentVolume.toDouble() / maxVolume.toDouble()) * 100.0).roundToInt().coerceIn(0, 100)
  }

  private fun emitVolumeChanged(volume: Int) {
    lastVolumePercent = volume
    val payload = Arguments.createMap().apply {
      putInt("volume", volume)
    }

    reactApplicationContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit("MagicLinkMediaVolumeChanged", payload)
  }
}
