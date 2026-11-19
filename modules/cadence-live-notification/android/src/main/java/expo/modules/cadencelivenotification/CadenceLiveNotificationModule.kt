package expo.modules.cadencelivenotification

import android.content.Context
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class CadenceLiveNotificationModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("CadenceLiveNotification")

    /** Saves the fast config (JSON) and posts or replaces the live notification. */
    Function("start") { configJson: String ->
      LiveFastNotifier.save(context, configJson)
      LiveFastNotifier.post(context)
    }

    /** Re-renders from the saved config, for example after the app returns to the foreground. */
    Function("refresh") {
      LiveFastNotifier.post(context)
    }

    Function("stop") {
      LiveFastNotifier.cancel(context)
    }

    Function("isShowing") {
      LiveFastNotifier.isActive(context)
    }
  }
}
