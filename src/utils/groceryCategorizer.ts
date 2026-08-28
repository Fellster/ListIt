import { GroceryCategory, GROCERY_CATEGORIES } from '../types';

const CATEGORY_KEYWORDS: Record<GroceryCategory, string[]> = {
  'Produce': [
    'apple', 'banana', 'orange', 'lemon', 'lime', 'avocado', 'tomato', 'potato', 'onion', 'garlic',
    'lettuce', 'spinach', 'kale', 'carrot', 'broccoli', 'cucumber', 'pepper', 'berry', 'strawberry',
    'blueberry', 'grape', 'watermelon', 'melon', 'herb', 'cilantro', 'parsley', 'basil', 'ginger',
    'mushroom', 'celery', 'zucchini', 'cabbage', 'asparagus', 'corn', 'peach', 'plum', 'pear', 'mango',
    'fruit', 'vegetable', 'greens', 'salad'
  ],
  'Dairy & Refrigerated': [
    'milk', 'cheese', 'cheddar', 'mozzarella', 'parmesan', 'butter', 'yogurt', 'egg', 'eggs', 'cream',
    'sour cream', 'cream cheese', 'tofu', 'almond milk', 'oat milk', 'soy milk', 'cottage cheese',
    'kefir', 'margarine', 'ricotta', 'gouda', 'feta'
  ],
  'Meat & Seafood': [
    'chicken', 'beef', 'steak', 'pork', 'bacon', 'turkey', 'sausage', 'salmon', 'fish', 'tuna',
    'shrimp', 'crab', 'lobster', 'ham', 'ground beef', 'ribs', 'meatball', 'lamb', 'tilapia', 'cod'
  ],
  'Bakery & Bread': [
    'bread', 'bagel', 'croissant', 'bun', 'buns', 'tortilla', 'pita', 'muffin', 'cake', 'cookie',
    'pastry', 'donut', 'sourdough', 'brioche', 'roll', 'rolls', 'baguette', 'crust'
  ],
  'Pantry & Grains': [
    'rice', 'pasta', 'spaghetti', 'noodle', 'flour', 'sugar', 'oil', 'olive oil', 'salt', 'pepper',
    'spice', 'cereal', 'oats', 'quinoa', 'lentil', 'beans', 'sauce', 'tomato sauce', 'ketchup',
    'mustard', 'mayo', 'mayonnaise', 'vinegar', 'honey', 'syrup', 'peanut butter', 'jam', 'jelly'
  ],
  'Canned & Jarred': [
    'canned', 'soup', 'broth', 'canned beans', 'canned corn', 'tuna can', 'olives', 'pickles',
    'salsa', 'marinara', 'coconut milk'
  ],
  'Frozen Foods': [
    'ice cream', 'frozen', 'pizza', 'frozen pizza', 'frozen veggies', 'frozen fruit', 'popsicle',
    'waffle', 'waffles', 'nuggets', 'frozen fries', 'ice'
  ],
  'Snacks & Treats': [
    'chips', 'popcorn', 'pretzel', 'pretzels', 'cracker', 'crackers', 'chocolate', 'candy', 'gummy',
    'nuts', 'almonds', 'cashews', 'trail mix', 'bar', 'granola bar', 'cookie'
  ],
  'Beverages': [
    'water', 'juice', 'soda', 'coke', 'pepsi', 'coffee', 'tea', 'beer', 'wine', 'sparkling water',
    'energy drink', 'kombucha', 'lemonade', 'smoothie'
  ],
  'Household & Cleaning': [
    'paper towel', 'toilet paper', 'trash bag', 'dish soap', 'detergent', 'sponge', 'cleaner',
    'bleach', 'foil', 'ziploc', 'plastic wrap', 'napkin', 'light bulb', 'battery', 'soap'
  ],
  'Personal Care': [
    'shampoo', 'conditioner', 'body wash', 'toothpaste', 'toothbrush', 'deodorant', 'lotion',
    'sunscreen', 'razor', 'floss', 'tampon', 'pad', 'vitamins', 'medicine', 'bandaid'
  ],
  'Other': []
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
}

export function parseItemInput(rawInput: string, defaultCategory: string = 'Other'): ParsedItemInput {
  let cleaned = rawInput.trim();
  let quantity = 1;
  let unit = 'pcs';

  // Pattern: "3 lbs apples" or "2x milk" or "dozen eggs" or "5 cans of beans"
  const regexDozen = /^(?:a\s+)?dozen\s+(.+)$/i;
  const matchDozen = cleaned.match(regexDozen);
  if (matchDozen) {
    quantity = 12;
    unit = 'pcs';
    cleaned = matchDozen[1].trim();
  } else {
    // Pattern like: "3.5 lbs of apples" or "2 boxes cereal" or "4x bananas" or "6 apples"
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
          // It wasn't a recognized unit, so it might be part of the title: e.g. "2 red apples"
          cleaned = `${possibleUnit} ${remainder}`.trim();
        } else {
          cleaned = remainder.trim();
        }
      }
    } else {
      // Just a leading number without unit like "3 apples"
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

  // Capitalize item title properly
  const formattedTitle = cleaned
    ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
    : rawInput;

  // Auto detect category
  const lowerTitle = formattedTitle.toLowerCase();
  let detectedCategory = defaultCategory;

  for (const cat of GROCERY_CATEGORIES) {
    if (cat === 'Other') continue;
    const keywords = CATEGORY_KEYWORDS[cat] || [];
    const matched = keywords.some(kw => {
      const regex = new RegExp(`\\b${kw}`, 'i');
      return regex.test(lowerTitle);
    });
    if (matched) {
      detectedCategory = cat;
      break;
    }
  }

  return {
    title: formattedTitle,
    quantity,
    unit,
    category: detectedCategory
  };
}
