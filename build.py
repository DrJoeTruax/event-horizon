"""Build the three simulators from src/.

    python build.py              build everything
    python build.py --preview    also write build/<name>.preview.html with a test hook

Sources in src/ are page bodies: they start at <title> and hold everything inline. Shared code is
pulled in from src/_part_<name>.js wherever a source says /*@<name>@*/.

Outputs:
    <slug>/index.html        standalone page for GitHub Pages (committed)
    build/<name>.html        the bare body, as published to claude.ai artifacts (not committed)
"""
import pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent
SRC = ROOT / 'src'
SITE = 'https://drjoetruax.github.io/event-horizon'
PAGES = [
    # name, slug, description
    ('event-horizon', 'event-horizon',
     'A black hole ray-traced live in your browser. Every pixel’s light follows Einstein’s equations, '
     'for both a still and a spinning black hole.'),
    ('recomposition', 'recomposition',
     'A mothership climbs back out of a black hole and reassembles. Real spaghettification, '
     '2,016 pieces each on its own orbit, played backward.'),
    ('warp', 'warp-strike',
     'A warp bubble the size of a black hole flies at one faster than light, '
     'with every ray traced through the warped spacetime.'),
]
# Links between the simulators point at claude.ai artifacts; on the site they point at each other.
ARTIFACTS = {'https://claude.ai/artifact/75y6nk4MdoaTQXfGVH7UWe': '../event-horizon/'}
HOOK = ("window.__rc = { setStory: (v) => { story = v; }, setScale: (v) => { renderScale = v; scaleCool = 1e12; }, "
        "pause: () => setPlaying(false) };\n")
TAIL = 'setPlaying(playing);\nrequestAnimationFrame(frame);\n})();'


def assemble(name):
    src = (SRC / f'{name}.src.html').read_text(encoding='utf-8')
    return re.sub(r'/\*@([a-z_]+)@\*/', lambda m: (SRC / f'_part_{m.group(1)}.js').read_text(encoding='utf-8'), src)


def esc(s):
    return s.replace('&', '&amp;').replace('"', '&quot;').replace('<', '&lt;')


def document(body, slug, desc):
    title = re.search(r'<title>(.*?)</title>', body).group(1)
    for a, b in ARTIFACTS.items():
        body = body.replace(a, b)
    head = f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="description" content="{esc(desc)}">
<meta property="og:type" content="website">
<meta property="og:title" content="{esc(title)}">
<meta property="og:description" content="{esc(desc)}">
<meta property="og:image" content="{SITE}/docs/{slug}.png">
<meta property="og:url" content="{SITE}/{slug}/">
<meta name="twitter:card" content="summary_large_image">
'''
    return head + body + '\n</html>\n'


def main():
    preview = '--preview' in sys.argv
    (ROOT / 'build').mkdir(exist_ok=True)
    for name, slug, desc in PAGES:
        body = assemble(name)
        (ROOT / 'build' / f'{name}.html').write_text(body, encoding='utf-8')
        (ROOT / slug).mkdir(exist_ok=True)
        (ROOT / slug / 'index.html').write_text(document(body, slug, desc), encoding='utf-8')
        if preview and body.count(TAIL) == 1:
            (ROOT / 'build' / f'{name}.preview.html').write_text(
                document(body.replace(TAIL, HOOK + TAIL), slug, desc), encoding='utf-8')
        print(f'built {slug}/index.html')


if __name__ == '__main__':
    main()
