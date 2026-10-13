package dev.galaxywatchlab.mobile

import android.service.notification.NotificationListenerService

/** Required by MediaSessionManager. Intentionally never reads or stores posted notifications. */
class MediaAccessListener : NotificationListenerService()
