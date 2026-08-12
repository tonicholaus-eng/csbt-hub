# CSBT category runtime fix

Fixes `Cannot read properties of undefined (reading 'label')` in SearchBar after expanding the Elve database.

Changes:
- Normalizes singular/plural and formatted category names (Vehicle/Vehicles, Sticker/Stickers, Pet Wear, etc.).
- Falls back safely to OTHER for malformed/missing runtime categories instead of crashing the Values page.
- Normalizes categories when the search index is built so search results always use a known category.

Copy the contents of this patch into the project root and replace files, then clear `.next` and restart the dev server.
