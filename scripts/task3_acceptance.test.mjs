import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { task3Fixture } from './fixtures/task3.mjs';

const html = readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
const names = ['goalName', 'targetKcal', 'targetProtein', 'scaleAmount', 'scaleIngredient', 'buildPlan', 'formatIngredient', 'todayDate', 'selectedDayIndex', 'escapeHtml', 'mealIcon', 'mealImage', 'macroNumber', 'macroText', 'localPlanFromRemote', 'currentPlan', 'renderDay', 'renderDashboard'];
const functions = html.split('\n').filter(line => names.some(name => line.startsWith(`function ${name}(`))).join('\n');
const demoMeals = html.slice(html.indexOf('const meals=['),html.indexOf('const defaultSettings='));
const planShares = html.split('\n').find(line => line.startsWith('const planShares='));
const dayChange = html.split('\n').find(line => line.startsWith('$("#planDaySelect").addEventListener'));

// Lightweight select semantics; browser tests independently verify these scenarios.
class Element {
  textContent = ''; disabled = false; value = ''; listeners = {}; markup = '';
  set innerHTML(value) {
    this.markup = value;
    if (value.startsWith('<option')) {
      const options = [...value.matchAll(/<option(?: value=['"]([^'"]+)['"])?\s*(selected)?[^>]*>([^<]*)<\/option>/g)];
      const selected = options.find(option => option[2]) ?? options[0];
      this.value = selected?.[1] ?? selected?.[3] ?? '';
    }
  }
  get innerHTML() { return this.markup; }
  addEventListener(name, listener) { this.listeners[name] = listener; }
}

function harness(scenario = 'normal') {
  const fixture = task3Fixture(scenario);
  const elements = {};
  const NativeDate = Date;
  class TestDate extends NativeDate {
    constructor(...args) { super(...(args.length ? args : ['2026-10-01T12:00:00Z'])); }
    static now() { return Date.parse('2026-10-01T12:00:00Z'); }
  }
  const context = vm.createContext({ Date:TestDate,
    remotePlan:fixture.plan,
    state:{goal:'keep', weight:70, protein:2, calories:2200, mealCount:4, shopDays:3, selectedPlanDay:fixture.selectedIndex},
    $: selector => elements[selector] ??= new Element(),
  });
  vm.runInContext(demoMeals + '\n' + planShares + '\n' + functions + '\n' + dayChange, context);
  return { elements, fixture, context, run: code => vm.runInContext(code, context) };
}

test('K1: lista zawiera wszystkie posiłki wybranego dnia', () => {
  const h = harness(); h.run('renderDay()');
  for (const meal of h.fixture.plan.content.days[0].meals) assert.ok(h.elements['#mealDetails'].innerHTML.includes(meal.name));
  assert.equal((h.elements['#mealDetails'].innerHTML.match(/class='card meal-detail'/g)||[]).length, 2);
});

test('K1/K6: zmiana dnia zdarzeniem change aktualizuje dania, datę i sumy', () => {
  const h = harness(); h.run('renderDay()');
  for (const index of [1,2,0]) {
    h.elements['#planDaySelect'].listeners.change({target:{value:String(index)}});
    assert.equal(h.run('currentPlan().date'), h.fixture.plan.content.days[index].date);
    assert.ok(h.elements['#mealDetails'].innerHTML.includes(h.fixture.plan.content.days[index].meals[0].name));
    assert.equal(h.elements['#planDaySelect'].value, String(index));
    assert.equal(h.elements['#dayTotals'].textContent, '950 kcal · 65 g białka · 30 g tłuszczu · 80 g węglowodanów');
  }
});

test('K2: kalorie i białko są widoczne przy każdym posiłku oraz w sumie', () => {
  const h = harness(); h.run('renderDay()');
  for (const text of ['650 kcal','45 g białka','300 kcal','20 g białka']) assert.ok(h.elements['#mealDetails'].innerHTML.includes(text));
  assert.equal(h.elements['#dayTotals'].textContent,'950 kcal · 65 g białka · 30 g tłuszczu · 80 g węglowodanów');
});

test('K2 rozszerzone: widoczne są także tłuszcze i węglowodany (interpretacja pełnego makro)', () => {
  const h = harness(); h.run('renderDay()');
  assert.match(h.elements['#mealDetails'].innerHTML,/tłuszcz|fat_g/i);
  assert.match(h.elements['#mealDetails'].innerHTML,/węglowodan|carbs_g/i);
});

