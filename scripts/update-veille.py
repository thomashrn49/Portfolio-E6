"""Recupere le flux RSS du CERT-FR et genere veille-data.js.

Execute chaque jour par GitHub Actions (.github/workflows/veille.yml).
Utilise uniquement la bibliotheque standard de Python.
"""

import html
import json
import re
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path

FEED_URL = "https://cert.cyber.gouv.fr/feed/"
MAX_ARTICLES = 6
OUTPUT = Path(__file__).resolve().parent.parent / "veille-data.js"


def clean_text(value):
    text = re.sub(r"<[^>]+>", " ", html.unescape(value or ""))
    return re.sub(r"\s+", " ", text).strip()


def main():
    request = urllib.request.Request(FEED_URL, headers={"User-Agent": "portfolio-veille"})
    with urllib.request.urlopen(request, timeout=30) as response:
        root = ET.fromstring(response.read())

    articles = []
    for item in root.iter("item"):
        title = clean_text(item.findtext("title"))
        link = (item.findtext("link") or "").strip()
        pub_date = item.findtext("pubDate")
        if not (title and link and pub_date):
            continue

        articles.append({
            "title": title,
            "link": link,
            "date": parsedate_to_datetime(pub_date).isoformat(),
            "excerpt": clean_text(item.findtext("description"))[:220],
        })

    if not articles:
        raise SystemExit("Aucun article trouve dans le flux CERT-FR")

    # Le flux est publie du plus ancien au plus recent : on trie du plus recent au plus ancien.
    articles.sort(key=lambda article: article["date"], reverse=True)

    data = {
        "updatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "source": FEED_URL,
        "articles": articles[:MAX_ARTICLES],
    }

    OUTPUT.write_text(
        "// Fichier genere automatiquement par scripts/update-veille.py - ne pas modifier a la main.\n"
        f"window.VEILLE_DATA = {json.dumps(data, ensure_ascii=False, indent=2)};\n",
        encoding="utf-8",
    )
    print(f"{len(data['articles'])} articles ecrits dans {OUTPUT.name}")


if __name__ == "__main__":
    main()
