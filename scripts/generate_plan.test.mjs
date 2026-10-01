import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import vm from 'node:vm';
import test from 'node:test';

// Test the actual deployed source, stubbing only external dependencies.
const source = readFileSync(new URL('../supabase/functions/generate-plan/index.ts', import.meta.url), 'utf8');
const javascript = stripTypeScriptTypes(source.replace(/^import .*createClient.*\n/, ''));
function runtime(overrides = {}) {
  const context = vm.createContext({ URL, Request, Response, console, ...overrides,
    Deno: { env: { get: () => 'test-only-value' }, serve: handler => { context.handler = handler; } },
  });
  vm.runInContext(javascript + '\nglobalThis.api = { normalizeIngredient, validateDays, buildShoppingItems, responseText, parseResponse, filterPromotions };', context);
  return context;
}
const { api } = runtime();
const plain = value => JSON.parse(JSON.stringify(value));
const ingredient = (name, amount, unit = 'g') => ({ name, amount, unit, category: 'Mięso i ryby', biedronka: true });
const meal = ingredients => ({ name: 'Posiłek', time: '12:00', kcal: 700, protein_g: 40, preparation: 'Ugotuj składniki.', ingredients });
const days = [
  { date: '2026-10-01', meals: [meal([ingredient('Filet z piersi kurczaka', 220)])] },
  { date: '2026-10-02', meals: [meal([ingredient('Filet z łososia', 180)])] },
  { date: '2026-10-03', meals: [meal([ingredient('Ryż biały', 0.12, 'kg')])] },
];
const validated = () => api.validateDays(structuredClone(days), '2026-10-01', 3, 1);
const official = 'https://zakupy.biedronka.pl/polecane/promocje/';
const response = text => ({ status: 'completed', output: [
  { type: 'reasoning', summary: [] },
  { type: 'web_search_call', action: { sources: [{ url: official }] } },
  { type: 'message', content: [{ type: 'output_text', text }] },
] });
const promotion = (changes = {}) => ({ ingredient_name: 'Filet z piersi kurczaka', product: 'Filet z piersi kurczaka 500 g', offer: '12,99 zł', verified: true, source_url: official, valid_from: '2026-10-01', valid_to: '2026-10-03', ...changes });

test('220 g kurczaka i 180 g łososia nie są ponownie mnożone przez 3 dni', () => {
  const items = plain(api.buildShoppingItems(validated()));
  assert.equal(items.find(x => x.name === 'Filet z piersi kurczaka').amount, 220);
  assert.equal(items.find(x => x.name === 'Filet z łososia').amount, 180);
  assert.equal(items.find(x => x.name === 'Ryż biały').amount, 120);
});

test('powtarzane składniki są sumowane, jednostki kg/l normalizowane', () => {
  const input = structuredClone(days);
  input[1].meals[0].ingredients.push(ingredient('filet z piersi kurczaka', 0.1, 'kg'));
  input[2].meals[0].ingredients.push(ingredient('Filet z piersi kurczaka', 50));
  const items = plain(api.buildShoppingItems(api.validateDays(input, '2026-10-01', 3, 1)));
  assert.equal(items.find(x => x.name === 'Filet z piersi kurczaka').amount, 370);
  assert.equal(api.normalizeIngredient(ingredient('Mleko', 0.25, 'l')).amount, 250);
});

test('niezgodne jednostki dla tego samego składnika są odrzucane', () => {
  const input = validated(); input[1].meals[0].ingredients.push(ingredient('Filet z piersi kurczaka', 1, 'szt'));
  assert.throws(() => api.buildShoppingItems(input), /jednostki/);
});

test('niejednoznaczne ilości, alternatywy i produkty spoza Biedronki są odrzucane', () => {
  for (const bad of ['Kurczak — 220 g', ingredient('Kurczak lub indyk', 220), ingredient('Kurczak', 1, 'opak'), ingredient('Kurczak', -1), ingredient('Kurczak', NaN), { ...ingredient('Kurczak', 220), biedronka: false }]) assert.throws(() => api.normalizeIngredient(bad));
});

test('kontrolowana jest liczba dni, posiłków i kolejność dat', () => {
  assert.throws(() => api.validateDays(days, '2026-10-01', 5, 1), /dni/);
  assert.throws(() => api.validateDays(days, '2026-10-01', 3, 2), /posiłków/);
  assert.throws(() => api.validateDays(days, '2026-10-02', 3, 1), /daty/);
  assert.equal(validated()[0].total_kcal, 700);
});