test('K3: posiłki AI mają ilustracje produktów lub kategorii, nie jedną ikonę talerza', () => {
  const h = harness(); h.run('renderDay()');
  const icons = h.run('currentPlan().meals.map(meal=>meal.icon)');
  assert.ok(icons.some(icon => icon !== '🍽️') || /<img\b|<svg\b/.test(h.elements['#mealDetails'].innerHTML), 'Brak ilustracji produktów/kategorii dla planu AI');
});

test('K4: ilości składników mają nazwy, liczby i jednostki g/ml/szt', () => {
  const h = harness(); h.run('renderDay()');
  for (const text of ['Filet z piersi kurczaka — 220 g','Ryż biały — 80 g','Oliwa z oliwek — 10 ml','Jaja — 2 szt']) assert.ok(h.elements['#mealDetails'].innerHTML.includes(text));
});

test('K4: starszy format tekstowy pozostaje czytelny', () => {
  const h = harness(); h.context.remotePlan.content.days[0].meals[0].ingredients = ['Kurczak — 220 g'];
  h.run('renderDay()'); assert.ok(h.elements['#mealDetails'].innerHTML.includes('Kurczak — 220 g'));
});

test('K5: każdy posiłek zawiera krótką instrukcję przygotowania', () => {
  const h = harness(); h.run('renderDay()');
  for (const meal of h.fixture.plan.content.days[0].meals) assert.ok(h.elements['#mealDetails'].innerHTML.includes(meal.preparation));
});

test('K6: po skróceniu planu lista wyboru i posiłki wskazują ten sam dzień', () => {
  const h = harness('short'); h.run('renderDay()');
  const index = Number(h.elements['#planDaySelect'].value);
  assert.equal(h.run('currentPlan().date'),h.fixture.plan.content.days[index].date);
});

test('K6: ujemny zapisany indeks dnia nadal pokazuje prawidłowy dzień planu AI', () => {
  const h = harness('negative'); assert.doesNotThrow(()=>h.run('renderDay()'));
  assert.equal(h.run('currentPlan().date'),h.fixture.plan.content.days[0].date);
});

test('K6: Dzisiejsze posiłki pokazują dzisiejszą datę, nie pierwszy dzień cyklu', () => {
  const h = harness(); h.run('renderDashboard()');
  const today = h.fixture.plan.content.days.find(day=>day.date==='2026-10-01');
  assert.ok(h.elements['#todayList'].innerHTML.includes(today.meals[0].name),'Dashboard pokazuje 30 września zamiast 1 października');
});

test('nagłówek Dzisiaj nie zawiera daty wpisanej na stałe', () => {
  assert.ok(!html.includes('Dzisiaj, 30 września'),'Nagłówek daty jest stały');
});

test('stare plany nie dostają wymyślonych zer dla brakujących makroskładników',()=>{
 const h=harness();for(const meal of h.context.remotePlan.content.days[0].meals){delete meal.fat_g;delete meal.carbs_g}
 h.run('renderDay()');assert.match(h.elements['#mealDetails'].innerHTML,/brak danych o tłuszczach/);
 assert.match(h.elements['#dayMacroNotice'].textContent,/Starszy plan/);assert.ok(!h.elements['#dayTotals'].textContent.includes('g tłuszczu'));
});
test('indeks niecałkowity lub niepoprawny nie rozdziela dat selektora i dań',()=>{
 for(const index of [1.7,'bad',undefined,999]){
  const h=harness();h.context.state.selectedPlanDay=index;h.run('renderDay()');
  const selected=Number(h.elements['#planDaySelect'].value);
  assert.equal(h.run('currentPlan().date'),h.fixture.plan.content.days[selected].date);
 }
});
test('dashboard bez dzisiejszego dnia nie przedstawia innego dnia jako dzisiejszy',()=>{
 const h=harness();h.context.remotePlan.content.days=h.context.remotePlan.content.days.filter(day=>day.date!=='2026-10-01');
 h.run('renderDashboard()');assert.match(h.elements['#todayList'].innerHTML,/Brak jadłospisu na dzisiaj/);
});
test('treść posiłku i składników jest kodowana przed wstawieniem do HTML',()=>{
 const h=harness();h.context.remotePlan.content.days[0].meals[0].name='<img src=x onerror=bad()>';
 h.context.remotePlan.content.days[0].meals[0].ingredients=['<script>bad()</script>'];h.run('renderDay()');
 assert.ok(!h.elements['#mealDetails'].innerHTML.includes('<img src=x'));
 assert.ok(h.elements['#mealDetails'].innerHTML.includes('&lt;script&gt;'));
 assert.match(h.elements['#mealDetails'].innerHTML,/<svg role='img'/);
});
