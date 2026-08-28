import { GroceryStore, GROCERY_STORES } from '../types';

const STORE_KEYWORDS: Record<GroceryStore, string[]> = {
  "Trader Joe's": [
    'trader joe', 'tj', 'cookie butter', 'everything bagel', 'frozen meal', 'snack', 'charcuterie', 
    'mandarin chicken', 'cauliflower gnocchi', 'sour dough', 'speculoos', 'trail mix'
  ],
  'Costco': [
    'costco', 'kirkland', 'bulk', 'toilet paper', 'paper towel', 'rotisserie chicken', 'pack', 'case', 
    'water case', 'detergent bulk', 'olive oil bulk'
  ],
  'Whole Foods': [
    'whole foods', 'organic', 'kale', 'artisan', 'kombucha', 'fresh fish', 'grass fed', 'gluten free', 
    'avocado organic', 'microgreens', 'berries'
  ],
  'Target': [
    'target', 'good & gather', 'household', 'soap', 'shampoo', 'cleaning', 'towel', 'storage', 
    'candles', 'electronics', 'coffee pods', 'snacks'
  ],
  'Safeway': [
    'safeway', 'signature select', 'lucerne', 'deli', 'bakery', 'roast chicken', 'cereal', 'soup'
  ],
  'Walmart': [
    'walmart', 'great value', 'equate', 'batteries', 'supplies', 'pantry', 'canned food'
  ],
  'Kroger': [
    'kroger', 'simple truth', 'private selection'
  ],
  'Aldi': [
    'aldi', 'clancy', 'friendly farms', 'season choice'
  ],
  'Sprouts': [
    'sprouts', 'bulk nuts', 'vitamins', 'fresh produce', 'farmers market'
  ],
  'CVS / Pharmacy': [
    'cvs', 'pharmacy', 'medicine', 'tylenol', 'advil', 'bandaid', 'toothpaste', 'vitamins', 'prescription', 
    'sunscreen', 'first aid', 'drops'
  ],
  'Home Depot / Hardware': [
    'home depot', 'lowes', 'hardware', 'screws', 'nails', 'light bulb', 'air filter', 'paint', 'tools', 
    'garden hose', 'soil', 'plants'
  ],
  'Local Market': [
    'local market', 'farmers market', 'butcher', 'bakery shop', 'fish market', 'deli counter'
  ],
  'Other Store': []
};

const QUANTITY_UNITS = [
  'lbs', 'lb', 'kg', 'g', 'oz', 'pack', 'packs', 'box', 'boxes', 'bag', 'bags',
  'bottle', 'bottles', 'can', 'cans', 'bunch', 'bunches', 'dozen', 'dz', 'ct',
  'gal', 'gallon', 'qt', 'quart', 'pt', 'pint', 'carton', 'jar', 'jars', 'piece', 'pcs'
];

export interface ParsedItemInput {
  title: string;
  quantity: number;
  unit: string;
  category: string;
  store: string;
}

export function parseItemInput(rawInput: string, defaultStore: string = "Trader Joe's"): ParsedItemInput {
  let cleaned = rawInput.trim();
  let quantity = 1;
  let unit = 'pcs';
  let explicitStore: string | undefined;

  // Check if store is mentioned via @Store or at Store
  const storeAtMatch = cleaned.match(/@([^@\n]+)/);
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

  const lowerTitle = formattedTitle.toLowerCase();
  let detectedStore = explicitStore || defaultStore;

  if (!explicitStore) {
    for (const store of GROCERY_STORES) {
      if (store === 'Other Store') continue;
      const keywords = STORE_KEYWORDS[store] || [];
      const matched = keywords.some((kw) => {
        const regex = new RegExp(`\\b${kw}`, 'i');
        return regex.test(lowerTitle);
      });
      if (matched) {
        detectedStore = store;
        break;
      }
    }
  }

  return {
    title: formattedTitle,
    quantity,
    unit,
    category: detectedStore,
    store: detectedStore
  };
}
