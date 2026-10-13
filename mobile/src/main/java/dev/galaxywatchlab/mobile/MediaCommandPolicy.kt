package dev.galaxywatchlab.mobile

/** Pure decision logic: no Android system calls, device access, or side effects. */
internal enum class MediaDispatchPlan { PLAY, PAUSE, TOGGLE, NEXT, PREVIOUS }

internal object MediaCommandPolicy {
    fun decide(
        command: String,
        playing: Boolean,
        canPlay: Boolean,
        canPause: Boolean,
        canToggle: Boolean,
        canNext: Boolean,
        canPrevious: Boolean
    ): MediaDispatchPlan? = when (command) {
        "NEXT" -> if (canNext) MediaDispatchPlan.NEXT else null
        "PREVIOUS" -> if (canPrevious) MediaDispatchPlan.PREVIOUS else null
        "PLAY_PAUSE" -> when {
            playing && canPause -> MediaDispatchPlan.PAUSE
            !playing && canPlay -> MediaDispatchPlan.PLAY
            canToggle -> MediaDispatchPlan.TOGGLE
            else -> null
        }
        else -> null
    }
}
