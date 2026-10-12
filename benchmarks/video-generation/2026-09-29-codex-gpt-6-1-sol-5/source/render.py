"""Deterministic 1080p/60fps vector-and-type film, rendered with Pillow."""
from __future__ import annotations

import argparse
import math
import subprocess
from functools import lru_cache
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
W, H, FPS, DURATION = 1920, 1080, 60, 45
WHITE, PAPER, INK = '#F7F8F8', '#F0F1F2', '#0D0E10'
GRAY, SILVER, BLACK = '#8A8F98', '#C9CCD1', '#08090A'
TIMES = [0, 3.75, 7.5, 13.125, 18.75, 24.375, 30, 33.75, 39.375, 45]


def clamp(value, low=0.0, high=1.0):
    return max(low, min(high, value))


def ease(value):
    value = clamp(value)
    return 1 - (1 - value) ** 4


def smooth(value):
    value = clamp(value)
    return value * value * (3 - 2 * value)


def progress(time, start=0, length=0.7):
    return ease((time - start) / length)


def lerp(start, end, value):
    return start + (end - start) * value


def rgb(color):
    return tuple(int(color[i:i + 2], 16) for i in (1, 3, 5))


@lru_cache(maxsize=200)
def font(size, weight=500):
    result = ImageFont.truetype(str(ROOT / 'assets/Inter.ttf'), int(size))
    result.set_variation_by_axes([weight, 0])
    return result


@lru_cache(maxsize=650)
def type_layer(content, size=40, color=INK, weight=500, tracking=0):
    face = font(size, weight)
    measure = ImageDraw.Draw(Image.new('RGBA', (1, 1)))
    width = measure.textlength(content, font=face) + tracking * max(0, len(content) - 1)
    image = Image.new('RGBA', (math.ceil(width) + 8, int(size * 1.35) + 12))
    draw = ImageDraw.Draw(image)
    if not tracking:
        draw.text((0, 0), content, font=face, fill=color, anchor='lt')
        return image
    x = 0.0
    baseline = -measure.textbbox((0, 0), content, font=face, anchor='ls')[1]
    for index, character in enumerate(content):
        draw.text((x, baseline), character, font=face, fill=color, anchor='ls')
        advance = measure.textlength(content[:index + 1], font=face)
        x = advance + tracking * (index + 1)
    return image


def place(image, layer, x, y, opacity=1, scale=1, angle=0, center=False):
    if opacity <= 0 or scale <= 0:
        return
    if abs(scale - 1) > 0.001:
        layer = layer.resize((max(1, round(layer.width * scale)), max(1, round(layer.height * scale))), Image.Resampling.BICUBIC)
    if angle:
        layer = layer.rotate(angle, resample=Image.Resampling.BICUBIC, expand=True)
    if opacity < 0.999:
        layer = layer.copy()
        layer.putalpha(layer.getchannel('A').point(lambda alpha: round(alpha * clamp(opacity))))
    if center:
        x -= layer.width / 2
        y -= layer.height / 2
    image.alpha_composite(layer, (round(x), round(y)))


def text(image, content, x, y, size=40, color=INK, weight=500, tracking=0, alpha=1, align='left'):
    layer = type_layer(content, size, color, weight, tracking)
    if align == 'center':
        x -= (layer.width - 8) / 2
    elif align == 'right':
        x -= layer.width - 8
    place(image, layer, x, y, alpha)


def headline(image, lines, x, y, time, size=100, color=INK, leading=None, align='left'):
    amount = progress(time, 0.12, 0.65)
    for index, line in enumerate(lines):
        text(image, line, x, y + index * (leading or size * 1.03) + (1 - amount) * 65,
             size, color, 620, -size * 0.047, amount, align)


def rounded(image, box, fill, radius=24, outline=None, width=1):
    ImageDraw.Draw(image).rounded_rectangle(tuple(round(v) for v in box), radius=radius, fill=fill, outline=outline, width=width)


