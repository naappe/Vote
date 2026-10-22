"""Only show news with an independently parsed publication date (Maldives time)."""
import json,re
from datetime import datetime,timezone,timedelta
from html.parser import HTMLParser
from urllib.request import Request,urlopen
MVT=timezone(timedelta(hours=5))
class MetaDates(HTMLParser):
 def __init__(self):super().__init__();self.values=[]
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if tag=="meta" and any(k in (a.get("property","").lower()+a.get("name","").lower()) for k in ("published_time","datepublished","pubdate","article:published","datecreated")):self.values.append(a.get("content",""))
  if tag=="time" and a.get("datetime"):self.values.append(a["datetime"])
def published(url):
 try:
  with urlopen(Request(url,headers={"User-Agent":"Mozilla/5.0"}),timeout=6) as response:html=response.read(600000).decode("utf-8","replace")
  meta=MetaDates();meta.feed(html)
  meta.values+=re.findall(r'"datePublished"\s*:\s*"([^"]+)"',html,re.I)
  for value in meta.values:
   try:
    dt=datetime.fromisoformat(value.strip().replace("Z","+00:00"))
    if dt.tzinfo is None:continue
    return dt.astimezone(MVT)
   except ValueError:pass
 except Exception:pass
 return None
def today_only(items):
 today=datetime.now(MVT).date()
 kept=[]
 for item in items[:15]:
  dt=published(item["url"])
  if dt is not None and dt.date()==today:kept.append({**item,"publishedAt":dt.isoformat()})
 return kept
