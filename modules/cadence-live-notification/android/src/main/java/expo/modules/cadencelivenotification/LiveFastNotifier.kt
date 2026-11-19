package expo.modules.cadencelivenotification

import android.Manifest
import android.app.AlarmManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.graphics.drawable.Icon
import android.net.Uri
import android.os.Build
import androidx.annotation.RequiresApi
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import org.json.JSONObject
import java.text.DateFormat
import java.util.Date

/**
 * Owns the persistent live notification, in one of two modes:
 *
 * - "fast": a chronometer counting up from the start of the fast, with a progress
 *   bar to the goal and an "End fast" action.
 * - "eating": a chronometer counting down to the end of the eating window, with a
 *   progress bar through the window and a "Start fast" action. It removes itself
 *   when the window closes.
 *
 * The OS draws the ticking timer, so nothing needs to run in between. The
 * notification is re-rendered every 15 minutes (and at zone changes while
 * fasting) via an inexact alarm, after reboot, and whenever the JS side calls
 * start/refresh.
 *
 * On Android 16+ (API 36) the notification asks to be promoted to a Live Update
 * with a segmented progress bar. Its status bar chip shows the icon only, no
 * ticking time.
 */
object LiveFastNotifier {
  // v2: IMPORTANCE_DEFAULT so the status bar icon still shows if the user turns off Live Updates
  // for the app (LOW channels are "silent" and hidden from the status bar). Channel importance
  // can't be raised after creation, hence a new id.
  const val CHANNEL_ID = "cadence_live_fast_v2"
  private const val LEGACY_CHANNEL_ID = "cadence_live_fast"
  const val NOTIFICATION_ID = 4120
  const val ACTION_REFRESH = "link.gatete.cadence.LIVE_FAST_REFRESH"
  const val ACTION_DISMISSED = "link.gatete.cadence.LIVE_FAST_DISMISSED"

  private const val REFRESH_EVERY_MINUTES = 15
  private const val PREFS = "cadence_live_fast"
  private const val KEY_CONFIG = "config"

  // ---- persistence -------------------------------------------------------

  fun save(context: Context, json: String) {
    prefs(context).edit().putString(KEY_CONFIG, json).apply()
  }

  fun load(context: Context): JSONObject? {
    val raw = prefs(context).getString(KEY_CONFIG, null) ?: return null
    return try { JSONObject(raw) } catch (_: Exception) { null }
  }

  fun clear(context: Context) {
    prefs(context).edit().remove(KEY_CONFIG).apply()
  }

  private fun prefs(context: Context) =
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  // ---- public entry points ----------------------------------------------

  /** Posts (or replaces) the notification from the saved config. No-op when nothing is live. */
  fun post(context: Context) {
    val config = load(context) ?: return
    if (config.optString("mode", "fast") == "eating") {
      postEating(context, config)
    } else {
      postFast(context, config)
    }
  }

  fun cancel(context: Context) {
    clear(context)
    NotificationManagerCompat.from(context).cancel(NOTIFICATION_ID)
    alarmManager(context).cancel(refreshIntent(context))
  }

  fun isActive(context: Context): Boolean {
    val nm = context.getSystemService(NotificationManager::class.java) ?: return false
    return nm.activeNotifications.any { it.id == NOTIFICATION_ID }
  }

  // ---- fasting -----------------------------------------------------------

  private data class Zone(val startMinutes: Int, val label: String, val color: Int)