@lru_cache(maxsize=80)
def shadow(width, height, radius=32, strength=28):
    layer = Image.new('RGBA', (width + 160, height + 160))
    ImageDraw.Draw(layer).rounded_rectangle((65, 65, width + 95, height + 95), radius=radius, fill=(0, 0, 0, strength))
    return layer.filter(ImageFilter.GaussianBlur(28))


def card(image, x, y, width, height, fill=WHITE, radius=28, border='#DDDFE2', depth=True):
    if depth:
        place(image, shadow(round(width), round(height), radius), x - 80, y - 64)
    rounded(image, (x, y, x + width, y + height), fill, radius, border)


def line(image, points, color, width=2, reveal=1):
    if reveal <= 0:
        return
    count = max(2, min(len(points), math.ceil(len(points) * reveal)))
    visible = points[:count]
    x0 = math.floor(min(p[0] for p in visible) - width)
    y0 = math.floor(min(p[1] for p in visible) - width)
    x1 = math.ceil(max(p[0] for p in visible) + width)
    y1 = math.ceil(max(p[1] for p in visible) + width)
    layer = Image.new('RGBA', (max(1, x1 - x0) * 2, max(1, y1 - y0) * 2))
    coords = [((x - x0) * 2, (y - y0) * 2) for x, y in visible]
    ImageDraw.Draw(layer).line(coords, fill=color, width=width * 2, joint='curve')
    layer = layer.resize((max(1, x1 - x0), max(1, y1 - y0)), Image.Resampling.LANCZOS)
    place(image, layer, x0, y0)


def bezier(a, b, c, d, count=90):
    points = []
    for p in np.linspace(0, 1, count):
        q = 1 - p
        points.append((q ** 3 * a[0] + 3 * q * q * p * b[0] + 3 * q * p * p * c[0] + p ** 3 * d[0],
                       q ** 3 * a[1] + 3 * q * q * p * b[1] + 3 * q * p * p * c[1] + p ** 3 * d[1]))
    return points


def envelope(image, x, y, size=64, color=INK, stroke=3):
    draw = ImageDraw.Draw(image)
    height = size * 0.67
    rounded(image, (x, y, x + size, y + height), None, max(4, round(size * 0.09)), color, stroke)
    draw.line([(x + 2, y + 4), (x + size / 2, y + height * 0.55), (x + size - 2, y + 4)], fill=color, width=stroke, joint='curve')


def check(image, x, y, size=26, color=INK):
    ImageDraw.Draw(image).line([(x, y + size * .52), (x + size * .35, y + size * .88), (x + size, y)], fill=color, width=4, joint='curve')


def arrow(image, x, y, size=25, color=INK):
    draw = ImageDraw.Draw(image)
    draw.line([(x, y + size / 2), (x + size, y + size / 2)], fill=color, width=3)
    draw.line([(x + size * .6, y), (x + size, y + size / 2), (x + size * .6, y + size)], fill=color, width=3)


def spark(image, x, y, size=32, color=INK):
    points = []
    for index in range(8):
        angle = index * math.pi / 4
        radius = size if index % 2 == 0 else size * .28
        points.append((x + math.cos(angle) * radius, y + math.sin(angle) * radius))
    ImageDraw.Draw(image).polygon(points, fill=color)


def label(image, content, x, y, dark=False, width=None):
    layer = type_layer(content, 23, WHITE if dark else INK, 530)
    width = width or layer.width + 40
    rounded(image, (x, y, x + width, y + 54), '#24272B' if dark else '#E6E8EA', 27)
    place(image, layer, x + 20, y + 16)


@lru_cache(maxsize=3)
def background(kind='dark'):
    yy, xx = np.mgrid[0:H, 0:W]
    glow = np.exp(-(((xx - 1450) / 780) ** 2 + ((yy - 430) / 680) ** 2))
    grain = np.random.default_rng(7).normal(0, .43, (H, W))
    base = 8 + glow * 19 + grain if kind == 'dark' else 247 - glow * 6 + grain
    array = np.clip(np.stack([base, base + (kind == 'dark'), base + 2], axis=-1), 0, 255).astype('uint8')
    result = Image.fromarray(array).convert('RGBA')
    draw = ImageDraw.Draw(result)
    grid = '#202226' if kind == 'dark' else '#EAEBED'
    for x in range(80, W, 160):
        for y in range(80, H, 160):
            draw.ellipse((x, y, x + 2, y + 2), fill=grid)
    return result


def masthead(image, chapter, dark=False):
    color = WHITE if dark else INK
    text(image, 'Lumail', 100, 65, 36, color, 640, -1.2)
    text(image, chapter.upper(), 1820, 72, 19, GRAY, 520, 2.6, align='right')
    ImageDraw.Draw(image).line((100, 124, 1820, 124), fill='#292C31' if dark else '#DFE1E4', width=1)


@lru_cache(maxsize=5)
def mail_tile(width=480, height=270, dark=False):
    image = Image.new('RGBA', (width + 150, height + 150))
    card(image, 75, 75, width, height, '#17191C' if dark else WHITE, 22, '#31353A' if dark else '#D6D9DD')
    envelope(image, 105, 112, 46, SILVER if dark else INK, 2)
    draw = ImageDraw.Draw(image)
    for index, length in enumerate([width * .55, width * .7, width * .61]):
        y = 185 + index * 25
        draw.rounded_rectangle((105, y, 105 + length, y + 8), radius=4, fill='#363A40' if dark else '#D8DBDF')
    rounded(image, (105, height + 25, 212, height + 45), '#32363C' if dark else '#202226', 8)
    return image


def opening(time):
    image = background('dark').copy()
    draw = ImageDraw.Draw(image)
    for i in range(7):
        p = (i / 7 + time * .14) % 1
        y = 1160 - p * 1440
        x = 1560 - p * 500
        scale = .38 + .6 * p
        place(image, mail_tile(490, 270, True), x, y, .12 + p * .6, scale, -11, True)
    masthead(image, 'Email, with momentum', True)
    word = type_layer('Email.', 246, WHITE, 650, -12)
    intro = progress(time, 0, .72)
    place(image, word, 105, 247 + (1 - intro) * 80, intro)
    amount = progress(time, .72, .55)
    text(image, 'With momentum.', 108, 526 + (1 - amount) * 70, 118, SILVER, 540, -5, amount)
    text(image, 'For people who write, ship and sell.', 114, 747, 34, GRAY, 450, alpha=progress(time, 1.25, .6))
    draw.line((114, 850, 620, 850), fill='#41454C', width=2)
    sweep = (time * 180) % 506
    draw.line((114 + sweep, 850, min(620, 214 + sweep), 850), fill=WHITE, width=3)
    text(image, 'A NEW WAY TO SEND', 114, 897, 20, GRAY, 520, 3.1)
    return image


def reveal(time):
    image = background('light').copy()
    masthead(image, 'Meet Lumail')
    draw = ImageDraw.Draw(image)
    amount = progress(time, .1, .8)
    # Architectural envelope: the flap unfolds away from the central wordmark.
    opening = progress(time, .2, 1.05)
    y = lerp(500, 765, opening)
    draw.polygon([(255, y), (960, y + 218), (1665, y)], fill='#E2E4E7')
    draw.line([(255, y), (960, y + 218), (1665, y)], fill='#CBCFD4', width=2)
    for index in range(3):
        inset = 26 * index
        rounded(image, (290 + inset, 210 + inset, 1630 - inset, 728 + inset), None, 32, '#D9DCE0', 1)
    text(image, 'Meet', 960, 304 + 35 * (1 - amount), 56, GRAY, 450, -1.6, amount, 'center')
    logo = type_layer('Lumail', 238, INK, 650, -11)
    place(image, logo, 960, 533, amount, lerp(.91, 1, amount), center=True)
    text(image, 'AI-powered email marketing.', 960, 647, 39, '#626871', 450, -1, progress(time, .55, .75), 'center')
    label(image, 'Write. Connect. Grow.', 811, 839)
    return image


