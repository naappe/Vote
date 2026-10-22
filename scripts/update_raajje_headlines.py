from news_dates import today_only
#!/usr/bin/env python3
"""Extract headline links from Raajje.mv for GitHub Pages. No login or private data."""
import json, pathlib, re, urllib.request
from html.parser import HTMLParser
from datetime import datetime, timezone
from urllib.parse import urljoin, urlparse

SOURCE="https://raajje.mv/category/news"
OUT=pathlib.Path("public/raajje-headlines.json")
class Links(HTMLParser):
    def __init__(self):
        super().__init__(); self.href=None; self.parts=[]; self.links=[]
    def handle_starttag(self, tag, attrs):
        if tag=="a":
            self.href=dict(attrs).get("href",""); self.parts=[]
    def handle_data(self,data):
        if self.href is not None:self.parts.append(data)
    def handle_endtag(self,tag):
        if tag=="a" and self.href is not None:
            title=" ".join(" ".join(self.parts).split())
            self.links.append((self.href,title))
            self.href=None; self.parts=[]
def collect():
    req=urllib.request.Request(SOURCE,headers={"User-Agent":"Mozilla/5.0 (compatible; VoteHeadlineTicker/1.0)"})
    with urllib.request.urlopen(req,timeout=25) as response:
        html=response.read(3_000_000).decode("utf-8","replace")
    parsed=Links();parsed.feed(html)
    result=[];seen=set()
    for href,title in parsed.links:
        url=urljoin(SOURCE,href)
        p=urlparse(url)
        if p.hostname not in ("raajje.mv","www.raajje.mv"):continue
        if not re.fullmatch(r"/[0-9]{3,}(?:/)?",p.path):continue
        if not 15<=len(title)<=230 or url in seen:continue
        seen.add(url);result.append({"title":title,"url":url})
        if len(result)==15:break
    if len(result)<3:raise RuntimeError("No reliable article links found. Keeping the last good headlines.")
    return {"source":"Raajje.mv","updatedAt":datetime.now(timezone.utc).isoformat(),"items":today_only(result)}
if __name__=="__main__":
    try:
        news=collect()
        OUT.parent.mkdir(parents=True,exist_ok=True)
        OUT.write_text(json.dumps(news,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
        print("Updated",len(news["items"]),"headlines")
    except Exception as ex:
        print("Refresh failed:",ex)
        if not OUT.exists():OUT.write_text('{"source":"Raajje.mv","updatedAt":null,"items":[]}\n',encoding="utf-8")
