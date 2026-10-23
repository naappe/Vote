'use client';
import {useEffect} from 'react';
export default function MDPStaticCache(){
 useEffect(()=>{
  if(!('serviceWorker' in navigator)||!window.isSecureContext)return;
  void navigator.serviceWorker.register('/Vote/mdp/sw.js',{scope:'/Vote/mdp/'}).catch(()=>{});
 },[]);
 return null;
}
