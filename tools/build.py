"""Copy tools/importer.js into both pages between the IMPORTER markers.
Run after editing the importer:  python3 tools/build.py"""
import pathlib, re
root = pathlib.Path(__file__).resolve().parent.parent
src = (root / 'tools' / 'importer.js').read_text()
block = '/* IMPORTER:START (copied from tools/importer.js by tools/build.py; edit the source, then rebuild) */\n' + src.strip() + '\n/* IMPORTER:END */'
for name in ['index.html', 'shared-tracker.html']:
    p = root / name
    s = p.read_text()
    new, n = re.subn(r'/\* IMPORTER:START.*?/\* IMPORTER:END \*/', lambda _: block, s, flags=re.S)
    if n != 1:
        raise SystemExit(f'{name}: expected one IMPORTER block, found {n}')
    p.write_text(new)
    print('updated', name)
