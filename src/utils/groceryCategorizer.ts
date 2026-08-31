export interface ParsedItemInput {
  title: string;
  quantity: number;
  unit: string;
  store?: string;
  category?: string;
}

const QUANTITY_UNITS = [
  'lbs', 'lb', 'kg', 'g', 'oz', 'pack', 'packs', 'box', 'boxes', 'bag', 'bags',
  'bottle', 'bottles', 'can', 'cans', 'bunch', 'bunches', 'dozen', 'dz', 'ct',
  'gal', 'gallon', 'qt', 'quart', 'pt', 'pint', 'carton', 'jar', 'jars', 'piece', 'pcs'
];

export function parseItemInput(rawInput: string, defaultStore: string = 'Any'): ParsedItemInput {
  let cleaned = rawInput.trim();
  let quantity = 1;
  let unit = 'pcs';
  let explicitStore: string | undefined;

  // Check if store is mentioned via @Store or at Store or store: Store
  const storeAtMatch = cleaned.match(/@([^@\n,]+)/);
  if (storeAtMatch) {
    explicitStore = storeAtMatch[1].trim();
    cleaned = cleaned.replace(storeAtMatch[0], '').trim();
  }

  // Pattern: "3 lbs apples" or "2x milk" or "dozen eggs" or "5 cans of beans"
  const regexDozen = /^(?:a\s+)?dozen\s+(.+)$/i;
  const matchDozen = cleaned.match(regexDozen);
  if (matchDozen) {
    quantity = 12;
    unit = 'pcs';
    cleaned = matchDozen[1].trim();
  } else {
    const regexQty = /^(\d+(?:\.\d+)?)\s*(?:x\s*|\s+)?([a-zA-Z]+)?(?:\s+of\s+|\s+)(.+)$/i;
    const matchQty = cleaned.match(regexQty);
    if (matchQty) {
      const num = parseFloat(matchQty[1]);
      const possibleUnit = (matchQty[2] || '').toLowerCase();
      const remainder = matchQty[3];

      if (!isNaN(num) && num > 0) {
        quantity = num;
        if (possibleUnit && QUANTITY_UNITS.includes(possibleUnit)) {
          unit = possibleUnit;
          cleaned = remainder.trim();
        } else if (possibleUnit) {
          cleaned = `${possibleUnit} ${remainder}`.trim();
        } else {
          cleaned = remainder.trim();
        }
      }
    } else {
      const simpleNumberMatch = /^(\d+(?:\.\d+)?)\s+(.+)$/i;
      const matchSimple = cleaned.match(simpleNumberMatch);
      if (matchSimple) {
        const num = parseFloat(matchSimple[1]);
        if (!isNaN(num) && num > 0) {
          quantity = num;
          cleaned = matchSimple[2].trim();
        }
      }
    }
  }

  const formattedTitle = cleaned
    ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
    : rawInput;

  const resolvedStore = explicitStore || defaultStore;

  return {
    title: formattedTitle,
    quantity,
    unit,
    store: resolvedStore,
    category: resolvedStore,
  };
}
