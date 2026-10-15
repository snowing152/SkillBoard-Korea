import { UserRound } from 'lucide-react';
import Image from 'next/image';
import { initials } from '@/lib/initials';
import { cn } from '@/lib/utils';

type Props = {
  name: string;
  photoUrl?: string | null;
  size?: 'md' | 'lg';
  /** A ring in the page color, for an avatar that overlaps the media cover. */
  ringed?: boolean;
  className?: string;
};

const SIZES = {
  md: { box: 'size-12 text-body', px: 48 },
  lg: { box: 'size-19 text-display', px: 76 },
} as const;

/**
 * Round avatar: the photo if there is one, otherwise the initials on the warm placeholder color.
 * Decorative (`aria-hidden`): the name is always printed next to it. `unoptimized` because photo hosts
 * are not allow-listed yet; the file is already a small avatar.
 */
export function Avatar({ name, photoUrl, size = 'md', ringed = false, className }: Props) {
  const { box, px } = SIZES[size];
  const letters = initials(name);
  return (
    <div
      aria-hidden="true"
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-avatar font-semibold text-avatar-foreground',
        ringed && 'border-4 border-background',
        box,
        className,
      )}
    >
      {photoUrl ? (
        <Image
          src={photoUrl}
          alt=""
          width={px}
          height={px}
          unoptimized
          className="size-full object-cover"
        />
      ) : letters ? (
        letters
      ) : (
        <UserRound className="size-1/2" />
      )}
    </div>
  );
}
