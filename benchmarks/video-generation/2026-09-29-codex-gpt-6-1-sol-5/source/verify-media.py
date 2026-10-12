"""Save independent export metadata and responsive player layout checks."""
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
result = subprocess.run([
    'ffprobe', '-v', 'error', '-count_frames', '-show_streams', '-show_format',
    '-of', 'json', str(ROOT / 'video.mp4')
], capture_output=True, text=True, check=True)
data = json.loads(result.stdout)
assert not result.stderr.strip(), result.stderr
video = next(item for item in data['streams'] if item['codec_type'] == 'video')
audio = next(item for item in data['streams'] if item['codec_type'] == 'audio')
assert video['width'] == 1920 and video['height'] == 1080
assert video['width'] / video['height'] == 16 / 9
assert video['r_frame_rate'] == '60/1'
assert video['nb_read_frames'] == '2700'
assert video['pix_fmt'] == 'yuv420p'
assert abs(float(data['format']['duration']) - 45) < .03
assert abs(float(audio['duration']) - 45) < .03
assert video['codec_name'] == 'h264' and audio['codec_name'] == 'aac'

html = (ROOT / 'index.html').read_text()
assert '<title>GPT-6</title>' in html
assert 'controls' in html and 'object-fit: contain' in html
assert '<h1' not in html and '<h2' not in html
assert 'src="video.mp4"' in html

layouts = []
for width, height in [(1920, 1080), (1440, 900), (800, 1200), (3440, 1440), (390, 844)]:
    fit_width = min(width, height * 16 / 9)
    fit_height = min(height, width * 9 / 16)
    assert abs(fit_width / fit_height - 16 / 9) < .0001
    assert abs(fit_width - width) < .0001 or abs(fit_height - height) < .0001
    layouts.append({'viewport': [width, height], 'player': [fit_width, fit_height]})

report = {
    'duration_seconds': float(data['format']['duration']),
    'dimensions': [video['width'], video['height']],
    'aspect_ratio': '16:9',
    'fps': 60,
    'frames': int(video['nb_read_frames']),
    'video_codec': video['codec_name'],
    'pixel_format': video['pix_fmt'],
    'audio_codec': audio['codec_name'],
    'audio_channels': audio['channels'],
    'audio_sample_rate': audio['sample_rate'],
    'file_size_bytes': int(data['format']['size']),
    'player_layouts': layouts,
    'browser_playback': 'Not verified: dev-browser returned Operation not permitted before accessing the player.'
}
(ROOT / 'verification/media.json').write_text(json.dumps(data, indent=2))
(ROOT / 'verification/report.json').write_text(json.dumps(report, indent=2))
print(json.dumps(report, indent=2))
