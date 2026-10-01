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

type Ingredient = { name: string; category: string; amount: number; unit: string; biedronka: boolean };
type Meal = { name: string; time: string; kcal: number; protein_g: number; fat_g: number; carbs_g: number; ingredients: Ingredient[]; preparation: string };
type PlanDay = { date: string; total_kcal: number; total_protein_g: number; total_fat_g: number; total_carbs_g: number; meals: Meal[] };
type Promotion = { ingredient_name: string; product: string; offer: string; verified: boolean; source_url: string; valid_from: string; valid_to: string };
type AiResponse = { status?: string; output_text?: string; output?: Array<{ type?: string; content?: Array<{ type?: string; text?: string; annotations?: Array<{ url?: string }> }>; action?: { sources?: Array<{ url?: string }> } }>; incomplete_details?: { reason?: string } };

function normalizedName(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ł/g, "l").replace(/[^a-z0-9]+/g, " ").trim();
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Nieprawidłowy obiekt planu.");
  return value as Record<string, unknown>;
}

function textField(value: unknown, label: string) {
  if (typeof value !== "string" || !value.trim() || value.length > 500) throw new Error(`Nieprawidłowe pole: ${label}.`);
  return value.trim();
}

function numericField(value: unknown, allowZero = false) {
  if (typeof value !== "number" || !Number.isFinite(value) || (allowZero ? value < 0 : value <= 0)) throw new Error("Nieprawidłowa ilość lub wartość odżywcza.");
  return value;
}

function roundAmount(value: number) { return Math.round(value * 1000) / 1000; }

function normalizeIngredient(value: unknown): Ingredient {
  const item = record(value);
  const name = textField(item.name, "nazwa składnika");
  if (!normalizedName(name)) throw new Error("Nieprawidłowa nazwa składnika.");
  if (/\b(lub|albo|opcjonalnie)\b|\//i.test(name)) throw new Error("Składnik musi wskazywać jeden konkretny produkt, bez alternatyw.");
  const units: Record<string, [string, number]> = { g: ["g", 1], kg: ["g", 1000], ml: ["ml", 1], l: ["ml", 1000], szt: ["szt", 1], "szt.": ["szt", 1] };
  const unitName = typeof item.unit === "string" ? item.unit.toLowerCase().trim() : "";
  const unit = Object.hasOwn(units, unitName) ? units[unitName] : undefined;
  if (!unit) throw new Error("Ilość składnika musi być wyrażona w g, kg, ml, l lub szt.");
  if (item.biedronka !== true) throw new Error("Składnik nie został oznaczony jako dostępny w Biedronce.");
  const amount = roundAmount(numericField(item.amount) * unit[1]);
  if (amount <= 0) throw new Error("Ilość składnika jest zbyt mała.");
  return { name, category: textField(item.category, "kategoria"), amount, unit: unit[0], biedronka: true };
}

function validateDays(value: unknown, start: string, dayCount: number, mealCount: number): PlanDay[] {
  if (!Array.isArray(value) || value.length !== dayCount) throw new Error("Nieprawidłowa liczba dni jadłospisu.");
  return value.map((entry, index) => {
    const day = record(entry);
    const expected = new Date(start + "T00:00:00Z"); expected.setUTCDate(expected.getUTCDate() + index);
    if (day.date !== expected.toISOString().slice(0, 10)) throw new Error("Nieprawidłowe daty jadłospisu.");
    if (!Array.isArray(day.meals) || day.meals.length !== mealCount) throw new Error("Nieprawidłowa liczba posiłków.");
    const meals = day.meals.map((entry): Meal => {
      const meal = record(entry);
      if (!Array.isArray(meal.ingredients) || !meal.ingredients.length) throw new Error("Brak mierzalnych składników posiłku.");
      return {
        name: textField(meal.name, "nazwa posiłku"), time: textField(meal.time, "godzina"),
        kcal: numericField(meal.kcal), protein_g: numericField(meal.protein_g, true),
        fat_g: numericField(meal.fat_g, true), carbs_g: numericField(meal.carbs_g, true),
        ingredients: meal.ingredients.map(normalizeIngredient), preparation: textField(meal.preparation, "przygotowanie"),
      };
    });
    return { date: day.date as string, meals, total_kcal: roundAmount(meals.reduce((sum, meal) => sum + meal.kcal, 0)), total_protein_g: roundAmount(meals.reduce((sum, meal) => sum + meal.protein_g, 0)), total_fat_g: roundAmount(meals.reduce((sum, meal) => sum + meal.fat_g, 0)), total_carbs_g: roundAmount(meals.reduce((sum, meal) => sum + meal.carbs_g, 0)) };
  });
}

// Ingredients already represent individual meals on specific days. Never multiply by shopDays again.
function buildShoppingItems(days: PlanDay[]): Ingredient[] {
  const items = new Map<string, Ingredient>();
  const units = new Map<string, string>();
  for (const day of days) for (const meal of day.meals) for (const ingredient of meal.ingredients) {
    const key = normalizedName(ingredient.name);
    if (units.has(key) && units.get(key) !== ingredient.unit) throw new Error("Ten sam składnik ma niezgodne jednostki.");
    units.set(key, ingredient.unit);
    const existing = items.get(key);
    if (existing) existing.amount = roundAmount(existing.amount + ingredient.amount);
    else items.set(key, { ...ingredient });
  }
  return [...items.values()];
}

function responseText(response: AiResponse) {
  const text = (Array.isArray(response.output) ? response.output : [])
    .flatMap(item => Array.isArray(item.content) ? item.content : [])
    .filter(part => part.type === "output_text" && typeof part.text === "string")
    .map(part => part.text).join("");
  return text || (typeof response.output_text === "string" ? response.output_text : "");
}

function parseResponse(response: AiResponse) {
  if (response.status !== "completed") throw new Error("Generator AI nie ukończył odpowiedzi. Spróbuj ponownie.");
  const output = responseText(response).trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const start = output.indexOf("{"); const end = output.lastIndexOf("}");
  return record(JSON.parse(start >= 0 && end >= start ? output.slice(start, end + 1) : output));
}

function officialSource(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname !== "zakupy.biedronka.pl" || url.username || url.password || url.port) return null;
    url.hash = "";
    return url.href;
  } catch { return null; }
}

