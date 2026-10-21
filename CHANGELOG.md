# Historia zmian

## Ikony menu mobilnego — 2026-10-21, zadanie #15

- Ikony pulpitu, sztućców, koszyka i ustawień nad niezmienionymi podpisami;
  zatwierdzony wariant „Pełne wyróżnienie” z ciemnym tłem aktywnej pozycji.
- Lokalne SVG bez CDN, dekoracyjne ikony pomijane przez czytniki ekranu,
  widoczny fokus i większe obszary dotykowe; układ desktopowy bez zmian.
- Safe-area oraz rezerwa mierzona z wysokości menu chronią końcową treść,
  przewijany fokus i toasty przy zmianie ekranu lub rozmiaru tekstu.
  Komunikaty PWA pozostają w dotychczasowym układzie strony.
- Siedem nowych testów MOBILE15; pełna regresja przed publikacją 147/147.
- [Wymagania #15, macierz NAV1–NAV7 i testy ręczne](docs/mobile-navigation.md).
  Potwierdzenie CI/Pages jest rejestrowane oddzielnie w PR; kontrola Safari/PWA
  na fizycznym iPhonie pozostaje do potwierdzenia przez użytkownika.
- Bez zmian Auth, SQL, API generatora i nowego tagu wydania; wymagane
  przebudowanie cache PWA przed publikacją frontendu.

## Konto i dyskretne statusy — 2026-10-21

- Przycisk logowania/Konto w przewijanym nagłówku zamiast nakładki nad treścią;
  osobny panel konta z e-mailem, ustawieniami i jawnym wylogowaniem.
- Sekcja Konto pod Twoje założenia na telefonie i komputerze, ze stanem
  synchronizacji i czasem ostatniej udanej synchronizacji.
- Rutynowe sukcesy synchronizacji bez szerokiego górnego banera;
  potwierdzenie zapisu przy przycisku, trwałe błędy i świadome ponowienie.
- Zachowane logowanie, dane i zasady synchronizacji; bez zmian SQL, Edge,
  SMTP ani sekretów. Wymagane przebudowanie cache PWA i regresja.
- [Zakres ACCOUNT1–ACCOUNT4 i macierz weryfikacji](docs/account-status-ux.md).
  Wyniki testów i potwierdzenie publikacji są rejestrowane oddzielnie w PR.

## Logowanie hasłem w PWA — 2026-10-21

- Domyślne logowanie e-mailem i hasłem bez opuszczania PWA; istniejące konta,
  identyfikatory, plany i dane pozostają bez zmian.
- Ustawienie hasła w zalogowanej sesji oraz link odzyskiwania dla obecnego konta;
  12–128 znaków, potwierdzenie, sprawdzenie właściciela przez Supabase Auth.
- Listener recovery przed odczytem sesji; router czeka na SDK i czyści callback.
- Brak zapisu haseł w storage/URL/logach; ochrona szkicu przy aktualizacji PWA.
- 21 nowych testów i rozszerzona regresja PWA, 125 łącznie. Nie zmieniono
  schematu, RLS, Edge, SMTP ani szablonów OTP; reset nadal podlega limitom poczty.
- [Instrukcja i macierz AUTH1–AUTH6](docs/password-login.md).

## PWA — 2026-10-20

- Manifest, ikony 192/512 px i Apple 180 px, uruchamianie standalone oraz
  panel instalacji w Ustawieniach, z instrukcjami dla Safari/iPhone/Maca.
- Ograniczony offline shell: interfejs, lokalne ustawienia i przykład planu;
  brak cache odpowiedzi API, tokenów, kodów logowania i konfiguracji Supabase.
- Jawny komunikat offline, blokada logowania/generowania bez sieci, bez
  obietnicy automatycznej synchronizacji lokalnych zmian i zapisanych planów AI.
- Network-first, fingerprint zawartości shell, cache ograniczony do scope
  projektu i aktualizacja na żądanie z ochroną szkicu oraz trwających operacji.
- 24 testy PWA, 104 testy łącznie; CI/Pages sprawdzają build cache, a Pages
  uruchamia pełną regresję przed publikacją. Bez migracji i zmian Edge.
- [Instalacja, ograniczenia offline i utrzymanie](docs/pwa.md).

## Czytelność licznika zakupów — 2026-10-19

- Biały tekst licznika na ciemnozielonym tle zamiast szarego nadpisania
  z ogólnego stylu nagłówka; kontrast wzrasta z 1,63:1 do 8,17:1.
- Większa, pogrubiona czcionka i dodatkowy odstęp wewnętrzny licznika.
- Test regresji wymaga osobnego stylu licznika i kontrastu co najmniej 7:1.
- Zmiana wyłącznie wizualna, bez modyfikacji danych i logiki koszyka.

## Aktualizacja UX — 2026-10-18, zadanie #7

Wymagania: [#7](https://github.com/kamilsulkowski-code/DietSupportApp/issues/7).
Zakres i weryfikacja: [macierz UX1–UX9](docs/ux-improvements.md).

- Trwała informacja o niezgodności lub nieznanej zgodności planu z założeniami.
- Trwały błąd generowania, oznaczenie poprzedniego planu i przejście do
  jadłospisu wyłącznie po sukcesie.
- Dynamiczne podsumowanie kalorii zaplanowanych, bez sugerowania rejestru spożycia.
- Jedna nawigacja dla danego rozmiaru ekranu oraz adres przechowujący widok i dzień.
- Neutralne powitanie gościa, oznaczenie demonstracji i logowanie z przycisku generowania.
- Jawny tryb kalorii automatycznych/ręcznych, szkic i status zapisu ustawień.
- Możliwość odrzucenia niezapisanych zmian przed uruchomieniem generatora.
- Filtrowanie zakupów, licznik pozostałych produktów i cofnięcie akcji zbiorczej.
- Cofanie zakupów jest unieważniane przy zmianie konta, cyklu lub ręcznej edycji;
  kontrolki daty zachowują fokus podczas zmiany dnia.
- Obsługa klawiatury w oknie logowania i dostępny wybór celu diety.
- Usunięcie prywatnego planu i zakupów z widoku również po zewnętrznym
  zdarzeniu wylogowania; blokowanie osobnego przycisku konta podczas modala.
- 79/79 testów (23 UX i 56 regresji), poprawna kontrola struktury i sprawdzenie
  interfejsu przy 320/390/768/1440 px przed wdrożeniem.
- Manifest identyfikuje frontend jako aktualizację `ux-7` z bazą v1.0.1,
  bez przesuwania historycznego tagu.
- Dokumentacja śledzi zakres zadania. Test produkcyjny
  po zalogowaniu, płatne AI oraz badanie z użytkownikami nie są potwierdzone
  przez samą weryfikację izolowaną.

Bez nowego tagu wydania, migracji SQL i zmian API generatora.
Potwierdzenie wdrożenia i kontroli produkcji jest rejestrowane w zadaniu #7.

## 1.0.1 — 2026-10-17

Wymaganie: [#5](https://github.com/kamilsulkowski-code/DietSupportApp/issues/5).
Implementacja: [PR #6](https://github.com/kamilsulkowski-code/DietSupportApp/pull/6).

- Średnia liczba treningów tygodniowo: 0–14 co 0,5, podgląd kalorii i zapis
  lokalny oraz w `profiles.settings` w Supabase.
- Spójne obliczenia kalorii na stronie i w generatorze, z pierwszeństwem
  ręcznie podanego celu. Starsze profile bez nowego pola oznaczają 0 treningów.
- Jawne założenie orientacyjne: sesja 60 minut, 3,5 MET; dodatkowy wydatek
  ponad spoczynek rozłożony na 7 dni. Nie jest to indywidualny pomiar.
- Ujednolicony dolny próg automatycznego celu: 1500 kcal w UI i Edge
  (wcześniej Edge miał 1200). Ręczny cel nadal omija ten próg.
- Nieudana synchronizacja jest widoczna i blokuje generowanie ze starymi
  ustawieniami. Istniejące plany nie są automatycznie zmieniane.
- 13 nowych testów, łącznie 56; kontrola zgodności UI/Edge w 1305 kombinacjach.
- Brak migracji SQL. Wdrożenie wymaga aktualizacji Edge Function i GitHub Pages.

Szczegóły, ograniczenia i mapowanie na kryteria: [opis wydania](docs/releases/v1.0.1.md).

## 1.0.0 — 2026-10-01

Pierwsze zaakceptowane MVP: ustawienia diety, jadłospis dnia, generator AI,
lista zakupów i zapis w Supabase. Zakres: zadania #1–#4.
[Release v1.0.0](https://github.com/kamilsulkowski-code/DietSupportApp/releases/tag/v1.0.0).
