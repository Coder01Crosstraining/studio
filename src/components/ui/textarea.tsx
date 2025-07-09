import * as React from 'react';

import {cn} from '@/lib/utils';

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<'textarea'>>(
  ({className, value, onChange, ...props}, ref) => {

    const sanitizeInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      // Basic sanitization: strip HTML tags to prevent XSS.
      // A more robust solution might use a library like DOMPurify if needed.
      const sanitizedValue = e.target.value.replace(/<[^>]*>?/gm, '');
      
      // Create a new event with the sanitized value to pass to the original onChange handler
      const newEvent = {
        ...e,
        target: { ...e.target, value: sanitizedValue },
      };

      if (onChange) {
        onChange(newEvent as React.ChangeEvent<HTMLTextAreaElement>);
      }
    };

    return (
      <textarea
        className={cn(
          'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        value={value ?? ''}
        onChange={sanitizeInput}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';

export {Textarea};