  private data class FastState(
    val startedAt: Long,
    val goalMinutes: Int,
    val elapsedMinutes: Int,
    val zones: List<Zone>,
    val current: Zone,
    val next: Zone?,
  ) {
    val goalAt: Long get() = startedAt + goalMinutes * 60_000L
    val goalReached: Boolean get() = elapsedMinutes >= goalMinutes

    companion object {
      fun from(config: JSONObject, now: Long): FastState {
        val startedAt = config.getLong("startedAt")
        val goalMinutes = config.optInt("goalMinutes", 960)
        val elapsed = ((now - startedAt) / 60_000L).toInt().coerceAtLeast(0)
        val arr = config.optJSONArray("zones")
        val zones = mutableListOf<Zone>()
        if (arr != null) {
          for (i in 0 until arr.length()) {
            val z = arr.getJSONObject(i)
            zones.add(Zone(z.getInt("startMinutes"), z.getString("label"), parseColor(z.optString("color"), Color.GRAY)))
          }
        }
        if (zones.isEmpty()) zones.add(Zone(0, "Fasting", Color.GRAY))
        zones.sortBy { it.startMinutes }
        val current = zones.lastOrNull { it.startMinutes <= elapsed } ?: zones.first()
        val next = zones.firstOrNull { it.startMinutes > elapsed }
        return FastState(startedAt, goalMinutes, elapsed, zones, current, next)
      }
    }
  }

  private fun postFast(context: Context, config: JSONObject) {
    ensureChannel(context)
    if (!canPost(context)) return

    val state = FastState.from(config, System.currentTimeMillis())
    val notification = if (Build.VERSION.SDK_INT >= 36) {
      buildFastPromoted(context, config, state)
    } else {
      buildFastCompat(context, config, state)
    }
    NotificationManagerCompat.from(context).notify(NOTIFICATION_ID, notification)

    // Next zone boundary, the goal, or the next 15-minute mark, whichever is first. Once the
    // goal is reached the bar is full, so only zone changes remain.
    val nextQuarter = (state.elapsedMinutes / REFRESH_EVERY_MINUTES + 1) * REFRESH_EVERY_MINUTES
    val nextMinute = listOfNotNull(
      state.next?.startMinutes,
      state.goalMinutes.takeIf { !state.goalReached },
      nextQuarter.takeIf { !state.goalReached },
    ).minOrNull()
    scheduleRefresh(context, nextMinute?.let { state.startedAt + it * 60_000L })
  }

  private fun fastText(state: FastState): String {
    val time = DateFormat.getTimeInstance(DateFormat.SHORT).format(Date(state.goalAt))
    return if (state.goalReached) {
      "Goal reached · ${state.current.label}"
    } else {
      "${state.current.label} · goal at $time"
    }
  }

  private fun buildFastCompat(context: Context, config: JSONObject, state: FastState): Notification {
    val accent = parseColor(config.optString("accentColor"), Color.parseColor("#F07C25"))
    return NotificationCompat.Builder(context, CHANNEL_ID)
      .setSmallIcon(smallIcon(context))
      .setContentTitle(config.optString("title", "Fasting"))
      .setContentText(fastText(state))
      .setColor(accent)
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setShowWhen(true)
      .setWhen(state.startedAt)
      .setUsesChronometer(true)
      .setProgress(state.goalMinutes, state.elapsedMinutes.coerceAtMost(state.goalMinutes), false)
      .setCategory(NotificationCompat.CATEGORY_STOPWATCH)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setContentIntent(openAppIntent(context))
      .setDeleteIntent(dismissedIntent(context))
      .addAction(0, "End fast", deepLinkIntent(context, config, "end-fast", REQUEST_END_FAST))
      .build()
  }

  @RequiresApi(36)
  private fun buildFastPromoted(context: Context, config: JSONObject, state: FastState): Notification {
    val segments = state.zones.mapIndexedNotNull { i, zone ->
      val end = (state.zones.getOrNull(i + 1)?.startMinutes ?: state.goalMinutes).coerceAtMost(state.goalMinutes)
      val length = end - zone.startMinutes
      if (length <= 0) null else Notification.ProgressStyle.Segment(length).setColor(zone.color)
    }
    val style = Notification.ProgressStyle()
      .setStyledByProgress(true)
      .setProgressSegments(segments)
      .setProgress(state.elapsedMinutes.coerceAtMost(state.goalMinutes))

    return promotedBuilder(context, config, "Fasting", fastText(state), style)
      .setWhen(state.startedAt)
      .setCategory(Notification.CATEGORY_STOPWATCH)
      .addAction(action(context, "End fast", deepLinkIntent(context, config, "end-fast", REQUEST_END_FAST)))
      .build()
  }

