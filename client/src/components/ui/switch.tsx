import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

// إنشاء مكون سويتش مبسط لتجنب مشكلة flushSync
const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => {
  // استخدام حالة داخلية لتجنب التغييرات المباشرة
  const [isChecked, setIsChecked] = React.useState(props.checked || false);
  
  // تحديث الحالة الداخلية عند تغير props.checked
  React.useEffect(() => {
    if (props.checked !== undefined) {
      setIsChecked(!!props.checked);
    }
  }, [props.checked]);
  
  // معالجة التغييرات محلياً أولاً ثم استدعاء المعالج الخارجي
  const handleChange = (checked: boolean) => {
    setIsChecked(checked);
    
    // استدعاء معالج التغيير الخارجي لاحقاً بعد اكتمال عملية الرندر
    if (props.onCheckedChange) {
      // استخدام queueMicrotask بدلاً من setTimeout لتنفيذ أسرع
      queueMicrotask(() => {
        props.onCheckedChange?.(checked);
      });
    }
  };
  
  return (
    <SwitchPrimitives.Root
      className={cn(
        "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input",
        className
      )}
      {...props}
      checked={isChecked}
      onCheckedChange={handleChange}
      ref={ref}
    >
      <SwitchPrimitives.Thumb
        className={cn(
          "pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0"
        )}
      />
    </SwitchPrimitives.Root>
  );
});

Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }
