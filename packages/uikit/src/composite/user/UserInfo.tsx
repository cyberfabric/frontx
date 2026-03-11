// @cpt-algo:cpt-hai3-algo-uikit-components-validate-ref-pattern:p1
// @cpt-dod:cpt-hai3-dod-uikit-components-ref-pattern:p1
// @cpt-flow:cpt-hai3-flow-uikit-components-consume-composite:p1

import React from 'react';
import { trim, toUpper } from 'lodash';
import { cn } from '../../lib/utils';
import { Avatar, AvatarImage, AvatarFallback } from '../../base/avatar';
import { Skeleton } from '../../base/skeleton';

/**
 * User Info Props
 * Matches UI Core contract in uikitContracts.ts
 */
export interface UserInfoProps {
  displayName?: string;
  email?: string;
  avatarUrl?: string;
  className?: string;
  loading?: boolean;
}

/**
 * UserInfo Component
 * Composite component combining shadcn Avatar + text
 * Displays user avatar with fallback initials and name/email
 */
// @cpt-begin:cpt-hai3-algo-uikit-components-validate-ref-pattern:p1:inst-1
// @cpt-begin:cpt-hai3-flow-uikit-components-consume-composite:p1:inst-1
export const UserInfo = (
  {
    ref,
    displayName,
    email,
    avatarUrl,
    className,
    loading
  }: UserInfoProps & {
    ref?: React.Ref<HTMLDivElement>;
  }
) => {
  const getInitials = (): string => {
    if (!displayName) return toUpper(email?.[0] || '') || '?';
    const parts = trim(displayName).split(/\s+/);
    if (parts.length >= 2) {
      return toUpper(`${parts[0][0]}${parts[parts.length - 1][0]}`);
    }
    return toUpper(displayName.slice(0, 2));
  };

  const initials = getInitials();
  const displayText = displayName || email || 'User';

  if (loading) {
    return (
      <div ref={ref} className={cn('flex items-center gap-2 text-sm', className)}>
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-4 w-24" />
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={cn(
        'flex items-center gap-2 text-sm text-muted-foreground',
        className
      )}
    >
      <Avatar className="h-8 w-8">
        {avatarUrl && <AvatarImage src={avatarUrl} alt={displayText} />}
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
      <span>{displayText}</span>
    </div>
  );
};

UserInfo.displayName = 'UserInfo';
// @cpt-end:cpt-hai3-algo-uikit-components-validate-ref-pattern:p1:inst-1
// @cpt-end:cpt-hai3-flow-uikit-components-consume-composite:p1:inst-1
