import { Link } from 'wouter';
import { 
  MessageSquare, 
  Settings, 
  Zap, 
  Users, 
  BarChart,
  Home
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/app', icon: Home },
  { name: 'Chat', href: '/app/chat', icon: MessageSquare },
  { name: 'Integrations', href: '/app/integrations', icon: Zap },
  { name: 'Team', href: '/app/team', icon: Users },
  { name: 'Analytics', href: '/app/analytics', icon: BarChart },
  { name: 'Settings', href: '/app/settings', icon: Settings },
];

export function Sidebar() {
  return (
    <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
      <nav className="mt-5 px-2">
        <div className="space-y-1">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white"
            >
              <item.icon
                className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500 dark:text-gray-400 dark:group-hover:text-gray-300"
                aria-hidden="true"
              />
              {item.name}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
} 