'use client';

import type { ProfileStatus } from '@skillboard/shared';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { setTalentProfileStatus } from '@/actions/talent-profile';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useRouter } from '@/i18n/navigation';
import { type ActionFailure, errorMessageKey } from '@/lib/api-errors';

/** Publish / unpublish. After the action succeeds the Server Component re-renders via router.refresh(). */
export function ProfileStatusActions({ status }: { status: ProfileStatus }) {
  const t = useTranslations('profile.my');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const [failure, setFailure] = useState<ActionFailure | null>(null);
  const [pending, startTransition] = useTransition();
  const next: ProfileStatus = status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant={next === 'PUBLISHED' ? 'default' : 'outline'}
        className="min-h-11"
        disabled={pending}
        onClick={() => {
          setFailure(null);
          startTransition(async () => {
            const result = await setTalentProfileStatus(next);
            if (result.ok) router.refresh();
            else setFailure(result);
          });
        }}
      >
        {next === 'PUBLISHED' ? t('publish') : t('unpublish')}
      </Button>
      {failure && (
        <Alert variant="destructive">
          <AlertDescription>{tCommon(errorMessageKey(failure.code))}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
