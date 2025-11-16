import clsx from 'clsx';
import React, { useMemo } from 'react';
import { BsFillPersonFill } from 'react-icons/bs';
import type { User } from '../types/common';
import { getColorFromString } from '../utils/colors';

export interface AvatarProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  circular?: boolean;
  inline?: boolean;
  alt?: string;
  user?: Partial<User>;
  className?: string;
  showName?: boolean;
}

export function Avatar({
  user,
  size = 'sm',
  alt,
  inline = false,
  circular = true,
  className = '',
  showName = false
}: AvatarProps) {
  const sizeClass = useMemo(() => {
    switch (size) {
      case 'xs':
        return 'w-4 h-4 text-xs';
      case 'sm':
        return 'w-5 h-5 text-xs';
      case 'md':
        return 'w-6 h-6 text-base';
      case 'lg':
        return 'w-8 h-8 text-base';
    }
  }, [size]);

  const fallbackName = user?.name?.trim() || user?.email || '?';
  const initials = useMemo(
    () =>
      fallbackName
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase())
        .slice(0, 2)
        .join(''),
    [fallbackName]
  );

  const textSize = useMemo(() => {
    switch (size) {
      case 'xs':
        return '10px';
      case 'sm':
        return '12px';
      case 'md':
        return '14px';
      case 'lg':
        return '16px';
    }
  }, [size]);

  const bgColorClass = useMemo(() => {
    if (user?.avatar) return 'bg-gray-200';
    if (!initials) return 'bg-gray-200';
    return `bg-${getColorFromString(fallbackName)}-500`;
  }, [user?.avatar, initials, fallbackName]);

  return (
    <div className={clsx('flex items-center gap-2', className)}>
      <div
        className={clsx(
          `items-center justify-center overflow-hidden leading-none ${inline ? 'inline-flex' : 'flex'}`,
          sizeClass,
          bgColorClass,
          initials && !user?.avatar && 'text-white',
          circular ? 'rounded-full' : 'rounded-md'
        )}
        title={fallbackName}
      >
        {user?.avatar ? (
          <img
            src={user.avatar}
            alt={alt || fallbackName}
            className={clsx('h-full w-full overflow-hidden object-cover', circular ? 'rounded-full' : 'rounded-md')}
          />
        ) : initials ? (
          <span style={{ fontSize: textSize }}>{initials}</span>
        ) : (
          <BsFillPersonFill className="text-gray-400" />
        )}
      </div>
      {showName && <span className="text-sm">{user?.name}</span>}
    </div>
  );
}

export default Avatar;
