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
4. Wdróż funkcję z włączonym sprawdzaniem JWT (domyślne ustawienie Supabase).

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

Funkcja zleca modelowi sprawdzenie oficjalnej strony promocji Biedronki przy
każdym generowaniu. Do planu trafiają wyłącznie oferty oznaczone przez model jako
zweryfikowane; przy braku wiarygodnego wyniku zapisywana jest pusta lista, a UI
jasno to komunikuje. Dzięki temu aplikacja nie przedstawia domyślonych ani
nieaktualnych promocji jako aktualnych.

## Weryfikacja

1. Zaloguj się do aplikacji i zapisz ustawienia.
2. Kliknij **Wygeneruj plan**.
3. Upewnij się, że w `meal_plans` i `shopping_cycles` powstały rekordy z tym
   samym właścicielem, a lista dni i zakupy są widoczne w aplikacji.
