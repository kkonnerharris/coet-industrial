"""Builds index.html from template.html: inlines COET's logo and its five original service drawings
(verbatim, from the earlier redesign's capture of coetsystems.com) and the team list.
Run: python build.py"""
import html, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
A = os.path.join(HERE, "assets")

TEAM = [  # the team shown (user, 2026-11-11: just Jason and Konner)
    ("ccdf94f84d", "Jason Coawette", "Founder & CEO"),
    ("konner-harris", "Konner Harris", "Systems engineer"),
]

def read(p):
    with open(p, encoding="utf-8") as f: return f.read()

out = read(os.path.join(HERE, "template.html"))
out = out.replace("{{logo}}", read(os.path.join(A, "logo.svg.html")))
for name in ["branding", "web", "rendering", "interfaces", "implementation"]:
    out = out.replace("{{scene:%s}}" % name, read(os.path.join(A, "scenes", name + ".html")))
team = "".join(
    '<li class="person" data-rise><img src="assets/img/team/%s.webp" width="600" height="750" alt="%s" loading="lazy" decoding="async">'
    '<p class="person__name">%s</p><p class="mono person__role">%s</p></li>' % (img, html.escape(n), html.escape(n), html.escape(r))
    for img, n, r in TEAM)
out = out.replace("{{team}}", team)
assert "{{" not in out, re.findall(r"\{\{[^}]+\}\}", out)
with open(os.path.join(HERE, "index.html"), "w", encoding="utf-8", newline="\n") as f: f.write(out)
print("index.html", len(out) // 1024, "KB")
