#!/usr/bin/env python3
"""Студия озвучки: раздаёт игру и принимает записи со страницы studio.html.

Запуск: python3 tools/studio_server.py  → http://localhost:8778/studio.html
Каждая запись сохраняется в audio/raw/<id>.<ext> (оригинал) и сразу чистится в
audio/voice/<id>.mp3: обрезка тишины, выравнивание громкости и, по желанию,
«мультяшный» сдвиг высоты для героев. Список js/voice-files.js обновляется сразу.
"""
import http.server
import json
import os
import re
import subprocess
import sys
import urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, 'audio', 'raw')
VOICE = os.path.join(ROOT, 'audio', 'voice')
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8778
os.makedirs(RAW, exist_ok=True)
os.makedirs(VOICE, exist_ok=True)

# Во сколько раз поднять/опустить голос героя (1 — без изменений).
PITCH = {'narrator': 1.0, 'bublik': 1.08, 'iriska': 1.14, 'ponchik': 1.2, 'frog': 1.07, 'bear': 0.86, 'bunny': 1.16}
EXT = {'audio/webm': 'webm', 'audio/ogg': 'ogg', 'audio/mp4': 'm4a', 'audio/aac': 'aac', 'audio/wav': 'wav',
       'audio/x-wav': 'wav', 'audio/mpeg': 'mp3', 'audio/aiff': 'aiff', 'audio/x-aiff': 'aiff'}


def write_voice_list():
    files = sorted(f for f in os.listdir(VOICE) if f.endswith('.mp3'))
    mapping = {f[:-4]: f for f in files}
    with open(os.path.join(ROOT, 'js', 'voice-files.js'), 'w', encoding='utf-8') as fh:
        fh.write('// Сгенерировано tools/scan-voice.js — список записанных реплик (id → файл в audio/voice/).\n')
        fh.write('(self.G = self.G || {}).VOICE_FILES = ' + json.dumps(mapping, ensure_ascii=False, indent=1) + ';\n')
    return mapping


def convert(src, dst, factor):
    # срезаем щелчок клавиши в начале (0,1 с) и в конце (0,15 с), потом тишину
    trim = ('atrim=start=0.1,areverse,atrim=start=0.15,areverse,asetpts=N/SR/TB,silenceremove=start_periods=1:start_threshold=-42dB:start_silence=0.05,'
            'areverse,silenceremove=start_periods=1:start_threshold=-42dB:start_silence=0.12,areverse')
    pitch = ''
    if abs(factor - 1) > 0.001:
        pitch = f',aresample=48000,asetrate={48000 * factor:.0f},aresample=44100,atempo={1 / factor:.4f}'
    chain = trim + pitch + ',loudnorm=I=-16:TP=-1.5:LRA=11,afade=t=in:d=0.02'
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', src, '-af', chain,
                    '-ac', '1', '-ar', '44100', '-b:a', '96k', dst], check=True)
    probe = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', dst],
                           capture_output=True, text=True)
    return float(probe.stdout.strip() or 0)


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def log_message(self, fmt, *args):
        if '/api/' in (args[0] if args else ''):
            sys.stderr.write('%s\n' % (fmt % args))

    def send_json(self, code, obj):
        body = json.dumps(obj, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path.startswith('/api/status'):
            ids = sorted(f[:-4] for f in os.listdir(VOICE) if f.endswith('.mp3'))
            return self.send_json(200, {'recorded': ids})
        return super().do_GET()

    def do_POST(self):
        url = urllib.parse.urlparse(self.path)
        q = urllib.parse.parse_qs(url.query)
        vid = (q.get('id') or [''])[0]
        if not re.fullmatch(r'[a-z0-9_]+', vid):
            return self.send_json(400, {'error': 'bad id'})
        if url.path == '/api/delete':
            for d in (VOICE, RAW):
                for f in os.listdir(d):
                    if os.path.splitext(f)[0] == vid:
                        os.remove(os.path.join(d, f))
            write_voice_list()
            return self.send_json(200, {'ok': True})
        if url.path != '/api/upload':
            return self.send_json(404, {'error': 'not found'})
        who = (q.get('who') or ['narrator'])[0]
        fx = (q.get('fx') or ['1'])[0] == '1'
        ctype = (self.headers.get('Content-Type') or 'audio/webm').split(';')[0].strip()
        ext = EXT.get(ctype, 'webm')
        size = int(self.headers.get('Content-Length') or 0)
        data = self.rfile.read(size)
        if len(data) < 500:
            return self.send_json(400, {'error': 'пустая запись'})
        for f in os.listdir(RAW):
            if os.path.splitext(f)[0] == vid:
                os.remove(os.path.join(RAW, f))
        raw = os.path.join(RAW, f'{vid}.{ext}')
        with open(raw, 'wb') as fh:
            fh.write(data)
        try:
            dur = convert(raw, os.path.join(VOICE, vid + '.mp3'), PITCH.get(who, 1.0) if fx else 1.0)
        except subprocess.CalledProcessError:
            return self.send_json(500, {'error': 'не удалось обработать запись'})
        if dur < 0.2:
            os.remove(os.path.join(VOICE, vid + '.mp3'))
            write_voice_list()
            return self.send_json(422, {'error': 'тишина — ничего не записалось'})
        write_voice_list()
        return self.send_json(200, {'ok': True, 'id': vid, 'duration': round(dur, 2)})


if __name__ == '__main__':
    write_voice_list()
    print(f'Студия озвучки: http://localhost:{PORT}/studio.html', flush=True)
    http.server.ThreadingHTTPServer(('127.0.0.1', PORT), Handler).serve_forever()
