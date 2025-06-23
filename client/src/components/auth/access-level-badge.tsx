import { Badge } from "@/components/ui/badge";
import { Shield, User, Crown } from "lucide-react";
import { AccessLevel, type AccessLevelType } from "@/shared/schema";

interface AccessLevelBadgeProps {
  accessLevel: AccessLevelType;
  className?: string;
}

export function AccessLevelBadge({ accessLevel, className }: AccessLevelBadgeProps) {
  const getBadgeConfig = (level: AccessLevelType) => {
    switch (level) {
      case AccessLevel.ADMIN:
        return {
          label: "Admin",
          variant: "default" as const,
          icon: <Crown className="h-3 w-3" />,
          className: "bg-red-500 text-white"
        };
      case AccessLevel.WRITE:
        return {
          label: "Write",
          variant: "default" as const,
          icon: <Shield className="h-3 w-3" />,
          className: "bg-blue-500 text-white"
        };
      case AccessLevel.READ:
      default:
        return {
          label: "Read",
          variant: "secondary" as const,
          icon: <User className="h-3 w-3" />,
          className: "bg-gray-100 text-gray-700"
        };
    }
  };

  const config = getBadgeConfig(accessLevel);

  return (
    <Badge variant={config.variant} className={`${config.className} ${className || ''}`}>
      {config.icon}
      <span className="ml-1">{config.label}</span>
    </Badge>
  );
}