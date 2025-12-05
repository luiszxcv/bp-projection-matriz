import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Info, ChevronDown, ChevronRight } from 'lucide-react';

interface SpreadsheetCellProps {
  value: number | string;
  onChange?: (value: number) => void;
  editable?: boolean;
  format?: 'number' | 'currency' | 'percentage';
  tooltip?: string;
  className?: string;
  tier?: string;
}

export function SpreadsheetCell({
  value,
  onChange,
  editable = false,
  format = 'number',
  tooltip,
  className,
  tier,
}: SpreadsheetCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const formatValue = (val: number | string): string => {
    if (typeof val === 'string') return val;
    
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(val);
      case 'percentage':
        return `${(val * 100).toFixed(1)}%`;
      case 'number':
      default:
        return new Intl.NumberFormat('pt-BR', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        }).format(val);
    }
  };

  const parseValue = (val: string): number => {
    const cleaned = val.replace(/[^\d.,\-]/g, '').replace(',', '.');
    if (format === 'percentage') {
      return parseFloat(cleaned) / 100;
    }
    return parseFloat(cleaned);
  };

  const handleDoubleClick = () => {
    if (!editable || !onChange) return;
    setIsEditing(true);
    const numVal = typeof value === 'number' ? value : 0;
    if (format === 'percentage') {
      setEditValue((numVal * 100).toString());
    } else {
      setEditValue(numVal.toString());
    }
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (onChange) {
      const parsed = parseValue(editValue);
      if (!isNaN(parsed)) {
        onChange(parsed);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
    }
  };

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const tierClass = tier ? `tier-${tier}` : '';
  const editableClass = editable ? 'cell-editable' : 'cell-calculated';
  const formatClass = format === 'currency' ? 'text-currency' : format === 'percentage' ? 'text-percentage' : 'text-number';

  const cellContent = (
    <div
      className={cn(
        'spreadsheet-cell text-right',
        editableClass,
        tierClass,
        formatClass,
        editable && 'cursor-pointer hover:bg-primary/10',
        className
      )}
      onDoubleClick={handleDoubleClick}
    >
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="spreadsheet-input"
        />
      ) : (
        <span className="block truncate">{formatValue(value)}</span>
      )}
    </div>
  );

  if (tooltip) {
    return (
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          {cellContent}
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs bg-popover text-popover-foreground border-border">
          <p className="text-xs">{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return cellContent;
}

interface RowHeaderProps {
  label: string;
  tooltip?: string;
  level?: 'section' | 'tier' | 'metric' | 'product';
  tier?: string;
  className?: string;
  expanded?: boolean;
  onToggle?: () => void;
}

export function RowHeader({ label, tooltip, level = 'metric', tier, className, expanded, onToggle }: RowHeaderProps) {
  const levelClass = 
    level === 'section' ? 'section-header' :
    level === 'tier' ? `tier-header tier-${tier}` :
    'spreadsheet-row-header';

  const content = (
    <div 
      className={cn(levelClass, 'flex items-center justify-between gap-2', className)}
      onClick={onToggle}
    >
      <div className="flex items-center gap-1.5">
        {level === 'section' && onToggle && (
          expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          )
        )}
        <span className="truncate">{label}</span>
      </div>
      {tooltip && (
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <Info className="h-3 w-3 text-muted-foreground flex-shrink-0 cursor-help" />
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-xs bg-popover text-popover-foreground border-border">
            <p className="text-xs">{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );

  return content;
}

export function ColumnHeader({ label, className }: { label: string; className?: string }) {
  return (
    <div className={cn('spreadsheet-header text-center', className)}>
      {label}
    </div>
  );
}
