from __future__ import annotations

import datetime as dt
import json
import re
import urllib.parse
import urllib.request
from pathlib import Path

from bs4 import BeautifulSoup


ROOT = Path(__file__).resolve().parents[1]
WIKI_URL = "https://en.wikipedia.org/wiki/2026_FIFA_World_Cup"
POLY_URL = "https://gamma-api.polymarket.com/markets?search=FIFA%20World%20Cup&closed=false&limit=50"


def fetch_text(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": "world-cup-dashboard/1.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read().decode("utf-8")


def text(node) -> str:
    if not node:
        return ""
    return re.sub(r"\s+", " ", node.get_text(" ", strip=True)).strip()


def clean_team(value: str) -> str:
    return re.sub(r"\s*\(H\)", "", value).replace("\xa0", " ").strip()


def parse_kickoff(date_text: str, time_text: str) -> str | None:
    match = re.search(r"(\d{1,2}):(\d{2})\s*([ap])\.m\.\s*UTC([−-]\d+|\+\d+)", time_text)
    if not match:
        return None
    hour = int(match.group(1))
    minute = int(match.group(2))
    if match.group(3) == "p" and hour != 12:
        hour += 12
    if match.group(3) == "a" and hour == 12:
        hour = 0
    offset = match.group(4).replace("−", "-")
    sign = "+" if offset.startswith("+") else "-"
    offset_hour = abs(int(offset))
    parsed_date = dt.datetime.strptime(date_text.replace("\xa0", " "), "%B %d, %Y")
    return f"{parsed_date:%Y-%m-%d}T{hour:02d}:{minute:02d}:00{sign}{offset_hour:02d}:00"


def team_from_box(box, selector: str) -> str:
    anchor = box.select_one(f'{selector} a[title$="team"]') or box.select_one(f"{selector} a")
    return clean_team(text(anchor) or text(box.select_one(f'{selector} [itemprop="name"]')))


def parse_matches(soup: BeautifulSoup) -> list[dict]:
    matches = []
    for index, box in enumerate(soup.select("div.footballbox"), 1):
        heading = box.find_previous(lambda tag: tag.name in ["h2", "h3"] and tag.get("id"))
        stage = text(heading)
        date_text = text(box.select_one(".fdate")).split(" (")[0]
        time_text = text(box.select_one(".ftime"))
        score = text(box.select_one(".fscore"))
        location = text(box.select_one('[itemprop="name address"]'))
        venue, city = (location.split(" , ", 1) + [""])[:2] if " , " in location else (location, "")
        matches.append(
            {
                "id": index,
                "stage": stage,
                "group": stage.replace("Group ", "") if stage.startswith("Group ") else "",
                "date": date_text,
                "timeLocal": time_text,
                "kickoff": parse_kickoff(date_text, time_text),
                "home": team_from_box(box, ".fhome"),
                "away": team_from_box(box, ".faway"),
                "score": score,
                "venue": venue,
                "city": city,
                "homeGoals": text(box.select_one(".fhgoal")),
                "awayGoals": text(box.select_one(".fagoal")),
                "status": "final" if re.match(r"^\d+[–-]\d+$", score) else "scheduled",
            }
        )
    return matches


def parse_standings(soup: BeautifulSoup) -> list[dict]:
    standings = []
    for letter in "ABCDEFGHIJKL":
        heading = soup.find(id=f"Group_{letter}")
        if not heading:
            continue
        table = heading.find_parent().find_next_sibling("table")
        for tr in table.find_all("tr"):
            cells = tr.find_all(["th", "td"])
            if len(cells) < 10 or not cells[0].get_text(strip=True).isdigit():
                continue
            values = [text(cell) for cell in cells]
            standings.append(
                {
                    "group": letter,
                    "pos": int(values[0]),
                    "team": clean_team(values[1]),
                    "pld": int(values[2]),
                    "w": int(values[3]),
                    "d": int(values[4]),
                    "l": int(values[5]),
                    "gf": int(values[6]),
                    "ga": int(values[7]),
                    "gd": values[8].replace("−", "-"),
                    "pts": int(re.search(r"\d+", values[9]).group()),
                    "qualification": values[10] if len(values) > 10 else "",
                }
            )
    return standings


def parse_odds(raw: list[dict]) -> list[dict]:
    odds = []
    for market in raw:
        question = market.get("question", "")
        match = re.match(r"Will (.+) win the 2026 FIFA World Cup\?", question)
        if not match:
            continue
        outcomes = market.get("outcomes", [])
        prices = market.get("outcomePrices", [])
        if isinstance(outcomes, str):
            outcomes = json.loads(outcomes)
        if isinstance(prices, str):
            prices = json.loads(prices)
        yes_index = outcomes.index("Yes") if "Yes" in outcomes else 0
        price = float(prices[yes_index]) if prices else 0
        odds.append(
            {
                "team": match.group(1),
                "probability": round(price * 100, 2),
                "price": price,
                "volume": round(float(market.get("volume") or 0)),
                "liquidity": round(float(market.get("liquidity") or 0)),
                "slug": market.get("slug"),
            }
        )
    return sorted(odds, key=lambda item: item["probability"], reverse=True)


def main() -> None:
    wiki_html = fetch_text(WIKI_URL)
    poly_raw = json.loads(fetch_text(POLY_URL))
    soup = BeautifulSoup(wiki_html, "html.parser")
    data = {
        "snapshot": dt.datetime.now().astimezone().date().isoformat(),
        "matches": parse_matches(soup),
        "standings": parse_standings(soup),
        "odds": parse_odds(poly_raw),
        "sources": [
            {"label": "Wikipedia: 2026 FIFA World Cup schedule and tables", "url": WIKI_URL},
            {"label": "Polymarket Gamma API: 2026 FIFA World Cup winner markets", "url": POLY_URL},
        ],
    }
    (ROOT / "data.js").write_text(
        "window.WC_DATA = " + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n",
        encoding="utf-8",
    )
    print(
        f"Updated data.js: {len(data['matches'])} matches, "
        f"{len(data['standings'])} standings, {len(data['odds'])} odds"
    )


if __name__ == "__main__":
    main()