function filterPromotions(value: unknown, items: Ingredient[], response: AiResponse, shoppingDate: string): Promotion[] {
  if (!Array.isArray(value)) return [];
  const sources = new Set((Array.isArray(response.output) ? response.output : []).flatMap(item => [
    ...(item.action?.sources ?? []).map(source => source.url),
    ...(item.content ?? []).flatMap(part => (part.annotations ?? []).map(annotation => annotation.url)),
  ]).map(officialSource).filter(Boolean));
  const catalog = new Map(items.map(item => [normalizedName(item.name), item]));
  const kept = new Map<string, Promotion>();
  for (const entry of value) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const promo = entry as Promotion;
    if (promo.verified !== true || typeof promo.ingredient_name !== "string" || typeof promo.product !== "string" || typeof promo.offer !== "string" || !promo.offer.trim()) continue;
    const ingredient = catalog.get(normalizedName(promo.ingredient_name));
    const source = officialSource(promo.source_url);
    if (!ingredient || !source || !sources.has(source)) continue;
    const product = normalizedName(promo.product);
    // Reject non-food, even if the model incorrectly links it to a food ingredient.
    if (/\b(karma|karmy|kot[a-z]*|psow|psa|szampon|rekawic[a-z]*|zmywar[a-z]*|plyn|nablyszcz[a-z]*|detergent|prani[a-z]*|mydl[a-z]*)\b/.test(product)) continue;
    const generic = new Set(["filet", "piersi", "mieso", "sosie", "wlasnym", "naturalny", "produkt", "napoj", "suchy", "bialy", "poltlusty", "pelnoziarnisty"]);
    const words = normalizedName(ingredient.name).split(" ").filter(word => word.length >= 3 && !generic.has(word));
    if (!words.length || !words.every(word => product.split(" ").some(token => token.startsWith(word.slice(0, Math.max(Math.min(4, word.length), word.length - 2)))))) continue;
    const validDate = (date: unknown) => typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date;
    if (!validDate(promo.valid_from) || !validDate(promo.valid_to) || promo.valid_from > shoppingDate || promo.valid_to < shoppingDate) continue;
    kept.set(normalizedName(promo.product), { ...promo, ingredient_name: ingredient.name, source_url: source });
  }
  return [...kept.values()];
}

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
  if (!Number.isInteger(Number(settings.shopDays)) || Number(settings.shopDays) < 1 || Number(settings.shopDays) > 14 || !Number.isInteger(Number(settings.mealCount)) || Number(settings.mealCount) < 1 || Number(settings.mealCount) > 6) return Response.json({ error: "Nieprawidłowa liczba dni lub posiłków." }, { status: 400, headers: corsHeaders });
  const kcal = targetKcal(settings);
  const protein = Math.round(Number(settings.weight) * Number(settings.protein));
  const start = new Date(); start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start); end.setUTCDate(start.getUTCDate() + Number(settings.shopDays) - 1);
  const date = (d: Date) => d.toISOString().slice(0, 10);

  const instructions = `Wygeneruj polski jadłospis na ${Number(settings.shopDays)} dni od ${date(start)} do ${date(end)}. Cel: ${settings.goal}; dziennie około ${kcal} kcal oraz ${protein} g białka; dokładnie ${settings.mealCount} posiłków dziennie.
Składniki muszą być dostępne w Biedronce. Każdy składnik to obiekt {name,category,amount,unit,biedronka:true}. amount to liczba oznaczająca ilość DLA JEDNEGO POSIŁKU, nie całego cyklu. unit wyłącznie g, kg, ml, l lub szt. Wagi dotyczą części jadalnych (dla konserw po odsączeniu, dla ryżu i makaronu przed gotowaniem). Używaj zawsze tej samej konkretnej polskiej nazwy i jednostki dla danego składnika we wszystkich posiłkach. Bez alternatyw, ukośników, opcjonalnych składników, łyżek, porcji i opakowań; np. oliwa w ml, przyprawy w g, chleb w g. NIE twórz shopping_items: serwer sam zsumuje składniki wszystkich dni.
Sprawdź aktualne promocje na https://zakupy.biedronka.pl/polecane/promocje/ i wykorzystaj pasujące produkty w posiłkach. promotions ma zawierać WYŁĄCZNIE oferty żywności użytej w jadłospisie. Każda oferta musi zawierać ingredient_name identyczne z name odpowiedniego składnika, product (pełna nazwa produktu sklepu), offer, verified:true, source_url (odwiedzony oficjalny URL), valid_from i valid_to (YYYY-MM-DD). Musi być ważna w dniu zakupów ${date(start)}. Bez potwierdzenia źródła i dat zwróć pustą tablicę, nie zgaduj. Nie dodawaj chemii, kosmetyków ani karmy.
Podaj dla każdego posiłku szacunkowe kcal, protein_g, fat_g (tłuszcze) i carbs_g (węglowodany), liczby nieujemne, dla podanych ilości składników. Pole preparation ogranicz do jednego krótkiego zdania. Zwróć wyłącznie jeden obiekt JSON bez Markdown, cytowań ani tekstu poza JSON: {"days":[{"date":"YYYY-MM-DD","meals":[{"name":"...","time":"08:00","kcal":700,"protein_g":40,"fat_g":20,"carbs_g":90,"ingredients":[{"name":"Filet z piersi kurczaka","category":"Mięso i ryby","amount":220,"unit":"g","biedronka":true}],"preparation":"..."}]}],"promotions":[{"ingredient_name":"Filet z piersi kurczaka","product":"...","offer":"...","verified":true,"source_url":"https://zakupy.biedronka.pl/...","valid_from":"YYYY-MM-DD","valid_to":"YYYY-MM-DD"}]}.`;
  const aiResponse = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${openAiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-5-mini",
      store: false,
      reasoning: { effort: "low" },
      max_output_tokens: 16000,
      tools: [{ type: "web_search", filters: { allowed_domains: ["zakupy.biedronka.pl"] } }],
      tool_choice: "required",
      include: ["web_search_call.action.sources"],
      input: instructions,
    }),
  });
  if (!aiResponse.ok) {
    const detail = await aiResponse.text();
    console.error("OpenAI API error", aiResponse.status, detail);
    if (aiResponse.status === 429) {
      const quotaExceeded = /insufficient_quota|billing_hard_limit_reached/i.test(detail);
      const error = quotaExceeded
        ? "Brak dostępnego limitu API OpenAI. Doładuj środki lub zwiększ limit rozliczeniowy w panelu OpenAI."
        : "Osiągnięto chwilowy limit zapytań OpenAI. Odczekaj minutę i spróbuj ponownie.";
      return Response.json({ error }, { status: 429, headers: corsHeaders });
    }
    return Response.json({ error: `Generator AI nie odpowiedział. Kod OpenAI: ${aiResponse.status}` }, { status: 502, headers: corsHeaders });
  }
  const response: AiResponse = await aiResponse.json();
  let days: PlanDay[], shoppingItems: Ingredient[], promotions: Promotion[];
  try {
    const generated = parseResponse(response);
    days = validateDays(generated.days, date(start), Number(settings.shopDays), Number(settings.mealCount));
    shoppingItems = buildShoppingItems(days);
    promotions = filterPromotions(generated.promotions, shoppingItems, response, date(start));
  } catch (error) {
    console.error("Invalid AI meal plan", error instanceof Error ? error.message : "Unknown validation error");
    return Response.json({ error: "Generator zwrócił nieprawidłowy plan: " + (error instanceof Error && !(error instanceof SyntaxError) ? error.message : "Nie udało się odczytać JSON.") }, { status: 502, headers: corsHeaders });
  }

  const { data: plan, error: planError } = await admin.from("meal_plans").insert({
    user_id: user.id, cycle_start: date(start), cycle_end: date(end), target_kcal: kcal,
    target_protein_g: protein, content: { schema_version: 3, days }, model: "gpt-5-mini",
  }).select().single();
  if (planError) return Response.json({ error: "Nie udało się zapisać jadłospisu." }, { status: 500, headers: corsHeaders });
  const { error: shoppingError } = await admin.from("shopping_cycles").insert({
    plan_id: plan.id, user_id: user.id, starts_on: date(start), ends_on: date(end),
    items: shoppingItems, promotions,
    promotion_source_url: promotions.length ? promotions[0].source_url : null,
  });
  if (shoppingError) return Response.json({ error: "Jadłospis zapisano, ale nie listę zakupów." }, { status: 500, headers: corsHeaders });
  return Response.json({ plan }, { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