@lru_cache(maxsize=1)
def editor_surface():
    image = Image.new('RGBA', (940, 780))
    card(image, 50, 45, 840, 675, WHITE, 28)
    text(image, 'New campaign', 90, 83, 26, INK, 600, -.6)
    label(image, 'Draft', 748, 74, width=100)
    ImageDraw.Draw(image).line((50, 140, 890, 140), fill='#E4E6E8', width=2)
    text(image, 'Subject', 90, 168, 20, GRAY, 500)
    text(image, 'Something good is landing.', 90, 205, 32, INK, 580, -.8)
    ImageDraw.Draw(image).line((50, 263, 890, 263), fill='#E4E6E8', width=2)
    text(image, 'B    I    H1    ↗    +', 92, 284, 21, '#6E747D', 550)
    text(image, 'Lumail', 100, 354, 28, INK, 650, -.8)
    text(image, 'A little idea.', 100, 419, 59, INK, 610, -2.8)
    text(image, 'A big hello.', 100, 485, 59, INK, 610, -2.8)
    text(image, 'Hey {{firstName}},', 103, 578, 24, '#656C76', 450)
    text(image, 'Your next great launch starts with one email.', 103, 624, 25, '#656C76', 450, -.4)
    return image


def writing(time):
    image = background('light').copy()
    masthead(image, 'AI-assisted creation')
    headline(image, ['From idea', 'to inbox.'], 110, 292, time, 111)
    alpha = progress(time, .5, .7)
    text(image, 'Draft, polish and schedule', 116, 615, 34, '#6E747D', 440, -.5, alpha)
    text(image, 'with the AI you already use.', 116, 664, 34, '#6E747D', 440, -.5, alpha)
    spark(image, 143, 819, 20)
    text(image, 'YOUR VOICE. MORE MOMENTUM.', 182, 807, 20, '#6E747D', 550, 1.9, alpha)
    entry = progress(time, .18, .9)
    editor = editor_surface().copy()
    content = progress(time, 1.0, .75)
    blank = editor.copy()
    rounded(blank, (90, 345, 860, 670), WHITE, 0)
    for row, length in enumerate([475, 590, 440]):
        rounded(blank, (100, 415 + row * 56, 100 + length, 425 + row * 56), '#E4E7EA', 5)
    editor = Image.blend(blank, editor, content)
    place(image, editor, 936 + (1 - entry) * 150, 205 + math.sin(time * .8) * 5, entry, .98)
    assistant = Image.new('RGBA', (900, 174))
    card(assistant, 45, 30, 800, 105, INK, 24, '#35393F')
    spark(assistant, 89, 83, 17, WHITE)
    text(assistant, 'Create a launch email for my newsletter.', 128, 69, 28, WHITE, 450, -.4)
    place(image, assistant, 917, 119 + (1 - progress(time, .4, .6)) * 60, progress(time, .4, .6))
    button = Image.new('RGBA', (420, 105))
    rounded(button, (0, 0, 418, 94), INK, 24)
    check(button, 32, 30, 24, WHITE)
    text(button, 'Ready for your review', 79, 33, 25, WHITE, 510, -.2)
    place(image, button, 1250, 900 + (1 - progress(time, 1.8, .55)) * 45, progress(time, 1.8, .55))
    return image


def avatar(image, x, y, radius, shade, variant=0):
    draw = ImageDraw.Draw(image)
    draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=shade)
    draw.ellipse((x - radius * .19, y - radius * .40, x + radius * .19, y - radius * .02), fill=INK)
    draw.rounded_rectangle((x - radius * .34, y + radius * .06, x + radius * .34, y + radius * .43), radius=radius * .18, fill=INK)


