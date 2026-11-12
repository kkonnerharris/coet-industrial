"""Builds index.html from template.html: inlines COET's logo, the services selector (COET's real copy and
its five original drawings, verbatim from the earlier redesign's capture of coetsystems.com) and the team.
Run: python build.py"""
import html, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
A = os.path.join(HERE, "assets")

SERVICES = [  # COET's own copy from coetsystems.com
    ("branding", "Branding", "Your brand should reflect the credibility of your product, and the company you're becoming.",
     ["Logo", "Type", "Color", "Pitch decks", "Brand portal"]),
    ("web", "Web", "Your site sells the machine before the demo does. Built from scratch, never from a template.",
     ["Framer", "SvelteKit", "Landing pages", "CMS"]),
    ("rendering", "Rendering", "Show the machine before it ships. Built from your CAD files, true down to the last bolt.",
     ["Blender", "Keyshot", "CAD renders", "Launch films"]),
    ("interfaces", "Interfaces", "The screens, controls, and sounds people touch every day. We tune every tap, click, and buzz until the machine feels like part of you.",
     ["Machine screens", "Apps", "Sound", "Haptics", "Design system"]),
    ("implementation", "Implementation", "We take the interface off the screen and put it on the machine. Production-ready software, integrated with your hardware and systems.",
     ["Embedded UI", "Frontend", "Integrations", "Prototypes"]),
]

TEAM = [  # COET's team as on coetsystems.com, plus Konner Harris (user, 2026-11-11)
    ("ccdf94f84d", "Jason Coawette", "Founder & CEO"), ("36975729e6", "Jackie Gilbert", "Head of design"),
    ("003d1294c5", "Giorgio Bordoli", "Head of engineering"), ("fdab99521a", "Lucas Lauachella", "Head of operations"),
    ("01c226b233", "Katie Little", "Product manager"), ("4399730803", "Matthew Schafman", "Interface designer"),
    ("c8e4e8d197", "Grace Gonzalez", "Interface designer"), ("25e9621bac", "Olaf Klimasz", "Motion designer"),
    ("a87de1edd8", "Laish Glenberg", "Software engineer"), ("3b9bb91c92", "Theo Xenakis", "Software engineer"),
    ("konner-harris", "Konner Harris", "Systems engineer"),
    ("21d586a60b", "Corsa DeCenzo", "Hardware engineer"), ("201bdec7a3", "Gabe Luraicella", "Brand & creative strategist"),
]

def read(p):
    with open(p, encoding="utf-8") as f: return f.read()

e = html.escape
tabs, panels = [], []
for i, (key, name, lede, tags) in enumerate(SERVICES):
    on = i == 0
    tabs.append(
        f'<button class="svc__tab" type="button" role="tab" id="tab-{key}" aria-controls="panel-{key}" aria-selected="{str(on).lower()}" tabindex="{0 if on else -1}" data-key="{key}">'
        f'<span class="svc__idx mono">{i + 1:02d}</span><span class="svc__name">{e(name)}</span>'
        f'<span class="svc__more"><span class="svc__more-in"><span class="svc__lede">{e(lede)}</span>'
        f'<span class="tags">{"".join(f"<span class=tag>{e(t)}</span>" for t in tags)}</span></span></span></button>')
    panels.append(
        f'<div class="stage__panel" role="tabpanel" id="panel-{key}" aria-labelledby="tab-{key}" data-key="{key}"{"" if on else " hidden"}>'
        f'<p class="sr-only">{e(name)}: {e(lede)}</p>{read(os.path.join(A, "scenes", key + ".html"))}</div>')

out = read(os.path.join(HERE, "template.html"))
out = out.replace("{{logo}}", read(os.path.join(A, "logo.svg.html")))
out = out.replace("{{svc-tabs}}", "\n        ".join(tabs)).replace("{{svc-panels}}", "".join(panels))
out = out.replace("{{team}}", "".join(
    '<li class="person" data-rise><img src="assets/img/team/%s.webp" width="600" height="750" alt="%s" loading="lazy" decoding="async">'
    '<p class="person__name">%s</p><p class="mono person__role">%s</p></li>' % (img, e(n), e(n), e(r)) for img, n, r in TEAM))
import casegen
out = out.replace("{{work-stage}}", casegen.home_stage())
assert "{{" not in out, re.findall(r"\{\{[^}]+\}\}", out)


def write(rel, text):
    path = os.path.join(HERE, *rel.split("/"))
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="\n") as f: f.write(text)
    print(rel, len(text) // 1024, "KB")


write("index.html", out)

# Case pages share the home page's head, nav and footer, cut from the same build, with links rebased.
HEAD, FOOT = out.split('<main id="main">')[0], out.split("</main>", 1)[1]


def shell(title, desc, base, body):
    def rebase(t):
        for attr in ('href="#', 'src="assets/', 'href="assets/', 'href="favicon', 'href="apple-touch'):
            t = t.replace(attr, attr[:6] + base + attr[6:] if attr.startswith("href") else attr[:5] + base + attr[5:])
        return t
    head = rebase(HEAD).replace("<title>COET · Hardware product studio</title>", "<title>%s</title>" % e(title))
    head = re.sub(r'<meta name="description" content="[^"]*">', '<meta name="description" content="%s">' % e(desc), head)
    page = head + body.strip() + rebase(FOOT)
    page = page.replace('href="%s#top"' % base, 'href="%s"' % base).replace('href="%s#main"' % base, 'href="#main"')
    return page.replace("<body>", '<body class="is-sub">', 1)


for i, p in enumerate(casegen.PROJECTS):
    write("work/%s/index.html" % p["slug"], casegen.case_page(p, i, shell))
write("work/index.html", casegen.work_index(shell))
