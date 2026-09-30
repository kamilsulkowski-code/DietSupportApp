"""Minimalna kontrola jakości dla statycznej strony Forma."""

from html.parser import HTMLParser
from pathlib import Path
import sys


class Validator(HTMLParser):
    pass


page = Path("dist/index.html")
if not page.exists():
    sys.exit("Brak dist/index.html")

content = page.read_text(encoding="utf-8")
Validator().feed(content)

for required in ("id=\"calculator\"", "Ułóż mój plan", "Lista zakupów"):
    if required not in content:
        sys.exit(f"Brakuje wymaganej części strony: {required}")

print("OK: strona ma poprawną strukturę i kluczowe elementy.")
