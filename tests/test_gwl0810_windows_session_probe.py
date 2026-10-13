"""Offline tests with mocked WinRT interface. No actual Windows media operations."""
import asyncio
import importlib.util
import pathlib
import unittest
from types import SimpleNamespace

ROOT = pathlib.Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('gwl0810probe', ROOT/'tools'/'gwl0810_windows_session_probe.py')
probe = importlib.util.module_from_spec(spec)
spec.loader.exec_module(probe)


class MockSession:
    def __init__(self, app, status='PLAYING'):
        self.source_app_user_model_id = app
        self.status = status
    def get_playback_info(self):
        return SimpleNamespace(playback_status=SimpleNamespace(name=self.status))


class MockManager:
    def __init__(self):
        self.instances = [
            MockSession('chrome.exe', 'PLAYING'),
            MockSession('YandexMusicNative', 'PAUSED'),
            MockSession('SoundCloud-Official', 'PLAYING'),
            MockSession('unknownplayer', 'STOPPED'),
        ]
    def get_sessions(self):
        return self.instances
    def get_current_session(self):
        return self.instances[0]


class FakeWinRT:
    class GlobalSystemMediaTransportControlsSessionManager:
        @staticmethod
        async def request_async():
            return MockManager()


class TestReadOnly(unittest.TestCase):
    def test_classification_does_not_claim_browser_tabs(self):
        self.assertEqual(probe.classify_app_id('chrome.exe'), 'BROWSER_TAB_UNRESOLVED')
        self.assertEqual(probe.classify_app_id('msedge.exe'), 'BROWSER_TAB_UNRESOLVED')
        self.assertEqual(probe.classify_app_id('YandexMusicApp'), 'YANDEX_APP_CANDIDATE_UNVERIFIED')
        self.assertEqual(probe.classify_app_id('SoundCloud'), 'SOUNDCLOUD_APP_CANDIDATE_UNVERIFIED')
        self.assertEqual(probe.classify_app_id(None), 'UNKNOWN_SOURCE')
        self.assertEqual(probe.classify_app_id('SomeOtherApp'), 'OTHER_APP')

    def test_results_hide_app_ids_by_default(self):
        report = asyncio.run(probe.inspect_sessions(FakeWinRT))
        self.assertEqual(report['count'], 4)
        self.assertFalse(any('source_app_user_model_id' in x for x in report['sessions']))
        self.assertEqual(report['sessions'][0]['source_class'], 'BROWSER_TAB_UNRESOLVED')
        self.assertTrue(report['sessions'][0]['same_app_id_as_system_current'])
        self.assertEqual(report['media_actions_executed'], 0)

    def test_explicit_reveal(self):
        report = asyncio.run(probe.inspect_sessions(FakeWinRT, include_identifiers=True))
        self.assertEqual(report['sessions'][1]['source_app_user_model_id'], 'YandexMusicNative')

    def test_no_media_actions_available(self):
        self.assertFalse(hasattr(probe, 'send_media_key'))
        self.assertFalse(hasattr(probe, 'try_toggle_play_pause_async'))


if __name__ == '__main__':
    unittest.main()
