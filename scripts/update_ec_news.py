from news_dates import today_only
#!/usr/bin/env python3
"""Publish Elections Commission news headlines for the static MDP dashboard."""
import json, pathlib, re
from datetime import datetime,timezone
from html.parser import HTMLParser
from urllib.request import Request,urlopen
from urllib.parse import urljoin,urlparse
SOURCE="https://www.elections.gov.mv/news"
OUT=pathlib.Path("public/ec-news.json")
class Links(HTMLParser):
 def __init__(self):super().__init__();self.href=None;self.parts=[];self.rows=[]
 def handle_starttag(self,t,a):
  if t=="a" and self.href is None:self.href=dict(a).get("href","");self.parts=[]
 def handle_data(self,t):
  if self.href is not None:self.parts.append(t)
 def handle_endtag(self,t):
  if t=="a" and self.href is not None:
   self.rows.append((self.href," ".join(" ".join(self.parts).split())));self.href=None;self.parts=[]
def collect():
 req=Request(SOURCE,headers={"User-Agent":"Mozilla/5.0"})
 with urlopen(req,timeout=25) as r:html=r.read(3000000).decode("utf-8","replace")
 parsed=Links();parsed.feed(html);items=[];seen=set()
 for href,title in parsed.rows:
  url=urljoin(SOURCE,href);p=urlparse(url)
  if p.hostname not in ("elections.gov.mv","www.elections.gov.mv"):continue
  if p.path.rstrip("/") in ("/news","/"):continue
  if len(title)<18 or len(title)>240 or url in seen:continue
  if not ("/news/" in p.path or "/media/" in p.path):continue
  seen.add(url);items.append({"title":title,"url":url})
  if len(items)>=12:break
 if not items:raise ValueError("No validated EC article links")
 return {"source":"EC","updatedAt":datetime.now(timezone.utc).isoformat(),"items":today_only(items)}
if __name__=="__main__":
 try:
  data=collect();OUT.parent.mkdir(parents=True,exist_ok=True);OUT.write_text(json.dumps(data,ensure_ascii=False,indent=2)+"\n",encoding="utf-8");print("EC news",len(data["items"]))
 except Exception as e:
  print("EC feed unavailable:",e)
  if not OUT.exists():OUT.parent.mkdir(parents=True,exist_ok=True);OUT.write_text('{"source":"EC","updatedAt":null,"items":[]}\n',encoding="utf-8")
