import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Settings = {
  goal: "cut" | "gain" | "keep";
  weight: number;
  calories?: number | string;
  protein: number;
  mealCount: number;
  shopDays: number;
};

function targetKcal(settings: Settings) {
  if (settings.calories) return Number(settings.calories);
  const multiplier = settings.goal === "gain" ? 34 : settings.goal === "cut" ? 28 : 31;
  return Math.max(1200, Math.round(Number(settings.weight) * multiplier));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405, headers: corsHeaders });

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const openAiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openAiKey) return Response.json({ error: "Brakuje sekretu OPENAI_API_KEY w funkcji." }, { status: 503, headers: corsHeaders });

  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return Response.json({ error: "Wymagane jest logowanie." }, { status: 401, headers: corsHeaders });
  const auth = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: { user }, error: userError } = await auth.auth.getUser();
  if (userError || !user) return Response.json({ error: "Nieprawidłowa sesja." }, { status: 401, headers: corsHeaders });

  const admin = createClient(url, serviceRole);
  const { data: profile, error: profileError } = await admin.from("profiles").select("settings").eq("id", user.id).single();
  if (profileError || !profile?.settings) return Response.json({ error: "Najpierw zapisz założenia planu." }, { status: 400, headers: corsHeaders });
  const settings = profile.settings as Settings;
  const kcal = targetKcal(settings);
  const protein = Math.round(Number(settings.weight) * Number(settings.protein));
  const start = new Date(); start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start); end.setUTCDate(start.getUTCDate() + Number(settings.shopDays) - 1);
  const date = (d: Date) => d.toISOString().slice(0, 10);

  const instructions = `Jesteś polskim dietetykiem i planistą zakupów. Wygeneruj plan na ${Number(settings.shopDays)} dni od ${date(start)} do ${date(end)}. Cel: ${settings.goal}; dziennie dokładnie około ${kcal} kcal oraz ${protein} g białka; ${settings.mealCount} posiłków dziennie. Składniki muszą być dostępne w Biedronce. Najpierw użyj narzędzia wyszukiwania, aby sprawdzić aktualne promocje wyłącznie na https://zakupy.biedronka.pl/polecane/promocje/ . Używaj tylko ofert, które udało się zweryfikować w tym źródle; gdy nie udało się znaleźć promocji, zwróć pustą tablicę promotions i pusty URL. Ilości zakupowe policz dla całego cyklu. Zwróć wyłącznie JSON o strukturze {days:[{date,total_kcal,total_protein_g,meals:[{name,time,kcal,protein_g,ingredients,preparation}]}],shopping_items:[{category,name,amount,unit,biedronka}],promotions:[{product,offer,verified}],promotion_source_url:string}.`;
  const aiResponse = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${openAiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-5-mini",
      store: false,
      tools: [{ type: "web_search" }],
      input: instructions,
      text: { format: { type: "json_object" } },
    }),
  });
  if (!aiResponse.ok) {
    const detail = await aiResponse.text();
    console.error("OpenAI API error", aiResponse.status, detail);
    return Response.json({ error: `Generator AI nie odpowiedział. Kod OpenAI: ${aiResponse.status}` }, { status: 502, headers: corsHeaders });
  }
  const response = await aiResponse.json();
  let generated: Record<string, unknown>;
  try { generated = JSON.parse(response.output_text); } catch { return Response.json({ error: "Generator zwrócił nieprawidłowy plan." }, { status: 502, headers: corsHeaders }); }
  if (!Array.isArray(generated.days) || !Array.isArray(generated.shopping_items) || !Array.isArray(generated.promotions)) return Response.json({ error: "Generator zwrócił niepełny plan." }, { status: 502, headers: corsHeaders });

  const { data: plan, error: planError } = await admin.from("meal_plans").insert({
    user_id: user.id, cycle_start: date(start), cycle_end: date(end), target_kcal: kcal,
    target_protein_g: protein, content: { days: generated.days }, model: "gpt-5-mini",
  }).select().single();
  if (planError) return Response.json({ error: "Nie udało się zapisać jadłospisu." }, { status: 500, headers: corsHeaders });
  const { error: shoppingError } = await admin.from("shopping_cycles").insert({
    plan_id: plan.id, user_id: user.id, starts_on: date(start), ends_on: date(end),
    items: generated.shopping_items, promotions: generated.promotions,
    promotion_source_url: generated.promotion_source_url || null,
  });
  if (shoppingError) return Response.json({ error: "Jadłospis zapisano, ale nie listę zakupów." }, { status: 500, headers: corsHeaders });
  return Response.json({ plan }, { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
