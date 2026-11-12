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
    ("konner-harris", "Konner Harris", "AI & systems engineer"),
    ("21d586a60b", "Corsa DeCenzo", "Hardware engineer"), ("201bdec7a3", "Gabe Luraicella", "Brand & creative strategist"),
]

BIOS = {  # click-to-open bios. Konner's is his own text (2026-11-12); Jason's is what the user said about him. Others come later.
    "konner-harris": [
        "Konner Harris is a software engineer specializing in AI integration, full-stack development, intelligent systems, and software infrastructure. His experience spans commercial software development, independent contracting, enterprise networking, robotics, and applied artificial intelligence, with an emphasis on turning emerging technologies into practical, real-world solutions.",
        "As a software engineer and contractor, Konner has worked on a diverse range of projects, including AI-powered applications, intelligent automation systems, conversational AI agents, business workflow integrations, web platforms, and custom software solutions. His work involves integrating large language models, external APIs, and automation frameworks into existing business systems, as well as designing and developing new applications from the ground up.",
        "He brings experience in backend development, system architecture, API integration, and modern frontend technologies, connecting complex engineering systems with intuitive user experiences.",
        "His technical background also includes enterprise network engineering at Southern Illinois University, where he supported large-scale networking infrastructure and developed Python automation tools. As a robotics research assistant at SIU's X-Lab, he has worked with ROS 2, robotic perception, LiDAR, large language models, and autonomous control systems.",
        "Beyond commercial development, Konner has pursued research and independent projects in machine learning, computational neuroscience, EEG signal processing, computer vision, federated learning, and medical imaging. He has also contributed to open-source software, including BrainFlow, and submitted contributions to projects maintained by Microsoft, Google, and NVIDIA.",
        "His technical toolkit includes Python, Go, C++, TypeScript, JavaScript, React, Linux, Docker, Kubernetes, cloud infrastructure, databases, and AI development frameworks.",
        "Konner holds a bachelor's degree in Computer Science from Southern Illinois University and has been accepted into Georgia Tech's Master of Science in Computer Science program.",
        "His approach combines software engineering, AI integration, infrastructure, and product development, with a focus on building intelligent, reliable systems that solve meaningful technical and business problems.",
    ],
    "ccdf94f84d": [
        "Jason Coawette studied computer science at Arizona State University and took on a wide range of freelance projects before founding COET Systems.",
        "His interests are UI/UX design and front-end development.",
    ],
}

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
def person(img, n, r):
    pic = '<img src="assets/img/team/%s.webp" width="600" height="750" alt="%s" loading="lazy" decoding="async">' % (img, e(n))
    txt = '<p class="person__name">%s</p><p class="mono person__role">%s</p>' % (e(n), e(r))
    if img not in BIOS:
        return '<li class="person" data-rise>%s%s</li>' % (pic, txt)
    body = "".join("<p>%s</p>" % e(p) for p in BIOS[img])
    return ('<li class="person person--bio" data-rise><button class="person__open" type="button" aria-haspopup="dialog" data-bio="%s">%s%s'
            '<span class="person__more">Read bio <span aria-hidden="true">+</span></span></button>'
            '<template id="bio-%s"><p class="bio__role">%s</p><h3 class="bio__name">%s</h3><div class="bio__body">%s</div></template></li>'
            % (img, pic, txt, img, e(r), e(n), body))
TEAM_HTML = "".join(person(*t) for t in TEAM)

import casegen
LOGO = read(os.path.join(A, "logo.svg.html"))
TEMPLATE = read(os.path.join(HERE, "template.html"))
NAV = read(os.path.join(HERE, "pages", "nav.html"))


def rebase(t, base):
    for attr in ('src="assets/', 'href="assets/', 'href="favicon', 'href="apple-touch'):
        t = t.replace(attr, attr.split('"')[0] + '"' + base + attr.split('"', 1)[1])
    return t


def shell(title, desc, base, body, cls="is-sub"):
    nav = NAV.replace("{{root}}", base or "./").replace("{{logo}}", LOGO).replace("{{menu-pills}}", casegen.menu_pills(base))
    page = TEMPLATE.replace("{{nav}}", nav).replace("{{main}}", body.strip())
    page = page.replace("<title>COET · Hardware product studio</title>", "<title>%s</title>" % e(title))
    page = re.sub(r'<meta name="description" content="[^"]*">', '<meta name="description" content="%s">' % e(desc), page)
    page = page.replace("{{logo}}", LOGO).replace("<body>", '<body class="%s">' % cls, 1)
    page = rebase(page, base)
    assert "{{" not in page, re.findall(r"\{\{[^}]+\}\}", page)
    return page


def write(rel, text):
    path = os.path.join(HERE, *rel.split("/"))
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="\n") as f: f.write(text)
    print(rel, len(text) // 1024, "KB")


def page_head(title, sub):
    return (f'<header class="cs-hero pg-hero"><div class="cs-wrap"><h1 class="cs-title" data-rise>{e(title)}</h1>'
            f'<p class="cs-aside pg-sub" data-rise>{e(sub)}</p></div></header>')


TITLE, DESC = "COET · Hardware product studio", "COET turns complicated hardware into intuitive product experiences. Brand, web, rendering, interfaces and implementation."
what = read(os.path.join(HERE, "pages", "what-we-do.html")).replace("{{svc-tabs}}", "\n        ".join(tabs)).replace("{{svc-panels}}", "".join(panels))
about = read(os.path.join(HERE, "pages", "about.html")).replace("{{team}}", TEAM_HTML)
# One continuous page: the MetaLab work stage opens it, then the numbers, the statement, services, client, team and close.
write("index.html", shell(TITLE, DESC, "", casegen.home_stage() + what + about, "is-home"))
for i, p in enumerate(casegen.PROJECTS):
    write("work/%s/index.html" % p["slug"], casegen.case_page(p, i, shell))
write("work/index.html", casegen.work_index(shell))
