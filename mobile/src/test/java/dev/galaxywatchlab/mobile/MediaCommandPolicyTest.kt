package dev.galaxywatchlab.mobile

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class MediaCommandPolicyTest {
    private fun decision(
        command: String, playing: Boolean = true, canPlay: Boolean = false,
        canPause: Boolean = false, canToggle: Boolean = false,
        canNext: Boolean = false, canPrevious: Boolean = false
    ) = MediaCommandPolicy.decide(command, playing, canPlay, canPause, canToggle, canNext, canPrevious)

    @Test fun playing_prefers_explicit_pause() {
        assertEquals(MediaDispatchPlan.PAUSE,
            decision("PLAY_PAUSE", playing = true, canPause = true, canToggle = true))
    }
    @Test fun paused_prefers_explicit_play() {
        assertEquals(MediaDispatchPlan.PLAY,
            decision("PLAY_PAUSE", playing = false, canPlay = true, canToggle = true))
    }
    @Test fun playing_toggle_only_is_addressed_toggle() {
        assertEquals(MediaDispatchPlan.TOGGLE,
            decision("PLAY_PAUSE", playing = true, canToggle = true))
    }
    @Test fun paused_toggle_only_is_addressed_toggle() {
        assertEquals(MediaDispatchPlan.TOGGLE,
            decision("PLAY_PAUSE", playing = false, canToggle = true))
    }
    @Test fun unsupported_pause_is_rejected_even_if_play_supported() {
        assertNull(decision("PLAY_PAUSE", playing = true, canPlay = true))
    }
    @Test fun unsupported_play_is_rejected_even_if_pause_supported() {
        assertNull(decision("PLAY_PAUSE", playing = false, canPause = true))
    }
    @Test fun next_and_previous_are_independently_gated() {
        assertEquals(MediaDispatchPlan.NEXT, decision("NEXT", canNext = true))
        assertNull(decision("NEXT", canPrevious = true))
        assertEquals(MediaDispatchPlan.PREVIOUS, decision("PREVIOUS", canPrevious = true))
        assertNull(decision("PREVIOUS", canNext = true))
    }
    @Test fun unknown_commands_never_dispatch() {
        assertNull(decision("VOLUME_UP", canNext = true, canPlay = true, canPause = true, canToggle = true))
        assertNull(decision("", canNext = true))
    }
    @Test fun no_advertised_action_never_dispatches() {
        for (action in listOf("PLAY_PAUSE", "NEXT", "PREVIOUS")) assertNull(decision(action))
    }
}
