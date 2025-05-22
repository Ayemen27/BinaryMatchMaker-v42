import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, value, defaultValue, ...props }, ref) => {
    // إضافة حالة داخلية لضمان أن القيم الابتدائية متسقة
    const [internalValue, setInternalValue] = React.useState<string | number | readonly string[] | undefined>(
      value !== undefined ? value : defaultValue !== undefined ? defaultValue : ""
    );

    // تحديث القيمة الداخلية عند تغير القيمة الخارجية
    React.useEffect(() => {
      if (value !== undefined) {
        setInternalValue(value);
      }
    }, [value]);

    // استخدام القيمة الداخلية عندما لا تتوفر القيمة الخارجية
    const inputValue = value !== undefined ? value : internalValue;

    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={ref}
        value={inputValue}
        onChange={(e) => {
          setInternalValue(e.target.value);
          if (props.onChange) {
            props.onChange(e);
          }
        }}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
