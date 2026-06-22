import { Button } from "@ecom/ui/components/button";
import { Input } from "@ecom/ui/components/input";
import { Textarea } from "@ecom/ui/components/textarea";

export function ButtonField({ children, containerClassName, fullWidth, ...props }: any) {
  return (
    <Button
      {...props}
      className={`${props.className || ""} ${fullWidth ? "w-full" : ""}`}
    >
      {children}
    </Button>
  );
}

export function InputField({ onValueChange, containerClassName, label, as, ...props }: any) {
  const Component = as === "textarea" ? Textarea : Input;
  return (
    <div className={`flex flex-col gap-1.5 ${containerClassName || ""}`}>
      {label && (
        <label className="text-sm font-medium text-[#1f2a37]">
          {label}
        </label>
      )}
      <Component
        {...props}
        onChange={(e: any) => {
          if (props.onChange) props.onChange(e);
          if (onValueChange) onValueChange(e.target.value);
        }}
      />
    </div>
  );
}
