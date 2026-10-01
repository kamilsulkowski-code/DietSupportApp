# Zadanie #3 — raport testów

Data: 1 października 2026, Europe/Warsaw.

## Weryfikacja poprawek — 1 października 2026

Aktualny wynik lokalny: **38/38 testów zaliczonych**: 16 jadłospisu,
12 generatora i 10 formularza OTP. Kontrola struktury HTML: OK.
Pierwotne wyniki poniżej zachowano jako historię audytu, nie aktualny stan.

Naprawiono:

- wspólną normalizację indeksu dnia dla selektora, nagłówka i posiłków
  (ujemny, zbyt duży, niecałkowity, niepoprawny oraz brak indeksu);
- dashboard wybierający dzisiejszy dzień wg lokalnej daty, niezależnie od
  dnia otwartego w widoku jadłospisu; brak dzisiejszego dnia ma jawny komunikat;
- dynamiczną datę nagłówka zamiast stałego 30 września;
- ilustracje kategorii posiłków w SVG z etykietami dostępności;
- pełne makro: wymagane `fat_g` i `carbs_g` nowych planów (format 3),
  sumy liczone na serwerze i pokazane w interfejsie;
- komunikat o brakujących danych historycznych zamiast wymyślonych wartości;
- kodowanie treści posiłków i składników przed wstawieniem do HTML.

Izolowany test przeglądarkowy: 320 px, skrócony plan ze starym indeksem,
zgodne daty selektora i posiłków, rozwijanie składników i zmiana dnia.
Szerokość dokumentu i scrollWidth: 320/320 px — bez poziomego przewijania.
Ujemny indeks przy 568 px pokazuje prawidłowy pierwszy dzień, bez Invalid Date.

Logowanie kodem przygotowano za flagą `emailOtpEnabled`; domyślnie jest
wyłączone, dopóki szablony Supabase wysyłają link zamiast kodu.
Nie wysyłano maili, nie generowano planów ani nie zmieniano danych użytkownika.
**Testy produkcyjne po zalogowaniu odłożono na wyraźną prośbę użytkownika.**
Zadania #3 nie zamykamy na podstawie samych testów izolowanych.

## Pierwotne podsumowanie (przed poprawkami)

Testy akceptacyjne: **12 przypadków, 6 zaliczonych, 6 niezaliczonych**.
Jeden niezaliczony przypadek dotyczy rozszerzonej interpretacji „makro” jako
białka, tłuszczów i węglowodanów. GitHub #3 nie definiuje tego jednoznacznie.
Pozostałe pięć błędów zostało potwierdzonych w kodzie i izolowanym interfejsie.
Osobne testy generatora: **11/11 zaliczonych**. Kontrola struktury strony: OK.

Nie zmieniono kodu aplikacji, danych w Supabase, statusu zadania ani konfiguracji
CI. Dodano wyłącznie lokalne testy, dane kontrolne i ten raport. Testy
akceptacyjne celowo zwracają kod wyjścia 1, dopóki wykryte braki nie są naprawione.

## Zakres i metody

- Sprawdzenie opublikowanej aplikacji bez aktywnej sesji.
- Wykonanie rzeczywistych funkcji z `dist/index.html` w izolowanym środowisku
  testowym oraz prawdziwych zdarzeń `change` w przeglądarce.
- Testy przeglądarkowe kopii tego samego interfejsu na danych kontrolnych:
  zwykły cykl, krótszy cykl ze starym indeksem dnia, ujemny indeks.
- Ilości składników w nowym formacie i kompatybilność starego formatu tekstowego.
- Desktop: zaobserwowana szerokość 1280 px. Telefon: rzeczywiste viewporty
  dokumentu 390 i 320 px, wymuszone przez izolowane ramki testowe.
- Brak poziomego przewijania widoku dnia przy 1280, 390 i 320 px. Sprawdzono
  wybór dnia, rozwijanie i zwijanie posiłków oraz czytelność składników i instrukcji.
- Bez generowania nowych planów, wysyłania OTP, zapisów do bazy i płatnych
  wywołań OpenAI. Serwer testowy usuwa z kopii strony konfigurację i skrypty
  Supabase; nie uruchamia inicjalizacji logowania.

## Wyniki przypadków

| Przypadek | Wynik |
|---|---|
| Lista wszystkich posiłków wybranego dnia | OK |
| Przełączanie kolejnych dni aktualizuje dania, datę i sumy | OK |
| Kalorie i białko dla posiłku oraz suma dnia | OK |
| Tłuszcze i węglowodany (rozszerzone makro) | Brak — wymaga uzgodnienia interpretacji |
| Ilustracje produktów lub kategorii w planie AI | Błąd — wszędzie ikona talerza |
| Nazwy, ilości i jednostki g/ml/szt | OK |
| Starsze tekstowe składniki | OK |
| Instrukcja przygotowania każdego posiłku | OK |
| Krótszy cykl ze starym indeksem wybranego dnia | Błąd — różne daty selektora i posiłków |
| Ujemny indeks wybranego dnia | Błąd — Invalid Date i lokalny plan zastępczy |
| Dzisiejsze posiłki na dashboardzie | Błąd — wybrany/ pierwszy dzień zamiast dzisiaj |
| Aktualna data w nagłówku dashboardu | Błąd — stałe „30 września” |

## Odtworzenie błędów

1. Uruchom lokalny serwer testowy opisany poniżej.
2. Dla `scenario=short` otwórz **Dzień**. Indeks zachowany z poprzedniego planu
   wynosi 6, nowy plan ma dwa dni. Selektor wskazuje 1 października, natomiast
   nagłówek i dania dotyczą 2 października. Potwierdzone na rzeczywistym `<select>`.
3. Dla `scenario=negative` otwórz **Dzień**. Zapisany indeks -1 powoduje
   nagłówek `Jadłospis na Invalid Date.` i prezentację lokalnych przykładowych dań
   zamiast zapisanych posiłków AI. Nie powoduje wyjątku kończącego skrypt.
4. Dla `scenario=normal` dashboard 1 października pokazuje posiłki pierwszego
   dnia cyklu, czyli 30 września. W widoku dnia zwykłe przełączanie działa.
5. Każdy posiłek AI ma tę samą ikonę 🍽️. Brak przypisanych grafik kategorii.

## Test wymagający zalogowania — zablokowany

Nie potwierdzono pełnej ścieżki produkcyjnej: zalogowanie → odczyt własnego
`meal_plans` → wybór dni tego planu. Dostępna strona produkcyjna zwróciła
`access_denied` / `otp_expired` po użyciu linku logowania; przycisk nadal
pokazuje „Zaloguj się”, a strona używa planu lokalnego.

Do zakończenia tego przypadku potrzebne jest zalogowanie aktualnym linkiem.
Nie wysłano nowego OTP automatycznie. Wyniki izolowane nie zastępują tego testu.

## Uruchamianie

Node.js 24:

```sh
node --test scripts/task3_acceptance.test.mjs
node --test scripts/generate_plan.test.mjs
python3 scripts/validate_site.py
node scripts/serve_day_tests.mjs
```

Serwer: `http://127.0.0.1:4174/?scenario=normal`.
Pozostałe scenariusze: `short`, `negative`.
Test telefonu: `http://127.0.0.1:4174/device?width=390&scenario=normal`
(dostępne szerokości ramek: 320, 390, 1440).

Raport nie oznacza odbioru zadania #3. Wykryte błędy nadal wymagają naprawy.
