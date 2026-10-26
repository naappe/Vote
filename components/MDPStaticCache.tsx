'use client';
import {useEffect} from 'react';
export default function MDPStaticCache(){
 useEffect(()=>{
  if(!('serviceWorker' in navigator)||!window.isSecureContext)return;
  void navigator.serviceWorker.register('/Vote/mdp/sw.js?v=3',{scope:'/Vote/mdp/',updateViaCache:'none'}).then(reg=>reg.update()).catch(()=>{});
 },[]);
 return null;
}
