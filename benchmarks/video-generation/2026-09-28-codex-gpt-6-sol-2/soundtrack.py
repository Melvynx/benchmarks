import math
import random
import struct
import wave

RATE = 44100
DURATION = 45
random.seed(42)
notes = [55.0, 65.41, 73.42, 82.41]
with wave.open('soundtrack.wav', 'wb') as out:
    out.setnchannels(1)
    out.setsampwidth(2)
    out.setframerate(RATE)
    chunk = bytearray()
    for i in range(RATE * DURATION):
        t = i / RATE
        beat = t * 2
        phase = beat % 1
        bar = int(beat // 8)
        kick_env = math.exp(-phase * 18)
        kick = math.sin(2 * math.pi * (52 * t + 13 * math.exp(-phase * 18))) * kick_env * 0.34
        snare_phase = (beat - 1) % 2
        snare = (random.random() * 2 - 1) * math.exp(-snare_phase * 26) * 0.105 if snare_phase < 0.28 else 0
        hat_phase = (beat * 2) % 1
        hat = (random.random() * 2 - 1) * math.exp(-hat_phase * 38) * 0.034
        n = notes[(int(beat // 2) + bar) % len(notes)]
        bass = (math.sin(2 * math.pi * n * t) + 0.30 * math.sin(2 * math.pi * n * 2 * t)) * 0.105
        arp_index = int(beat * 2) % 8
        arp_freq = notes[(arp_index + bar) % 4] * (4 if arp_index % 3 else 2)
        arp = math.sin(2 * math.pi * arp_freq * t) * math.exp(-hat_phase * 5) * 0.042
        transition = 0
        for hit in (5, 11, 17, 23, 29, 35, 40):
            dt = t - hit
            if 0 <= dt < 0.35:
                transition += (random.random() * 2 - 1) * (1 - dt / 0.35) * 0.055
        volume = min(1, t / 0.7) * min(1, (45 - t) / 1.4)
        sample = max(-1, min(1, (kick + snare + hat + bass + arp + transition) * volume))
        chunk += struct.pack('<h', int(sample * 32767))
        if len(chunk) >= 16384:
            out.writeframesraw(chunk)
            chunk.clear()
    if chunk:
        out.writeframesraw(chunk)
