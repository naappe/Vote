#!/usr/bin/env python3
"""Publish public MDP announcements to a JSON feed for the static dashboard."""
from datetime import datetime, timezone
from html.parser import HTMLParser
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen
import json
import pathlib

SOURCE="https://mdp.org.mv/announcements"
OUT=pathlib.Path("public/mdp-announcements.json")
class Extractor(HTMLParser):
    def __init__(self):
        super().__init__(); self.link=None; self.depth=0; self.text=[]; self.items=[]
    def handle_starttag(self,tag,attrs):
        if tag=="a":
            if self.link is None:
                self.link=dict(attrs).get("href","");self.text=[];self.depth=1
            else:self.depth+=1
    def handle_data(self,data):
        if self.link is not None:self.text.append(data)
    def handle_endtag(self,tag):
        if tag=="a" and self.link is not None:
            self.depth-=1
            if self.depth==0:
                self.items.append((self.link," ".join(" ".join(self.text).split())))
                self.link=None;self.text=[]
def collect():
    req=Request(SOURCE,headers={"User-Agent":"Mozilla/5.0 (compatible; MDPAnnouncementFeed/1.0)"})
    with urlopen(req,timeout=25) as response:page=response.read(3_000_000).decode("utf-8","replace")
    parser=Extractor();parser.feed(page)
    entries=[];seen=set()
    for href,title in parser.items:
        url=urljoin(SOURCE,href);parts=urlparse(url)
        if parts.hostname not in ("mdp.org.mv","www.mdp.org.mv"):continue
        if not href or parts.path.rstrip("/") in ("/announcements","/en/announcements",""):continue
        if not 16<=len(title)<=260:continue
        if not any("\u0780"<=char<="\u07b1" for char in title) and len(title)<25:continue
        if url in seen:continue
        seen.add(url);entries.append({"title":title,"url":url})
        if len(entries)>=12:break
    if not entries:raise RuntimeError("No announcement links found")
    return {"source":"MDP","updatedAt":datetime.now(timezone.utc).isoformat(),"items":entries}
if __name__=="__main__":
    try:
        feed=collect();OUT.parent.mkdir(parents=True,exist_ok=True)
        OUT.write_text(json.dumps(feed,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
        print("MDP announcements:",len(feed["items"]))
    except Exception as exc:
        print("MDP refresh failed:",exc)
        if not OUT.exists():
            OUT.parent.mkdir(parents=True,exist_ok=True)
            OUT.write_text('{"source":"MDP","updatedAt":null,"items":[]}\n',encoding="utf-8")
