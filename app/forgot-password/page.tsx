"use client";

import { FormEvent, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPassword(){

const supabase = useMemo(()=>createClient(),[]);
const [email,setEmail] = useState("");
const [message,setMessage] = useState("");

const resetPassword = async(e:FormEvent<HTMLFormElement>)=>{

e.preventDefault();

await supabase.auth.resetPasswordForEmail(email,{
redirectTo:`${window.location.origin}/reset-password`
});

setMessage("Password reset email sent");

};

return(

<main className="min-h-screen bg-[#020817] text-white flex items-center justify-center">

<div className="w-full max-w-md rounded-[32px] border border-white/10 bg-white/5 backdrop-blur-xl p-10 shadow-2xl">

<h1 className="text-4xl font-bold text-center mb-6">
Reset password
</h1>

<form onSubmit={resetPassword} className="space-y-6">

<input
type="email"
required
placeholder="Email address"
value={email}
onChange={(e)=>setEmail(e.target.value)}
className="w-full rounded-full border border-white/10 bg-white/10 px-6 py-4 text-lg text-white"
/>

<button className="w-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-500 px-6 py-4 text-lg font-semibold text-white">

Send reset link

</button>

</form>

{message && (
<p className="mt-6 text-center text-green-400">
{message}
</p>
)}

</div>

</main>

);

}
