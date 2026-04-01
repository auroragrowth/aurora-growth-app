"use client";

import { useState } from "react";

type BillingInterval = "monthly" | "yearly";

export default function UpgradePlansClient() {

  const [billingInterval,setBillingInterval] = useState<BillingInterval>("monthly")

  const prices = {
    core:{monthly:79,yearly:790},
    pro:{monthly:149,yearly:1490},
    elite:{monthly:345,yearly:3450}
  }

  const startCheckout = async(planKey:string)=>{
    const res = await fetch("/api/stripe/checkout",{
      method:"POST",
      headers:{ "Content-Type":"application/json"},
      body:JSON.stringify({planKey,billingInterval})
    })

    const data = await res.json()

    if(data.url){
      window.location.href=data.url
    }
  }

  return(
    <div className="space-y-10">

      <div className="flex gap-4">

        <button
        onClick={()=>setBillingInterval("monthly")}
        className={`px-6 py-2 rounded-full ${billingInterval==="monthly"?"bg-white text-black":"bg-white/10 text-white"}`}>
        Monthly
        </button>

        <button
        onClick={()=>setBillingInterval("yearly")}
        className={`px-6 py-2 rounded-full ${billingInterval==="yearly"?"bg-white text-black":"bg-white/10 text-white"}`}>
        Yearly (Save 20%)
        </button>

      </div>

      <div className="grid md:grid-cols-3 gap-8">

        {Object.entries(prices).map(([plan,price])=>{

          const value = billingInterval==="monthly"?price.monthly:price.yearly

          return(
            <div key={plan}
            className="rounded-2xl border border-white/10 bg-white/5 p-8">

              <h3 className="text-2xl font-semibold capitalize">{plan}</h3>

              <div className="text-4xl font-bold mt-4">
                £{value}
                <span className="text-lg text-slate-400">
                /{billingInterval==="monthly"?"mo":"yr"}
                </span>
              </div>

              <button
              onClick={()=>startCheckout(plan)}
              className="mt-6 w-full py-3 rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 text-white">
              Start {plan}
              </button>

            </div>
          )

        })}

      </div>

    </div>
  )

}
