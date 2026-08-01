"use client";
import React,{useState,useRef,useEffect} from "react";
import {useLanguage} from "@/context/LanguageContext";
import {useDemoClock} from "@/context/DemoClockContext";
import {supabase} from "@/lib/supabase";
interface M{role:string;content:string;card?:boolean;ref?:string;sum?:string;inqId?:string;}
export default function AminaChat(){
  const {locale:l,t}=useLanguage();
  const {getSimulatedTime}=useDemoClock();
  const [open,setOpen]=useState(false);
  const [msgs,setMsgs]=useState<M[]>([]);
  const [input,setInput]=useState("");
  const [loading,setLoading]=useState(false);
  const [sid,setSid]=useState("");
  const [email,setEmail]=useState("");
  const [emailSuccess,setEmailSuccess]=useState("");
  const endRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{setSid(`chat-${Math.floor(Math.random()*900000)}`);},[]);
  useEffect(()=>{setMsgs([{role:"assistant",content:t("chat_welcome")}]);},[l]);
  useEffect(()=>{endRef.current?.scrollIntoView({behavior:"smooth"});},[msgs,loading]);
  const handleSend=async(e:React.FormEvent)=>{
    e.preventDefault();
    if(!input.trim()||loading)return;
    const txt=input.trim();
    setInput("");
    const upd=[...msgs,{role:"user",content:txt}];
    setMsgs(upd);
    setLoading(true);
    try{
      const res=await fetch("/api/chat",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({message:txt,history:upd.slice(1,-1),locale:l,sessionId:sid,isAfterHours:getSimulatedTime().isAfterHours})
      });
      const d=await res.json();
      setMsgs(prev=>[...prev,d.escalated?{role:"assistant",content:d.message,card:true,ref:d.reference,sum:d.summary,inqId:d.inquiryId}:{role:"assistant",content:d.message}]);
    }catch{
      setMsgs(prev=>[...prev,{role:"assistant",content:"Error. Try again."}]);
    }finally{setLoading(false);}
  };
  const handleEmail=(inqId:string)=>{
    if(email.includes("@"))supabase.from("inquiries").update({email:email.trim()}).eq("id",inqId).then(()=>setEmailSuccess(inqId));
  };
  const openWa=(ref:string,sum:string)=>{
    const msg=l==="fr"?`Bonjour, suite à ma demande. Réf: ${ref}. Résumé: ${sum}`:`Hello, following up on request. Ref: ${ref}. Summary: ${sum}`;
    window.open(`https://wa.me/25722219656?text=${encodeURIComponent(msg)}`);
  };
  return(
    <>
      <button onClick={() => setOpen(!open)} className="fixed bottom-6 right-6 z-40 bg-slate-900 text-white p-4 rounded-full shadow-2xl border border-slate-800 cursor-pointer">
        {open?"✕":"💬"}
      </button>
      {open &&(
        <div className="fixed bottom-24 right-6 z-40 w-96 max-w-[calc(100vw-3rem)] h-[500px] max-h-[calc(100vh-10rem)] bg-slate-950 border border-slate-850 rounded-xl shadow-2xl flex flex-col overflow-hidden text-xs md:text-sm text-slate-200">
          <div className="bg-slate-900 border-b border-slate-850 px-4 py-3 flex items-center justify-between">
            <span className="font-bold text-slate-100">🤖 {t("chat_title")}</span>
            <button onClick={()=>setOpen(false)} className="text-slate-400">✕</button>
          </div>
          <div className="flex-grow overflow-y-auto p-4 space-y-4">
            {msgs.map((m,i)=>(
              <div key={i} className={`flex gap-2 ${m.role==="user"?"justify-end":"justify-start"}`}>
                {m.role==="assistant"&&<span>🤖</span>}
                <div className="space-y-3 max-w-[80%]">
                  <div className={`rounded-lg px-3 py-2 leading-relaxed ${m.role==="user"?"bg-amber-600 text-white rounded-br-none" : "bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-none"}`}>
                    {m.content.split(/\*\*([^*]+)\*\//g).map((p,idx)=>idx%2===1?<strong key={idx} className="font-bold text-amber-500">{p}</strong>:p)}
                  </div>
                  {m.card&&m.ref&&m.sum&&(
                    <div className="bg-slate-900 border border-amber-600/30 rounded-lg p-3 space-y-2">
                      <div className="border-b border-slate-850 pb-1 text-[10px] text-amber-500 font-bold">⚠ {t("chat_escalated_title")}</div>
                      <p className="text-[10px] text-slate-450">{t("timeline_ref")} <span className="text-slate-200 font-bold">{m.ref}</span></p>
                      <button onClick={()=>openWa(m.ref!,m.sum!)} className="w-full bg-emerald-600 text-white text-[11px] py-1 rounded cursor-pointer">{t("chat_wa_continue")} ➔</button>
                      {emailSuccess===m.inqId?(
                        <div className="text-[10px] text-emerald-400 text-center bg-emerald-950/20 py-1 border border-emerald-900/50 rounded">✔ {t("chat_email_success")}</div>
                      ):(
                        <div className="space-y-1 pt-1.5 border-t border-slate-800/50">
                          <span className="text-[9px] text-slate-500 block">{t("chat_email_leave")}</span>
                          <div className="flex gap-1">
                            <input type="email" placeholder={t("chat_email_placeholder")} value={email} onChange={e=>setEmail(e.target.value)} className="bg-slate-950 border border-slate-800 rounded px-2 py-0.5 text-[11px] text-white flex-grow" />
                            <button onClick={()=>handleEmail(m.inqId!)} className="bg-slate-800 text-slate-300 px-2 rounded text-[10px]">{t("chat_email_submit")}</button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {m.role==="user"&&<span>👤</span>}
              </div>
            ))}
            {loading&&<div className="text-slate-555 text-xs">🤖 typing...</div>}
            <div ref={endRef} />
          </div>
          <form onSubmit={handleSend} className="bg-slate-900 border-t border-slate-850 p-2 flex gap-2">
            <input type="text" placeholder={t("chat_placeholder")} value={input} onChange={e=>setInput(e.target.value)} disabled={loading} className="bg-slate-950 border border-slate-850 rounded px-3 py-1.5 text-xs text-white outline-none flex-grow" />
            <button type="submit" disabled={loading||!input.trim()} className="bg-slate-950 text-amber-500 p-2 border border-slate-850 rounded cursor-pointer">➔</button>
          </form>
        </div>
      )}
    </>
  );
}
