import { Users, ListTodo, Bug, Globe, Shield, Activity, Settings, Wrench } from "lucide-react";

export const IconMap = {
  Users,
  ListTodo,
  Bug,
  Globe,
  Shield,
  Activity,
  Settings,
  Wrench
};

export default function DynamicIcon({ name, ...props }) {
  const IconComponent = IconMap[name] || Globe;
  return <IconComponent {...props} />;
}