test('parser odczytuje output po narzędziach i reasoning, wspiera fallback', () => {
  assert.deepEqual(plain(api.parseResponse(response('```json\n{"days":[]}\n```'))), { days: [] });
  assert.equal(api.responseText({ output: [{ content: [{ type: 'output_text', text: '{"a":' }, { type: 'output_text', text: '1}' }] }] }), '{"a":1}');
  assert.equal(api.responseText({ output_text: 'fallback' }), 'fallback');
  assert.throws(() => api.parseResponse({ status: 'incomplete', output_text: '{"days":[]}' }), /nie ukończył/);
  assert.throws(() => api.parseResponse(response('Not JSON')));
});

test('pasująca promocja żywności z odwiedzonego oficjalnego źródła zostaje', () => {
  const promos = api.filterPromotions([promotion()], api.buildShoppingItems(validated()), response('{}'), '2026-10-01');
  assert.equal(promos.length, 1);
  assert.equal(promos[0].ingredient_name, 'Filet z piersi kurczaka');
});

test('karma, chemia, niepowiązana żywność i fałszywe przypisanie są usuwane', () => {
  const unrelated = [promotion({ product: 'Sheba karma z kurczaka dla kota' }), promotion({ product: 'Płyn do zmywarki' }), promotion({ ingredient_name: 'Gnocchi', product: 'Gnocchi' }), promotion({ product: 'Milka czekolada' })];
  assert.equal(api.filterPromotions(unrelated, api.buildShoppingItems(validated()), response('{}'), '2026-10-01').length, 0);
});

test('oferty bez źródła, potwierdzenia lub ważnych dat są odrzucane', () => {
  const invalid = [promotion({ verified: false }), promotion({ source_url: 'https://zakupy.biedronka.pl.evil.example/' }), promotion({ source_url: 'https://zakupy.biedronka.pl/nieodwiedzony/' }), promotion({ valid_from: '2026-10-02' }), promotion({ valid_to: '2026-09-30' }), promotion({ valid_to: '2026-02-30' }), promotion({ valid_from: undefined })];
  assert.equal(api.filterPromotions(invalid, api.buildShoppingItems(validated()), response('{}'), '2026-10-01').length, 0);
  assert.equal(api.filterPromotions([promotion()], api.buildShoppingItems(validated()), { output: [] }, '2026-10-01').length, 0);
});

test('endpoint zapisuje wyliczone zakupy, ignoruje shopping_items AI', async () => {
  const saved = {};
  const settings = { goal: 'keep', weight: 70, protein: 2, calories: 2500, mealCount: 1, shopDays: 3 };
  const today = new Date().toISOString().slice(0, 10);
  const generatedDays = structuredClone(days).map((day, index) => {
    const date = new Date(today + 'T00:00:00Z'); date.setUTCDate(date.getUTCDate() + index);
    return { ...day, date: date.toISOString().slice(0, 10) };
  });
  let requestBody;
  const context = runtime({
    createClient: () => ({
      auth: { getUser: async () => ({ data: { user: { id: 'owner' } } }) },
      from: table => ({
        select: () => ({ eq: () => ({ single: async () => ({ data: { settings } }) }) }),
        insert: data => { saved[table] = data; return table === 'meal_plans' ? { select: () => ({ single: async () => ({ data: { ...data, id: 'plan-id' } }) }) } : Promise.resolve({ error: null }); },
      }),
    }),
    fetch: async (_url, request) => {
      requestBody = JSON.parse(request.body);
      return Response.json(response(JSON.stringify({ days: generatedDays, shopping_items: [{ name: 'Filet z piersi kurczaka', amount: 660 }], promotions: [promotion({ product: 'Płyn do zmywarki' })] })));
    },
  });
  const result = await context.handler(new Request('https://example.test', { method: 'POST', headers: { Authorization: 'Bearer test' } }));
  assert.equal(result.status, 200);
  assert.equal(saved.meal_plans.content.schema_version, 2);
  assert.equal(saved.shopping_cycles.plan_id, 'plan-id');
  assert.equal(saved.shopping_cycles.items.find(x => x.name === 'Filet z piersi kurczaka').amount, 220);
  assert.equal(saved.shopping_cycles.items.find(x => x.name === 'Filet z łososia').amount, 180);
  assert.equal(saved.shopping_cycles.promotions.length, 0);
  assert.equal(saved.shopping_cycles.promotion_source_url, null);
  assert.equal(requestBody.include[0], 'web_search_call.action.sources');
  assert.deepEqual(requestBody.tools[0].filters.allowed_domains, ['zakupy.biedronka.pl']);
});

test('UI obsługuje stare tekstowe i nowe mierzalne składniki', () => {
  const html = readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
  const match = html.match(/function formatIngredient\(item\)\{[^\n]+\}/);
  const context = vm.createContext({}); vm.runInContext(match[0], context);
  assert.equal(context.formatIngredient(ingredient('Kurczak', 220)), 'Kurczak — 220 g');
  assert.equal(context.formatIngredient('Kurczak — 220 g'), 'Kurczak — 220 g');
});
