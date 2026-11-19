package expo.modules.cadencelivenotification

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** Zone-boundary refreshes and (optionally) re-posting after a swipe-away. */
class LiveFastReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    when (intent.action) {
      LiveFastNotifier.ACTION_REFRESH -> LiveFastNotifier.post(context)
      LiveFastNotifier.ACTION_DISMISSED -> {
        val config = LiveFastNotifier.load(context) ?: return
        if (config.optBoolean("repostOnDismiss", false)) LiveFastNotifier.post(context)
      }
    }
  }
}

/** Restores the live notification after a reboot or an app update. */
class LiveFastBootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    when (intent.action) {
      Intent.ACTION_BOOT_COMPLETED, Intent.ACTION_MY_PACKAGE_REPLACED -> LiveFastNotifier.post(context)
    }
  }
}
