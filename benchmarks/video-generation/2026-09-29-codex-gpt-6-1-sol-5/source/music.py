"""Create an original 128 BPM electronic score and motion accents."""
from pathlib import Path
import wave

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
RATE, DURATION, BPM = 48000, 45, 128
BEAT = 60 / BPM
SCORE = np.zeros((RATE * DURATION, 2), dtype=np.float64)
RANDOM = np.random.default_rng(126)


def add(sound, start, volume=1, pan=0):
    offset = round(start * RATE)
    if offset < 0:
        sound = sound[-offset:]
        offset = 0
    length = min(len(sound), len(SCORE) - offset)
    if length <= 0:
        return
    left = np.cos((pan + 1) * np.pi / 4)
    right = np.sin((pan + 1) * np.pi / 4)
    SCORE[offset:offset + length, 0] += sound[:length] * volume * left
    SCORE[offset:offset + length, 1] += sound[:length] * volume * right


def frequency(note):
    return 440 * 2 ** ((note - 69) / 12)


def clock(length):
    return np.arange(round(length * RATE)) / RATE


def kick():
    t = clock(.43)
    phase = np.cumsum(45 + 104 * np.exp(-t * 40)) * 2 * np.pi / RATE
    body = np.sin(phase) * np.exp(-t * 12)
    tick = RANDOM.normal(0, 1, len(t)) * np.exp(-t * 250) * .10
    return (body + tick) * (1 - np.exp(-t * 1800))


def hat(opened=False):
    t = clock(.19 if opened else .07)
    noise = RANDOM.normal(0, 1, len(t))
    high = noise - np.convolve(noise, np.ones(9) / 9, mode='same')
    return high * np.exp(-t * (24 if opened else 74)) * (1 - np.exp(-t * 3000))


def clap():
    t = clock(.2)
    noise = RANDOM.normal(0, 1, len(t))
    high = noise - np.convolve(noise, np.ones(45) / 45, mode='same')
    envelope = np.exp(-t * 31)
    envelope += .5 * np.exp(-np.maximum(t - .015, 0) * 60) * (t >= .015)
    tone = np.sin(2 * np.pi * 185 * t) * np.exp(-t * 43)
    return high * envelope * .3 + tone * .25


def pluck(note, length=.75):
    t = clock(length)
    hz = frequency(note)
    body = np.sin(2 * np.pi * hz * t) + .35 * np.sin(2 * np.pi * hz * 2 * t)
    body += .13 * np.sin(2 * np.pi * hz * 3 * t)
    return body * np.exp(-t * 7) * (1 - np.exp(-t * 430))


def bass(note):
    t = clock(.5)
    hz = frequency(note)
    body = np.sin(2 * np.pi * hz * t) + .19 * np.sin(2 * np.pi * hz * 2 * t)
    return body * np.exp(-t * 6) * (1 - np.exp(-t * 180))


def pad(notes, length):
    t = clock(length)
    sound = np.zeros(len(t))
    for note in notes:
        hz = frequency(note)
        for detune in [.9985, 1.0015]:
            sound += np.sin(2 * np.pi * hz * detune * t) * .13
            sound += np.sin(2 * np.pi * hz * detune * 2 * t) * .028
    envelope = np.minimum(t / .9, 1) * np.minimum((length - t) / 1.5, 1)
    return sound * np.maximum(envelope, 0)


def whoosh(start):
    t = clock(.65)
    noise = RANDOM.normal(0, 1, len(t))
    low = np.convolve(noise, np.ones(55) / 55, mode='same')
    envelope = np.sin(np.pi * t / .65) ** 2
    add(low * envelope, start - .35, .4, -.2)
    add(low * envelope, start - .30, .2, .6)


CHORDS = [[50, 53, 57, 60], [46, 50, 53, 57], [48, 53, 57, 60], [48, 52, 55, 59]]
for section in range(6):
    chord = CHORDS[section % 4]
    start = section * 7.5
    add(pad(chord, 8.5), start, .44, -.15)
    add(pad([n + 12 for n in chord], 8.5), start + .03, .12, .55)

for step in range(192):
    start = step * BEAT / 2
    if start > 42.4:
        continue
    chord = CHORDS[int(start / 7.5) % 4]
    note = chord[[0, 2, 1, 3, 2, 1, 3, 2][step % 8]] + 12
    volume = .12 if start < 3.75 else .19
    if 30 <= start < 33.75:
        volume *= .62
    sound = pluck(note)
    pan = [-.5, .3, -.15, .55][step % 4]
    add(sound, start, volume, pan)
    add(sound, start + BEAT * .75, volume * .22, -pan)

for beat in range(96):
    start = beat * BEAT
    if start < 3.75 or start > 41.25:
        continue
    if not (30 <= start < 33.75 and beat % 2):
        add(kick(), start, .47)
    if beat % 4 in [1, 3]:
        add(clap(), start, .23)
    chord = CHORDS[int(start / 7.5) % 4]
    if beat % 2 == 0:
        add(bass(chord[0] - 24), start, .32)
    add(hat(), start + BEAT / 2, .07, .32)
    if start > 7.5:
        add(hat(), start + BEAT / 4, .022, -.25)
        add(hat(beat % 4 == 3), start + BEAT * .75, .032, -.3)

for cut in [3.75, 7.5, 13.125, 18.75, 24.375, 30, 33.75, 39.375]:
    whoosh(cut)
    add(pluck(74, 1.3), cut, .17, .2)
    add(pluck(81, 1.3), cut + .025, .09, -.25)

# Final sonic signature: a resolved D minor voicing, then a clean tail.
for note in [62, 65, 69, 74]:
    add(pluck(note, 3), 42.1875, .17, (note - 68) / 16)
fade = np.minimum(np.arange(len(SCORE)) / (RATE * .45), 1)
fade *= np.minimum((len(SCORE) - 1 - np.arange(len(SCORE))) / (RATE * 1.0), 1)
SCORE *= fade[:, None]
SCORE = np.tanh(SCORE * 1.15)
SCORE *= .87 / max(.87, np.max(np.abs(SCORE)))
pcm = (SCORE * 32767).astype('<i2')
output = ROOT / 'source/soundtrack.wav'
with wave.open(str(output), 'wb') as stream:
    stream.setnchannels(2)
    stream.setsampwidth(2)
    stream.setframerate(RATE)
    stream.writeframes(pcm.tobytes())
print(f'Original score: {output} — {DURATION}s, stereo, {BPM} BPM', flush=True)
