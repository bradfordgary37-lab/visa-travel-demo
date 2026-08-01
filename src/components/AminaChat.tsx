"use client";
import React,{useState,useRef,useEffect} from "react";
import {useLanguage} from "@/context/LanguageContext";
import {useDemoClock} from "@/context/DemoClockContext";
import {supabase} from "@/lib/supabase";

export default function AminaChat(){
  const {locale:l}=useLanguage(), {getSimulatedTime:gt}=useDemoClock();
  const [open,setOpen]=useState(false),[msgs,setMsgs]=useState<any[]>([]),[input,setInput]=useState(""),[loading,setLoading]=useState(false),[sid,setSid]=useState("");
  const [email,setEmail]=useState(""),[success,setSuccess]=useState("");
  const endRef=useRef<HTMLDivElement>(null), fr=l==="fr";

  useEffect(()=>{setSid(`c-${Math.floor(Math.random()*9000)}`);},[]);
  useEffect(()=>{setMsgs([{role:"assistant",content:fr?"Bonjour! Comment puis-je vous aider?":"Hello! How can I help you?"}]);},[l]);
  useEffect(()=>{endRef.current?.scrollIntoView();},[msgs,loading]);

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
        body:JSON.stringify({message:txt,history:upd.slice(1,-1),locale:l,sessionId:sid,isAfterHours:gt().isAfterHours})
      });
      const d=await res.json();
      setMsgs(prev=>[...prev,d.escalated?{role:"assistant",content:d.message,card:true,ref:d.reference,sum:d.summary,inqId:d.inquiryId}:{role:"assistant",content:d.message}]);
    }catch{
      setMsgs(prev=>[...prev,{role:"assistant",content:"Error. Try again."}]);
    }finally{setLoading(false);}
  };

  const handleEmail=(inqId:string)=>{
    if(email.includes("@"))supabase.from("inquiries").update({email:email.trim()}).eq("id",inqId).then(()=>setSuccess(inqId));
  };

  const openWa=(ref:string,sum:string)=>{
    const msg=fr?`Bonjour, suite à ma demande. Réf: ${ref}. Résumé: ${sum}`:`Hello, following up on request. Ref: ${ref}. Summary: ${sum}`;
    window.open(`https://wa.me/25722219656?text=${encodeURIComponent(msg)}`);
  };

  return(
    <>
      <button onClick={()=>setOpen(!open)} className="fixed bottom-6 right-6 z-40 bg-slate-900 text-white p-4 rounded-full border border-slate-800 cursor-pointer">
        {open?"✕":"💬"}
      </button>
      {open &&(
        <div className="fixed bottom-24 right-6 z-40 w-96 max-w-[calc(100vw-3rem)] h-[500px] bg-slate-950 border border-slate-850 rounded-xl flex flex-col overflow-hidden text-xs text-slate-200">
          <div className="bg-slate-900 border-b border-slate-850 px-4 py-3 flex items-center justify-between">
            <span className="font-bold">🤖 Amina</span>
            <button onClick={()=>setOpen(false)} className="text-slate-400">✕</button>
          </div>
          <div className="flex-grow overflow-y-auto p-4 space-y-4">
            {msgs.map((m,i)=>(
              <div key={i} className={`flex gap-2 ${m.role==="user"?"justify-end":"justify-start"}`}>
                {m.role==="assistant"&&<span>🤖</span>}
                <div className="space-y-2 max-w-[80%]">
                  <div className={`rounded-lg px-3 py-2 leading-relaxed ${m.role==="user"?"bg-amber-600 text-white":"bg-slate-900 border border-slate-800"}`}>
                    {m.content.split(/\*\*([^*]+)\*\//g).map((p: string, idx: number)=>idx%2===1?<strong key={idx} className="font-bold text-amber-500">{p}</strong>:p)}
                  </div>
                  {m.card&&m.ref&&m.sum&&(
                    <div className="bg-slate-900 border border-amber-600/30 rounded-lg p-3 space-y-2">
                      <div className="text-[10px] text-amber-500 font-bold">⚠ {fr?"Demande Transmise":"Request Escalated"}</div>
                      <p className="text-[10px] text-slate-450">{fr?"Réf :":"Ref:"} <span className="text-slate-200 font-bold">{m.ref}</span></p>
                      <button onClick={()=>openWa(m.ref!,m.sum!)} className="w-full bg-emerald-600 text-white text-[11px] py-1 rounded cursor-pointer">{fr?"Continuer sur WhatsApp":"Continue on WhatsApp"}</button>
                      {success===m.inqId?(
                        <div className="text-[10px] text-emerald-400 text-center bg-emerald-950/20 py-1 rounded">✔ {fr?"Email enregistré":"Email saved"}</div>
                      ):(
                        <div className="space-y-1 pt-1.5 border-t border-slate-800/50">
                          <span className="text-[9px] text-slate-500 block">{fr?"Laissez votre email":"Leave your email"}</span>
                          <div className="flex gap-1">
                            <input type="email" placeholder="email@domain.com" value={email} onChange={e=>setEmail(e.target.value)} className="bg-slate-950 border border-slate-800 rounded px-2 py-0.5 text-white flex-grow" />
                            <button onClick={()=>handleEmail(m.inqId!)} className="bg-slate-850 text-slate-300 px-2 rounded text-[10px]">{fr?"Envoyer":"Submit"}</button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading&&<div className="text-slate-555 text-xs">🤖 typing...</div>}
            <div ref={endRef} />
          </div>
          <form onSubmit={handleSend} className="bg-slate-900 border-t border-slate-850 p-2 flex gap-2">
            <input type="text" placeholder={fr?"Posez votre question...":"Ask your question..."} value={input} onChange={e=>setInput(e.target.value)} disabled={loading} className="bg-slate-950 border border-slate-850 rounded px-3 py-1 text-xs text-white outline-none flex-grow" />
            <button type="submit" disabled={loading||!input.trim()} className="bg-slate-950 text-amber-500 p-2 border border-slate-850 rounded cursor-pointer">➔</button>
          </form>
        </div>
      )}
    </>
  );
}
