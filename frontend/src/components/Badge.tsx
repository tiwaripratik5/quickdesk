import React from 'react';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'default' | 'purple';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  success: 'bg-green-100 text-green-800',
  warning: 'bg-yellow-100 text-yellow-800',
  danger: 'bg-red-100 text-red-800',
  info: 'bg-blue-100 text-blue-800',
  default: 'bg-gray-100 text-gray-700',
  purple: 'bg-purple-100 text-purple-800',
};

export function getStatusVariant(status: string): BadgeVariant {
  if (status === 'resolved') return 'success';
  if (status === 'open') return 'warning';
  return 'default';
}

export function getPriorityVariant(priority: string): BadgeVariant {
  if (priority === 'High') return 'danger';
  if (priority === 'Medium') return 'warning';
  if (priority === 'Low') return 'success';
  return 'default';
}

export function getCategoryVariant(category: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    IT: 'info',
    HR: 'purple',
    Finance: 'success',
    Admin: 'default',
    Other: 'default',
  };
  return map[category] || 'default';
}

export default function Badge({ label, variant = 'default' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variantClasses[variant]}`}>
      {label}
    </span>
  );
}