  // ---- eating window -----------------------------------------------------

  private data class EatingState(val startedAt: Long, val endsAt: Long, val now: Long) {
    val totalMinutes: Int get() = ((endsAt - startedAt) / 60_000L).toInt().coerceAtLeast(1)
    val elapsedMinutes: Int get() = ((now - startedAt) / 60_000L).toInt().coerceIn(0, totalMinutes)
    val closed: Boolean get() = now >= endsAt
  }

  private fun postEating(context: Context, config: JSONObject) {
    val state = EatingState(config.getLong("startedAt"), config.getLong("endsAt"), System.currentTimeMillis())
    // The window has closed: nothing left to count down, so step aside quietly.
    if (state.closed) {
      cancel(context)
      return
    }
    ensureChannel(context)
    if (!canPost(context)) return

    val notification = if (Build.VERSION.SDK_INT >= 36) {
      buildEatingPromoted(context, config, state)
    } else {
      buildEatingCompat(context, config, state)
    }
    NotificationManagerCompat.from(context).notify(NOTIFICATION_ID, notification)

    // Next 15-minute mark of the window, or its end (where the refresh removes the notification).
    val nextQuarter = state.startedAt + (state.elapsedMinutes / REFRESH_EVERY_MINUTES + 1) * REFRESH_EVERY_MINUTES * 60_000L
    scheduleRefresh(context, minOf(nextQuarter, state.endsAt))
  }

  private fun eatingText(state: EatingState): String {
    val time = DateFormat.getTimeInstance(DateFormat.SHORT).format(Date(state.endsAt))
    return "Next fast at $time"
  }

  private fun buildEatingCompat(context: Context, config: JSONObject, state: EatingState): Notification {
    val accent = parseColor(config.optString("accentColor"), Color.parseColor("#9BB068"))
    return NotificationCompat.Builder(context, CHANNEL_ID)
      .setSmallIcon(smallIcon(context))
      .setContentTitle(config.optString("title", "Eating window"))
      .setContentText(eatingText(state))
      .setColor(accent)
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setShowWhen(true)
      .setWhen(state.endsAt)
      .setUsesChronometer(true)
      .setChronometerCountDown(true)
      .setProgress(state.totalMinutes, state.elapsedMinutes, false)
      .setCategory(NotificationCompat.CATEGORY_PROGRESS)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setContentIntent(openAppIntent(context))
      .setDeleteIntent(dismissedIntent(context))
      .addAction(0, "Start fast", deepLinkIntent(context, config, "start-fast", REQUEST_START_FAST))
      .build()
  }

  @RequiresApi(36)
  private fun buildEatingPromoted(context: Context, config: JSONObject, state: EatingState): Notification {
    val accent = parseColor(config.optString("accentColor"), Color.parseColor("#9BB068"))
    val style = Notification.ProgressStyle()
      .setStyledByProgress(true)
      .setProgressSegments(listOf(Notification.ProgressStyle.Segment(state.totalMinutes).setColor(accent)))
      .setProgress(state.elapsedMinutes)

    return promotedBuilder(context, config, "Eating window", eatingText(state), style)
      .setWhen(state.endsAt)
      .setChronometerCountDown(true)
      .setCategory(Notification.CATEGORY_PROGRESS)
      .addAction(action(context, "Start fast", deepLinkIntent(context, config, "start-fast", REQUEST_START_FAST)))
      .build()
  }

  // ---- shared builders ---------------------------------------------------

  @RequiresApi(36)
  private fun promotedBuilder(
    context: Context,
    config: JSONObject,
    fallbackTitle: String,
    text: String,
    style: Notification.ProgressStyle,
  ): Notification.Builder =
    Notification.Builder(context, CHANNEL_ID)
      .setSmallIcon(smallIcon(context))
      .setContentTitle(config.optString("title", fallbackTitle))
      .setContentText(text)
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setShowWhen(true)
      .setUsesChronometer(true)
      .setVisibility(Notification.VISIBILITY_PUBLIC)
      .setStyle(style)
      .setContentIntent(openAppIntent(context))
      .setDeleteIntent(dismissedIntent(context))
      .setRequestPromotedOngoing(true)
      // A promoted notification always gets a status bar chip. An empty short critical
      // text takes precedence over the chronometer, so the chip shows only the icon.
      .setShortCriticalText("")

