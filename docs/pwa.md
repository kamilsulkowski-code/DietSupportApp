# Forma jako PWA

## Zakres

PWA dodaje instalację na urządzeniu, własne ikony, uruchamianie w osobnym
oknie oraz ograniczony tryb offline. Nie wymaga nowego konta, opłat,
uprawnień powiadomień, zmiany schematu bazy ani wdrożenia funkcji Supabase.
Nie oznacza publikacji w App Store ani Google Play.

## Instalacja

Najpierw otwórz online [Formę](https://kamilsulkowski-code.github.io/DietSupportApp/).
W **Ustawieniach → Forma jako aplikacja** są instrukcje oraz przycisk
instalacji, gdy przeglądarka udostępni taką możliwość.

- iPhone/iPad: w Safari otwórz menu **Udostępnij → Dodaj do ekranu początkowego**;
  jeśli pojawia się opcja „Otwieraj jako aplikację”, pozostaw ją włączoną.
- Mac: w zgodnej wersji Safari wybierz **Plik → Dodaj do Docka** lub menu
  Udostępnij. Apple wymaga macOS Sonoma 14 lub nowszego.
- Chrome/Edge: użyj przycisku instalacji w pasku adresu, menu przeglądarki
  albo przycisku „Zainstaluj Formę” w aplikacji, jeśli został udostępniony.
- Instalacja z przeglądarki osadzonej w innej aplikacji może nie być dostępna;
  otwórz wtedy adres bezpośrednio w Safari, Chrome lub Edge.

Instalacja zależy od systemu i przeglądarki. Nie deklarujemy wykonania
instalacji na fizycznym iPhonie/Macu na podstawie samych testów technicznych.
Skrót lub osobne okno mogą mieć odrębną sesję logowania — w razie potrzeby
zaloguj się w zainstalowanej aplikacji.

Aktualizacja 2026-10-21: domyślne logowanie hasłem odbywa się bezpośrednio
w PWA. [Pierwsze ustawienie i odzyskanie hasła](password-login.md) może raz
wymagać otwarcia wiadomości w Safari; potem wróć do PWA i użyj e-maila/hasła.
Aktualizacja PWA respektuje również niezapisany formularz hasła.

Źródła: [instrukcja Apple dla Maca](https://support.apple.com/pl-pl/104996),
[instrukcja Apple dla iPhone’a](https://support.apple.com/guide/iphone/iphea86e5236/ios),
[instalowalność PWA — MDN](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable).

## Co działa bez sieci

Po pierwszej udanej wizycie online service worker zapisuje **tylko pliki
interfejsu**: HTML, skrypty/styl PWA, manifest i ikony. Dzięki temu aplikacja
może się ponownie otworzyć, gdy sieć jest niedostępna. Wczyta dotychczasowe
lokalne ustawienia i przykładowy plan, jednoznacznie oznaczony jako przykład.

**To nie jest pełny tryb offline dla zapisanych planów AI i zakupów.**
Przy otwartej karcie wcześniej pobrane dane mogą pozostać w pamięci strony,
ale po zamknięciu lub odświeżeniu nie obiecujemy ich dostępności bez sieci.
Nie zmieniamy istniejącego mechanizmu zapisu danych użytkownika.

Logowanie, pobieranie planów z Supabase, synchronizacja i generowanie AI
wymagają internetu. Offline próby logowania/generowania są blokowane przed
żądaniem. Zmiany lokalne **nie tworzą kolejki synchronizacji** i nie są
automatycznie wysyłane po powrocie sieci. Ponowne pobranie profilu z chmury
może zastąpić lokalne ustawienia i odhaczenia stanem serwera, tak jak w
dotychczasowej wersji. Nie używaj tego zakresu jako gwarancji trwałych,
międzyplatformowych zakupów offline.

Pierwsza wizyta bez internetu nie zadziała. Przeglądarka/system może usunąć
cache, np. wskutek braku miejsca lub wyczyszczenia danych witryny. Czcionki
zewnętrzne nie są zapisywane przez workera; offline działa font systemowy.

## Cache i prywatność

- Scope manifestu i workera jest względny: `/DietSupportApp/` na GitHub Pages,
  bez przejmowania innych projektów tej samej domeny.
- Cache ma ścisłą listę dozwolonych publicznych plików. Nie przechwytujemy
  Supabase, OpenAI, CDN, POST, żądań z Authorization, konfiguracji Supabase,
  `version.json` ani samego `sw.js`.
- Nawigacje z parametrami, w tym kodem logowania, nie są zapisywane w cache.
  Przy braku sieci mogą dostać jedynie wcześniej zapisany kanoniczny HTML.
- PWA nie dodaje cache odpowiedzi API, tokenów, wiadomości e-mail ani linków
  logowania. Dotychczasowe localStorage i sesja SDK pozostają bez zmian;
  dodanie PWA nie szyfruje ich ani nie zastępuje zabezpieczeń RLS.
- Dane sieciowe mają pierwszeństwo przed cache; udany nowy HTML zastępuje
  stary. Błędy, przekierowania i odpowiedzi nie-HTML nie zatruwają shell.
- Aktywacja usuwa wyłącznie stare cache Formy dla dokładnie tego scope,
  nie cache innych aplikacji na domenie.

## Aktualizacje

Nowy worker czeka, zamiast samoczynnie wykonywać `skipWaiting`. Globalny
komunikat i przycisk w Ustawieniach pozwalają świadomie go aktywować.
Szkic formularza, trwające generowanie lub logowanie blokują przeładowanie.
Aktywacja w innej karcie nie przeładowuje automatycznie bieżącej karty.

Nie zmieniaj nazwy `sw.js` przy kolejnych wydaniach. Samo usunięcie pliku
nie usuwa workera z wcześniej używanych urządzeń. Wycofując PWA, trzeba
osobno dostarczyć worker wyrejestrowujący się i usuwający wyłącznie własny
cache; nie wystarczy odwrócić HTML. [Cykl aktualizacji — web.dev](https://web.dev/learn/pwa/update).

## Budowanie i publikacja

```sh
node scripts/build_pwa.mjs
node scripts/build_pwa.mjs --check
node --test scripts/*.test.mjs
python3 scripts/validate_site.py
```

`scripts/service-worker.template.js` jest źródłem workera. Generator liczy
SHA-256 szablonu i ośmiu plików shell, a następnie zapisuje `dist/sw.js` z
identyfikatorem cache. Każda zmiana interfejsu/ikon wymaga ponownego builda.
CI i workflow Pages sprawdzają zgodność fingerprintu. Pages dodatkowo
uruchamia pełną regresję przed publikacją; nie opublikuje starego workera.

Ikony PNG są śledzone w repozytorium, więc CI nie wymaga Pillow. Przy ich
zmianie źródła wektorowe/ścieżki są w `dist/icons/icon.svg` oraz
`scripts/build_pwa_icons.py`; rasteryzacja wymaga Pillow i polecenia
`python3 scripts/build_pwa_icons.py`, a następnie nowego builda PWA.

## Weryfikacja i śledzenie

| Kryterium | Kod | Testy |
| --- | --- | --- |
| PWA1: instalacja i ikony | manifest, metadata HTML, ikony | tożsamość/scope, rzeczywiste wymiary PNG |
| PWA2: offline shell | instalacja SW | osiem publicznych plików, niekompletny build odrzucany |
| PWA3: aktualność | network-first w SW | nowy HTML, fallback, quota, błędne odpowiedzi |
| PWA4: prywatność | allowlista SW | wyłączenia API/auth/query/POST/CDN |
| PWA5: wersjonowanie | build + aktywacja | fingerprint, scope cleanup, jawny skipWaiting |
| PWA6: UX instalacji | pwa.js i panel Ustawień | prompt dopiero po kliknięciu, instrukcja, standalone, brak wsparcia |
| PWA7: ograniczenia offline | komunikat i blokady w HTML/JS | jawny stan, brak próby sieciowej |
| PWA8: ochrona szkicu | aktualizacja w pwa.js | dirty/busy, pierwsza aktywacja, inne karty |

`scripts/pwa.test.mjs` zawiera 24 nowe testy; łącznie z regresją jest 104.
Testy na atrapach nie zastępują fizycznej instalacji ani rzeczywistej sesji
Supabase. Raport publikacji i kontroli produkcyjnej należy zapisać w PR.

Kontrola przeglądarkowa przed publikacją (2026-10-20): w izolowanym originie
potwierdzono worker w stanie `activated`, scope `/DietSupportApp/` i dokładnie
osiem publicznych plików cache. Po odłączeniu lokalnego serwera (bezpośrednie
żądanie HTTP nie zwracało strony) ponowne otwarcie Ustawień nadal wczytało
formularz i panel PWA z cache. Włączono następnie serwer z powrotem.
Instrukcja instalacji była dostępna w interfejsie. Nie instalowano aplikacji
w systemie użytkownika i nie wykonano testu na fizycznym iPhonie/Macu.

Test przeglądarkowy bez kont/AI: `node scripts/serve_pwa_tests.mjs`.
Otwórz `http://127.0.0.1:4177/DietSupportApp/#settings`; panel
`http://127.0.0.1:4177/__pwa-test` pozwala obejrzeć rejestrację/cache i odłączyć
wyłącznie ten serwer aplikacji. Testuje utratę połączenia z serwerem;
nie symuluje zmiany systemowego `navigator.onLine`.