def audience(time):
    image = background('dark').copy()
    masthead(image, 'Audience segmentation', True)
    headline(image, ['Find your', 'people.'], 111, 284, time, 119, WHITE)
    text(image, 'Turn subscriber activity', 117, 634, 34, GRAY, 440, -.5, progress(time, .55, .55))
    text(image, 'into meaningful connections.', 117, 682, 34, GRAY, 440, -.5, progress(time, .55, .55))
    label(image, 'Tags', 115, 816, True)
    label(image, 'Segments', 228, 816, True)
    label(image, 'Your audience', 400, 816, True)
    shift = smooth((time - 1.35) / 1.35)
    # A constellation resolves into a segment, without interrupting the headline.
    draw = ImageDraw.Draw(image)
    cx, cy = 1410, 566
    draw.ellipse((1020, 186, 1790, 956), outline='#24282E', width=1)
    draw.ellipse((1120, 286, 1690, 856), outline='#24282E', width=1)
    positions = []
    for index in range(15):
        angle = index * 2.4 + time * .065
        radius = 130 + (index % 3) * 100
        start = (cx + math.cos(angle) * radius, cy + math.sin(angle) * radius)
        target = (1160 + index % 5 * 124, 540 + index // 5 * 112)
        point = (lerp(start[0], target[0], shift), lerp(start[1], target[1], shift))
        positions.append(point)
        if index and shift < .95:
            draw.line((positions[index - 1], point), fill='#343940', width=1)
    board = Image.new('RGBA', (780, 600))
    card(board, 60, 45, 660, 510, '#17191C', 30, '#353A42')
    text(board, 'A segment that makes sense.', 98, 90, 29, WHITE, 570, -.6)
    label(board, 'Clicked pricing', 95, 151, True)
    label(board, 'No purchase', 336, 151, True)
    text(board, 'READY TO CONNECT', 100, 531, 19, GRAY, 540, 2)
    arrow(board, 643, 528, 23, WHITE)
    place(image, board, 1010, 278, shift)
    for index, (x, y) in enumerate(positions):
        amount = progress(time, .18, .7)
        radius = lerp(31 + index % 3 * 6, 34, shift) * amount
        avatar(image, x, y, radius, ['#C9CCD1', '#8A8F98', '#A7ABB2'][index % 3])
    text(image, 'The right message. The right people.', 1410, 947, 26, SILVER, 440, -.4, progress(time, 2.65, .65), 'center')
    return image


def workflow_node(image, x, y, width, title, subtitle, kind='email', dark=False):
    height = 155
    card(image, x, y, width, height, INK if dark else WHITE, 25, '#31353B' if dark else '#D4D8DD')
    rounded(image, (x + 22, y + 22, x + 73, y + 73), '#30343A' if dark else '#E7E9EC', 15)
    color = WHITE if dark else INK
    if kind == 'email':
        envelope(image, x + 34, y + 37, 27, color, 2)
    elif kind == 'time':
        draw = ImageDraw.Draw(image)
        draw.ellipse((x + 34, y + 33, x + 61, y + 60), outline=color, width=2)
        draw.line([(x + 48, y + 39), (x + 48, y + 47), (x + 54, y + 47)], fill=color, width=2)
    else:
        spark(image, x + 48, y + 46, 14, color)
    text(image, title, x + 92, y + 37, 25, color, 580, -.7)
    text(image, subtitle, x + 24, y + 104, 23, SILVER if dark else '#767D87', 450, -.4)


def workflow(time):
    image = background('light').copy()
    masthead(image, 'Visual workflows')
    headline(image, ['One spark. A whole journey.'], 960, 206, time, 91, align='center')
    text(image, 'Build it once. Keep the conversation going.', 960, 335, 31, '#767D87', 440, -.5, progress(time, .5, .65), 'center')
    points = [bezier((475, 586), (565, 586), (505, 586), (595, 586)),
              bezier((925, 586), (985, 586), (945, 586), (1015, 586)),
              bezier((1305, 586), (1390, 586), (1370, 463), (1455, 463)),
              bezier((1305, 586), (1390, 586), (1370, 760), (1455, 760))]
    for index, path in enumerate(points):
        line(image, path, '#D0D4DA', 3)
        line(image, path, INK, 4, progress(time, .75 + index * .35, 1))
        if time > 1.3:
            dot = path[round(((time - 1.3) * .42 + index * .16) % 1 * (len(path) - 1))]
            ImageDraw.Draw(image).ellipse((dot[0] - 7, dot[1] - 7, dot[0] + 7, dot[1] + 7), fill=INK)
    node_layer = Image.new('RGBA', (W, H))
    workflow_node(node_layer, 145, 507, 330, 'Subscriber joins', 'A new connection', 'spark')
    workflow_node(node_layer, 595, 507, 330, 'Send welcome', 'Make a great first hello')
    workflow_node(node_layer, 1015, 507, 290, 'Wait 2 days', 'Let the story breathe', 'time')
    workflow_node(node_layer, 1455, 384, 325, 'Continue story', 'Welcome email opened', 'email', True)
    workflow_node(node_layer, 1455, 682, 325, 'Follow up', 'Not opened yet')
    place(image, node_layer, 0, (1 - progress(time, .24, .8)) * 74, progress(time, .24, .8))
    text(image, 'WELCOME', 306, 744, 18, '#90969F', 530, 2, align='center')
    text(image, 'CONNECT', 760, 744, 18, '#90969F', 530, 2, align='center')
    text(image, 'BRANCH', 1160, 744, 18, '#90969F', 530, 2, align='center')
    text(image, 'Triggers. Timing. Branches. Goals.', 960, 929, 29, '#767D87', 450, -.4, progress(time, 2, .7), 'center')
    return image


@lru_cache(maxsize=1)
def analytics_surface():
    image = Image.new('RGBA', (990, 760))
    card(image, 60, 45, 870, 650, '#14171B', 30, '#363C44')
    text(image, 'Campaign insights', 102, 89, 29, WHITE, 570, -.7)
    text(image, 'Engagement over time', 103, 152, 23, GRAY, 450)
    draw = ImageDraw.Draw(image)
    for y in [240, 320, 400, 480]:
        draw.line((103, y, 880, y), fill='#30353B', width=1)
    for index, word in enumerate(['Opens', 'Clicks', 'Conversions']):
        x = 105 + index * 258
        rounded(image, (x, 547, x + 234, 651), '#20252B', 20)
        text(image, word, x + 22, 586, 27, SILVER, 500, -.5)
    return image


def analytics(time):
    image = background('dark').copy()
    masthead(image, 'Campaign analytics', True)
    headline(image, ['Every send.', 'A clearer', 'picture.'], 111, 279, time, 107, WHITE)
    text(image, 'See what connects.', 117, 767, 35, GRAY, 450, -.5, progress(time, .5, .65))
    text(image, 'Make the next send count.', 117, 818, 35, GRAY, 450, -.5, progress(time, .5, .65))
    board = analytics_surface().copy()
    reveal_amount = progress(time, .65, 2.2)
    for index, color in enumerate([WHITE, '#979EA8', '#5F6772']):
        points = []
        for value in np.linspace(0, 1, 240):
            x = 105 + value * 771
            trend = .2 + value * .61 + .07 * math.sin(value * 9 + index) + .023 * math.cos(value * 37)
            y = 500 - trend * (300 - index * 74)
            points.append((x, y))
        line(board, points, color, 4 if index == 0 else 3, reveal_amount)
        end = points[max(0, round(reveal_amount * (len(points) - 1)))]
        ImageDraw.Draw(board).ellipse((end[0] - 6, end[1] - 6, end[0] + 6, end[1] + 6), fill=color)
    highlight = 105 + smooth((time - 2.6) / 1.5) * 771
    if time > 2.6:
        ImageDraw.Draw(board).line((highlight, 213, highlight, 510), fill='#4C5560', width=1)
    entry = progress(time, .18, .85)
    place(image, board, 908 + (1 - entry) * 150, 252, entry, .96)
    return image


def platform(time):
    image = background('dark').copy()
    masthead(image, 'One platform', True)
    headline(image, ['All your email.', 'One home.'], 960, 223, time, 110, WHITE, align='center')
    entry = progress(time, .24, .65)
    layer = Image.new('RGBA', (W, H))
    for index, title in enumerate(['Campaigns', 'Sequences', 'Transactional']):
        x = 130 + index * 568
        card(layer, x, 564, 524, 304, '#171A1F', 28, '#3B414A')
        envelope(layer, x + 44, 611, 76, WHITE, 3)
        text(layer, title, x + 42, 738, 39, WHITE, 550, -1.1)
        if index == 2:
            label(layer, 'Priority lane', x + 281, 615, True)
    place(image, layer, 0, (1 - entry) * 110, entry)
    for index in range(8):
        p = ((time - .6) * .28 + index / 8) % 1
        x = 154 + p * 1618
        ImageDraw.Draw(image).ellipse((x - 4, 908, x + 4, 916), fill=GRAY)
    text(image, 'One domain. One dashboard. One bill.', 960, 975, 27, GRAY, 450, -.4, progress(time, .8, .65), 'center')
    return image


def pricing(time):
    image = background('light').copy()
    masthead(image, 'Room to grow')
    draw = ImageDraw.Draw(image)
    entry = progress(time, .2, .95)
    # A continuous infinity stroke: grow the audience without a contact-based fee.
    points = []
    for angle in np.linspace(0, math.tau, 380):
        denom = 1 + math.sin(angle) ** 2
        points.append((458 + 290 * math.cos(angle) / denom,
                       390 + 220 * math.sin(angle) * math.cos(angle) / denom))
    line(image, points, '#D8DBDF', 22)
    line(image, points, INK, 23, entry)
    headline(image, ['Unlimited', 'subscribers.'], 110, 611, time, 91)
    text(image, 'Pay for emails sent.', 117, 850, 35, '#757C86', 440, -.5, entry)
    draw.line((929, 247, 929, 906), fill='#D9DDE2', width=2)
    amount = progress(time, .25, .75)
    text(image, '3,000', 1400, 345 + 80 * (1 - amount), 213, INK, 610, -9.5, amount, 'center')
    text(image, 'emails / month free', 1400, 615, 48, '#626A75', 480, -1.8, amount, 'center')
    button = Image.new('RGBA', (294, 78))
    rounded(button, (0, 0, 293, 77), INK, 39)
    check(button, 35, 27, 24, WHITE)
    text(button, 'No card needed', 79, 27, 24, WHITE, 500, -.4)
    place(image, button, 1253, 744, progress(time, 1.1, .65))
    return image


def finale(time):
    image = background('dark').copy()
    draw = ImageDraw.Draw(image)
    entry = progress(time, .06, .8)
    for index in range(5):
        radius = 180 + index * 125 + time * 13
        draw.ellipse((960 - radius, 520 - radius * .7, 960 + radius, 520 + radius * .7), outline='#24272C', width=1)
    text(image, 'EMAIL, WITH MOMENTUM', 960, 220, 24, GRAY, 520, 4, entry, 'center')
    logo = type_layer('Lumail', 226, WHITE, 650, -10.5)
    place(image, logo, 960, 487 + 40 * (1 - entry), entry, lerp(.94, 1, entry), center=True)
    text(image, 'Love sending email.', 960, 620, 64, SILVER, 460, -2.1, progress(time, .45, .65), 'center')
    button = Image.new('RGBA', (540, 100))
    rounded(button, (0, 0, 539, 98), WHITE, 49)
    text(button, 'Start free', 46, 34, 32, INK, 590, -.6)
    ImageDraw.Draw(button).line((238, 29, 238, 70), fill='#CDD1D6', width=2)
    text(button, 'lumail.io', 271, 35, 31, INK, 500, -.8)
    arrow(button, 469, 38, 23)
    place(image, button, 690, 769 + 50 * (1 - progress(time, .8, .6)), progress(time, .8, .6))
    text(image, '3,000 emails/month free · No card', 960, 911, 27, GRAY, 450, -.4, progress(time, 1.05, .75), 'center')
    return image


SCENES = [opening, reveal, writing, audience, workflow, analytics, platform, pricing, finale]
TRANSITIONS = ['slide', 'zoom', 'slide', 'rise', 'iris', 'fade', 'rise', 'iris']


@lru_cache(maxsize=9)
def scene_end(index):
    return SCENES[index](TIMES[index + 1] - TIMES[index] - .01)


def frame(time):
    index = min(8, next((i for i in range(9) if time < TIMES[i + 1]), 8))
    local = time - TIMES[index]
    image = SCENES[index](local)
    if index == 0 or local >= .62:
        return image.convert('RGB')
    outgoing = scene_end(index - 1)
    amount = smooth(local / .62)
    result = outgoing.copy()
    style = TRANSITIONS[index - 1]
    if style == 'fade':
        return Image.blend(outgoing, image, amount).convert('RGB')
    if style == 'slide':
        place(result, outgoing, -amount * 220, 0)
        place(result, image, W * (1 - amount), 0)
    elif style == 'rise':
        place(result, outgoing, 0, -amount * 120)
        place(result, image, 0, H * (1 - amount))
    elif style == 'zoom':
        place(result, image, W / 2, H / 2, amount, lerp(.89, 1, amount), center=True)
    else:
        mask = Image.new('L', (W, H))
        radius = 1300 * amount
        ImageDraw.Draw(mask).ellipse((W / 2 - radius, H / 2 - radius, W / 2 + radius, H / 2 + radius), fill=255)
        result = Image.composite(image, outgoing, mask)
    return result.convert('RGB')


def export_stills():
    samples = [2.6, 5.9, 10.7, 16.5, 22.3, 27.9, 32.4, 37.1, 43.2]
    sheet = Image.new('RGB', (1920, 1080), '#101215')
    for index, time in enumerate(samples):
        image = frame(time)
        image.save(ROOT / f'verification/scene-{index + 1:02}.jpg', quality=92)
        sheet.paste(image.resize((640, 360), Image.Resampling.LANCZOS), (index % 3 * 640, index // 3 * 360))
    sheet.save(ROOT / 'verification/storyboard.jpg', quality=94)
    frame(5.9).save(ROOT / 'assets/poster.jpg', quality=94)


def export_film():
    output = ROOT / 'source/picture.mp4'
    command = ['ffmpeg', '-y', '-hide_banner', '-loglevel', 'warning', '-f', 'rawvideo',
               '-pixel_format', 'rgb24', '-video_size', f'{W}x{H}', '-framerate', str(FPS),
               '-i', '-', '-an', '-c:v', 'libx264', '-preset', 'fast', '-crf', '18',
               '-pix_fmt', 'yuv420p', '-threads', '6', '-movflags', '+faststart', str(output)]
    encoder = subprocess.Popen(command, stdin=subprocess.PIPE)
    try:
        for index in range(FPS * DURATION):
            encoder.stdin.write(frame(index / FPS).tobytes())
            if index % 300 == 0:
                print(f'Rendered {index}/{FPS * DURATION} frames ({index / FPS:.1f}s)', flush=True)
        encoder.stdin.close()
        code = encoder.wait()
        if code:
            raise RuntimeError(f'ffmpeg returned {code}')
    except BaseException:
        encoder.kill()
        raise
    print(f'Picture export complete: {output}', flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--stills', action='store_true')
    parser.add_argument('--render', action='store_true')
    args = parser.parse_args()
    if args.stills:
        export_stills()
    if args.render:
        export_film()
