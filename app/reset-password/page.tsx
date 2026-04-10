"use client";

import { useMemo,useState,FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function ResetPassword(){

const router = useRouter();
const supabase = useMemo(()=>createClient(),[]);

const [password,setPassword] = useState("");
const [message,setMessage] = useState("");

const updatePassword = async(e:FormEvent<HTMLFormElement>)=>{

e.preventDefault();

const { error } = await supabase.auth.updateUser({
password
});

if(!error){
setMessage("Password updated");
fetch("/api/auth/password-changed", { method: "POST" }).catch(() => {});
setTimeout(()=>router.push("/login"),1500);
}

};

return(

<main className="min-h-screen bg-[#020817] text-white flex items-center justify-center">

<div className="w-full max-w-md rounded-[32px] border border-white/10 bg-white/5 backdrop-blur-xl p-10 shadow-2xl">

<h1 className="text-4xl font-bold text-center mb-6">
Set new password
</h1>

<form onSubmit={updatePassword} className="space-y-6">

<input
type="password"
required
placeholder="New password"
value={password}
onChange={(e)=>setPassword(e.target.value)}
className="w-full rounded-full border border-white/10 bg-white/10 px-6 py-4 text-lg text-white"
/>

<button className="w-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-500 px-6 py-4 text-lg font-semibold text-white">

Update password

</button>

</form>

{message && (
<p className="mt-6 text-green-400 text-center">
{message}
</p>
)}

</div>

</main>

);

}
