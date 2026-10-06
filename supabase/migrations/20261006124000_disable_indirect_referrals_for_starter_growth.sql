-- Indirect referral earnings are enabled only for the Pro plan (Rs. 900).
update public.plans
set indirect_referral_pct = 0,
    reward_budget_pkr = round(price_pkr * ad_budget_pct / 100, 0)
where active = true
  and price_pkr in (300, 600);
