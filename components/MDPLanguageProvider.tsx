'use client';

import {createContext,useContext,useEffect,useMemo,useState,type ReactNode} from 'react';
import {translateMdpText,type MdpLanguage} from '../lib/mdp-language';

type LanguageContextValue={language:MdpLanguage;setLanguage:(language:MdpLanguage)=>void};
const LanguageContext=createContext<LanguageContextValue>({language:'en',setLanguage:()=>{}});
const STORAGE_KEY='mdp-resident-language';
const textAttributes=['placeholder','title','aria-label'];

function translateTextNode(node:Node,language:MdpLanguage){
 const current=node.nodeValue||'';const translated=translateMdpText(current,language);
 if(translated!==current)node.nodeValue=translated;
}

function translateAttributes(element:HTMLElement,language:MdpLanguage){
 for(const attribute of textAttributes){
  const current=element.getAttribute(attribute);if(current===null)continue;
  const translated=translateMdpText(current,language);if(translated!==current)element.setAttribute(attribute,translated);
 }
}

function localizeSubtree(node:Node,language:MdpLanguage){
 if(node.nodeType===Node.TEXT_NODE){translateTextNode(node,language);return}
 if(node.nodeType!==Node.ELEMENT_NODE)return;
 const element=node as HTMLElement;
 translateAttributes(element,language);
 element.querySelectorAll<HTMLElement>('*').forEach(child=>translateAttributes(child,language));
 const walker=document.createTreeWalker(element,NodeFilter.SHOW_TEXT);
 let textNode:Node|null;
 while((textNode=walker.nextNode()))translateTextNode(textNode,language);
}

export function MDPLanguageProvider({children}:{children:ReactNode}){
 const [language,setLanguageState]=useState<MdpLanguage>('en');
 useEffect(()=>{const saved=window.localStorage.getItem(STORAGE_KEY);if(saved==='dv'||saved==='en')setLanguageState(saved)},[]);
 useEffect(()=>{
  document.documentElement.lang=language==='dv'?'dv':'en';
  document.documentElement.dir=language==='dv'?'rtl':'ltr';
  const root=document.getElementById('mdp-language-root');if(!root)return;
  localizeSubtree(root,language);
  const observer=new MutationObserver(records=>{
   for(const record of records){
    if(record.type==='characterData')translateTextNode(record.target,language);
    else if(record.type==='childList')record.addedNodes.forEach(node=>localizeSubtree(node,language));
    else if(record.type==='attributes'&&record.target instanceof HTMLElement)translateAttributes(record.target,language);
   }
  });
  observer.observe(root,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:textAttributes});
  return()=>{observer.disconnect();document.documentElement.lang='en';document.documentElement.dir='ltr'};
 },[language]);
 const value=useMemo(()=>({language,setLanguage:(next:MdpLanguage)=>{window.localStorage.setItem(STORAGE_KEY,next);setLanguageState(next)}}),[language]);
 return <LanguageContext.Provider value={value}><div id="mdp-language-root" className="contents">{children}</div></LanguageContext.Provider>;
}

export function useMdpLanguage(){return useContext(LanguageContext)}
