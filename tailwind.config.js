/** @type {import('tailwindcss').Config} */
module.exports={
  content:['./app/**/*.{js,ts,jsx,tsx}','./components/**/*.{js,ts,jsx,tsx}','./layout/**/*.{js,ts,jsx,tsx}','./shared/**/*.{js,ts,jsx,tsx}'],
  theme:{extend:{
    fontFamily:{sans:['Plus Jakarta Sans','Inter','system-ui','sans-serif']},
    colors:{
      calm:{50:'#f3f6f9',100:'#e8edf2',200:'#d5dce4',500:'#6b7a8e',700:'#31465c',800:'#1e3a5f',900:'#0f1923'},
      gold:{400:'#d7b84b',500:'#c9a227',600:'#a98518'}
    },
    boxShadow:{soft:'0 14px 40px rgba(15,25,35,.08)',panel:'0 1px 2px rgba(15,25,35,.05),0 12px 34px rgba(15,25,35,.06)'}
  }},
  plugins:[]
};