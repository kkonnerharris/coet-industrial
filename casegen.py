"""Case studies and the work index, generated from projects.py (MetaLab-style storytelling, COET's own type and palette)."""
import html, os
from projects import PROJECTS

e = html.escape


def frame(img, base, slug, eager=False):
    """A screenshot in a quiet device frame: a browser bar for desktop screens, a phone for mobile ones."""
    if "diagram" in img:
        return f'<figure class="cs-plate cs-plate--diagram">{diagram(img["diagram"])}</figure>'
    src = f'{base}assets/img/case/{slug}/{img["src"]}'
    load = "eager" if eager else "lazy"
    if img["frame"] == "phone":
        return (f'<figure class="cs-plate cs-plate--phone"><div class="phone"><img src="{src}" alt="" loading="{load}" decoding="async"></div></figure>')
    return (f'<figure class="cs-plate"><div class="browser"><div class="browser__bar" aria-hidden="true"><i></i><i></i><i></i></div>'
            f'<img src="{src}" alt="" loading="{load}" decoding="async"></div></figure>')


def diagram(kind):
    """An explanatory system diagram (not a screenshot), drawn from the project description."""
    if kind != "go2":
        return ""
    nodes = [  # x, y, label, sub
        (60, 70, "Web interface", "docs + typed commands"), (60, 230, "Voice agent", "spoken commands"),
        (380, 150, "Agent harness", "interprets, decides"), (700, 70, "Local inference", "Ollama server"),
        (700, 230, "Unitree Go2", "robot commands"), (380, 330, "LiDAR + camera", "what the robot senses"),
    ]
    box = lambda x, y, t, s: (f'<g class="dg-node" transform="translate({x},{y})"><rect width="240" height="76" rx="6"/>'
                              f'<text x="18" y="32" class="dg-t">{e(t)}</text><text x="18" y="55" class="dg-s">{e(s)}</text></g>')
    links = [("M300 108 C340 108 340 188 380 188", ""), ("M300 268 C340 268 340 188 380 188", ""),
             ("M620 172 C660 172 660 108 700 108", ""), ("M620 204 C660 204 660 268 700 268", ""),
             ("M820 306 C820 380 760 368 620 368", "dg-back"), ("M500 330 L500 226", "dg-back")]
    paths = "".join(f'<path class="dg-link {c}" d="{d}"/>' for d, c in links)
    return (f'<svg class="dg" viewBox="0 0 1000 440" role="img" aria-label="System diagram: the web interface and voice agent send commands to an agent harness, '
            f'which reasons with a local model served by Ollama and the robot\'s LiDAR and camera, then sends commands to the Unitree Go2.">'
            f'{paths}{"".join(box(*n) for n in nodes)}</svg>')


def meta_row(p):
    items = [("Project type", p["type"])]
    if p.get("stage"):
        items.append(("Stage", p["stage"]))
    items.append(("Deliverables", " · ".join(p["deliverables"])))
    if p.get("live"):
        items.append(("Live", f'<a href="{p["live"]}" target="_blank" rel="noopener">{e(p["live_label"])} ↗</a>'))
    return "".join(f'<div><dt>{k}</dt><dd>{v if k == "Live" else e(v)}</dd></div>' for k, v in items)


def hero_media(p, base):
    if p.get("hero"):
        return frame({"src": p["hero"], "frame": "browser"}, base, p["slug"], eager=True)
    if p.get("diagram"):
        return f'<figure class="cs-plate cs-plate--diagram">{diagram(p["diagram"])}</figure>'
    # no screenshots published: a typographic plate, never a made-up screen
    return (f'<figure class="cs-plate cs-plate--type" aria-hidden="true"><span>{e(p["line"])}</span>'
            f'<small class="mono">{" / ".join(e(d) for d in p["deliverables"])}</small></figure>')


