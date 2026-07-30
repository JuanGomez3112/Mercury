import type { ReactNode } from "react";

export default function AuthField({
  label,
  name,
  type = "text",
  placeholder,
  autoComplete,
  icon,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  icon: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium text-navy">{label}</span>
      <div className="m-field">
        <input
          name={name}
          type={type}
          placeholder={placeholder}
          autoComplete={autoComplete}
        />
        <span className="m-ico">{icon}</span>
      </div>
    </label>
  );
}