  @RequiresApi(36)
  private fun action(context: Context, title: String, intent: PendingIntent): Notification.Action =
    Notification.Action.Builder(Icon.createWithResource(context, smallIcon(context)), title, intent).build()

  // ---- plumbing ----------------------------------------------------------

  private const val REQUEST_OPEN = 1
  private const val REQUEST_END_FAST = 2
  private const val REQUEST_REFRESH = 3
  private const val REQUEST_DISMISSED = 4
  private const val REQUEST_START_FAST = 5

  private fun ensureChannel(context: Context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val nm = context.getSystemService(NotificationManager::class.java) ?: return
    if (nm.getNotificationChannel(LEGACY_CHANNEL_ID) != null) nm.deleteNotificationChannel(LEGACY_CHANNEL_ID)
    // Re-creating an existing channel updates its name and description (never its importance),
    // so the rename to "Live timer" reaches installs that created it as "Fast in progress".
    val channel = NotificationChannel(CHANNEL_ID, "Live timer", NotificationManager.IMPORTANCE_DEFAULT).apply {
      description = "The live timer for your fast and your eating window."
      // Default importance keeps the icon in the status bar; no sound or vibration, ever.
      setSound(null, null)
      enableVibration(false)
      setShowBadge(false)
      lockscreenVisibility = Notification.VISIBILITY_PUBLIC
    }
    nm.createNotificationChannel(channel)
  }

  private fun canPost(context: Context): Boolean {
    if (Build.VERSION.SDK_INT >= 33 &&
      ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
    ) return false
    return NotificationManagerCompat.from(context).areNotificationsEnabled()
  }

  private fun smallIcon(context: Context): Int {
    val id = context.resources.getIdentifier("notification_icon", "drawable", context.packageName)
    return if (id != 0) id else context.applicationInfo.icon
  }

  private fun openAppIntent(context: Context): PendingIntent {
    val launch = context.packageManager.getLaunchIntentForPackage(context.packageName)
      ?: Intent(Intent.ACTION_MAIN).setPackage(context.packageName)
    return PendingIntent.getActivity(context, REQUEST_OPEN, launch, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
  }

  /** Opens the app at <scheme>://<path>, where the JS side acts at the moment of the tap. */
  private fun deepLinkIntent(context: Context, config: JSONObject, path: String, requestCode: Int): PendingIntent {
    val scheme = config.optString("scheme", "cadence")
    val intent = Intent(Intent.ACTION_VIEW, Uri.parse("$scheme://$path"))
      .setPackage(context.packageName)
      .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
    return PendingIntent.getActivity(context, requestCode, intent, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
  }

  private fun refreshIntent(context: Context): PendingIntent {
    val intent = Intent(context, LiveFastReceiver::class.java).setAction(ACTION_REFRESH)
    return PendingIntent.getBroadcast(context, REQUEST_REFRESH, intent, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
  }

  private fun dismissedIntent(context: Context): PendingIntent {
    val intent = Intent(context, LiveFastReceiver::class.java).setAction(ACTION_DISMISSED)
    return PendingIntent.getBroadcast(context, REQUEST_DISMISSED, intent, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
  }

  private fun alarmManager(context: Context) =
    context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

  /**
   * Re-renders at `at` (plus a second, so the boundary has passed), or cancels any pending
   * refresh when null. Inexact on purpose: the chronometer, not this alarm, keeps time.
   */
  private fun scheduleRefresh(context: Context, at: Long?) {
    val am = alarmManager(context)
    val pi = refreshIntent(context)
    if (at == null) {
      am.cancel(pi)
      return
    }
    am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at + 1_000L, pi)
  }

  private fun parseColor(value: String?, fallback: Int): Int =
    try { if (value.isNullOrEmpty()) fallback else Color.parseColor(value) } catch (_: IllegalArgumentException) { fallback }
}
