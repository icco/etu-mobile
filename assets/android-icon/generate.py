#!/usr/bin/env python3
"""Regenerate Android icons; requires resvg-js and ImageMagick 7 on PATH."""

import json
from pathlib import Path
import subprocess
import tempfile
import xml.etree.ElementTree as ET


HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
RES = ROOT / 'android/app/src/main/res'
EXPO = 'expo' in json.loads((ROOT / 'app.json').read_text())
NS = '{http://www.w3.org/2000/svg}'
ANDROID = 'http://schemas.android.com/apk/res/android'
FOREGROUND = ET.parse(HERE / 'foreground.svg').getroot()
BACKGROUND = FOREGROUND.attrib['data-background']


def paths(root):
    return '\n'.join(ET.tostring(p, encoding='unicode').strip() for p in root if p.tag == NS + 'path')


def svg(body, viewbox='0 0 108 108'):
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="108" height="108" viewBox="{viewbox}">{body}</svg>'


def render(body, destination, size):
    destination.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as directory:
        source = Path(directory) / 'render.svg'
        source.write_text(body)
        raster = Path(directory) / 'render.png'
        subprocess.run(['resvg-js', '--no-system-font', '--fit-width', str(size * 4),
                        str(source), str(raster)], check=True, capture_output=True)
        subprocess.run(['magick', str(raster), '-resize', f'{size}x{size}',
                        '-strip', f'PNG32:{destination}'], check=True)


def vector(source, destination):
    root = ET.parse(source).getroot()
    output = ET.Element('vector', {'xmlns:android': ANDROID, 'android:width': '108dp',
                                  'android:height': '108dp', 'android:viewportWidth': '108',
                                  'android:viewportHeight': '108'})
    names = {'d': 'pathData', 'fill': 'fillColor', 'fill-rule': 'fillType',
             'stroke': 'strokeColor', 'stroke-width': 'strokeWidth', 'stroke-linecap': 'strokeLineCap'}
    for path in root.findall(NS + 'path'):
        attrs = {}
        for key, value in path.attrib.items():
            value = {'none': '#00000000', 'evenodd': 'evenOdd'}.get(value, value)
            attrs['android:' + names[key]] = value
        ET.SubElement(output, 'path', attrs)
    ET.indent(output)
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(ET.tostring(output, encoding='unicode') + '\n')


def main():
    mark = paths(FOREGROUND)
    mono = paths(ET.parse(HERE / 'monochrome.svg').getroot())
    background = f'<path fill="{BACKGROUND}" d="M0 0H108V108H0Z"/>'
    # Android displays the central 72dp of a 108dp adaptive layer.
    full = svg(background + mark, '18 18 72 72')
    (HERE / 'icon.svg').write_text(full + '\n')
    render(full, HERE / 'play-store.png', 512)
    render(svg(mark), HERE / 'foreground.png', 1024)
    render(svg(mono), HERE / 'monochrome.png', 1024)

    if EXPO:
        render(full, ROOT / 'assets/icon.png', 1024)
        render(svg(mark), ROOT / 'assets/adaptive-icon.png', 1024)
    else:
        for density, size in [('mdpi', 48), ('hdpi', 72), ('xhdpi', 96), ('xxhdpi', 144), ('xxxhdpi', 192)]:
            for name, mask in [('ic_launcher', '<rect x="20" y="20" width="68" height="68" rx="15"/>'),
                               ('ic_launcher_round', '<circle cx="54" cy="54" r="34"/>')]:
                body = f'<defs><clipPath id="mask">{mask}</clipPath></defs><g clip-path="url(#mask)">{background}{mark}</g>'
                render(svg(body, '18 18 72 72'), RES / f'mipmap-{density}/{name}.png', size)
        vector(HERE / 'foreground.svg', RES / 'drawable/ic_launcher_foreground.xml')
        vector(HERE / 'monochrome.svg', RES / 'drawable/ic_launcher_monochrome.xml')
        (RES / 'values/ic_launcher_colors.xml').write_text(
            f'<resources>\n    <color name="ic_launcher_background">{BACKGROUND}</color>\n</resources>\n')
        for version in [26, 33]:
            themed = '\n    <monochrome android:drawable="@drawable/ic_launcher_monochrome" />' if version == 33 else ''
            content = (f'<adaptive-icon xmlns:android="{ANDROID}">\n'
                       '    <background android:drawable="@color/ic_launcher_background" />\n'
                       '    <foreground android:drawable="@drawable/ic_launcher_foreground" />'
                       f'{themed}\n</adaptive-icon>\n')
            folder = RES / f'mipmap-anydpi-v{version}'
            folder.mkdir(parents=True, exist_ok=True)
            for name in ['ic_launcher', 'ic_launcher_round']:
                (folder / f'{name}.xml').write_text(content)

    # Inspect actual launcher crops in both color and wallpaper-tinted modes.
    tiles = []
    for row in range(2):
        for column, mask in enumerate(['<circle cx="54" cy="54" r="36"/>',
                                      '<rect x="18" y="18" width="72" height="72" rx="18"/>',
                                      '<rect x="18" y="18" width="72" height="72" rx="4"/>']):
            index = row * 3 + column
            fill = BACKGROUND if row == 0 else '#D3E7EF'
            art = mark if row == 0 else mono.replace('#FFFFFF', '#243F50')
            tiles.append(f'<svg x="{column * 120}" y="{row * 120}" width="120" height="120" viewBox="0 0 108 108">'
                         f'<defs><clipPath id="m{index}">{mask}</clipPath></defs>'
                         f'<g clip-path="url(#m{index})"><path fill="{fill}" d="M0 0H108V108H0Z"/>{art}</g></svg>')
    preview = '<svg xmlns="http://www.w3.org/2000/svg" width="360" height="240" viewBox="0 0 360 240"><path fill="#101722" d="M0 0H360V240H0Z"/>' + ''.join(tiles) + '</svg>'
    render(preview, HERE / 'preview.png', 1200)
    print(f'Generated icons for {ROOT.name}')


if __name__ == '__main__':
    main()
