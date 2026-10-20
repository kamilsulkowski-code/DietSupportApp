# Logowanie hasłem w PWA

## Zakres — 2026-10-21

Domyślne logowanie e-mailem i hasłem ustanawia sesję bezpośrednio w otwartej
PWA. Nie wymaga kliknięcia linku przy każdym logowaniu ani własnej domeny/SMTP
do samego sprawdzenia hasła. Dotychczasowe konto, jego UUID, plany i profil
pozostają te same; nie wykonujemy migracji SQL, tworzenia kont ani zmian RLS.

Włącznik: `passwordAuthEnabled: true` w `dist/supabase-config.js`. Wyłączenie
flagi przywraca poprzedni formularz e-mail. Logowanie linkiem pozostaje
dostępne jako jawna opcja zapasowa. OTP nadal wymaga osobnego uruchomienia
szablonów — tej funkcji nie aktywowano i nie skonfigurowano SMTP.

## Pierwsze ustawienie hasła do istniejącego konta

1. Jeśli jesteś już zalogowany w Safari, otwórz **Ustawienia → Ustaw / zmień
   hasło do konta**. Wpisz nowe, unikalne hasło dwukrotnie (12–128 znaków).
2. Jeśli nie masz sesji, wybierz **Zaloguj się → Nie mam / nie pamiętam hasła**.
   Wpisz adres dotychczasowego konta i poproś o link ustawienia hasła.
3. Otwórz najnowszy link z e-maila. Może otworzyć Safari — w tym jednorazowym
   kroku jest to oczekiwane. Po sprawdzeniu sesji przez Supabase aplikacja
   pokaże formularz ustawienia hasła do potwierdzonego konta.
4. Po zapisaniu wróć do ikony PWA i zaloguj się tym samym e-mailem i nowym
   hasłem. Sesje Safari i PWA mogą być oddzielne.

Nie przesyłaj hasła asystentowi ani w zgłoszeniach. Użytkownik sam wpisuje,
potwierdza i zapisuje hasło. Wdrożenie interfejsu nie ustawia nikomu hasła.

## Zwykłe logowanie i odzyskiwanie

- **Zaloguj się**: e-mail + hasło; aplikacja wywołuje `signInWithPassword`.
- **Nie mam / nie pamiętam hasła**: `resetPasswordForEmail` z przekierowaniem
  na obecny katalog aplikacji; adres musi pozostać na liście dozwolonych URL
  w Supabase. Sukces żądania nie potwierdza istnienia konta ani dostarczenia.
- **Ustaw / zmień hasło**: `getUser` sprawdza sesję i identyfikator właściciela,
  potem `updateUser({password})`. Zmiana nie przenosi danych do innego konta.
- **Zaloguj linkiem z e-maila** (lub kodem po jego aktywacji): dotychczasowy mechanizm. Przy obecnej
  konfiguracji wysyła link i nie rozwiązuje oddzielnych sesji PWA/Safari.

Odzyskiwanie i potwierdzanie nowych adresów nadal wymagają poczty. Wbudowana
poczta Supabase jest testowa, ma ograniczenia odbiorców i obecnie 2 wiadomości
na godzinę dla projektu. Nie jest to kompletne rozwiązanie produkcyjne dla
publicznej rejestracji. Nowy flow obsługuje istniejące konta, bez wyłączania
potwierdzania e-maila. Nie włącza automatycznych ponowień ani płatnych usług.

## Bezpieczeństwo i PWA

- Nie zapisujemy haseł w localStorage/sessionStorage, URL, cache, logach ani
  tabelach aplikacji. Pola są czyszczone po próbie, anulowaniu i zmianie metody.
  Menedżer haseł przeglądarki może działać zgodnie z wyborem użytkownika.
- Sesją i weryfikacją hasła zarządza Supabase Auth. Frontend nie używa
  `service_role` ani administratora do zmiany cudzych kont.
- Listener `PASSWORD_RECOVERY` jest rejestrowany przed odczytem sesji. Router
  czeka na SDK przed usunięciem parametrów callbacku; same parametry URL nie
  autoryzują zmiany hasła. Błędy wygasłych linków mają bezpieczny komunikat.
- Operacje chmury z listenera są odkładane poza blokadę callbacku SDK.
- Szkic hasła i trwająca operacja blokują ręczne przeładowanie aktualizacji PWA.
- Logowanie i zmiana hasła wymagają internetu. Worker nadal nie buforuje API,
  konfiguracji, danych konta ani odpowiedzi logowania.

## Weryfikacja i śledzenie

| Kryterium | Implementacja | Weryfikacja |
| --- | --- | --- |
| AUTH1: logowanie wewnątrz PWA | `signInWithPassword`, domyślny formularz | sukces, błędy, brak sesji, offline, podwójne kliknięcie |
| AUTH2: ustawienie bez dotychczasowego hasła | reset + ten sam redirect | ograniczenie ponowień, limit, neutralna odpowiedź |
| AUTH3: zachowanie tożsamości | `getUser` + `updateUser` | UUID właściciela, długość, zgodność, sesja i błędy serwera |
| AUTH4: callback i recovery | `initAuth`, router | kolejność listenera, wygasły link, czyszczenie URL, wylogowanie |
| AUTH5: prywatność i aktualizacja | czyszczenie pól, `passwordFormDirty` | brak storage haseł, ochrona odświeżenia i PWA |
| AUTH6: integracja formularza | pełny skrypt i DOM | submit, przełączanie metod, ustawienia, router |

18 testów `scripts/auth_password.test.mjs`, 3 integracyjne w `ux.test.mjs`,
rozszerzona regresja PWA; 125 testów łącznie. Testy nie wysyłają wiadomości,
nie zmieniają prawdziwych haseł i nie zastępują testu po ustawieniu hasła przez
użytkownika na fizycznym iPhonie.

Test wizualny: `node scripts/serve_password_tests.mjs`, port 4180. To fikcyjne
konto z wyłączoną wysyłką i celowo odrzucanym zapisem/logowaniem. Nie wpisuj
tam prawdziwych haseł; testowe odpowiedzi nie potwierdzają działania backendu.

Przed publikacją: `node scripts/build_pwa.mjs`, `node --test scripts/*.test.mjs`,
`node scripts/build_pwa.mjs --check`, `python3 scripts/validate_site.py`.
CI/Pages wymagają aktualnego workera. Raport wdrożenia zapisujemy w PR.

Źródła: [Supabase — hasła](https://supabase.com/docs/guides/auth/passwords),
[zdarzenia Auth](https://supabase.com/docs/reference/javascript/auth-onauthstatechange),
[SMTP i ograniczenia domyślnej poczty](https://supabase.com/docs/guides/auth/auth-smtp).
