# Generator jadłospisu AI

Generator działa jako Supabase Edge Function `generate-plan`. Przeglądarka nie
zna klucza OpenAI: wysyła wyłącznie żądanie do funkcji wraz z sesją zalogowanego
użytkownika.

## Jednorazowe wdrożenie

1. W Supabase SQL Editor uruchom cały plik
   `supabase/migrations/20261001_ai_meal_plans.sql`.
2. W **Edge Functions** utwórz funkcję o nazwie `generate-plan` i wklej zawartość
   `supabase/functions/generate-plan/index.ts`.
3. W **Edge Functions → Secrets** dodaj `OPENAI_API_KEY`. Nie wpisuj klucza do
   plików w `dist/`, ustawień przeglądarki ani do sekretów dostępnych dla Pages.
4. Wdróż funkcję z repozytorium, zachowując dotychczasową konfigurację JWT.
   Funkcja dodatkowo zawsze weryfikuje sesję przez `auth.getUser()`.

Zmienne `SUPABASE_URL`, `SUPABASE_ANON_KEY` i `SUPABASE_SERVICE_ROLE_KEY` są
dostarczane funkcjom Edge przez Supabase. Klucz service role służy tylko funkcji
do zapisu danych po zweryfikowaniu JWT użytkownika.

## Co jest zapisywane

- `meal_plans` przechowuje plan wygenerowany dla konkretnego cyklu oraz jego
  cele kaloryczne i białkowe.
- `shopping_cycles` przechowuje zbiorczą listę zakupów, snapshot promocji i
  adres źródła promocji dla danego planu.

RLS pozwala użytkownikowi tylko odczytać własne plany. Wstawianie rekordów z
przeglądarki jest zablokowane; robi to tylko funkcja po sprawdzeniu sesji.

## Promocje Biedronki

Funkcja wymaga wyszukiwania w domenie `zakupy.biedronka.pl` i odbiera listę
odwiedzonych źródeł API. Serwer zachowuje tylko oferty powiązane z konkretnym
składnikiem jadłospisu, oznaczone jako zweryfikowane, ważne w dniu zakupów i
pochodzące z oficjalnego URL występującego w źródłach odpowiedzi.
Odrzuca niepowiązane produkty, karmę i chemię. Bez potwierdzonych danych lista
promocji pozostaje pusta. Ten filtr nie jest niezależnym audytem cen sklepu:
treść oferty i okres obowiązywania nadal odczytuje model.

## Obliczanie zakupów (format 2)

Składniki posiłków mają pola `name`, `category`, `amount`, `unit`, `biedronka`.
Ilość dotyczy jednego posiłku. Kod serwera sumuje wszystkie wystąpienia danego
produktu we wszystkich dniach, normalizując kg → g i l → ml. Nie mnoży wyniku
ponownie przez liczbę dni i nie używa pola `shopping_items` wygenerowanego przez AI.
Nieznane jednostki, alternatywy i niezgodne jednostki dla tego samego produktu
są odrzucane przed zapisem. Lista oznacza ilości do zużycia, nie liczbę opakowań.

Nowe rekordy mają `meal_plans.content.schema_version = 2`. Starsze plany nadal
można odczytać, ale ich historyczne ilości nie są automatycznie naprawiane:
tekstowe składniki mogą być niejednoznaczne. Po wdrożeniu należy wygenerować
nowy plan, aby uzyskać poprawnie sumowane zakupy.

Parser czyta fragmenty `output[].content[]` typu `output_text`, a nie wyłącznie
pole pomocnicze SDK `response.output_text`. Niekompletne odpowiedzi są odrzucane.

## Weryfikacja

1. Zaloguj się do aplikacji i zapisz ustawienia.
2. Kliknij **Wygeneruj plan**.
3. Upewnij się, że w `meal_plans` i `shopping_cycles` powstały rekordy z tym
   samym właścicielem, a lista dni i zakupy są widoczne w aplikacji.

Testy regresji bez płatnych zapytań API: `node --test scripts/generate_plan.test.mjs`
(Node.js 24). Są uruchamiane również przez workflow „Kontrola jakości”.
Sprawdzają przypadek kurczak 220 g / łosoś 180 g w trzydniowym planie,
sumowanie powtórzeń, promocje, parser Responses API i zapis przez endpoint.
