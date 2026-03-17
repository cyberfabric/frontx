import React from 'react';
import type { ApiUser } from '../../../api/types';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';

interface AccountDetailsCardProps {
  user: ApiUser;
  t: (key: string) => string;
}

export const AccountDetailsCard: React.FC<AccountDetailsCardProps> = ({ user, t }) => {
  const department =
    typeof user.extra?.department === 'string' ? user.extra.department : t('not_provided');

  return (
    <Card>
      <CardHeader>
        <CardTitle>{user.firstName} {user.lastName}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="flex items-center gap-4">
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={`${user.firstName} ${user.lastName}`}
              className="h-20 w-20 rounded-full"
            />
          ) : null}
          <div className="grid gap-1">
            <p className="font-mono text-sm text-muted-foreground">{user.email}</p>
            <p className="text-sm text-muted-foreground">{user.role}</p>
          </div>
        </div>

        <dl className="grid gap-3 text-sm">
          <div className="grid gap-1">
            <dt className="font-medium text-muted-foreground">{t('department_label')}</dt>
            <dd>{department}</dd>
          </div>
          <div className="grid gap-1">
            <dt className="font-medium text-muted-foreground">{t('id_label')}</dt>
            <dd className="font-mono">{user.id}</dd>
          </div>
          <div className="grid gap-1">
            <dt className="font-medium text-muted-foreground">{t('created_label')}</dt>
            <dd>{new Date(user.createdAt).toLocaleString()}</dd>
          </div>
          <div className="grid gap-1">
            <dt className="font-medium text-muted-foreground">{t('updated_label')}</dt>
            <dd>{new Date(user.updatedAt).toLocaleString()}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
};

AccountDetailsCard.displayName = 'AccountDetailsCard';
