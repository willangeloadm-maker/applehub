import React, { useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface StableInputProps extends Omit<React.ComponentProps<'input'>, 'onChange' | 'value'> {
  value: string;
  onValueChange: (value: string) => void;
  formatter?: (value: string) => string;
}

export const StableInput = React.memo(({ 
  value, 
  onValueChange, 
  formatter,
  className,
  ...props 
}: StableInputProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Atualizar o valor do input apenas se diferente
  useEffect(() => {
    if (inputRef.current && inputRef.current.value !== value) {
      const cursorPosition = inputRef.current.selectionStart;
      inputRef.current.value = value;
      
      // Restaurar posição do cursor
      if (cursorPosition !== null) {
        inputRef.current.setSelectionRange(cursorPosition, cursorPosition);
      }
    }
  }, [value]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = e.target.value;
    
    if (formatter) {
      newValue = formatter(newValue);
    }
    
    onValueChange(newValue);
  };
  
  return (
    <input
      ref={inputRef}
      type="text"
      defaultValue={value}
      onChange={handleChange}
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm transition-all duration-200 hover:border-accent focus:border-primary",
        className
      )}
      {...props}
    />
  );
});

StableInput.displayName = 'StableInput';