def case_page(p, i, shell):
    base = "../../"
    nxt = PROJECTS[(i + 1) % len(PROJECTS)]
    light = " cs-panel--light" if p.get("light") else ""
    contribution = "".join(f'<li><h3>{e(t)}</h3><p>{e(d)}</p></li>' for t, d in p["contribution"])
    chapters = ""
    for c in p["chapters"]:
        imgs = c["images"]
        grid = "cs-grid--1" if len(imgs) == 1 else ("cs-grid--split" if any(im.get("frame") == "phone" for im in imgs) else "cs-grid--2")
        chapters += (f'<section class="cs-chapter"><div class="cs-wrap cs-text"><p class="cs-label">{e(c["label"])}</p>'
                     f'<h2 class="cs-statement" data-rise>{e(c["statement"])}</h2><p class="cs-aside" data-rise>{e(c["body"])}</p></div>'
                     f'<div class="cs-panel{light}"><div class="cs-wrap cs-grid {grid}">{"".join(frame(im, base, p["slug"]) for im in imgs)}</div></div></section>')
    features = "".join(f'<li data-rise><span class="mono">{n + 1:02d}</span><h3>{e(t)}</h3><p>{e(d)}</p></li>' for n, (t, d) in enumerate(p["features"]))
    results = ""
    if p["results"]:
        results = ('<section class="cs-results"><div class="cs-wrap"><p class="cs-label">Results</p><ul>'
                   + "".join(f'<li data-rise><span class="cs-num">{e(n)}</span><p>{e(t)}</p></li>' for n, t in p["results"]) + "</ul></div></section>")
    live = ""
    if p.get("live"):
        live = (f'<a class="cs-live" href="{p["live"]}" target="_blank" rel="noopener" data-sfx="press"><span class="cs-label">Live site</span>'
                f'<span class="cs-live__url">{e(p["live_label"])}</span><span class="cs-live__go" aria-hidden="true">↗</span></a>')
    nxt_media = (f'<img src="{base}assets/img/case/{nxt["slug"]}/{nxt["hero"]}" alt="" loading="lazy" decoding="async">' if nxt.get("hero") else "")
    body = f"""
<main id="main" class="cs">
  <header class="cs-hero">
    <div class="cs-wrap">
      <a class="cs-back mono" href="{base}work/" data-sfx="tick">← All work</a>
      <h1 class="cs-title" data-rise>{e(p["name"])}</h1>
      <dl class="cs-meta mono" data-rise>{meta_row(p)}</dl>
    </div>
    <div class="cs-panel cs-panel--hero{light}" style="--tone:{p['tone']}"><div class="cs-wrap">{hero_media(p, base)}</div></div>
  </header>

  <section class="cs-intro"><div class="cs-wrap"><p class="cs-lede" data-rise>{e(p["overview"])}</p></div></section>

  <section class="cs-context"><div class="cs-wrap cs-text"><p class="cs-label">Product context</p>
    <h2 class="cs-statement" data-rise>{e(p["context"][0])}</h2><p class="cs-aside" data-rise>{e(p["context"][1])}</p></div></section>

  <section class="cs-role"><div class="cs-wrap"><p class="cs-label">COET's contribution</p><ul class="cs-rows">{contribution}</ul></div></section>

  {chapters}

  <section class="cs-features"><div class="cs-wrap"><p class="cs-label">Key features</p><ul class="cs-feat">{features}</ul></div></section>
  {results}
  <div class="cs-wrap">{live}</div>

  <a class="cs-next" href="{base}work/{nxt['slug']}/" data-sfx="press">
    <span class="cs-next__media" aria-hidden="true">{nxt_media}</span>
    <span class="cs-wrap cs-next__body"><span class="cs-label">Next project</span><span class="cs-next__name">{e(nxt["name"])}</span>
    <span class="cs-next__line">{e(nxt["line"])}</span></span>
  </a>

  {help_block(base)}
</main>"""
    return shell(title=f'{p["name"]} · COET', desc=p["teaser"], base=base, body=body)


def help_block(base):
    return f"""<section class="cs-help"><div class="cs-wrap cs-help__in">
    <h2 class="cs-help__title">How can we help?</h2>
    <ul class="cs-help__rows">
      <li><a href="https://coetsystems.com/start-a-project" data-sfx="press">Start a project <span aria-hidden="true">↗</span></a></li>
      <li><a href="{base}work/" data-sfx="tick">See all work <span aria-hidden="true">↗</span></a></li>
      <li><a href="{base}#team" data-sfx="tick">Meet the team <span aria-hidden="true">↗</span></a></li>
    </ul></div></section>"""


def work_index(shell):
    base = "../"
    rows = "".join(
        f'<li><a class="wi-row" href="{base}work/{p["slug"]}/" data-sfx="tick"><span class="wi-name">{e(p["name"])}</span>'
        f'<span class="wi-desc">{e(p["teaser"])}</span><span class="wi-del mono">{"<br>".join(e(d) for d in p["deliverables"])}</span></a></li>'
        for p in PROJECTS)
    body = f"""
<main id="main" class="cs wi">
  <header class="cs-hero"><div class="cs-wrap"><h1 class="cs-title wi-title" data-rise>A sample of our work.</h1>
  <p class="cs-aside wi-sub" data-rise>Brand, web, interfaces and engineering, from public registries to robots.</p></div></header>
  <section><div class="cs-wrap"><ul class="wi-list">{rows}</ul></div></section>
  {help_block(base)}
</main>"""
    return shell(title="Work · COET", desc="Case studies from COET: brand, web, interfaces and engineering.", base=base, body=body)


def home_stage():
    """The home page's work section: MetaLab's stage. Pills on the left; pointing at one swaps the whole stage."""
    pills, layers = [], []
    for i, p in enumerate(PROJECTS):
        on = " is-on" if i == 0 else ""
        pills.append(f'<li><a class="ws-pill{on}" href="work/{p["slug"]}/" data-ws="{i}" data-sfx="press">{e(p["short"])}</a></li>')
        bg = (f'<img class="ws-bg" src="assets/img/case/{p["slug"]}/{p["hero"]}" alt="" loading="lazy" decoding="async">' if p.get("hero") else '<span class="ws-bg ws-bg--plain"></span>')
        shot = (f'<span class="ws-shot"><img src="assets/img/case/{p["slug"]}/{p["hero"]}" alt="" loading="lazy" decoding="async"></span>' if p.get("hero")
                else (f'<span class="ws-shot ws-shot--diagram">{diagram(p["diagram"])}</span>' if p.get("diagram") else ""))
        layers.append(f'<div class="ws-layer{on}" data-ws-layer="{i}" style="--tone:{p["tone"]}" aria-hidden="{str(i != 0).lower()}">{bg}{shot}'
                      f'<span class="ws-del mono">{" · ".join(e(d) for d in p["deliverables"])}</span>'
                      f'<span class="ws-name">{e(p["short"])}</span><span class="ws-line">{e(p["teaser"])}</span></div>')
    pills.append('<li><a class="ws-pill ws-pill--all" href="work/" data-sfx="press">All work</a></li>')
    return f"""<section class="ws" id="work" aria-labelledby="work-title" data-ws-root>
    <h2 class="sr-only" id="work-title">Work</h2>
    <div class="ws-layers">{"".join(layers)}</div>
    <p class="ws-intro">We take all that technical depth and turn it into something people understand and enjoy.</p>
    <ul class="ws-pills" aria-label="Case studies">{"".join(pills)}</ul>
  </section>"""
