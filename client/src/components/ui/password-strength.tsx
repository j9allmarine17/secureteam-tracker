import { Check, X } from "lucide-react";

interface PasswordStrengthProps {
  password: string;
}

export default function PasswordStrength({ password }: PasswordStrengthProps) {
  const requirements = [
    {
      label: "At least 12 characters",
      met: password.length >= 12,
    },
    {
      label: "Contains lowercase letter",
      met: /[a-z]/.test(password),
    },
    {
      label: "Contains uppercase letter",
      met: /[A-Z]/.test(password),
    },
    {
      label: "Contains number",
      met: /[0-9]/.test(password),
    },
    {
      label: "Contains special character",
      met: /[^a-zA-Z0-9]/.test(password),
    },
  ];

  const strength = requirements.filter(req => req.met).length;
  const getStrengthColor = () => {
    if (strength <= 1) return "bg-red-500";
    if (strength <= 3) return "bg-yellow-500";
    if (strength <= 4) return "bg-orange-500";
    return "bg-green-500";
  };

  const getStrengthText = () => {
    if (strength <= 1) return "Very Weak";
    if (strength <= 3) return "Weak";
    if (strength <= 4) return "Good";
    return "Strong";
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Password Strength</span>
          <span className={`font-medium ${strength >= 5 ? 'text-green-400' : 'text-gray-400'}`}>
            {getStrengthText()}
          </span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${getStrengthColor()}`}
            style={{ width: `${(strength / 5) * 100}%` }}
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <p className="text-sm text-gray-400 font-medium">Requirements:</p>
        {requirements.map((req, index) => (
          <div key={index} className="flex items-center space-x-2 text-sm">
            {req.met ? (
              <Check className="w-4 h-4 text-green-400" />
            ) : (
              <X className="w-4 h-4 text-gray-500" />
            )}
            <span className={req.met ? "text-green-400" : "text-gray-500"}>
              {req.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}