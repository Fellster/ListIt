import React from 'react';
import { 
  Calendar, 
  Home, 
  List, 
  ShoppingCart, 
  CheckSquare, 
  Folder, 
  Star, 
  Heart, 
  Sparkles,
  ClipboardList
} from 'lucide-react';

interface ListIconProps {
  icon?: string;
  type?: string;
  className?: string;
  fallback?: React.ReactNode;
}

export const renderListIcon = (
  icon?: string, 
  type?: string, 
  className: string = "w-5 h-5 text-current"
): React.ReactNode => {
  if (!icon) {
    if (type === 'grocery') return <span className="text-lg">🛒</span>;
    return <ClipboardList className={className} />;
  }

  const clean = icon.trim().toLowerCase();

  // Known string icon keywords
  switch (clean) {
    case 'calendar':
    case 'today':
    case 'date':
      return <Calendar className={className} />;
    case 'home':
    case 'house':
      return <Home className={className} />;
    case 'grocery':
    case 'shopping':
    case 'cart':
      return <ShoppingCart className={className} />;
    case 'list':
    case 'todo':
    case 'checklist':
    case 'task':
      return <CheckSquare className={className} />;
    case 'folder':
      return <Folder className={className} />;
    case 'star':
      return <Star className={className} />;
    case 'heart':
      return <Heart className={className} />;
    case 'sparkles':
      return <Sparkles className={className} />;
  }

  // If it's an emoji (single character or short emoji sequence)
  // Check if string contains standard text letters (a-z). If it only contains emoji/symbols, render as span
  if (!/^[a-zA-Z0-9_\-\s]+$/.test(icon)) {
    return <span className="text-lg leading-none">{icon}</span>;
  }

  // Fallback for unrecognized plain text words so the word itself is never printed
  if (type === 'grocery') return <span className="text-lg">🛒</span>;
  return <List className={className} />;
};

export const ListIcon: React.FC<ListIconProps> = ({ icon, type, className }) => {
  return <>{renderListIcon(icon, type, className)}</>;
};
