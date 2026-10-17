# Treningi tygodniowo — zadanie #5

## Zachowanie

W ustawieniach planu dostępne jest pole `trainingsPerWeek`: liczba od 0 do 14,
co 0,5. Połówki pozwalają zapisać średnią z kilku tygodni. Pole jest wymagane;
stare profile bez pola oraz z `null` są interpretowane jako 0 treningów.
Wartość jest zapisywana lokalnie w `forma-settings` i w JSONB
`profiles.settings` razem z pozostałymi założeniami. Nie wymaga migracji SQL.

Podgląd celu reaguje na zmianę treningów, wagi, celu i ręcznych kalorii.
Zapis nie przepisuje historycznych planów AI: trzeba wygenerować nowy plan.
Generator pobiera zapisane ustawienia z profilu, a nie wyliczenia klienta.
Nieudana synchronizacja blokuje nowe wywołanie generatora, aby nie użył starych
założeń. Formularz informuje wówczas o zapisie wyłącznie lokalnym.

## Jawny model szacunkowy

Zadanie nie określa czasu, rodzaju ani intensywności treningu. Przyjmujemy
produktowe uproszczenie: sesja trwa 60 minut i odpowiada umiarkowanemu
treningowi siłowemu 3,5 MET. Wartość 3,5 MET pochodzi z pozycji 02054
[2024 Adult Compendium](https://pacompendium.com/wp-content/uploads/2024/02/1_2024-adult-compendium_1_2024.pdf).
Nie jest to indywidualny pomiar ani zwalidowany model całkowitego zapotrzebowania.

Orientacyjny dodatkowy wydatek ponad spoczynek jednej sesji to
`(3,5 - 1) × waga × 1 godzina`, czyli `2,5 × waga`. Rozkładamy go na tydzień:

```text
baza = waga × (redukcja: 28, utrzymanie: 31, budowa mięśni: 34)
dodatek dzienny = waga × 2,5 × trainingsPerWeek / 7
kalorie automatyczne = max(1500, round(baza + dodatek dzienny))
```

To rozszerzenie dotychczasowej heurystyki MVP, nie wyliczenie BMR/TDEE.
Próg 1500 jest technicznym ograniczeniem odziedziczonym z interfejsu, a nie
uniwersalnym zaleceniem żywieniowym. Ujednolicono z nim wcześniejszy próg
1200 w funkcji Edge. Dla niskiej masy ciała minimalny próg może zamaskować
różnicę między małymi liczbami treningów. Wiek, wzrost, aktywność pozatreningowa
i rzeczywisty czas/intensywność nie są uwzględniane. Białko pozostaje `waga × g/kg`.

Ręcznie podana kaloryczność ma pierwszeństwo: treningi są nadal zapisywane,
ale nie podnoszą ręcznego celu. Formularz mówi o tym wprost.
Przykład: 70 kg, utrzymanie, automatycznie: 0 treningów = 2170 kcal,
3 treningi = 2245 kcal, 7 treningów = 2345 kcal. Z ręcznym celem 2000 kcal
każdy z tych przypadków zachowuje 2000 kcal.

## Sprawdzenie i wdrożenie

- `node --test scripts/training_settings.test.mjs` sprawdza formularz,
  zapis/odczyt lokalny i chmurowy na atrapach, nieudany zapis, starsze profile,
  walidację oraz docelowe kalorie przekazane przez endpoint do AI i do bazy.
- Porównuje obliczenia UI i Edge dla 3 celów, 5 wag, 29 wartości treningów
  i 3 ustawień kalorii (1305 kombinacji).
- `scripts/serve_training_tests.mjs` udostępnia izolowany interfejs na porcie
  4175 bez konfiguracji Supabase i bez wywołań AI. Pozwala sprawdzić mobile
  (`/device?width=390`) i desktop (`/device?width=1440`).
- CI uruchamia testy nowej funkcji i istniejące testy regresji.
- Frontend wdraża się przez GitHub Pages, a `generate-plan` wymaga osobnego
  wdrożenia źródła `supabase/functions/generate-plan/index.ts` do Supabase.
  Do czasu wdrożenia obu części obliczenia produkcyjne mogą być niespójne.
- Test z rzeczywistym zalogowaniem i płatnym generowaniem AI nie jest częścią
  testów izolowanych. Zgodnie z wcześniejszą prośbą pozostaje do osobnej sesji.
