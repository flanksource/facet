import { useMemo } from 'react';
import { Avatar } from './Avatar';
import type { User } from '../types/common';

export interface AvatarGroupProps {
  users: Partial<User>[];
  size?: 'xs' | 'sm' | 'md' | 'lg';
  maxCount?: number;
  className?: string;
}

export function AvatarGroup({
  users,
  size = 'md',
  maxCount = 5,
  className = ''
}: AvatarGroupProps) {
  const sliceUsers = useMemo(
    () => users?.slice(0, maxCount) || [],
    [users, maxCount]
  );

  return (
    <div className={`flex -space-x-2 overflow-hidden ${className}`}>
      {sliceUsers?.map((user, index) => (
        <div
          key={user.avatar || user.name || index}
          className="rounded-full ring-2 ring-white"
        >
          <Avatar user={user} size={size} />
        </div>
      ))}
    </div>
  );
}

export default AvatarGroup;
