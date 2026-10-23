"""Audit the static export and, optionally, its published URLs for retired team UI."""
import argparse
from concurrent.futures import ThreadPoolExecutor
from html.parser import HTMLParser
import json
from pathlib import Path
import re
from urllib.parse import urlsplit
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
EXPORT = ROOT / "out"
BASE_PATH = "/souzana"
LANDINGS = ("/team/", "/team/photo-grid/", "/team/version-1/", "/team/version-2/")
RETIRED = (
    "BiographyPreview", "team-roster", "team-person", "team-version-bar",
    "team-directory-page", "team-directory-hero", "team-categories", "team-search",
    "team-partner-details", "bio-review-bar", "bio-articles",
)
BIOGRAPHIES = json.loads((ROOT / "lib/team-biographies.json").read_text())
for member in BIOGRAPHIES:
    assert member["hasTwoVersions"], f"Missing second version: {member['id']}"
    assert member["versions"]["1"] != member["versions"]["2"], f"Duplicate versions: {member['id']}"
    assert any(block["type"] == "list" for block in member["versions"]["2"]), f"Second version needs lists: {member['id']}"
MEMBER_IDS = ["souzana-klimentidi"] + [member["id"] for member in BIOGRAPHIES]


def normalized(text):
    return re.sub(r"\s+", " ", text).strip()


class Page(HTMLParser):
    def __init__(self, html):
        super().__init__()
        self.tiles, self.links, self.assets, self.classes = [], [], set(), set()
        self.blocks, self.copy_depth, self.current, self.parts = [], 0, None, []
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        classes = set(attrs.get("class", "").split())
        self.classes.update(classes)
        if tag == "a":
            self.links.append(attrs.get("href", ""))
            if "team-photo-tile" in classes:
                self.tiles.append(attrs["href"])
        if tag == "script" and attrs.get("src"):
            self.assets.add(attrs["src"])
        if tag == "link" and attrs.get("rel") == "stylesheet":
            self.assets.add(attrs["href"])
        if tag == "div" and "team-biography-copy" in classes:
            self.copy_depth = 1
        elif tag == "div" and self.copy_depth:
            self.copy_depth += 1
        if self.copy_depth and tag in ("p", "li"):
            self.current, self.parts = tag, []

    def handle_data(self, text):
        if self.current:
            self.parts.append(text)

    def handle_endtag(self, tag):
        if self.current == tag:
            self.blocks.append((tag, normalized("".join(self.parts))))
            self.current = None
        if tag == "div" and self.copy_depth:
            self.copy_depth -= 1


def route_for(path):
    relative = path.relative_to(EXPORT)
    return "/" + str(relative.parent).strip(".").strip("/") + "/" if path.name == "index.html" else "/" + relative.as_posix()


def no_retired(text, location):
    for marker in RETIRED:
        assert marker not in text, f"Retired team UI {marker!r} remains in {location}"


def validate(documents, label):
    parsed = {}
    for route, html in documents.items():
        no_retired(html, route)
        page = parsed[route] = Page(html)
        for href in page.links:
            path = urlsplit(href).path
            if path.startswith(BASE_PATH + "/team/"):
                target = path[len(BASE_PATH):].rstrip("/") + "/"
                assert target in documents, f"Broken team link from {route}: {href}"
    for route in LANDINGS:
        page = parsed[route]
        base = route if route in ("/team/version-1/", "/team/version-2/") else "/team/"
        expected = [BASE_PATH + base + member_id + "/" for member_id in MEMBER_IDS]
        assert page.tiles == expected, f"Wrong portrait grid or version links in {route}"
    for base, version in (("/team/", "1"), ("/team/version-1/", "1"), ("/team/version-2/", "2")):
        souzana = documents[base + "souzana-klimentidi/"]
        assert "souzana-portrait.webp" in souzana
        assert not ({"team-biography-copy", "team-profile-role", "team-biography-versions"} & parsed[base + "souzana-klimentidi/"].classes)
        for marker in ("Managing Partner", "INSEAD", "Oxford", "Coral Shipping", "LinkedIn"):
            assert marker not in souzana, f"Withdrawn profile detail {marker!r} in {base}"
        for member in BIOGRAPHIES:
            expected = []
            for block in member["versions"][version]:
                if block["type"] == "paragraph":
                    expected.append(("p", normalized(block["text"])))
                else:
                    expected.extend(("li", normalized(item)) for item in block["items"])
            route = base + member["id"] + "/"
            assert parsed[route].blocks == expected, f"Source biography changed at {route}"
    print(f"PASS {label}: {len(documents)} HTML pages; {len(LANDINGS)} grids of {len(MEMBER_IDS)} portraits; {3 * len(MEMBER_IDS)} profile routes; {3 * len(BIOGRAPHIES)} source biographies checked; no retired UI.")
    return set().union(*(page.assets for page in parsed.values()))


def fetch(url):
    request = Request(url, headers={"Cache-Control": "no-cache"})
    with urlopen(request, timeout=30) as response:
        assert response.status == 200, f"HTTP {response.status}: {url}"
        return response.read().decode("utf-8")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--live", metavar="SITE_URL", help="Also audit the deployed site, for example https://kl1me.github.io/souzana")
    args = parser.parse_args()
    assert EXPORT.is_dir(), "Build the static export before running this audit."
    documents = {}
    for path in EXPORT.rglob("*.html"):
        route = route_for(path).replace("//", "/")
        documents[route] = path.read_text()
    validate(documents, "local export")
    assets = list((EXPORT / "_next").rglob("*.js")) + list((EXPORT / "_next").rglob("*.css"))
    for path in assets:
        no_retired(path.read_text(), path.relative_to(EXPORT))
    assert not (ROOT / "components/team/BiographyPreview.tsx").exists()
    print(f"PASS local bundles: {len(assets)} JavaScript/CSS files contain no retired team UI.")
    if args.live:
        site = args.live.rstrip("/")
        # Generated 404 pages deliberately return an error status and are checked locally.
        routes = [route for route in documents if "404" not in route and "_not-found" not in route]
        with ThreadPoolExecutor(max_workers=4) as pool:
            live = dict(zip(routes, pool.map(fetch, [site + route for route in routes])))
            assets = validate(live, "published site")
            origin = "{0.scheme}://{0.netloc}".format(urlsplit(site))
            urls = sorted(origin + asset for asset in assets if asset.startswith(BASE_PATH + "/_next/") and asset.split("?")[0].endswith((".css", ".js")))
            for url, text in zip(urls, pool.map(fetch, urls)):
                no_retired(text, url)
        print(f"PASS published bundles: {len(urls)} JavaScript/CSS files contain no retired team UI.")


if __name__ == "__main__":
    main()
